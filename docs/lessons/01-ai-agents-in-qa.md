---
title: AI Agents trong QA — Claude Code, Playwright MCP và quy trình plan → generate → review → heal → triage
short: AI Agents
icon: agent
---

# AI Agents trong QA

## Mục tiêu bài học

Sau bài này bạn sẽ:

- Phân biệt được **chatbot hỏi–đáp** với **agent** (có công cụ, có vòng lặp, có thể sửa file và chạy lệnh).
- Biết đặt "luật chơi" cho agent bằng `CLAUDE.md`, sub-agent và danh sách tool hạn chế.
- Hiểu vì sao **Playwright MCP** dùng accessibility snapshot thay vì để model "đoán selector".
- Nắm quy trình của Playwright Test Agents (planner / generator / healer) và cách repo này áp dụng.
- Đặt **human-in-the-loop** đúng chỗ, và nhận ra các rủi ro: hallucination, làm yếu assertion, lộ secret.

## 1. Khái niệm

### Agent khác gì với "hỏi AI viết giúp một đoạn code"?

Khi bạn dán lỗi vào chatbot, nó chỉ trả lời bằng văn bản. Một **agent** như Claude Code thì khác: nó đọc được repo, chạy được `npx playwright test`, nhìn thấy log lỗi, sửa file rồi chạy lại cho đến khi đạt điều kiện dừng. Sức mạnh đến từ vòng lặp *quan sát → hành động → kiểm tra*, và rủi ro cũng đến từ chính vòng lặp đó: agent có thể "sửa cho xanh" bằng cách làm test trở nên vô nghĩa.

Vì vậy, làm việc với agent trong QA không phải là "bảo AI viết test", mà là **thiết kế một hệ thống có hàng rào**: ngữ cảnh rõ ràng, quyền hạn hẹp, và con người duyệt ở những điểm quyết định.

### CLAUDE.md — bộ nhớ dài hạn của dự án

`CLAUDE.md` nằm ở gốc repo và được Claude Code nạp vào ngữ cảnh mỗi phiên làm việc. Đây là nơi ghi các quy ước mà một QA senior sẽ nói với người mới ngày đầu tiên. Xem file thật: [CLAUDE.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/CLAUDE.md). Một số quy tắc trong đó:

```markdown
1. Locator priority: getByRole > getByLabel > getByTestId > CSS.
2. No hard sleeps. Never use waitForTimeout ... Rely on auto-waiting and web-first assertions.
4. One behaviour per test. Small and independent.
5. Test data comes from tests/data/ (factories/builders such as TodoBuilder).
8. Specs import `test` and `expect` from tests/fixtures, not from @playwright/test.
9. Never weaken an assertion to make a test pass. A red test is information.
10. Never call /api/test/reset from tests that run in parallel.
```

Hai điểm đáng học. Thứ nhất, quy tắc nào bạn phải nhắc agent đến lần thứ hai thì hãy đưa vào `CLAUDE.md`. Thứ hai, quy tắc tốt **giải thích hậu quả** ("it clears ALL todos for everyone") chứ không chỉ cấm; agent (và đồng nghiệp mới) tuân thủ tốt hơn khi hiểu lý do.

### Sub-agent — chuyên môn hóa và thu hẹp quyền

Một agent "làm được tất cả" khó kiểm soát. Claude Code cho phép định nghĩa sub-agent trong `.claude/agents/*.md`, mỗi cái có mô tả, prompt riêng và danh sách tool được phép. Repo này có bốn vai:

| Sub-agent | Vai trò | Ranh giới |
|---|---|---|
| `test-planner` | Khám phá app bằng trình duyệt MCP, viết kế hoạch Markdown vào `specs/plans/` | Không viết code test |
| `test-generator` | Biến kế hoạch đã duyệt thành spec theo POM/fixture/builder, rồi chạy | Chỉ ghi trong `tests/` |
| `test-healer` | Sửa test đỏ do UI đổi | Chỉ sửa locator/điều hướng; **cấm** đổi assertion |
| `flaky-triager` | Phân loại lỗi: product bug / test bug / flaky / environment | Chỉ đọc |

Mở file thật để xem cách viết: [test-healer.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.claude/agents/test-healer.md), [test-planner.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.claude/agents/test-planner.md), [test-generator.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.claude/agents/test-generator.md), [flaky-triager.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.claude/agents/flaky-triager.md). Phần quan trọng nhất là frontmatter `tools:` (whitelist công cụ) và mục "Hard limits":

```markdown
---
name: test-healer
description: Repairs a failing Playwright spec after a UI change ... Cannot change assertions or expected values.
tools: Read, Grep, Glob, Edit, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, ...
---
## Hard limits
- You may change locators, navigation steps and page-object actions.
- You may NOT change, remove or loosen any assertion, expected value, matcher ...
- You may NOT add `waitForTimeout`, `test.skip`, `test.fixme` or `.retry`.
- Maximum 3 repair attempts per test. After that, stop and report what you learned.
```

Lưu ý `test-healer` chỉ có `Edit` (sửa file có sẵn), không có `Write` để tạo file mới, và chỉ được dùng một tập con công cụ trình duyệt của MCP: đó là nguyên tắc *least privilege* áp cho agent. Giới hạn "tối đa 3 lần thử" chặn vòng lặp sửa vô tận.

### Slash command — đóng gói thao tác lặp lại

Thao tác lặp lại được đóng thành lệnh trong `.claude/commands/`: [/gen-test](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.claude/commands/gen-test.md), [/heal](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.claude/commands/heal.md), [/triage](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.claude/commands/triage.md). Bên trong chỉ là một prompt có `$ARGUMENTS`, nhưng cả team gọi cùng một quy trình thay vì mỗi người một kiểu. Ví dụ `/gen-test` ép thứ tự: planner → **dừng chờ bạn duyệt kế hoạch** → generator → `--repeat-each=3` → typecheck → không commit.

## 2. Playwright MCP: nhìn bằng accessibility snapshot

**MCP (Model Context Protocol)** là chuẩn để agent gọi công cụ bên ngoài. Repo khai báo server `@playwright/mcp` trong [.mcp.json](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.mcp.json):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Cách tiếp cận cũ là đưa HTML hoặc screenshot cho model rồi nhờ nó đoán selector. HTML thật rất dài và nhiều nhiễu; ảnh thì model phải suy ra vị trí. Kết quả là selector "nghe hợp lý" nhưng không tồn tại. Playwright MCP làm khác: nó trả về **accessibility snapshot**, tức cây ngữ nghĩa mà trình duyệt dựng cho trình đọc màn hình. Với trang đăng nhập của demo app, snapshot có dạng:

```yaml
- heading "TaskFlow" [level=1]
- textbox "Email" [ref=e5]
- textbox "Password" [ref=e7]
- button "Sign in" [ref=e9]
```

Mỗi phần tử có `role`, tên truy cập và một `ref` duy nhất. Agent click bằng `ref`, nên **không phải đoán**; khi chuyển sang viết test, nó dùng luôn role + name, đúng thứ tự ưu tiên locator ở bài 2. Đó chính là những dòng bạn thấy trong [tests/pages/login.page.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/login.page.ts):

```ts
this.email = page.getByLabel('Email');
this.password = page.getByLabel('Password');
this.submit = page.getByRole('button', { name: 'Sign in' });
```

Bonus: nếu một nút không xuất hiện trong snapshot hoặc không có tên, rất có thể người dùng đọc màn hình cũng không dùng được nó. Đó là một phát hiện về accessibility, không chỉ về test.

## 3. Playwright Test Agents: planner → generator → healer

Từ Playwright 1.56, bộ công cụ chính thức "Test Agents" gồm ba agent có prompt và tool được tinh chỉnh sẵn. Một lệnh để dựng chúng cho Claude Code:

```bash
npx playwright init-agents --loop=claude
```

Lệnh sinh ra định nghĩa agent planner / generator / healer trong `.claude/agents/`, cấu hình MCP, một thư mục cho kế hoạch test và một `seed.spec.ts` làm điểm khởi đầu (ví dụ: đã đăng nhập sẵn). Luồng làm việc:

1. **Planner** mở app qua MCP, khám phá và viết kế hoạch Markdown: kịch bản, bước, kết quả mong đợi.
2. **Generator** đọc kế hoạch, thao tác thật trên trình duyệt để xác nhận từng bước, rồi xuất file `.spec.ts`.
3. **Healer** chạy test đỏ, xem trace/console/DOM, vá locator hoặc timing và chạy lại.

Repo này không dùng nguyên bản sinh ra, mà viết lại bốn agent của riêng mình để **gắn với luật của dự án**: planner ghi vào `specs/plans/`, generator phải dùng page object + `tests/data`, healer bị cấm đụng vào assertion. Bài học: agent mặc định là điểm khởi đầu, còn "chất lượng" nằm ở phần ràng buộc bạn thêm vào.

## 4. Ví dụ chạy được: từ kế hoạch đến test

Chạy server (`npm run serve`, sau `npm run build` để có `dist/`) rồi mở Claude Code trong repo.

**Bước 1 — Plan.**

```text
/gen-test todo filtering
```

Lệnh này gọi `test-planner`, agent mở `http://localhost:4173/demo/`, đăng nhập bằng tài khoản demo công khai `qa@demo.dev` / `Passw0rd!`, đi qua luồng thêm / đánh dấu / lọc / xóa và ghi `specs/plans/todo-filtering.md`. Phần đầu ra có dạng (rút gọn):

```markdown
## Scenario: Active filter hides done todos  [@regression]
Steps:
1. Add "Open item" and "Finished item".
2. Tick the checkbox "Toggle Finished item".
3. Press the "Active" filter button.
Expected: "Open item" is listed, "Finished item" is not.
```

**Bước 2 — Duyệt kế hoạch (con người).** `/gen-test` dừng tại đây. Hãy hỏi: thiếu case âm tính nào? (tiêu đề trống, tiêu đề toàn khoảng trắng, reload có giữ dữ liệu không.) Bổ sung rồi mới cho đi tiếp.

**Bước 3 — Generate.** `test-generator` sinh spec theo POM, fixture và builder của repo. Kết quả phải giống phong cách của [tests/ui/todos.spec.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/ui/todos.spec.ts):

```ts
import { test, expect } from '../fixtures';
import { aTodo } from '../data';

test.describe('Todos', () => {
  test.beforeEach(async ({ todoPage }) => {
    await todoPage.open();
  });

  test('@regression active filter hides done todos', async ({ todoPage }) => {
    const open = aTodo().withPrefix('Open').build().title;
    const finished = aTodo().withPrefix('Finished').build().title;
    await todoPage.add(open);
    await todoPage.add(finished);
    await todoPage.toggle(finished);
    await todoPage.filter('Active');
    await expect(todoPage.item(open)).toBeVisible();
    await expect(todoPage.item(finished)).toHaveCount(0);
  });
});
```

**Bước 4 — Review.** Bạn đọc diff như đọc PR của đồng nghiệp, với checklist ở cuối `CLAUDE.md`: assertion có kiểm tra hành vi thật không, có `waitForTimeout` lọt vào không, dữ liệu có đi qua builder không, tag có đủ không.

**Bước 5 — Heal.** Giả sử dev đổi nhãn nút "Add" thành "Add task" và test đỏ:

```text
/heal tests/ui/todos.spec.ts
```

Healer chạy test, đọc lỗi, mở trang bằng MCP, thấy nút mới trong snapshot và sửa `addButton` ở [tests/pages/todo.page.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/todo.page.ts), **một chỗ duy nhất** nhờ POM. Nếu thay vào đó nó muốn đổi `toHaveCount(0)` thành `toHaveCount(1)` cho khớp, đó là dấu hiệu bug sản phẩm hoặc agent đang lách luật: từ chối.

**Bước 6 — Triage trong CI.** Khi CI đỏ, [scripts/ai-triage.mjs](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/scripts/ai-triage.mjs) đọc `reports/results.json`, gom các test thất bại hoặc flaky kèm thông báo lỗi (đã cắt gọn), gọi Anthropic Messages API khi có `ANTHROPIC_API_KEY`, và ghi kết quả vào `$GITHUB_STEP_SUMMARY`. Không có key thì chỉ liệt kê lỗi; script không bao giờ thoát mã khác 0 nên triage không làm vỡ pipeline. Prompt hệ thống của script cấm gợi ý "thêm sleep" hay "nới assertion". Xem pipeline ở [.github/workflows/ci.yml](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.github/workflows/ci.yml); workflow [claude.yml](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/.github/workflows/claude.yml) cho phép gọi `@claude` trên PR/issue để review.

Thử ở máy local:

```bash
npx playwright test --project=api
npm run ai:triage          # không key: chỉ liệt kê lỗi
```

Triage chỉ **gợi ý** phân loại và bước tiếp theo; nó không tự sửa code, không tự rerun vô hạn, không tự đóng ticket.

## 5. Human-in-the-loop: duyệt ở đâu?

Không cần duyệt từng dòng, nhưng phải có **cổng kiểm soát** ở những chỗ rủi ro cao:

| Điểm | Câu hỏi con người trả lời |
|---|---|
| Sau *plan* | Kịch bản có đúng nghiệp vụ không? Thiếu case âm tính nào? |
| Sau *generate* | Assertion có ý nghĩa không? Có theo POM/fixture/builder không? |
| Sau *heal* | Chỉ đổi locator? Expected value còn nguyên? |
| Sau *triage* | "Flaky" thật, hay đang che một bug có điều kiện? |
| Trước *merge* | CI xanh + ít nhất một người đã đọc diff. |

Quy tắc đơn giản: agent **đề xuất**, con người **chịu trách nhiệm**. Agent không commit lên `main`, không đẩy snapshot, không đụng secrets của CI; mọi thay đổi đi qua pull request như code của người.

## 6. Giới hạn và rủi ro

- **Hallucination**: agent bịa API, bịa selector hoặc bịa "bug". Giảm thiểu bằng MCP snapshot, bắt chạy test thật, và không tin kết quả chưa được thực thi.
- **Làm yếu assertion**: lỗi nguy hiểm nhất. Test xanh nhưng không còn bảo vệ gì. Cấm trong prompt (xem `test-healer`) *và* kiểm tra bằng review: tìm trong diff `expect` bị xóa, `.skip`, matcher bị nới (`toHaveText` → `toBeTruthy`), timeout bị tăng.
- **Lộ secret**: không dán token/credentials thật vào prompt. Repo chỉ có tài khoản demo công khai; `ANTHROPIC_API_KEY` chỉ nằm ở GitHub Secrets.
- **Quyền quá rộng**: cho agent `Bash` không giới hạn trên máy có credentials production là thảm họa. Dùng whitelist tool, chạy trong container/CI.
- **Chi phí và nhiễu**: log dài tốn tiền và làm loãng kết quả; script triage giới hạn số lỗi và độ dài thông báo gửi đi.
- **Dữ liệu nhạy cảm trong report**: trace và screenshot có thể chứa dữ liệu thật; chỉ cho agent đọc report từ môi trường test.
- **Non-determinism**: cùng một prompt có thể ra hai kết quả khác nhau. Vì thế "đúng" phải được xác nhận bằng test chạy được, không bằng việc agent nói là đúng.

## Lỗi thường gặp / anti-patterns

1. **"Làm cho test pass"** mà không ràng buộc. Hãy nói rõ *được sửa gì, cấm sửa gì*.
2. **Sinh hàng loạt test rồi commit luôn**: 40 test không ai đọc là nợ kỹ thuật. Sinh từng nhóm nhỏ, review từng nhóm.
3. **Không có `CLAUDE.md`**: mỗi lần agent viết một phong cách khác nhau, tự chế locator, thêm `sleep`.
4. **Prompt mơ hồ** ("test trang login"): thiếu tiêu chí chấp nhận, agent chọn case dễ nhất.
5. **Tin triage tuyệt đối**: nhãn "flaky" của AI chỉ là giả thuyết; xác nhận bằng `--repeat-each` và đọc trace.
6. **Dán HTML thay vì dùng MCP**: tốn token và dễ ra selector sai.
7. **Một agent làm mọi việc**: không tách vai nên không có chốt chặn giữa "viết" và "sửa".
8. **Cho agent cập nhật screenshot baseline** để CI xanh: biến visual test thành vô nghĩa (xem bài 4).

## Bài tập thực hành

1. Đọc `CLAUDE.md` và thêm một quy tắc mới (ví dụ: "mọi test API phải kiểm tra cả status code lẫn shape của body"). Nhờ agent sinh một test API và xem nó có tuân thủ không.
2. Chạy `/gen-test todo filtering` trong Claude Code. Trước khi duyệt kế hoạch, **tự bạn** bổ sung 3 case âm tính mà planner bỏ sót.
3. Trong thư mục thử nghiệm riêng, chạy `npx playwright init-agents --loop=claude` và so sánh các file sinh ra với `.claude/agents/` của repo. Khác nhau ở đâu, vì sao repo cần thêm ràng buộc?
4. Cố tình đổi nhãn nút "Sign in" trong bản sao của `site/demo/index.html`, chạy `/heal tests/ui/login.spec.ts` và kiểm tra diff: agent chỉ sửa locator ở `login.page.ts`?
5. Làm hỏng một assertion (đổi `toHaveCount(0)` thành `toHaveCount(1)`) rồi nhờ healer sửa. Nó báo bug hay sửa số cho khớp? Hoàn thiện phần "Hard limits" cho đến khi nó luôn chọn cách đầu.
6. Chạy `npm run ai:triage` khi có và không có `ANTHROPIC_API_KEY`; ghi lại hành vi khác nhau.

## Checklist tóm tắt

- [ ] Có `CLAUDE.md` ghi quy ước: locator, không `waitForTimeout`, builder, tag, không nới assertion.
- [ ] Sub-agent chia vai (planner / generator / healer / triager) và **giới hạn tool**.
- [ ] Dùng Playwright MCP (accessibility snapshot) thay vì dán HTML để đoán selector.
- [ ] Quy trình plan → generate → review → heal → triage; có người duyệt sau mỗi bước quan trọng.
- [ ] Healer bị cấm đổi expected value, xóa assertion, thêm `skip`/`waitForTimeout`; tối đa 3 lần thử.
- [ ] Secrets chỉ nằm trong GitHub Secrets / biến môi trường, không vào prompt hay repo.
- [ ] Triage trong CI chỉ gợi ý, bỏ qua êm khi thiếu key, không tự động sửa.
- [ ] Mọi thay đổi của agent đi qua PR và CI trước khi merge.
