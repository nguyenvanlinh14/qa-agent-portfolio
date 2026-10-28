---
title: Bug evidence - video có giọng đọc, phụ đề karaoke và dedupe
short: Video Evidence
icon: book
---

# Bug evidence: video có giọng đọc tiếng Anh, phụ đề karaoke và dedupe

Một bug report tốt cần trả lời được ba câu: **làm gì** (các bước), **thấy gì** (actual), **mong gì** (expected). Video trả lời cả ba nhanh nhất, nhưng video quay tay thường dài, không có tiếng, người xem không biết đang ở bước nào và phải tua đi tua lại. Bài này dựng một pipeline tự động: Playwright quay lại thao tác tái hiện lỗi, máy đọc từng bước bằng tiếng Anh, phụ đề sáng lên theo từng từ như karaoke, góc trên có thẻ "STEP 3/8" và bên dưới có thanh tiến độ. Đầu ra là MP4, phụ đề WebVTT, ảnh poster và bug report theo template của team.

Xem kết quả: [`/evidence/`](https://nguyenvanlinh14.github.io/qa-agent-portfolio/evidence/).

## Mục tiêu bài học

- Tạo một bug **có chủ đích** bằng fault injection để luyện tập và demo.
- Quay video bằng Playwright, giữ mỗi bước trên màn hình đúng bằng độ dài câu thuyết minh.
- Sinh giọng đọc (TTS), dựng phụ đề karaoke ASS và trộn tất cả bằng ffmpeg.
- **Dedupe**: một video cho mỗi bug *duy nhất*, không phải cho mỗi test đỏ.

## 1. Fault injection: bug bật bằng cờ

Demo app có cờ `?defect=watchlist-remove-not-saved` ([`site/demo/store.js`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/site/demo/store.js)): bấm xoá thì dòng biến mất nhưng danh sách không được lưu, tải lại trang là mã vừa xoá quay về. Không có cờ thì app chạy bình thường. Đây là cách luyện viết test và evidence trên một lỗi **biết trước** mà không phải làm hỏng code thật. Test regression `a removal survives a reload` ([`tests/ui/watchlist.spec.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/ui/watchlist.spec.ts)) chính là test sẽ bắt được lỗi này.

## 2. Kịch bản: một câu cho mỗi bước

[`evidence/scripts/watchlist-remove-not-saved.json`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/evidence/scripts/watchlist-remove-not-saved.json) chứa tiêu đề, **signature** của bug, giọng đọc, các trường của report (Device, OS, Prerequisite, Account, Scope) và danh sách bước. Mỗi bước gồm `key`, `card` (chữ trên thẻ STEP) và `say` (câu đọc):

```json
{ "key": "actual", "card": "Actual", "kind": "actual",
  "say": "Actual result: FPT is back on the watchlist. The removal was never saved." }
```

Viết câu thuyết minh theo thứ tự: bối cảnh → các bước → actual → expected. Mỗi câu ngắn, mỗi câu một ý.

## 3. Pipeline ba bước

```bash
npm run evidence     # = evidence:narrate → evidence:record → evidence:build
```

**Narrate** ([`scripts/evidence/narrate.mjs`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/scripts/evidence/narrate.mjs)): mỗi câu thành một file WAV. Giọng chính là **Gemini TTS** (`gemini-3.8-flash-tts`, giọng `en-us-rami`), nghe tự nhiên như người dẫn podcast; khi hết quota ngày (HTTP 429) thì tự chuyển sang bản `lite`. Không có `GEMINI_API_KEY` thì dùng giọng dự phòng (`say` trên macOS, `espeak-ng` trên Linux), nên ai clone repo cũng chạy được. Độ dài clip được đọc thẳng từ header WAV, không cần ffprobe.

Hai điều cần nhớ khi dùng TTS trên cloud: chỉ gửi **đúng câu cần đọc** (thêm câu kiểu "Read calmly: …" thì model sẽ đọc luôn câu đó), và lời thoại được gửi tới nhà cung cấp, nên **không bao giờ** được chứa dữ liệu nội bộ (id, host, token, dữ liệu khách hàng). Bug bảo mật thì chỉ mô tả hành vi trong lời đọc; chi tiết để trong report.

**Record** ([`tests/evidence/`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/tree/main/tests/evidence)): project `evidence` chỉ được bật khi có `EVIDENCE=1`, nên không bao giờ chạy trong CI. `EvidenceRecorder.step(key, actions)` chạy thao tác, rồi **giữ màn hình** cho tới khi câu thuyết minh của bước đó đọc xong, và ghi lại thời điểm bắt đầu / kết thúc thật vào `timeline.json`:

```ts
await rec.step('remove', async () => {
  await rec.spotlight(watchlist.remove('FPT'));   // viền đỏ: người xem biết sắp bấm vào đâu
  await watchlist.remove('FPT').click();
  await expect(watchlist.count).toHaveText('1 stock');
});
```

Đây là nơi duy nhất repo cho phép chờ theo thời gian: nó canh nhịp video cho người xem, không dùng để đồng bộ với app. Bước `actual` có assertion `toHaveCount(1)`: nếu bug đã được sửa thì việc quay thất bại, và không có video sai nào được đăng.

**Build** ([`scripts/evidence/build-video.mjs`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/scripts/evidence/build-video.mjs)): sinh phụ đề ASS rồi gọi ffmpeg một lần.

## 4. Phụ đề karaoke với ASS

ASS (Advanced SubStation Alpha) có tag `\kf<centi giây>`: chữ đổi dần từ màu *secondary* sang màu *primary* trong khoảng thời gian đó. TTS không trả về mốc thời gian của từng từ, nên thời lượng câu được chia cho các từ theo độ dài, cộng thêm khoảng nghỉ sau dấu câu:

```js
const weight = (w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1 + (/[.!?]$/.test(w) ? 4 : /[,;:]$/.test(w) ? 2 : 0);
// "{\kf38}Actual {\kf52}result: {\kf21}FPT ..."
```

Mỗi bước có ba lớp: dòng karaoke ở dưới, thẻ `STEP n/N · ...` (đỏ cho Actual, xanh cho Expected) và nhãn `BUG EVIDENCE` ở góc. Thanh tiến độ là `drawbox` với độ rộng `iw*t/DURATION`. Âm thanh: mỗi clip được `adelay` tới đúng mốc bắt đầu của bước, rồi `amix` trộn lại.

Đặt lớp phủ ở chỗ **không che bằng chứng**. Bản đầu tiên che mất tiêu đề "Watchlist · 2 stocks", trong khi con số 2 chính là bằng chứng của bug. Phải xem lại khung hình thật trước khi đăng.

Ngoài MP4, pipeline còn ghi file WebVTT cho thẻ `<track kind="captions">` (để người dùng trình đọc màn hình và người tắt tiếng vẫn xem được), ảnh poster lấy ở bước Actual, và file JSON chứa bug report.

## 5. Dedupe: một video cho mỗi bug duy nhất

Một lần chạy có 40 test đỏ thường không phải 40 bug. Phiên đăng nhập hết hạn là **một** vấn đề môi trường; cùng một API lỗi trên 6 màn hình là **một** bug. Quay 40 video là lãng phí, và người đọc report bị chôn trong trùng lặp.

[`scripts/evidence/dedupe.mjs`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/scripts/evidence/dedupe.mjs) đọc `reports/results.json` và tạo **signature** cho mỗi lỗi = file spec + dòng lỗi đầu tiên sau khi che đi phần hay thay đổi (số, id, giá trị trong ngoặc kép, thời gian). Lỗi kiểu môi trường (`ECONNREFUSED`, 401, 5xx) được gom chung thành một nhóm. Sau đó script đối chiếu với [`evidence/registry.json`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/evidence/registry.json):

```
### Failure dedupe: 3 failures → 2 unique (0 known, 2 new)
```

- **Đã có trong registry** → không quay lại, chỉ thêm một lần xuất hiện (occurrence) vào entry cũ.
- **Mới** → quay video và thêm entry mới.
- **Môi trường** → sửa môi trường, chạy lại, không quay video.

CI chạy bước này mỗi khi test đỏ và ghi kết quả vào job summary.

## Bài tập thực hành

1. Thêm cờ lỗi thứ hai (ví dụ: bộ lọc ngành trên board bỏ sót một mã), viết kịch bản và quay video cho nó.
2. Đổi giọng đọc: `TTS_VOICE=Daniel npm run evidence:narrate` (tiếng Anh giọng Anh), rồi dựng lại.
3. Cho dedupe gom thêm theo URL của trang trong lỗi Playwright, và kiểm tra trên một lần chạy có nhiều test đỏ.

## Checklist tóm tắt

- [ ] Mỗi bước một câu; người xem luôn biết đang ở bước nào (thẻ STEP + thanh tiến độ).
- [ ] Bước Actual có assertion: bug đã sửa thì không có video sai.
- [ ] Lớp phủ không che phần bằng chứng; xem lại khung hình trước khi đăng.
- [ ] Có captions WebVTT và report theo template (Device, OS, Prerequisite, Account, Steps, Actual, Expected, Scope).
- [ ] Dedupe trước khi quay: N test đỏ → M bug duy nhất.
