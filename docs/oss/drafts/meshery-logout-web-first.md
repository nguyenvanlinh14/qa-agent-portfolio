# meshery/meshery: dùng web-first URL assertion trong `logout.spec.ts`

Trạng thái: **đã push lên fork, chờ mở PR** (chưa mở PR, chưa comment ở đâu cả).

- Branch: `test/logout-web-first-assertions` trên `nguyenvanlinh14/meshery` (commit `db982a01a`, base là `master` của upstream tại `87db0f3b9`, 2026-10-28).
- Compare URL (mở PR từ đây): https://github.com/meshery/meshery/compare/master...nguyenvanlinh14:meshery:test/logout-web-first-assertions?expand=1
- Patch: `/home/user/qa-agent-portfolio/docs/oss/drafts/meshery-logout-web-first.patch` (`git format-patch`, áp được bằng `git am`).
- Bối cảnh: PR đầu tiên [#22619](https://github.com/meshery/meshery/pull/22619) (userpreference, bỏ `waitForTimeout`) đã merge; đây là mục #8 trong inventory của `meshery-userpref-no-sleep.md`.

## 1. Diff (1 file, +1/-2)

`ui/tests/e2e/logout.spec.ts`:

```diff
     const request = await waitForLogoutRequest;
     expect(request.url()).toContain('/user/logout');
 
-    await page.waitForURL('/provider');
-    expect(page.url()).toContain(`/provider`);
+    await expect(page).toHaveURL('/provider');
```

Vì sao:

- `expect(page.url()).toContain(...)` đọc URL **một lần** ra string rồi so sánh, không retry. Đây chính là pattern mà web-first assertion thay thế. Nó cũng yếu hơn cần thiết: `toContain('/provider')` vẫn pass với `/provider-foo` hay `/foo?next=/provider`.
- `toHaveURL('/provider')` auto-wait/retry (expect timeout 60s của họ) và so khớp **toàn bộ** URL (có `baseURL`), nên `waitForURL` + assert thủ công gộp thành một dòng, vẫn kiểm tra cùng một điều: sau logout trang kết thúc ở `/provider`.

**Chủ ý KHÔNG đổi dòng 27** (`expect(request.url()).toContain('/user/logout')`), khác với giả định ban đầu của inventory:

- `request` là object của `Request` đã resolve, `request.url()` là getter đồng bộ trên dữ liệu bất biến, nên không có race để sửa. Playwright cũng không có web-first matcher cho `Request`.
- Dòng đó gần như thừa vì `page.waitForRequest('/user/logout')` ở trên đã lọc đúng URL (glob). Xoá nó thì đúng hơn về mặt "bớt thừa" nhưng là thay đổi nội dung kiểm tra, ngoài phạm vi "web-first". Nếu reviewer muốn, có thể xoá hoặc siết thành `pathname` ở một PR khác. Nên nói rõ lựa chọn này trong PR (đã có trong Notes for Reviewers bên dưới).

Quy trình repo: commit có `Signed-off-by` (DCO, `-s`) và trailer `Assisted-by: Claude Code`; chỉ commit đúng 1 file (không có `next-env.d.ts`/`tsconfig.tsbuildinfo`).

## 2. Kiểm chứng (trung thực: chạy cái gì, ở đâu)

Tất cả chạy **trong sandbox của AI assistant (Claude Code)**, không phải trên máy cá nhân của Linh và không phải CI của Meshery.

Môi trường: build Meshery server từ đúng source của `87db0f3b9` (`go build ./server/cmd/main.go ./server/cmd/error.go`, Go 1.26.4), chạy với `PROVIDER_BASE_URLS=""`, `DISABLE_OPERATOR=true`, `PORT=9081`, `HOME` tạm; serve static UI build sẵn `ui/out` + `provider-ui/out` (từ commit `adf88a0c6`; đã kiểm tra `git diff adf88a0c6..87db0f3b9 -- ui provider-ui server` chỉ khác đúng spec userpreference đã merge, nên bản build vẫn khớp code). Playwright qua một config tạm (wrap `ui/playwright.config.js`, chỉ thêm `launchOptions.executablePath` tới Chromium cài sẵn, `--no-sandbox`, reporter `list`), project `chromium-local-provider`, **đã xoá config tạm** và **đã dừng server** sau khi chạy. Không chạy `playwright install`.

| Phép thử | Kết quả |
|---|---|
| Spec **trước** khi sửa (upstream master), `--repeat-each=5` | 5/5 pass (+ 1 setup), 31.2s tổng |
| Spec **sau** khi sửa, `--repeat-each=5` | 5/5 pass (+ 1 setup), lần chạy đầu 40.7s, lần chạy cuối 33.3s (4 workers song song, thời gian từng test dao động 7-17s do tranh chấp CPU, không có ý nghĩa so sánh tốc độ) |
| Mutation 1: đổi kỳ vọng thành `toHaveURL('/provider-wrong')` | **fail** đúng dòng 29: `Expect "toHaveURL" with timeout 60000ms ... unexpected value "http://localhost:9081/provider"` (retry 116 lần rồi mới fail) |
| Mutation 2: đổi mock redirect `Location: '/provider'` thành `'/somewhere-else'` | **fail** đúng dòng 29: `unexpected value "http://localhost:9081/somewhere-else"` |
| `prettier --check tests/e2e/logout.spec.ts` (config repo) | pass |
| `eslint tests/e2e/logout.spec.ts` (config repo) | pass, 0 lỗi |

Cả hai mutation đã được revert (xác nhận bằng `git diff --stat` = đúng +1/-2 trước khi commit).

**Chưa kiểm chứng / hạn chế:**

- Chỉ project `chromium-local-provider`. Spec này chạy được cả với `chromium-meshery-provider` nhưng cần token cloud.meshery.io, không chạy được ở đây; CI của Meshery sẽ xác nhận.
- Không chạy trong CI thật / Docker image / Kind cluster (spec này không cần cluster). Không chạy các spec khác.
- Test này **mock** `/user/logout` bằng `page.route` (trả 302 về `/provider`), nên không kiểm tra logout thật của server. Đó là hành vi sẵn có, tôi không đổi.
- Chưa chạy `tsc` riêng cho file này (thay đổi chỉ dùng API typed sẵn của `@playwright/test`; `expect(page).toHaveURL` là typed).
- Kết quả "trước/sau" chỉ chứng minh không hồi quy và assertion không rỗng; không có khác biệt tốc độ đo được (`waitForURL` đã retry sẵn, thay đổi này là về độ chặt và phong cách chứ không phải flaky fix).

## 3. PR description (sẵn sàng paste)

Đặt title: `[UI] test(e2e): use web-first URL assertions in logout spec`

> **Description**
>
> `ui/tests/e2e/logout.spec.ts` ends with `await page.waitForURL('/provider')` followed by `expect(page.url()).toContain('/provider')`. The second line reads the URL once into a plain string, so it cannot retry, and `toContain` is looser than needed (it would also pass for `/provider-foo`).
>
> This PR replaces both lines with a single web-first assertion: `await expect(page).toHaveURL('/provider')`. It auto-waits until the URL matches (or the expect timeout elapses) and matches the full URL. The test still verifies the same thing: after logout the user lands on `/provider`.
>
> **Notes for Reviewers**
>
> - Follow-up to #22619 (same area: removing non-web-first patterns in the e2e specs). No tracking issue, this is a small test-only cleanup.
> - One file, +1/-2. No product code changes.
> - I intentionally left `expect(request.url()).toContain('/user/logout')` (the line above) alone: `request` is the already-resolved `Request` from `waitForRequest`, `url()` is a synchronous getter, so there is no race, and there is no web-first matcher for it. The line is also largely redundant with the `waitForRequest('/user/logout')` filter. Happy to drop or tighten it if you prefer.
> - Only the `chromium-local-provider` project was run (see below). I could not run `chromium-meshery-provider` (needs a remote-provider token), so CI is the confirmation for that project.
>
> **Testing**
>
> Run against a locally built Meshery server (Local provider, no Kubernetes) with the static UI build, `npx playwright test --project=chromium-local-provider tests/e2e/logout.spec.ts --repeat-each=5`.
>
> Before (upstream master):
>
> ```
>   ✓  [local-setup] › tests/e2e/local.setup.js:12:6 › authenticate as Local provider
>   ✓  [chromium-local-provider] › tests/e2e/logout.spec.ts:12:7 › Logout Page Tests › Logout from current user session   (x5)
>   6 passed (31.2s)
> ```
>
> After (this PR):
>
> ```
>   ✓  [local-setup] › tests/e2e/local.setup.js:12:6 › authenticate as Local provider
>   ✓  [chromium-local-provider] › tests/e2e/logout.spec.ts:12:7 › Logout Page Tests › Logout from current user session   (x5)
>   6 passed (33.3s)
> ```
>
> To check the new assertion is not vacuous, I temporarily changed the expectation to `toHaveURL('/provider-wrong')`, and separately changed the mocked redirect `Location` to `/somewhere-else`. Both made the test fail at the new line, then I reverted them:
>
> ```
> Error: expect(page).toHaveURL(expected) failed
>   - Expect "toHaveURL" with timeout 60000ms
>     116 × unexpected value "http://localhost:9081/provider"
>   > 29 |     await expect(page).toHaveURL('/provider-wrong');
>
>   (mock redirect to /somewhere-else)
>     117 × unexpected value "http://localhost:9081/somewhere-else"
>   > 29 |     await expect(page).toHaveURL('/provider');
> ```
>
> `npx prettier --check tests/e2e/logout.spec.ts` and `npx eslint tests/e2e/logout.spec.ts` both pass.
>
> **AI assistance**
>
> I used an AI coding assistant (Claude Code) to inspect the spec, make the change and run the checks above. The runs listed under Testing were executed by the assistant in a sandbox (locally built server + Chromium), not on my own machine. The commit carries an `Assisted-by: Claude Code` trailer. I reviewed the diff and I take responsibility for the change.
>
> **Signed commits**
>
> - [x] Yes, I signed my commits (DCO `Signed-off-by`).

(Trước khi đăng: nếu Linh muốn dòng "I reviewed ..." đúng sự thật thì nên tự chạy lại lệnh ở mục 4 trên máy mình, hoặc ít nhất đọc diff. Đoạn "Before/After" và output mutation ở trên là rút gọn từ output thật của sandbox (bỏ dòng noise `injected env` / `No remote-provider credentials`, gộp 5 dòng lặp thành `(x5)`, ghép hai lần fail vào một khối); đừng coi là log nguyên văn.)

## 4. Chạy lại local (cho Linh)

```bash
git clone https://github.com/meshery/meshery && cd meshery
git fetch https://github.com/nguyenvanlinh14/meshery test/logout-web-first-assertions && git checkout FETCH_HEAD
# hoặc: git am /home/user/qa-agent-portfolio/docs/oss/drafts/meshery-logout-web-first.patch
make ui-provider-build && (cd ui && npm ci && npm run build)    # UI tĩnh, tránh overlay của next dev
# chạy server Local provider ở cổng 9081 (make server hoặc binary), rồi:
cd ui && npx playwright test --project=chromium-local-provider tests/e2e/logout.spec.ts --repeat-each=5
npx prettier --check tests/e2e/logout.spec.ts && npx eslint tests/e2e/logout.spec.ts
```

## 5. Task B: vì sao case "Meshery Catalog Content" bị comment-out

Kết luận ngắn: bị tắt có chủ đích bởi maintainer **Lee Calcote** vì test "dysfunctional" liên quan đến catalog extension; lý do kỹ thuật chi tiết **không được ghi trong commit**.

- Commit: `fcbe21805cc` (2024-10-03, Lee Calcote), message nguyên văn: **"[Test] Disable dysfunctional catalog extension test"**, có `Signed-off-by`, không có body. Diff chỉ comment-out đúng khối object `Toggle "Meshery Catalog Content"` trong `userpreference.spec.js` (file này sau đó được đổi tên sang `.ts` ở `642ab7ca112`, 2026-02-14, chỉ thêm kiểu dữ liệu; khối comment được giữ nguyên).
- PR: merge qua [meshery/meshery#12262](https://github.com/meshery/meshery/pull/12262) (branch `leecalcote-patch-3`, merge commit `9adff4811de`, 2024-10-08, title trùng message commit). Xác minh bằng `git merge-base --is-ancestor fcbe21805cc 9adff4811de^2`. **Không đọc được thảo luận của PR** (sandbox không có quyền GitHub API tới repo upstream), nên không biết có giải thích thêm trong PR hay không.
- Bối cảnh cùng đợt: Lee Calcote cũng có `b88ef8d53cc` "[Test] Disable tests that are not ready" (2024-10-03, `service_mesh_performance.spec.js`) và PR #12231 `test/disable-failing-test`; tức đây là đợt tắt hàng loạt test đang đỏ trên CI. Sau đó `7eadac93a8f` (Jerens Lensun, 2024-10-09) gắn `@unstable` + annotation issue [#12329](https://github.com/meshery/meshery/issues/12329) cho cả `describe` của userpreference (khi viết lại spec), không riêng case catalog. Tôi **chưa đọc được** nội dung #12329 nên không khẳng định nó nói về catalog.
- Lịch sử sau đó: `3c07f07c9a3` "ci: fix user preference test" (2024-09-05) có **trước** lần tắt; không có commit nào sau 2024-10-03 bật lại. Khối comment còn nguyên cho tới nay (`userpreference.spec.ts:12-18`, kể cả sau #22619).
- Code hiện tại vẫn còn toggle: `ui/components/user-preferences/index.tsx:617` (`label="Meshery Catalog Content"`), `catalogContent` khởi tạo `true` rồi bị `useEffect` ghi đè bằng dữ liệu server.
- Đối chiếu với kết quả trước đó: bỏ comment và chạy `-g Catalog --repeat-each=4` trên Local provider đã pass 4/4 (ở commit `adf88a0c6`, xem `meshery-userpref-no-sleep.md` mục 5). Do đó "dysfunctional" năm 2024 có thể là lỗi của thời điểm đó hoặc chỉ xảy ra với Meshery provider/extension (cloud), điều mà sandbox không chạy được.
- Ghi chú về cách tra cứu: clone là shallow nên lần `git fetch --depth 300` không với tới 2024; tôi phải `git fetch --filter=blob:none --shallow-since=2022-01-01 origin master` mới thấy lịch sử (bản cũ nhất thấy được là `0219656b18d` 2024-10-27 chỉ là grafted boundary trong clone shallow). `git log -S 'Catalog'` trên path `.ts` chỉ trả `642ab7ca112` (do rename `.js` -> `.ts`); phải truy theo path `.js` mới ra `fcbe21805cc`.

Việc nên làm nếu muốn bật lại: đọc #12262 và #12329 trước, rồi hỏi maintainer (ví dụ ghi trong comment của PR/issue) xem catalog toggle còn "dysfunctional" trên Meshery provider không; nếu chỉ có Local provider ổn thì có thể bật có điều kiện theo `provider` fixture (đừng bật lại khi chưa rõ).
