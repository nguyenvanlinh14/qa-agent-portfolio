---
title: Docker cho QA - môi trường test lặp lại được
short: Docker cho QA
icon: docker
---

# Docker cho QA: môi trường test lặp lại được

"Chạy trên máy tôi thì xanh." Câu này là kẻ thù số một của automation. Docker giải quyết nó bằng cách đóng gói hệ điều hành, thư viện hệ thống, font, browser và phiên bản Node thành một **image** bất biến, để test chạy ở đâu cũng cho cùng kết quả. Bài này dựa trên đúng các file của repo: `docker/Dockerfile`, `docker-compose.yml` và cách CI dùng cùng một image.

## Mục tiêu bài học

- Giải thích vì sao QA cần Docker, đặc biệt cho visual testing.
- Hiểu image `mcr.microsoft.com/playwright:v1.64.1-noble` và vì sao phải khoá phiên bản.
- Đọc và sửa được Dockerfile cho test framework.
- Dựng stack `sut` + `tests` + `k6` bằng docker compose với healthcheck, `depends_on`, volumes và profile.
- Chạy test trong container ở GitHub Actions và hiểu những khác biệt so với chạy trên runner trần.

## Khái niệm

### Vì sao QA nên dùng Docker

1. **Reproducible**: cùng image, cùng kết quả. Bạn đính kèm lệnh `docker compose run tests` vào bug report thay vì "hãy cài giống tôi".
2. **Baseline visual ổn định**: ảnh chụp màn hình phụ thuộc vào font, anti-aliasing, phiên bản Chromium. Baseline tạo trên macOS sẽ lệch vài pixel so với Linux. Nếu cả CI lẫn máy dev đều chạy cùng image Linux thì baseline luôn khớp (xem bài 04).
3. **Cách ly**: SUT, test và công cụ tải chạy trong mạng riêng, không tranh port với thứ khác trên máy.
4. **Onboarding nhanh**: máy mới chỉ cần Docker, không cần cài Node, browser hay k6.
5. **Gần CI**: càng ít khác biệt giữa local và CI, càng ít "fail ở CI mà local xanh".

### Image, container, volume, network

- **Image**: khuôn đọc-chỉ, build một lần. **Container**: một thể hiện đang chạy của image.
- **Volume / bind mount**: thư mục chia sẻ giữa máy chủ và container. Với test, đây là cách lấy `playwright-report/` và `reports/` ra ngoài, vì mọi thứ ghi bên trong container sẽ mất khi nó dừng.
- **Network**: compose tạo mạng riêng, các service gọi nhau bằng tên service (`http://sut:4173`), không dùng `localhost` (trong container, `localhost` là chính nó).

### Image Playwright chính thức

```text
mcr.microsoft.com/playwright:v1.64.1-noble
```

- `v1.64.1` phải **trùng khớp** với phiên bản `@playwright/test` trong `package.json` (repo ghim chính xác `1.64.1`). Lệch phiên bản thì Playwright không tìm thấy browser đã cài sẵn và báo lỗi `Executable doesn't exist`.
- `noble` là Ubuntu 24.04. Cùng tag nghĩa là cùng font và cùng thư viện render, nên baseline giống nhau.
- Image đã chứa Chromium, Firefox, WebKit và Node, bạn **không** chạy `playwright install` trong container.

## Ví dụ chạy được

### 1. Dockerfile: [`docker/Dockerfile`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docker/Dockerfile)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

# Cài dependencies trước để layer này được cache cho tới khi lockfile đổi.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=1
EXPOSE 4173

# Mặc định: build site rồi chạy cả suite (SUT do webServer của Playwright khởi động).
CMD ["npm", "test"]
```

Thứ tự lệnh rất quan trọng cho tốc độ build: file thay đổi nhiều (code) đặt sau file thay đổi ít (lockfile). Repo có `.dockerignore` để loại `node_modules`, `dist`, `playwright-report`, `reports`... khỏi build context, vừa nhẹ vừa tránh ghi đè `node_modules` của container bằng bản của máy chủ. Lưu ý `ENV CI=1`: Playwright dùng nó để bật `retries`, `forbidOnly`, `workers` như trên CI thật.

### 2. docker compose: [`docker-compose.yml`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docker-compose.yml)

```yaml
x-app: &app
  build:
    context: .
    dockerfile: docker/Dockerfile
  image: qa-agent-portfolio:local

services:
  # System under test: portfolio site + demo REST API (server/app.mjs)
  sut:
    <<: *app
    command: ["sh", "-c", "npm run build && node server/app.mjs"]
    environment:
      PORT: "4173"
    ports:
      - "4173:4173"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:4173/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 3s
      timeout: 3s
      retries: 30
      start_period: 5s

  # Playwright suite, nhắm vào container SUT (webServer bị bỏ qua khi có BASE_URL)
  tests:
    <<: *app
    command: ["npx", "playwright", "test"]
    depends_on:
      sut:
        condition: service_healthy
    environment:
      BASE_URL: http://sut:4173
      CI: "1"
    init: true
    ipc: host
    volumes:
      - ./playwright-report:/app/playwright-report
      - ./reports:/app/reports
      - ./test-results:/app/test-results

  # k6 smoke (tuỳ chọn): docker compose --profile perf run --rm k6
  k6:
    image: grafana/k6:1.4.0
    profiles: ["perf"]
    depends_on:
      sut:
        condition: service_healthy
    environment:
      BASE_URL: http://sut:4173
    command: ["run", "/work/k6/smoke.js"]
    volumes:
      - ./k6:/work/k6:ro
      - ./reports:/work/reports
```

(Đã lược `expose`, `user`, `working_dir`; xem file thật.) Giải thích từng quyết định:

- **`x-app: &app`** là YAML anchor: `sut` và `tests` dùng chung một image `qa-agent-portfolio:local`, build một lần. `sut` chỉ khác ở `command`.
- **`healthcheck`** trên `sut`: Docker chạy lệnh kiểm tra định kỳ và gắn trạng thái `healthy`. Image Playwright không cần `curl`, vì đã có Node nên ta dùng `fetch` của Node.
- **`depends_on` + `condition: service_healthy`**: `tests` và `k6` chỉ khởi động khi SUT thực sự trả lời `/api/health`. Dùng `depends_on` trần chỉ chờ container *bắt đầu*, chưa chắc server đã nghe port. Đó là nguyên nhân kinh điển của lỗi `ECONNREFUSED` chập chờn.
- **`BASE_URL: http://sut:4173`**: `playwright.config.ts` khi thấy `BASE_URL` sẽ **bỏ qua `webServer`** và test thẳng vào service `sut`. Một cấu hình, hai chế độ (local tự khởi động server, compose dùng server ngoài).
- **`volumes`**: report ghi vào `/app/playwright-report` hiện ra ở thư mục cùng tên trên máy bạn. Mở `playwright-report/index.html` xem như bình thường. Mount `test-results/` để có cả trace và ảnh chụp khi fail.
- **`ipc: host`** và **`init: true`**: khuyến nghị của Playwright khi chạy Chromium trong Docker (tránh crash do bộ nhớ chia sẻ, và dọn tiến trình zombie).
- **`profiles: ["perf"]`**: service `k6` mặc định *không* chạy. Chỉ khi bật profile nó mới xuất hiện, nên `docker compose up` thông thường không kéo thêm k6. Script k6 mount chế độ chỉ đọc (`:ro`), còn `reports/` để ghi file summary.

### 3. Các lệnh hay dùng

```bash
# Chạy toàn bộ test trong container, trả exit code của tests
docker compose up --build --abort-on-container-exit --exit-code-from tests

# Chạy một project hoặc một file
docker compose run --rm tests npx playwright test --project=api
docker compose run --rm tests npx playwright test tests/ui/login.spec.ts

# Chạy k6 smoke (bật profile perf)
docker compose --profile perf run --rm k6

# Cập nhật baseline visual bằng đúng môi trường Linux của CI
docker compose run --rm tests npx playwright test --project=visual --update-snapshots

# Dọn dẹp
docker compose down --volumes --remove-orphans
```

Lệnh `--update-snapshots` ở trên giải quyết đúng bài toán nêu ở đầu: dev dùng macOS/Windows vẫn tạo được baseline giống hệt CI mà không cần Linux thật. (Ảnh được ghi vào container; muốn lấy ra máy chủ, hãy mount thêm `tests/visual/__screenshots__`, hoặc đơn giản hơn là dùng workflow `update-snapshots` ở bài 07.)

### 4. Container trong GitHub Actions

Có hai cách chạy test trong Docker ở CI. Repo dùng cách thứ nhất ở [`.github/workflows/ci.yml`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.github/workflows/ci.yml):

```yaml
test:
  name: Playwright (ui + api + visual)
  needs: typecheck
  runs-on: ubuntu-latest
  # Cùng image với docker/Dockerfile và update-snapshots.yml, nên ảnh chụp khớp từng pixel.
  container:
    image: mcr.microsoft.com/playwright:v1.64.1-noble
  env:
    HOME: /root
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm test            # pretest chạy build trước
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
```

Cách thứ hai là `docker compose` ngay trong job (`run: docker compose up --build --abort-on-container-exit --exit-code-from tests`), phù hợp khi bạn muốn CI chạy y hệt local, kể cả nhiều service. Cách thứ nhất đơn giản hơn: toàn bộ job nằm trong image, `actions/checkout` và upload-artifact vẫn hoạt động, và `webServer` vẫn khởi chạy `node server/app.mjs` ngay trong container, nên không cần service `sut` riêng.

Lưu ý khi dùng `container:` ở Actions:

- Job chạy bằng user `root` trong container; `HOME: /root` giúp các browser (đặc biệt Firefox) có thư mục home hợp lệ.
- Nếu bước nào chạy `git` (như workflow commit baseline), cần `git config --global --add safe.directory "$GITHUB_WORKSPACE"` vì chủ sở hữu thư mục checkout khác user trong container.

- Image đã kèm Node, nên job không cần `actions/setup-node`.
- Job k6 dùng `grafana/setup-k6-action` trên runner trần là đủ (xem bài 05), không cần container.

## Lỗi thường gặp

1. **Lệch phiên bản image và `@playwright/test`.** Nâng một mà quên một. Giải pháp: khi nâng Playwright, đổi tag image trong `docker/Dockerfile`, `ci.yml`, `update-snapshots.yml` trong cùng một PR.
2. **Dùng `localhost` để gọi service khác.** Trong `tests`, `localhost` là chính container `tests`. Dùng `http://sut:4173`.
3. **`depends_on` không có healthcheck.** Test khởi chạy khi SUT chưa nghe port, dẫn đến lỗi chập chờn.
4. **Quên mount volume cho report.** Test chạy xong, container bị xoá, báo cáo biến mất theo.
5. **Bind mount đè `node_modules`.** Mount cả `.:/app` làm `node_modules` Linux bị thay bằng bản macOS. Chỉ mount thư mục output, hoặc thêm anonymous volume `/app/node_modules`.
6. **Thiếu `ipc: host` hoặc `--shm-size`.** Chromium crash ngẫu nhiên với lỗi liên quan bộ nhớ chia sẻ.
7. **Chạy `playwright install` trong image chính thức.** Vừa chậm vừa vô nghĩa vì browser đã có sẵn đúng phiên bản.
8. **Dùng tag `latest` cho image.** Mất tính lặp lại, baseline có thể đổi mà không ai biết. Repo ghim cả `grafana/k6:1.4.0` vì lý do này.
9. **Chạy test song song gọi `/api/test/reset`** trên SUT dùng chung: nó xoá dữ liệu của mọi worker.

## Bài tập thực hành

1. Chạy `docker compose up --build --abort-on-container-exit --exit-code-from tests` và mở `playwright-report/index.html` được tạo ra ở máy bạn.
2. Cố ý bỏ khối `healthcheck` và `condition: service_healthy`, chạy lại vài lần để thấy lỗi kết nối chập chờn, rồi khôi phục lại.
3. Thêm `.dockerignore` hợp lý và so sánh thời gian build lần hai (có cache) với lần đầu.
4. Chạy k6 qua compose: `docker compose --profile perf run --rm k6`. Sau đó đổi lệnh thành `run /scripts/load.js`.
5. Dùng Docker để tạo lại baseline visual, so sánh với baseline CI tạo ra và giải thích vì sao chúng khớp.
6. Thêm service `tests-firefox` (hoặc một biến môi trường `PROJECT`) để chạy cùng suite trên browser khác.

## Checklist tóm tắt

- [ ] Biết ba lý do: reproducible, baseline visual, cách ly.
- [ ] Tag image `v1.64.1-noble` khớp với `@playwright/test` 1.64.1.
- [ ] Dockerfile copy lockfile và `npm ci` trước khi copy code.
- [ ] Service `sut` có healthcheck, `tests` dùng `depends_on: service_healthy`.
- [ ] `BASE_URL=http://sut:4173` trong compose, không dùng `localhost`.
- [ ] Report được mount ra máy chủ qua volumes.
- [ ] k6 nằm trong profile `perf`.
- [ ] CI dùng `container:` với cùng image và upload artifact kể cả khi fail (`if: always()`).
- [ ] Mọi chỗ ghi phiên bản Playwright được nâng đồng thời.
