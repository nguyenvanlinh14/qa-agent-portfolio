---
title: Visual Testing với toHaveScreenshot — baseline theo OS, Docker image chính thức và workflow update-snapshots
short: Visual Testing
icon: eye
---

# Visual Testing với `toHaveScreenshot`

## Mục tiêu bài học

Sau bài này bạn sẽ:

- Viết visual test bằng `expect(...).toHaveScreenshot()` và hiểu cơ chế **baseline** hoạt động ra sao.
- Loại bỏ nguồn gây nhiễu: vùng động (`mask`), hoạt ảnh (`animations: 'disabled'`), `reducedMotion`, font chưa tải.
- Giải thích được vì sao baseline phụ thuộc **hệ điều hành** và vì sao repo này chạy test trong **Docker image chính thức của Playwright**.
- Vận hành quy trình cập nhật baseline qua workflow `update-snapshots` một cách an toàn.
- Chọn **threshold** hợp lý và biết **khi nào không nên** dùng visual test.

## 1. Khái niệm

### Visual regression test là gì?

Test chức năng hỏi "nút có tồn tại và bấm được không". Visual test hỏi "trang **trông** có giống lần trước đã được duyệt không". Lần chạy đầu tiên, Playwright lưu ảnh chụp làm **baseline** (còn gọi là snapshot hoặc golden image). Các lần sau nó chụp lại, so từng pixel với baseline, và nếu khác quá ngưỡng thì test fail, kèm ba ảnh: *expected*, *actual*, *diff*.

Visual test bắt được loại lỗi mà assertion DOM bỏ qua: CSS sai làm nút bị che, font bị đổi, màu mất tương phản, layout vỡ ở dark mode. Đổi lại, nó **nhạy** và **dễ gây nhiễu**, nên cần kỷ luật.

### Ví dụ chạy được

File thật: [tests/visual/visual.spec.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/visual/visual.spec.ts).

```ts
import { test, expect } from '../fixtures';

test.describe('Visual regression', () => {
  test('@regression home hero matches the baseline', async ({ page, homePage }) => {
    await homePage.goto();
    await page.evaluate(() => document.fonts.ready);
    await expect(homePage.heroTitle).toBeVisible();
    await expect(page.locator('.hero')).toHaveScreenshot('home-hero.png', {
      mask: [homePage.stats], // numbers change with every build
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('@regression demo login page matches the baseline', async ({ page, loginPage }) => {
    await loginPage.goto();
    await page.evaluate(() => document.fonts.ready);
    await expect(loginPage.heading).toBeVisible();
    await expect(page).toHaveScreenshot('demo-login.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});
```

Đi qua từng quyết định, vì mỗi dòng ở đây tồn tại để chống một nguồn flaky cụ thể.

**`await page.evaluate(() => document.fonts.ready)`**: chờ web font tải xong. Ảnh chụp lúc font fallback còn hiển thị sẽ khác ảnh chụp sau khi font tải, một nguồn flaky kinh điển.

**`await expect(...).toBeVisible()` trước khi chụp**: bảo đảm trang đã render phần quan trọng; `toHaveScreenshot` tự chờ ảnh ổn định giữa hai lần chụp liên tiếp, nhưng không biết "trang đã sẵn sàng" nghĩa là gì với app của bạn.

**Chụp một phần tử (`page.locator('.hero')`) thay vì cả trang**: phạm vi nhỏ hơn thì ít nhiễu hơn và diff dễ đọc hơn. Chụp toàn trang chỉ nên dành cho vài trang "đại diện".

**`mask: [homePage.stats]`**: Playwright phủ một khối màu đặc lên vùng được chỉ định trước khi so sánh. Dùng cho mọi thứ thay đổi theo mỗi build hoặc mỗi lần chạy: số liệu thống kê, thời gian, avatar ngẫu nhiên, quảng cáo, `build-info`, con số báo cáo.

**`animations: 'disabled'`**: Playwright dừng CSS animation/transition (hoạt ảnh hữu hạn nhảy về trạng thái cuối, vô hạn về trạng thái đầu) và đóng băng caret nhấp nháy. Repo đặt mặc định này ở cấp config:

```ts
// playwright.config.ts
expect: {
  timeout: 7_000,
  toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
},
snapshotPathTemplate: '{testDir}/visual/__screenshots__/{arg}{ext}',
```

**`reducedMotion: 'reduce'`** (project `visual`): bật `prefers-reduced-motion: reduce` trong trình duyệt. Những trang tôn trọng media query này sẽ tự tắt hoạt ảnh ngay từ CSS, bổ trợ cho `animations: 'disabled'` (vốn chỉ xử lý CSS animation, không xử lý animation viết bằng JS). Cấu hình project:

```ts
{
  name: 'visual',
  testMatch: 'visual/**/*.spec.ts',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
    contextOptions: { reducedMotion: 'reduce' },
  },
},
```

Ba điều khác được **cố định** ở đây: viewport (kích thước khác → layout khác), `colorScheme` (không phụ thuộc cài đặt máy), và chỉ một trình duyệt (Chromium). Nguyên tắc chung: visual test càng *xác định* (deterministic) càng ít flaky. Xem toàn bộ cấu hình ở [playwright.config.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/playwright.config.ts).

## 2. Baseline và đường dẫn snapshot

Với `snapshotPathTemplate` ở trên, ảnh baseline nằm tại `tests/visual/__screenshots__/home-hero.png` và `demo-login.png`. Chúng được commit vào git như mã nguồn: **thay đổi baseline là thay đổi hành vi hiển thị, và phải đi qua code review** như mọi diff khác (nhìn ảnh trước/sau ngay trong PR).

Template đã **bỏ** các token mặc định như `{projectName}` và `{platform}`. Mặc định, Playwright thêm hậu tố nền tảng (`-linux`, `-darwin`, `-win32`) vào tên file. Repo cố ý gom về một tên duy nhất vì chỉ **một** môi trường (Linux trong Docker) được phép sinh baseline; xem phần tiếp theo.

## 3. Vì sao baseline phụ thuộc OS, và vì sao dùng Docker

Cùng một trang, cùng một Chromium, nhưng chụp trên macOS, Windows và Linux cho ra ảnh **khác pixel**:

- Font hệ thống và cấu hình hinting khác nhau.
- Anti-aliasing (làm mịn chữ) khác nhau, nhất là LCD/subpixel.
- Phiên bản thư viện đồ họa (FreeType, Skia, driver) khác nhau.

Hậu quả: baseline sinh trên laptop macOS sẽ fail trên CI Linux với hàng ngàn pixel lệch nhẹ, dù không có lỗi nào cả. Nhiều team vì thế tắt visual test; cách làm đúng là **cố định môi trường**.

Quy ước của repo (CI contract):

1. Mọi lần chạy có ảnh chụp, ở CI và ở workflow cập nhật baseline, đều chạy bên trong image **`mcr.microsoft.com/playwright:v1.64.1-noble`**, trùng phiên bản với `@playwright/test` trong `package.json`. Image đã có sẵn trình duyệt và font cố định.
2. **Không ai sinh baseline trên máy cá nhân** và commit lên (quy tắc 11 trong [CLAUDE.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/CLAUDE.md)). `npm run test:update-snapshots` chỉ để thử nghiệm cục bộ.
3. Muốn chạy visual test giống CI ngay trên máy mình, dùng cùng image (xem thêm bài 6 về Docker):

```bash
docker run --rm -it --ipc=host -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -lc "npm ci && npm run build && npx playwright test --project=visual"
```

Khi nâng cấp Playwright, nhớ nâng cả tag image, và sinh lại baseline, vì bản Chromium mới có thể render khác đi chút ít.

## 4. Workflow update-snapshots

Khi UI thay đổi có chủ đích (đổi màu nút, thêm một khối), baseline cũ fail một cách *đúng đắn*. Quy trình cập nhật:

1. Mở PR với thay đổi UI. CI (`ci.yml`) fail ở project `visual`; trong artifact `playwright-report` bạn thấy ảnh *expected / actual / diff*.
2. **Con người xem diff và quyết định**: thay đổi này có chủ đích không? Nếu không, đó là bug, hãy sửa code, đừng sửa baseline.
3. Nếu có chủ đích, chạy tay workflow [update-snapshots.yml](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.github/workflows/update-snapshots.yml) bằng `workflow_dispatch` trên nhánh của PR. Workflow chạy trong đúng Docker image ở trên, thực thi `npm run test:update-snapshots`, rồi commit các ảnh mới vào nhánh.
4. Review ảnh baseline mới trong PR (GitHub hiển thị ảnh PNG trực tiếp), rồi merge.

Rút gọn ý tưởng của workflow:

```yaml
name: Update snapshots
on: workflow_dispatch
jobs:
  update:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.64.1-noble
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npx playwright test --project=visual --update-snapshots
      # ... commit & push các file trong tests/visual/__screenshots__/
```

Với AI agent (bài 1): agent **không được** cập nhật baseline để làm CI xanh. Đây là một trong những cách dễ nhất để một agent "lách" test, và `test-healer` bị cấm rõ ràng điều này. Cập nhật baseline là quyết định của con người.

## 5. Threshold: bao nhiêu thì đủ?

`toHaveScreenshot` có ba nút chỉnh độ nhạy:

| Tùy chọn | Ý nghĩa | Gợi ý |
|---|---|---|
| `maxDiffPixelRatio` | Tỉ lệ pixel được phép lệch (0–1) | `0.01` (1%) cho trang UI thường, như repo |
| `maxDiffPixels` | Số pixel tuyệt đối được phép lệch | Dùng cho phần tử nhỏ, nơi tỉ lệ phần trăm không có nghĩa |
| `threshold` | Độ khác màu (0–1) để một pixel bị tính là lệch | Mặc định `0.2`; hạ xuống nếu cần bắt thay đổi màu tinh tế |

Nguyên tắc:

- Bắt đầu **chặt** (ngưỡng thấp), nới dần chỉ khi bạn chứng minh được nhiễu là vô hại. Ngưỡng cao hơn nhu cầu sẽ nuốt mất lỗi thật, ví dụ một icon biến mất có thể chỉ chiếm 0,3% pixel.
- Ngưỡng **không** thay thế cho việc cố định môi trường. Dùng ngưỡng để che sự khác biệt giữa OS là cách làm sai (mục 3).
- Ưu tiên chụp **phần tử nhỏ** thay vì toàn trang với ngưỡng lớn: ngưỡng 1% trên ảnh toàn trang là hàng ngàn pixel, đủ để giấu cả một nút bị hỏng.
- Ngưỡng đặt ở config là mặc định; chỉ ghi đè tại test khi có lý do, kèm comment.

## 6. Khi nào KHÔNG nên dùng visual test

- **Nội dung động**: feed, dashboard thời gian thực, dữ liệu theo người dùng. Mask quá nhiều thì không còn gì để so sánh; dùng assertion DOM.
- **Trang đang thay đổi liên tục** (giai đoạn prototype): baseline sẽ phải cập nhật hằng ngày và mọi người sẽ ngừng đọc diff.
- **Khi assertion DOM đã đủ**: "nút Add tồn tại và bật" không cần ảnh chụp. Visual test là lớp bổ sung, không phải lớp thay thế.
- **Kiểm tra layout đa trình duyệt/đa OS**: ảnh chụp không đáp ứng việc này; dùng project riêng và baseline riêng, hoặc công cụ chuyên dụng (cloud visual testing).
- **Không có môi trường cố định** (không dùng Docker, runner khác nhau mỗi lần): bạn sẽ chỉ nhận được nhiễu.
- **Không ai review diff.** Một bộ visual test mà người ta bấm "update" vô tội vạ còn tệ hơn không có.

Quy tắc ngón tay cái: giữ vài visual test cho các trang "bộ mặt" (trang chủ, đăng nhập, một vài thành phần cốt lõi), phần còn lại dùng assertion thông thường. Đó cũng là cách repo này làm: chỉ hai ảnh baseline.

Một lối tắt khác cho phần tử nhỏ mà vẫn có ý nghĩa là **ARIA snapshot** (`toMatchAriaSnapshot`): so cấu trúc ngữ nghĩa dạng văn bản, không phụ thuộc OS hay font, rất phù hợp để khẳng định "trang có đúng các mục này".

## Lỗi thường gặp / anti-patterns

1. **Sinh baseline trên máy cá nhân rồi commit.** Sẽ fail trên CI Linux. Chỉ dùng workflow `update-snapshots`.
2. **Chạy `--update-snapshots` để làm CI xanh** mà không xem diff.
3. **Không `mask` vùng động.** Mỗi build một con số khác là mỗi build một lần fail.
4. **Chụp trước khi font/ảnh tải xong.** Thêm `document.fonts.ready` và chờ phần tử chính hiển thị.
5. **Nới ngưỡng để che flaky** thay vì tìm nguyên nhân (hoạt ảnh, font, dữ liệu động).
6. **Chụp toàn trang cho mọi test.** Diff khổng lồ, khó đọc, dễ fail do thay đổi không liên quan.
7. **Quên cố định viewport, `colorScheme`, locale, múi giờ.** Ảnh khác nhau giữa các lần chạy.
8. **Lệch phiên bản giữa `@playwright/test` và Docker image.** Render khác đi, baseline fail hàng loạt.
9. **Để agent AI cập nhật baseline.** Đây là quyết định của con người.
10. **Dùng visual test thay cho assertion chức năng.** Ảnh giống nhau không có nghĩa nút hoạt động.

## Bài tập thực hành

1. Chạy `npx playwright test --project=visual` trong Docker bằng lệnh ở mục 3. Xem file trong `tests/visual/__screenshots__/`.
2. Trong bản sao thử nghiệm, đổi màu nút `Sign in` trong `site/demo/demo.css`, chạy lại test và mở HTML report (`npm run report`) để đọc ba ảnh *expected / actual / diff*.
3. Bỏ `mask: [homePage.stats]` khỏi test hero, build lại site và chạy hai lần liên tiếp. Quan sát hiện tượng nhiễu, rồi khôi phục `mask`.
4. Thử chạy visual test ngay trên máy (không Docker) và ghi lại số pixel lệch so với baseline của CI. Điều này minh họa vì sao quy tắc "không sinh baseline cục bộ" tồn tại.
5. Thêm một visual test cho trang todo có vài mục, với `mask` cho thời điểm/giá trị động. Cân nhắc trang này có đáng làm visual test hay nên dùng assertion DOM.
6. Chạy workflow `update-snapshots` trên một nhánh thử, xem commit tự động và đọc diff ảnh trong PR.
7. Thử `toMatchAriaSnapshot` trên form đăng nhập và so sánh độ ổn định với `toHaveScreenshot`.

## Checklist tóm tắt

- [ ] Visual test chạy trong `mcr.microsoft.com/playwright:v1.64.1-noble`, tag khớp phiên bản `@playwright/test`.
- [ ] Baseline chỉ được sinh bởi workflow `update-snapshots`; không commit ảnh sinh cục bộ.
- [ ] Viewport, `colorScheme`, `reducedMotion` được cố định trong project `visual`.
- [ ] `animations: 'disabled'`, chờ `document.fonts.ready`, và chờ phần tử chính hiển thị trước khi chụp.
- [ ] Mọi vùng động đều được `mask`.
- [ ] Chụp phần tử thay vì toàn trang khi có thể; ngưỡng thấp (`maxDiffPixelRatio` ~ 0.01) và có lý do khi nới.
- [ ] Mọi thay đổi baseline được review như code; agent AI không được cập nhật baseline.
- [ ] Chỉ dùng visual test cho vài trang "bộ mặt"; phần còn lại dùng assertion DOM/ARIA.
