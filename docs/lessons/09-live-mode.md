---
title: Live mode - theo dõi test và tải ngay khi đang chạy
short: Live Mode
icon: ci
---

# Live mode: theo dõi Playwright và k6 ngay khi đang chạy

Báo cáo HTML chỉ có khi lượt chạy đã kết thúc. Một bộ regression 20 phút hay một bài stress 15 phút mà phải chờ tới cuối mới biết "đỏ ở đâu" thì rất phí thời gian: lỗi môi trường (server sập, phiên đăng nhập hết hạn) nên được thấy ngay ở phút thứ nhất để dừng lại, không phải ở phút thứ hai mươi. Bài này dựng **live mode** cho cả hai phía: dashboard realtime cho Playwright và web dashboard của k6.

## Mục tiêu bài học

- Viết một **custom reporter** của Playwright, đẩy sự kiện ra ngoài bằng Server-Sent Events (SSE).
- Ghi lại **timeline** của mỗi lượt chạy (JSONL) để phát lại (replay) sau đó, ví dụ trên GitHub Pages.
- Bật **k6 web dashboard** khi chạy và xuất cùng giao diện đó thành một file HTML cho CI.
- Biết nên nhìn gì trên dashboard để quyết định dừng hay chạy tiếp.

## 1. Playwright: reporter là nơi mọi sự kiện đi qua

Playwright gọi reporter ở từng mốc: `onBegin` (biết tổng số test, số worker), `onTestBegin`, `onStepBegin` (các `test.step` bạn tự viết), `onTestEnd` (status, outcome, duration, retry, lỗi) và `onEnd`. Reporter của repo là [`reporters/live-reporter.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/reporters/live-reporter.ts):

```ts
onTestEnd(test: TestCase, result: TestResult): void {
  this.emit({
    type: 'testEnd',
    t: this.now(),                       // ms tính từ lúc bắt đầu chạy
    id: `${test.id}#${result.retry}`,    // mỗi lần retry là một lần chạy riêng
    status: result.status,               // passed | failed | timedOut | skipped | interrupted
    outcome: test.outcome(),             // expected | unexpected | flaky | skipped
    duration: result.duration,
    retry: result.retry,
    error: result.error?.message?.split('\n')[0],
  });
}
```

`emit` làm hai việc: ghi thêm một dòng vào `reports/live-events.jsonl` và, khi `LIVE=1`, gửi dòng đó cho mọi trình duyệt đang nghe `/events`:

```ts
for (const c of this.clients) c.write(`data: ${line}\n\n`);   // định dạng SSE: "data: ...\n\n"
```

SSE đơn giản hơn WebSocket: một chiều server → trình duyệt, chạy trên HTTP thường, trình duyệt tự kết nối lại. Phía dashboard chỉ cần:

```js
const es = new EventSource('/events');
es.onmessage = (m) => { apply(JSON.parse(m.data)); render(); };
```

Chạy thử:

```bash
npm run test:live          # LIVE=1 playwright test, mở http://127.0.0.1:5667/?live=1
```

Hai chi tiết đáng học:

- **Mở dashboard giữa chừng vẫn đúng.** Khi một client mới kết nối, reporter gửi lại toàn bộ sự kiện đã có trước khi gửi sự kiện mới. Dashboard là một hàm thuần `apply(event)` trên state, nên phát lại từ đầu luôn cho ra cùng kết quả.
- **Đếm theo outcome cuối cùng, không theo từng lần chạy.** Một test fail rồi pass ở retry là `flaky`, không phải "1 fail + 1 pass". Dashboard giữ map `test id (bỏ #retry) → outcome mới nhất`.

Lưu ý: `--reporter=dot` trên dòng lệnh **thay thế** toàn bộ reporter trong config. Muốn giữ live mode thì khai báo cả hai: `--reporter=dot,./reporters/live-reporter.ts`.

### Khung trình duyệt: test đang nhìn thấy gì

Con số pass / fail chưa đủ để người xem "tin" rằng test chạy trên trình duyệt thật. Fixture `page` ([`tests/fixtures/index.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/fixtures/index.ts)) chụp một ảnh JPEG nhỏ của trang sau mỗi test UI, kèm **URL chính xác** lúc đó, và ghi thẳng ra `reports/live-frames/raw/<testId>-<retry>`. Reporter nhặt ảnh đó ở `onTestEnd`, đánh số theo thứ tự chạy, rồi gửi kèm sự kiện. Dashboard hiển thị ảnh trong một khung trình duyệt có thanh địa chỉ, và bấm vào thanh địa chỉ là mở đúng trang demo đó.

Tại sao không dùng `testInfo.attach`? Vì attachment sẽ được nhúng vào `results.json` và HTML report (khoảng 250 ảnh mỗi lần chạy), còn gỡ attachment ra trong reporter thì làm HTML reporter lỗi. Trao đổi qua file riêng thì giữ report gọn. Khi phát lại trên site, URL `http://localhost:4173/...` của CI được đổi sang địa chỉ công khai của site, để người xem thấy và mở được trang thật.

## 2. Replay: live mode cho người không chạy test

File JSONL chính là "băng ghi hình" của lượt chạy. CI tải nó lên cùng các report khác; bước deploy chép nó thành `dist/live/latest-run.jsonl`, và trang [`/live/`](https://nguyenvanlinh14.github.io/qa-agent-portfolio/live/) phát lại với tốc độ 1×, 4×, 16× hoặc nhảy thẳng tới cuối. Người review PR, PO hay nhà tuyển dụng xem được lượt chạy "như đang diễn ra" mà không cần cài gì.

Có sẵn hai bản ghi để thử: `sample-run.jsonl` (một lượt chạy thật, xanh hết) và `examples/failing-run.jsonl` (đủ 4 loại: pass, fail, flaky, skipped). Bản thứ hai được [`tests/ui/live.spec.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/ui/live.spec.ts) dùng làm dữ liệu vàng (golden data).

## 3. k6: web dashboard có sẵn

Từ k6 v0.49, dashboard đã nằm sẵn trong k6, chỉ cần bật bằng biến môi trường:

```bash
npm run k6:live
# = K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_OPEN=true \
#   K6_WEB_DASHBOARD_EXPORT=reports/k6-load-dashboard.html k6 run k6/load.js
```

- `K6_WEB_DASHBOARD=true`: mở dashboard ở http://127.0.0.1:5665 trong lúc chạy (request rate, p95, VUs, lỗi theo thời gian).
- `K6_WEB_DASHBOARD_EXPORT`: khi kết thúc, xuất **cùng giao diện** thành một file HTML độc lập. CI dùng cách này cho bài smoke, và site đăng nó ở [`/perf/`](https://nguyenvanlinh14.github.io/qa-agent-portfolio/perf/).

Trên dashboard k6, đọc theo thứ tự: **lỗi** (đường `http_req_failed` có nhô lên không) → **p95 theo thời gian** (tăng theo bậc VU hay tăng dần dù VU đứng yên, dấu hiệu rò rỉ) → **request rate** (VU tăng mà RPS không tăng nghĩa là hệ thống đã bão hoà).

## 4. Stress, spike và so sánh trước / sau

- [`k6/stress.js`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/k6/stress.js): tăng theo bậc 5 → 10 → 20 → 40 → 80 VU, có `abortOnFail` khi lỗi vượt 5% để không "đánh" tiếp một hệ thống đã gãy.
- [`k6/spike.js`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/k6/spike.js): nền thấp → tăng vọt → về lại nền. Mỗi request được gắn tag `phase` (baseline / surge / recovery), và threshold nằm ở **recovery**: hệ thống không chỉ cần sống sót qua đợt tăng vọt mà còn phải hồi phục.
- Mỗi request có tag `endpoint`, và [`k6/lib/journey.js`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/k6/lib/journey.js) tạo một threshold cho từng endpoint, nên summary có p95 riêng của từng endpoint.
- [`scripts/k6-compare.mjs`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/scripts/k6-compare.mjs) so hai summary theo từng endpoint. Một endpoint chỉ bị đánh dấu **WORSE** khi vừa chậm hơn quá ×1.2 **vừa** chậm thêm ít nhất 5 ms, để nhiễu dưới mili giây không làm đỏ cổng chất lượng.

```bash
STEPS=2,5 STEP=5s k6 run k6/stress.js && cp reports/k6-stress-summary.json reports/before/
# ... sửa code ...
k6 run k6/stress.js
npm run k6:compare -- reports/before/k6-stress-summary.json reports/k6-stress-summary.json
```

Workflow [`perf.yml`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.github/workflows/perf.yml) chạy stress / spike / load theo yêu cầu (workflow_dispatch) và lưu dashboard cùng summary làm artifact.

## Lỗi thường gặp

1. **Dashboard chỉ hiện số tổng.** Không biết worker nào đang kẹt ở test nào thì không phân biệt được "chậm" với "treo". Hãy hiện test đang chạy và thời gian đã chạy của từng worker.
2. **Đếm retry như test riêng.** Tổng sẽ vượt quá số test và tỉ lệ pass sai. Hãy đếm theo outcome cuối cùng.
3. **Bỏ qua timeline.** Không lưu sự kiện thì sau khi chạy xong không ai xem lại được "lúc nào bắt đầu đỏ".
4. **So sánh perf bằng mắt.** Hai lần chạy luôn lệch vài phần trăm. Cần ngưỡng tương đối **và** ngưỡng tuyệt đối, so theo từng endpoint.

## Bài tập thực hành

1. Chạy `npm run test:live`, mở dashboard ở phút thứ hai và kiểm tra nó hiện đúng những gì đã xảy ra trước đó.
2. Thêm vào reporter sự kiện `stdout` (`onStdOut`) và hiện log của test đang chạy trên dashboard.
3. Chạy `k6 run k6/spike.js` với `PEAK=200` và đọc p95 của pha recovery so với baseline.

## Checklist tóm tắt

- [ ] Reporter ghi JSONL ở mọi lượt chạy; SSE chỉ bật khi `LIVE=1`.
- [ ] Dashboard là hàm thuần trên chuỗi sự kiện: live và replay dùng chung code.
- [ ] Đếm theo outcome cuối (flaky ≠ fail + pass).
- [ ] k6: bật `K6_WEB_DASHBOARD` khi chạy tay, `K6_WEB_DASHBOARD_EXPORT` trong CI.
- [ ] So sánh perf theo endpoint, có ngưỡng tương đối và tuyệt đối.
