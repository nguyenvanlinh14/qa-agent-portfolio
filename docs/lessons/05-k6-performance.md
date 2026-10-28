---
title: k6 Performance - đo tải API với VUs, thresholds và CI
short: k6 Performance
icon: gauge
---

# k6 Performance: đo tải API với VUs, thresholds và CI

Test chức năng trả lời câu hỏi "nó có chạy đúng không?". Test hiệu năng trả lời câu hỏi khác: "nó còn chạy đúng và đủ nhanh khi có nhiều người dùng cùng lúc không?". Trong bài này bạn sẽ dùng **k6** (của Grafana) để viết kịch bản tải bằng JavaScript, đặt ngưỡng pass/fail (thresholds) và chạy nó trong CI như một cổng chất lượng thực sự.

## Mục tiêu bài học

Sau bài này bạn có thể:

- Giải thích được VU (virtual user), iteration, stage và vì sao chúng khác với "số request".
- Viết `check` và `threshold` để biến kết quả đo thành pass/fail tự động (p95 < 300ms, tỉ lệ lỗi < 1%).
- Phân biệt smoke, load, stress, soak test và biết khi nào dùng loại nào.
- Dùng `group`, `tags` để kết quả có cấu trúc, và `handleSummary` để xuất báo cáo.
- Chạy k6 trong GitHub Actions với biến `BASE_URL` và đọc được bảng kết quả.

## Khái niệm

### VU, iteration, duration

- **VU (virtual user)**: một "người dùng ảo" chạy hàm `default` của bạn lặp đi lặp lại. 10 VUs nghĩa là 10 luồng chạy song song.
- **Iteration**: một lần chạy trọn vẹn hàm `default` (ví dụ: login, tạo todo, xoá todo). Một iteration có thể gồm nhiều request.
- **Duration**: tổng thời gian chạy. Hết thời gian k6 dừng, kể cả khi iteration đang dở (có `gracefulStop`).

Nên nhớ: số request/giây (RPS) là **hệ quả** của số VU nhân với tốc độ mỗi iteration. Nếu bạn muốn cố định RPS thì dùng executor `constant-arrival-rate`, còn mặc định k6 điều khiển theo VU.

### Stages: kịch bản tăng/giảm tải

`stages` mô tả đường cong tải: tăng dần (ramp-up), giữ ổn định (steady), giảm dần (ramp-down).

```js
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // tăng lên 20 VUs
    { duration: '1m',  target: 20 }, // giữ 20 VUs
    { duration: '10s', target: 0 },  // giảm về 0
  ],
};
```

### Checks và thresholds, đừng nhầm hai thứ này

- **check**: một khẳng định trên từng response (`status === 200`). Check fail **không** làm test fail; nó chỉ ghi lại tỉ lệ pass.
- **threshold**: điều kiện trên **metric tổng hợp** (`p(95)<300`). Threshold vi phạm thì k6 thoát với exit code khác 0, tức là CI đỏ.

Vì vậy một kịch bản đúng luôn có cả hai: check để biết *cái gì* sai, threshold để *quyết định* pass/fail. Muốn check cũng chặn được build, hãy đặt threshold lên metric `checks`: `checks: ['rate>0.99']`.

### Metrics quan trọng

| Metric | Ý nghĩa |
|---|---|
| `http_req_duration` | Tổng thời gian request, đây là metric để đặt p95 |
| `http_req_failed` | Tỉ lệ request lỗi (status >= 400 hoặc lỗi mạng) |
| `http_reqs` | Tổng số request, kèm tốc độ/giây |
| `iteration_duration` | Thời gian cho cả một iteration |
| `vus` | Số VU đang hoạt động |

Hãy nhìn **percentile** (p90, p95, p99) chứ đừng chỉ nhìn trung bình. Trung bình 80ms có thể che giấu việc 5% người dùng chờ tới 2 giây.

### Bốn loại bài test hiệu năng

| Loại | Mục đích | Hình dạng | Khi nào chạy |
|---|---|---|---|
| **Smoke** | Kịch bản có chạy nổi không, hệ thống có sống không | 1-2 VUs, 30 giây | Mọi commit/PR |
| **Load** | Hệ thống chịu được tải *dự kiến* không | Ramp lên tải bình thường, giữ vài phút | Mỗi đêm, hoặc trước release |
| **Stress** | Điểm gãy ở đâu, hồi phục thế nào | Tăng liên tục vượt ngưỡng dự kiến | Định kỳ, khi đổi kiến trúc |
| **Soak** | Rò rỉ bộ nhớ, tài nguyên cạn dần | Tải vừa phải nhưng kéo dài hàng giờ | Trước các bản lớn |

Trong repo này CI chạy **smoke** trên mỗi push (nhanh, ổn định) và để **load** chạy thủ công hoặc theo lịch. Stress/soak chỉ là biến thể của `options`, bạn sẽ tự viết ở phần bài tập.

## Ví dụ chạy được

SUT của repo ([`server/app.mjs`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/server/app.mjs)) lắng nghe ở cổng 4173 với `/api/health`, `/api/auth/login` và `/api/todos`. Hai file k6 nhắm vào API này.

### 1. Smoke: [`k6/smoke.js`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/k6/smoke.js)

Smoke test chạy 2 VUs trong 30 giây, mỗi iteration đi hết một hành trình API: health, đăng nhập, tạo todo, liệt kê, đánh dấu xong, xoá. Dưới đây là phần cốt lõi (rút gọn):

```js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 2, duration: '30s' },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],  // p95 dưới 300ms
    http_req_failed: ['rate<0.01'],    // lỗi dưới 1 phần trăm
    checks: ['rate>0.99'],
    'http_req_duration{group:::todos}': ['p(95)<300'], // threshold riêng cho một group
  },
  tags: { suite: 'smoke' },
};

export default function () {
  let token;

  group('health', () => {
    const res = http.get(`${BASE_URL}/api/health`, { tags: { endpoint: 'health' } });
    check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: status ok': (r) => r.json('status') === 'ok',
    });
  });

  group('auth', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: 'qa@demo.dev', password: 'Passw0rd!' }),
      { headers: JSON_HEADERS, tags: { endpoint: 'login' } },
    );
    check(res, { 'login: status 200': (r) => r.status === 200 });
    token = res.json('token');
  });

  group('todos', () => {
    const headers = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
    const created = http.post(
      `${BASE_URL}/api/todos`,
      JSON.stringify({ title: `k6 smoke ${__VU}-${__ITER}` }),
      { headers, tags: { endpoint: 'todos_create' } },
    );
    check(created, { 'create: status 201': (r) => r.status === 201 });
    const id = created.json('id');
    // ... list, PATCH done:true, DELETE (xem file thật)
    http.del(`${BASE_URL}/api/todos/${id}`, null, { headers, tags: { endpoint: 'todos_delete' } });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'reports/k6-smoke-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
```

Chú ý `__ENV.BASE_URL`: cùng một script chạy được trên máy local, trong Docker (`http://sut:4173`) và trong CI. Đừng bao giờ hard-code host.

### 2. Load với stages, group và tags: [`k6/load.js`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/k6/load.js)

```js
export const options = {
  stages: [
    { duration: '20s', target: 10 }, // warm up
    { duration: '30s', target: 20 }, // tăng lên đỉnh
    { duration: '50s', target: 20 }, // giữ đỉnh
    { duration: '20s', target: 0 },  // giảm về 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{group:::todos}': ['p(95)<300'],
  },
  tags: { suite: 'load' },
};

export default function () {
  // group 'health' -> group 'auth' (login) -> group 'todos':
  //   tạo 3 todo, GET danh sách, PATCH todo đầu tiên, DELETE cả 3
  // ...
  sleep(Math.random() * 1.5 + 0.5); // think time ngẫu nhiên 0.5-2 giây
}
```

Vài điểm đáng học (đối chiếu với code thật):

- Mỗi iteration **tự dọn** những gì nó tạo ra (tạo 3, xoá 3), nên dữ liệu trên SUT không phình ra theo thời gian chạy.
- `tags: { endpoint: 'todos_create' }` gom các URL động (`/api/todos/<uuid>`) về một nhóm metric. Nếu không đặt tag, mỗi UUID thành một dòng metric riêng, bảng kết quả sẽ bùng nổ (cardinality). Tag cấp `options` (`suite: 'load'`) gắn nhãn cho cả lần chạy.
- `'http_req_duration{group:::todos}'` là threshold trên **một group**: cú pháp `group:::tên` (ba dấu hai chấm) là quy ước của k6 cho tag `group`.
- `group` còn sinh metric `group_duration`, giúp bạn so sánh các bước của hành trình.
- `sleep` ngẫu nhiên mô phỏng think time của người dùng thay vì bắn request liên tục.
- `handleSummary` thay thế bảng tóm tắt mặc định, và k6 sẽ **không** in bảng mặc định nữa nên phải tự trả về `stdout`. Cùng lúc ta ghi `reports/k6-load-summary.json`, file mà CI có thể upload làm artifact.
- Mỗi iteration đều đăng nhập lại, nên endpoint login nằm trong tải đo. Đó là lựa chọn có chủ đích để mô phỏng người dùng thật; nếu chỉ muốn đo CRUD, hãy đăng nhập một lần trong `setup()` rồi truyền token qua tham số `data`.

### 3. Chạy local

```bash
# Terminal 1: dựng SUT (cần dist/ nên build trước)
npm run build && npm run serve

# Terminal 2
npm run k6:smoke
BASE_URL=http://localhost:4173 npm run k6:load
```

### 4. Stress và soak: chỉ là đổi `options`

```js
// stress: leo thang cho tới khi vỡ
export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

// soak: vừa phải nhưng rất lâu
export const options = {
  stages: [
    { duration: '2m', target: 15 },
    { duration: '2h', target: 15 },
    { duration: '2m', target: 0 },
  ],
};
```

### 5. Chạy trong CI

Trong [`.github/workflows/ci.yml`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.github/workflows/ci.yml), job `k6` chạy song song với job Playwright (cả hai chỉ cần `typecheck` xanh):

```yaml
k6:
  name: k6 smoke
  needs: typecheck
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: npm }
    - run: npm ci
    - run: npm run build
    - name: Start the SUT and wait for /api/health
      run: |
        mkdir -p reports
        node server/app.mjs > reports/sut.log 2>&1 &
        for i in $(seq 1 30); do
          curl -sf http://localhost:4173/api/health > /dev/null && exit 0
          sleep 1
        done
        cat reports/sut.log >&2; exit 1
    - uses: grafana/setup-k6-action@v1
    - name: k6 smoke test
      run: k6 run k6/smoke.js
      env:
        BASE_URL: http://localhost:4173
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: k6-reports
        path: reports/k6-*
```

`grafana/setup-k6-action` cài sẵn binary k6 nên bạn không phải tự tải. Vòng lặp `curl` chờ `/api/health` đảm bảo server đã sẵn sàng trước khi k6 bắn request. Khi threshold bị vi phạm, k6 thoát với exit code 99, bước này đỏ và job `deploy` (cần `k6`) không chạy. Đây chính là điều ta muốn: hiệu năng trở thành điều kiện để publish, không phải một báo cáo không ai đọc. Bước upload với `if: always()` giữ lại `reports/k6-smoke-summary.json` kể cả khi fail.

### 6. Đọc kết quả

Cuối lần chạy bạn sẽ thấy khối như sau (số liệu minh hoạ, rút gọn):

```text
     ✓ health: status 200
     ✓ health: status ok

   ✓ checks.........................: 100.00% ✓ 480  ✗ 0
     http_req_duration..............: avg=2.1ms  min=1.2ms  med=1.9ms  max=9.8ms  p(90)=3.4ms p(95)=4.6ms
       { expected_response:true }...: avg=2.1ms ...
   ✓ http_req_failed................: 0.00%   ✓ 0    ✗ 360
     iterations.....................: 60      1.9/s

running (31.0s), 2/2 VUs, 60 complete and 0 interrupted iterations
```

Cách đọc nhanh:

1. Dấu `✓`/`✗` cạnh một metric cho biết threshold của nó pass hay fail. Hãy tìm `✗` trước tiên.
2. Nhìn `p(95)` và `max`, không chỉ `avg`.
3. `iterations` và `vus` cho biết bạn có thực sự tạo ra tải mong muốn không. Nếu `iterations` quá thấp, có thể `sleep` quá dài hoặc server là nút thắt cổ chai.
4. `interrupted iterations` lớn nghĩa là iteration chưa kịp xong khi hết giờ, và thường là dấu hiệu server quá chậm.

## Lỗi thường gặp

1. **Chỉ có check, không có threshold.** Test luôn xanh dù mọi request lỗi. Hãy đặt `http_req_failed` và `checks` vào `thresholds`.
2. **Hard-code URL.** Script chỉ chạy được trên một máy. Luôn dùng `__ENV.BASE_URL`.
3. **Không đặt `name` tag cho URL động.** Metric bị nhân lên theo từng ID, k6 chậm và báo cáo vô nghĩa.
4. **Quên `sleep` (think time).** Mỗi VU bắn request liên tục, bạn đo khả năng chịu DoS chứ không phải hành vi người dùng.
5. **Không phân biệt login nằm trong tải hay ngoài tải.** Đăng nhập mỗi iteration làm login chiếm một phần tải đo; nếu chỉ muốn đo CRUD, đăng nhập một lần ở `setup()`.
6. **Gọi `/api/test/reset` trong k6.** Endpoint này xoá *toàn bộ* todo và token của mọi người dùng, kể cả các VU khác. Hãy để dữ liệu tự dọn bằng bước delete trong chính iteration.
7. **Đo trên máy yếu hoặc runner CI chung rồi đặt ngưỡng quá sát.** Threshold p95 < 300ms cho API đơn giản là rộng rãi; đừng đặt 20ms rồi chịu cảnh flaky.
8. **Chạy k6 và SUT trên cùng một máy rồi kết luận về production.** Số liệu CI chỉ để phát hiện *hồi quy tương đối*, không phải con số tuyệt đối.
9. **Dùng thư viện Node trong script.** k6 không chạy trên Node; `import` chỉ nhận module k6 hoặc URL/ES module thuần.

## Bài tập thực hành

1. Chạy `npm run k6:smoke` cục bộ rồi cố ý làm nó fail: hạ threshold xuống `p(95)<0.1` và quan sát exit code (`echo $?`).
2. Thêm một group vào `k6/load.js` kiểm tra đăng nhập sai mật khẩu, kèm check `status === 401`. Đảm bảo `http_req_failed` không bị tính sai (gợi ý: `http.setResponseCallback(http.expectedStatuses(200, 201, 204, 401))` hoặc tham số `responseCallback` ở từng request).
3. Chạy `npm run k6:stress` (đã có sẵn [`k6/stress.js`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/k6/stress.js)) và tìm số VU mà p95 bắt đầu vượt 300ms trên máy bạn; đọc thêm live mode và so sánh trước / sau ở bài 09.
4. Mở rộng `handleSummary` để xuất thêm `reports/k6-smoke-summary.md` (bảng markdown ngắn gồm p95, error rate) rồi ghi nội dung đó vào `$GITHUB_STEP_SUMMARY` trong CI.
5. Thêm job `k6-load` chạy theo `schedule` (cron hằng đêm) và `workflow_dispatch`, không chạy trên mỗi push.

## Checklist tóm tắt

- [ ] Biết VU là gì, iteration là gì, và RPS là hệ quả.
- [ ] Mọi script có `thresholds`: `http_req_failed` < 1%, p95 < 300ms, `checks` > 99%.
- [ ] URL lấy từ `__ENV.BASE_URL`.
- [ ] URL động có `tags: { name }`.
- [ ] Quyết định có chủ đích: login trong tải hay ở `setup()`; dữ liệu tạo ra được dọn ngay trong iteration.
- [ ] Smoke chạy mỗi push; load/stress/soak chạy theo lịch hoặc thủ công.
- [ ] Hiểu exit code khác 0 khi threshold fail và cách CI dựa vào đó.
- [ ] Đọc kết quả theo thứ tự: `✗` trước, rồi p95/max, rồi iterations/VUs.
