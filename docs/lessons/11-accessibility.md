---
title: Accessibility testing - axe, WCAG và baseline kiểu ratchet
short: Accessibility
icon: rules
---

# Accessibility testing: axe, WCAG 2.1 AA và baseline kiểu ratchet

Accessibility (a11y) không phải "tính năng phụ": nút không có tên thì người dùng trình đọc màn hình không bấm được, và chữ tương phản thấp thì người lớn tuổi đọc không ra. Một phần lớn lỗi a11y có thể kiểm tra tự động bằng **axe-core**, chạy ngay trong Playwright. Bài này chỉ cách đưa axe vào bộ test sao cho nó **bảo vệ được chất lượng mà không đỏ vĩnh viễn**.

## Mục tiêu bài học

- Quét trang bằng `@axe-core/playwright`, giới hạn ở các rule WCAG 2.1 A/AA.
- Quét ở **cả light và dark theme**: lỗi tương phản phụ thuộc vào theme.
- Dùng baseline kiểu **ratchet**: lỗi đã biết được chấp nhận có lý do và có giới hạn, còn lỗi mới thì làm test fail.
- Sửa các lỗi hay gặp nhất: tương phản màu, input không có nhãn, vùng cuộn không vào được bằng bàn phím.

## 1. axe trong Playwright, qua fixture

Repo cung cấp `axe` như một fixture ([`tests/fixtures/index.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/fixtures/index.ts)), nên mọi spec dùng chung một cấu hình:

```ts
axe: async ({ page }, use) => use(() => new AxeBuilder({ page }).withTags([...A11Y_TAGS])),
```

```ts
const { violations } = await axe().analyze();   // mỗi violation: id, impact, nodes[] (selector của phần tử lỗi)
```

## 2. Vì sao phải quét cả light và dark

Lần quét đầu tiên trên site này cho ra: trang chủ có 13 phần tử tương phản kém, CV 18, bài học 15 cộng 8 checkbox không có nhãn. Gần như tất cả nằm ở **light theme**, vì Playwright mặc định dùng light. Nguyên nhân là các token màu light (`--accent-2: #0b9a79` trên nền `#f5f6fc` chỉ đạt **3.29:1**, trong khi WCAG AA yêu cầu **4.5:1** cho chữ thường).

Cách sửa là chỉnh token, không sửa từng phần tử:

| Token (light) | Cũ | Tỉ lệ | Mới | Tỉ lệ |
|---|---|---|---|---|
| `--accent-2` | `#0b9a79` | 3.29 | `#087a60` | 4.91 |
| `--ok` | `#14a05a` | 3.14 | `#0e7a43` | 5.01 |
| `--danger` | `#d8374f` | 4.25 | `#c02640` | 5.42 |
| `--warn` | `#b97a06` | 3.33 | `#8a5b00` | 5.44 |

Với chữ màu nhấn đặt trên nền đã pha màu (chip, badge), dùng `color-mix(in srgb, var(--accent) 55%, var(--text))`. Màu sẽ tự sáng lên ở dark và tối đi ở light, đạt tương phản ở cả hai theme mà không phải viết hai giá trị.

Hai lỗi còn lại của trang bài học do Markdown sinh ra, nên sửa ở renderer ([`scripts/build-site.mjs`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/scripts/build-site.mjs)):

- Checkbox của task list (`- [ ]`) → thêm `aria-label="To do" / "Done"`.
- Khối code cuộn ngang → `<pre tabindex="0">` để vào được bằng bàn phím (`scrollable-region-focusable`).

## 3. Baseline kiểu ratchet

Bật axe trên một sản phẩm đang chạy thường cho ra hàng chục lỗi. Nếu test đỏ cho tới khi sửa hết thì team sẽ tắt nó đi. Nếu bỏ qua tất cả thì lỗi mới lọt vào. **Ratchet** (bánh cóc) là cách ở giữa: chỉ cho phép chất lượng đi lên.

[`tests/data/a11y.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/data/a11y.ts):

```ts
{
  name: 'demo watchlist',
  path: '/demo/watchlist.html?seed=42&frozen=1',
  known: [{
    rule: 'link-in-text-block',
    maxNodes: 1,
    reason: 'Empty-state link is told apart from the text by colour only. Demo app behaviour is frozen; fix needs a human decision.',
  }],
}
```

Luật trong [`tests/ui/a11y.spec.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/ui/a11y.spec.ts):

- Rule không có trong danh sách → **fail**.
- Rule đã biết nhưng số phần tử lỗi vượt `maxNodes` → **fail** (lỗi đang lan ra).
- Rule đã biết mà nay không còn → **pass**, kèm annotation "đã sửa, xoá khỏi baseline", để mức chất lượng mới được khoá lại.

Mỗi entry phải có `reason`: ai chấp nhận và vì sao. Một baseline không có lý do thì chỉ là cách giấu lỗi.

## 4. axe không thay được người

axe bắt được khoảng một phần ba các lỗi WCAG: những gì máy đo được (tương phản, nhãn, thuộc tính ARIA, cấu trúc). Những thứ cần người kiểm: thứ tự focus có hợp lý không, thông báo `aria-live` có đọc đúng lúc không, nội dung có dễ hiểu không. Hãy kiểm tra bằng bàn phím (Tab, Enter, Esc) và một trình đọc màn hình (VoiceOver, NVDA) ở các luồng chính.

## Bài tập thực hành

1. Đổi `--accent` của light theme thành một màu nhạt hơn, chạy `npx playwright test tests/ui/a11y.spec.ts` và đọc thông báo lỗi.
2. Sửa lỗi `link-in-text-block` của demo (gạch chân link), chạy lại và xoá entry khỏi baseline theo annotation.
3. Thêm bước kiểm tra bàn phím: Tab tới nút "Sign in" trên trang đăng nhập demo và nhấn Enter.

## Checklist tóm tắt

- [ ] Quét theo tag WCAG 2.1 A/AA, ở cả light và dark.
- [ ] Sửa ở token / renderer trước, không vá từng phần tử.
- [ ] Baseline có `maxNodes` và `reason`; lỗi mới hoặc lỗi lan rộng thì test đỏ.
- [ ] Sửa xong thì xoá khỏi baseline để khoá mức chất lượng mới.
- [ ] Vẫn kiểm tra bàn phím và trình đọc màn hình bằng tay ở các luồng chính.
