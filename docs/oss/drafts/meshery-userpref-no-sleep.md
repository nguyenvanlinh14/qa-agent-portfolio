# meshery/meshery: bỏ `waitForTimeout(2000)` trong `userpreference.spec.ts`

Trạng thái: **bản nháp, chưa liên hệ** (chưa comment, chưa mở issue/PR, chưa push, chưa commit; thay đổi nằm uncommitted trên nhánh local `wip/userpref-no-sleep` trong `/home/user/meshery/meshery`).

Cơ sở: clone `--depth 1` của `meshery/meshery` tại commit `adf88a0c6185` (merge PR #22550, 2026-10-27). Mọi số liệu dưới đây là từ code ở commit đó. **Không truy cập được GitHub issue tracker từ sandbox**, nên chưa biết đã có issue/PR trùng hay chưa (xem "Câu hỏi mở").

## 1. Meshery Playwright setup (tóm tắt)

| Mục | Hiện trạng |
|---|---|
| Config | `ui/playwright.config.js` (CommonJS). `testDir: ./tests/e2e`, `fullyParallel: false`, `retries: 0`, `workers: CI ? 1 : 4`, timeout/expect 60s (`tests/e2e/delays.js`), reporter allure + custom + html |
| Projects | `local-setup`, `remote-setup`, `chromium-local-provider` (phụ thuộc local-setup), `chromium-meshery-provider` (phụ thuộc remote-setup, cần token/tài khoản cloud.meshery.io) |
| Auth | `tests/e2e/local.setup.js` chọn provider "Local" trên `/provider`, lưu `storageState` vào `playwright/.auth/user-local-provider.json`. Provider Local **không cần credential** |
| Fixtures / POM | `tests/e2e/fixtures/project.js` (option `provider`, fixture `clusterMetaData` đọc `~/.kube/config`), `fixtures/pages.js` (`DesignsPage`), page object dạng JS thuần trong `tests/e2e/pages/` (`DashboardPage`, `ExtensionsPage`, `DesignPage`, ...). Nhiều spec import `test/expect` trực tiếp từ `@playwright/test` |
| Tags | `@unstable` (test flaky, reporter xử lý riêng), `@TC-<n>`, `@cut:<slug>`, `@client:ui`, `@connections`, `@relationship` (xem `connections.testmap.ts`, doc `ui/tests.md`). Không có quy ước `@smoke`/`@regression` |
| CI | `.github/workflows/build-and-test.yml` gọi `test-e2e.yml`: Kind cluster + Docker image Meshery server (`meshery-server:ci`, port 9081) + Playwright. **PR chạy `npm run test:e2e:ci:local`** (chỉ Local provider, fork PR vẫn chạy được); **push lên master mới chạy cả Meshery provider** (cần secret `REMOTE_PROVIDER_TEST_USER_TOKEN`). Job bị gate theo `steps.playwright-tests.outcome` (không phải `conclusion`) |
| Dịch vụ cần có | Meshery server + UI build; Kubernetes chỉ cần cho các test connections/controllers/adapters. Test Local provider như `userpreference`, `logout`, `settings`, `indexui` **không cần cluster** |
| Doc | `docs/content/en/project/contributing/ui/tests.md` (setup, policy `@unstable`, "never re-disarm the gate", `test.fixme` phải kèm tracking issue) |
| Quy mô | 16 spec file, 88 test (liệt kê bằng `playwright test --list --project=chromium-local-provider`) |

Chính sách AI: `GOVERNANCE.md` mục contribution nói đóng góp có hỗ trợ AI **được chào đón**, contributor chịu trách nhiệm về tính đúng đắn/giấy phép, phải sign-off DCO (`git commit -s`) và "comply with the project's AI contribution policy as described in CONTRIBUTING.md". **`CONTRIBUTING.md` trong repo chỉ có 6 dòng trỏ sang docs.meshery.io và không có mục AI nào**; repo còn có `AGENTS.md`, `CLAUDE.md`, `.agents/` (agent/skill cho contributor). Chưa tìm thấy văn bản policy AI cụ thể trong repo, cần đọc lại trang https://docs.meshery.io/project/contributing trước khi gửi. PR template yêu cầu `[component]` ở đầu tiêu đề, "Notes for Reviewers: This PR fixes #…", checkbox signed commits, và before/after output.

## 2. Inventory cơ hội (file:line, trong `ui/tests/e2e/`)

| # | Loại | Vị trí | Ghi chú |
|---|---|---|---|
| 1 | **Hard sleep** `page.waitForTimeout(2000)` | `userpreference.spec.ts:85` | **Duy nhất trong cả thư mục e2e** (grep `waitForTimeout`, `networkidle` = 0 chỗ khác). Đây là patch của bản nháp này |
| 2 | Spec bị comment-out toàn bộ | `designs.spec.ts:1-143` | 143 dòng đều là comment; `fixtures/pages.js` + `pages/DesignPage/*` vẫn tồn tại |
| 3 | Case bị comment-out | `userpreference.spec.ts:12-18` ("Toggle Meshery Catalog Content") | Xem mục 5: chạy lại được trên Local provider, nhưng chưa rõ lý do bị tắt |
| 4 | `test.describe.skip` + `@unstable` | `service_mesh_lifecycle.spec.ts:11` | Cần Meshery Istio adapter ở `localhost:10000` |
| 5 | `test.skip` | `settings.spec.ts:81` | Cùng kịch bản adapter; có `click({ force: true })` ở `:83`, và `service_mesh_lifecycle.spec.ts:28` |
| 6 | `test.fixme` | `telemetry.spec.ts:34` (#21172), `performance.spec.ts:36` (#20504) | Có tracking issue; #20504 là product defect (casl ability singleton không reactive), sửa spec không giúp được |
| 7 | Skip theo điều kiện môi trường | `connections.spec.ts:151,171,201,220,238,278,351`; `controllers-config.spec.ts:536,626,792`; `extensions.spec.ts:34,42,50,62,74,84` | 16 chỗ `test.skip(cond, ...)` lúc chạy. Nếu môi trường CI không đủ điều kiện thì coverage mất âm thầm (test báo "skipped", không đỏ) |
| 8 | Assertion không web-first | `logout.spec.ts:27,30` (`expect(request.url()).toContain`, `expect(page.url()).toContain`) | Dòng 30 yếu hơn `toHaveURL('/provider')`; dòng 27 trùng lặp với matcher của `waitForRequest` ở dòng 22 |
| 9 | `isChecked()` một lần | `userpreference.spec.ts:76` | Chấp nhận được vì page chỉ render sau khi prefs load (`pages/user/preferences.tsx` trả `null` đến khi có data) |
| 10 | XPath | `controllers-config.testmap.ts:193,196,200,203` | Có helper + comment; cần để định vị field theo label |
| 11 | `locator('text=...')` + `.first()` | `utils/waitForSnackBar.ts:4` (dùng ở `connections.spec.ts:290,310,385`) | Nên là `getByText`/`getByRole('alert')` |
| 12 | CSS `tbody tr`, `label` -> `..` -> `input` | `connections.spec.ts:270,294,299,342`; `settings.spec.ts:109-112`; `service_mesh_lifecycle.spec.ts:31-34,45,59`; `service-mesh-performance.spec.ts:95` | Brittle, nhưng nhiều chỗ nằm trong test đang skip |
| 13 | TODO | `pages/DesignPage/components/ImportModal.js:27` | filechooser không còn hiện, thay bằng modal trung gian (liên quan #2) |
| 14 | `test.slow()`/timeout 180s phải kéo dài | `telemetry.spec.ts:15`, `performance.spec.ts:6`, `extensions.spec.ts:24`, `models.spec.ts:62-63` (600s), `connections.spec.ts`, `controllers-config.spec.ts:152,786` | Dấu hiệu điều hướng nav chậm (xem comment trong `DashboardPage.navigateToSubMenuItem`) |
| 15 | Trang UI chưa có e2e | `pages/management/environments.tsx`, `workspaces.tsx`, `credentials.tsx`, `adapter.tsx` (chỉ có test đang skip), `pages/configuration/catalog.tsx`, `filters.tsx`, `pages/telemetry/index.tsx`; nav `navigateToEnvironment/Workspace/Adapters` có trong `DashboardPage.js` nhưng không spec nào gọi | Muốn viết mới cần dựng Local provider và kiểm tra tính năng nào thực sự có ở Local |
| 16 | Duplicate login | Không có | Login đã gom vào `local.setup.js`/`remote.setup.js` + `storageState`; không cần fixture mới |
| 17 | `.only` | 0 | `forbidOnly: !!CI` |

Khác: `retries: 0`, không có `test.fail`. ESLint không có rule nào cấm `waitForTimeout` trong `tests/e2e` (`eslint.config.js` loại `tests/**` khỏi vài rule guardrail). Tsconfig `include` là `["ui/**/*.ts", ...]` tính từ thư mục `ui/`, nên `tests/e2e` có vẻ **không** được `tsc` kiểm tra mặc định (chưa xác minh sâu, tôi chỉ typecheck riêng file bằng tsconfig tạm).

## 3. Chọn gì và vì sao

Chọn #1: bỏ `waitForTimeout(2000)` trong `userpreference.spec.ts`.

- Là vi phạm hard-sleep duy nhất còn lại, nhỏ, dễ review, đúng pattern "web-first assertion", thể hiện kỹ năng QA mà không đụng product code.
- **Có thể validate thật không cần Kubernetes**: Local provider + server + UI build là đủ (đã làm, xem mục 4).
- Các lựa chọn khác bị loại: #4/#5 cần adapter chạy sẵn; #6 là product defect; #7 cần quyết định về môi trường CI; #15 (spec mới) rủi ro cao hơn vì không biết Local provider hỗ trợ gì và PR đầu tay nên nhỏ.

Vì sao sleep thừa: toggle ở `components/user-preferences/index.tsx` cập nhật state React **lập tức** (`setAnonymousStats(!anonymousStats)` trước khi gọi API), và test đã `await` đúng request POST + response 200 trước đó. `toBeChecked()` vốn đã auto-retry (expect timeout 60s), nên 2s chờ cứng chỉ làm chậm test và che giấu thứ tự đồng bộ thật.

## 4. Patch (`meshery-userpref-no-sleep.patch`, +3/−7, 1 file)

```diff
-      // Verify that state of switch changed
-      await page.waitForTimeout(2000);
-      if (wasChecked) {
-        await expect(prefSwitch).not.toBeChecked();
-      } else {
-        await expect(prefSwitch).toBeChecked();
-      }
+      // Verify that state of switch changed. toBeChecked() retries until the switch settles
+      // on the expected state, so no fixed sleep is needed.
+      await expect(prefSwitch).toBeChecked({ checked: !wasChecked });
```

Không đổi giá trị mong đợi: vẫn khẳng định switch đảo trạng thái so với `wasChecked`, chỉ gộp if/else thành một assertion và bỏ sleep. Ghi chú trung thực: sleep cũ vô tình cũng kiểm tra "trạng thái không bị đảo lại trong 2s sau response"; assertion mới không còn kiểm tra điều đó (không thấy code nào đảo lại, và đó không phải mục đích khai báo của test).

### Đã kiểm chứng (thật, không phải suy đoán)

Dựng đúng "documented local setup" nhưng không cần Docker/Kind:

1. Build Meshery server từ source (`go build ./server/cmd/main.go ./server/cmd/error.go`, Go toolchain 1.26.4 tự tải qua proxy), chạy với `PROVIDER_BASE_URLS=""`, `DISABLE_OPERATOR=true`, `HOME` tạm.
2. `provider-ui` và `ui` build static (`npm ci --ignore-scripts`, `next build`), server phục vụ `ui/out` ở `:9081` đúng như CI.
3. Playwright 1.61.1 chạy qua một config tạm (đã xoá) chỉ thêm `launchOptions.executablePath = /opt/pw-browsers/chromium-1243/...` và `--no-sandbox`, project `chromium-local-provider`.

Kết quả:

| Phép thử | Kết quả |
|---|---|
| `npx playwright test --list` (spec đã sửa) | OK, liệt kê đúng 2 test x 2 project |
| `prettier --check` + `eslint` cho file đã sửa (config của repo) | pass |
| `tsc --noEmit` riêng file (tsconfig tạm extends config repo) | 0 lỗi |
| Chạy thật `userpreference.spec.ts`, `--repeat-each=5` (sau khi sửa) | **11/11 pass** (setup + 10), ~6.3s/test |
| Cùng lệnh trên code gốc (đối chứng) | 11/11 pass, ~8.0s/test (**nhanh hơn ~1.7-2s/test sau khi sửa**) |
| Mutation: đổi thành `checked: wasChecked` | test **fail** đúng chỗ (`Expected: unchecked, Received: checked`), tức assertion không rỗng |

**Chưa kiểm chứng / hạn chế:**

- Chỉ chạy project `chromium-local-provider`. `chromium-meshery-provider` cần token cloud.meshery.io, không chạy được ở đây; spec chạy chung cho cả hai provider nên cần CI của họ xác nhận.
- Không chạy trong CI thật, không chạy Docker image của họ, không có Kind cluster (không cần cho spec này).
- Không chạy toàn bộ suite 88 test, không chạy các spec khác.
- Lần đầu thử bằng `next dev` thất bại vì overlay lỗi dev (`LatestBlogs` fetch blog feed ra internet bị chặn trong sandbox, `<nextjs-portal>` chặn click). Đây là hạn chế của sandbox/dev mode, không phải lỗi của patch; đã chuyển sang bản build static như CI.
- Test vẫn thay đổi preference phía server (không dọn). Ngoài phạm vi patch này.

## 5. Phát hiện phụ (chưa đưa vào patch)

- Bỏ comment case "Meshery Catalog Content" (`userpreference.spec.ts:12-18`) rồi chạy `-g Catalog --repeat-each=4` trên Local provider: **4/4 pass**. Không biết lý do ban đầu comment-out (clone shallow, không có lịch sử). Có thể do Meshery provider hoặc race: `catalogContent` khởi tạo `true` rồi `useEffect` ghi đè bằng dữ liệu server (`components/user-preferences/index.tsx`). Nên hỏi maintainer trước khi bật lại.
- `logout.spec.ts:30` -> `await expect(page).toHaveURL('/provider')` là PR nhỏ thứ hai hợp lý (chưa chạy thử).

## 6. Cách kiểm chứng local (cho Linh)

```bash
git clone https://github.com/meshery/meshery && cd meshery
git apply /home/user/qa-agent-portfolio/docs/oss/drafts/meshery-userpref-no-sleep.patch
make ui-provider-build          # nếu thiếu provider-ui/out thì /provider trả 404 và setup chết khó hiểu
make server                     # chọn Local provider, cổng 9081 (hoặc build-server + server-binary-local)
cd ui && npm ci
# static UI để tránh overlay dev: (cd ui && npm run build) rồi server phục vụ ui/out
npx playwright test --project=chromium-local-provider tests/e2e/userpreference.spec.ts --repeat-each=5
npx prettier --check tests/e2e/userpreference.spec.ts && npx eslint tests/e2e/userpreference.spec.ts
```

(Theo doc của Meshery thì có thể dùng `make server` + `make ui` + `MESHERY_SERVER_URL=http://localhost:3000`; tôi gặp overlay dev nên dùng bản build.) Trên máy có Playwright browsers chuẩn thì `make ui-test-setup` theo doc của họ. Khi commit: `git commit -s` (DCO), tiêu đề dạng `[UI] ...`, và **đừng commit `ui/tsconfig.tsbuildinfo` hay `next-env.d.ts`** (AGENTS.md cảnh báo; build có thể làm bẩn `next-env.d.ts`).

## 7. Câu hỏi mở

1. Đã có issue/PR nào cho việc này chưa? Cần tìm trên tracker (`waitForTimeout`, `userpreference`, label `area/ci`/`area/testing`/`help wanted`) trước khi làm. Nếu đã có người nhận thì đổi sang #8 (`logout.spec.ts`) hoặc #3.
2. Họ có muốn một issue riêng cho việc này hay PR thẳng (thay đổi 3 dòng) là đủ? Nếu có yêu cầu issue, dùng text bên dưới.
3. Có nên thêm guardrail ESLint cấm `waitForTimeout` trong `tests/e2e` (tương tự test `playwrightWorkers.test.ts` của họ) để không tái phát? Đề xuất làm sau, khi đã quen reviewer.
4. Văn bản "AI contribution policy" thật nằm ở đâu và yêu cầu disclosure thế nào?
5. Mentorship Playwright chưa thấy ở năm 2026 (chỉ có CI overhaul #18795); repo này vẫn rất active (AGENTS.md, nhiều test mới 2026) nhưng nên đọc #18795 để biết họ có đang đổi cấu trúc e2e/CI hay không trước khi gửi.

## 8. Text tiếng Anh để Linh đăng (sau khi kiểm tra tracker, nếu chưa có issue trùng)

Issue (hoặc mô tả PR):

> **[UI] e2e: remove fixed 2s sleep in `userpreference.spec.ts`**
>
> `ui/tests/e2e/userpreference.spec.ts` waits with `page.waitForTimeout(2000)` before asserting the switch state. It is the only fixed sleep left under `ui/tests/e2e`.
>
> The sleep is not needed: the switch state updates synchronously on click and the test already awaits the matching `POST /api/user/prefs` request and 200 response. `await expect(prefSwitch).toBeChecked({ checked: !wasChecked })` auto-retries, so I'd replace the sleep + if/else with that single web-first assertion.
>
> Verified locally against the Local provider (built server + static UI, no Kubernetes): `--repeat-each=5` passes 10/10 before and after, each test ~1.7s faster, and flipping the expected value makes the test fail as it should. I could not run the `chromium-meshery-provider` project (needs a remote-provider token), so CI on that project would be the confirmation.
>
> Happy to open a PR if this looks fine. Separately, the "Meshery Catalog Content" case in the same file is commented out; it passes 4/4 locally against the Local provider. Is there a known reason it was disabled?
>
> AI-assistance disclosure: I used an AI coding assistant (Claude) to inspect the test suite and draft the change. I reviewed the diff, ran the checks above myself, and will sign off my commits under the DCO.

(Trước khi đăng: Linh nên tự chạy lại các lệnh ở mục 6, vì tuyên bố "verified locally" phải đúng với máy của Linh.)

## 9. File liên quan

- Patch: `/home/user/qa-agent-portfolio/docs/oss/drafts/meshery-userpref-no-sleep.patch`
- Clone + nhánh: `/home/user/meshery/meshery` (`wip/userpref-no-sleep`, thay đổi chưa commit), file `ui/tests/e2e/userpreference.spec.ts`
