---
title: Playwright + Page Object Model — fixtures, storageState, projects và web-first assertions
short: Playwright + POM
icon: pom
---

# Playwright + Page Object Model

## Mục tiêu bài học

Sau bài này bạn sẽ:

- Tổ chức một framework Playwright theo **Page Object Model (POM)** gọn, dễ bảo trì.
- Dùng **fixtures** để tiêm page object và client API vào test thay vì tự `new` trong từng file.
- Đăng nhập **một lần** bằng `storageState` và chia sẻ cho cả bộ test UI qua **projects + dependencies**.
- Chọn locator đúng thứ tự ưu tiên và viết **web-first assertions** không cần `sleep`.
- Gắn tag `@smoke` / `@regression` để chạy tập con test.

Ứng dụng được test là demo TaskFlow (`/demo/`): đăng nhập bằng `qa@demo.dev` / `Passw0rd!` (tài khoản demo công khai), sau đó thêm / đánh dấu / lọc / xóa todo. Toàn bộ code trong bài là code thật của repo (có rút gọn).

## 1. Khái niệm

### Page Object Model là gì, và không phải là gì

POM đóng gói **cách tương tác với một trang** (locator + hành động) vào một class, để test chỉ còn mô tả **ý định**:

```ts
// Không POM: test biết quá nhiều về DOM
await page.getByLabel('Email').fill('qa@demo.dev');
await page.getByLabel('Password').fill('Passw0rd!');
await page.getByRole('button', { name: 'Sign in' }).click();

// Có POM: test nói về ý định
await loginPage.login(users.qa);
```

Khi UI đổi, bạn sửa **một** chỗ trong page object thay vì 30 test. Nhưng POM cũng có ranh giới: **page object cung cấp locator và hành động; assertion nằm trong spec** (quy tắc số 7 của [CLAUDE.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/CLAUDE.md)). Nếu giấu `expect` trong page object, người đọc test không còn thấy kỳ vọng nằm ở đâu.

### Cấu trúc thư mục của repo

```text
playwright.config.ts
tests/
  pages/       BasePage, HomePage, LoginPage, TodoPage, LessonPage
  fixtures/    index.ts (test + expect mở rộng), api-client.ts
  data/        factories.ts, todo-builder.ts
  setup/       auth.setup.ts  → lưu playwright/.auth/user.json
  ui/          spec UI        (project "ui")
  api/         spec API       (project "api", bài 3)
  visual/      spec ảnh chụp  (project "visual", bài 4)
```

Cấu hình đầy đủ: [playwright.config.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/playwright.config.ts).

## 2. Page Object: BasePage và các trang con

`BasePage` giữ phần dùng chung; mỗi trang chỉ thêm locator và hành động của riêng nó. File thật: [base.page.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/base.page.ts), [login.page.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/login.page.ts), [todo.page.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/todo.page.ts), [home.page.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/home.page.ts), [lesson.page.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/lesson.page.ts).

```ts
// tests/pages/base.page.ts
import type { Page } from '@playwright/test';

export abstract class BasePage {
  /** Path relative to baseURL, e.g. '/' or '/demo/'. */
  abstract readonly path: string;

  constructor(protected readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }
}
```

```ts
// tests/pages/login.page.ts (rút gọn)
export class LoginPage extends BasePage {
  readonly path = '/demo/';
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
    this.error = page.getByRole('alert');
  }

  async login({ email, password }: Credentials): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

```ts
// tests/pages/todo.page.ts (rút gọn)
export class TodoPage extends BasePage {
  readonly path = '/demo/todos.html';
  readonly newTodo = this.page.getByLabel('New todo', { exact: true });
  readonly items = this.page.getByRole('list', { name: 'Todo list' }).getByRole('listitem');
  readonly remaining = this.page.getByTestId('remaining');

  async add(title: string) {
    await this.newTodo.fill(title);
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  item(title: string) {
    return this.items.filter({ hasText: title });
  }

  async toggle(title: string) {
    await this.page.getByRole('checkbox', { name: `Toggle ${title}`, exact: true }).click();
  }

  async filter(name: 'All' | 'Active' | 'Done') {
    await this.page.getByRole('button', { name, exact: true }).click();
  }
}
```

Chú ý hai chi tiết. Các nhãn `Toggle <title>` / `Delete <title>` đến từ `aria-label` trong [site/demo/todos.html](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/site/demo/todos.html): dùng `getByRole` với *tên truy cập* vừa ổn định vừa buộc app phải accessible. Còn `exact: true` tránh việc nút `Add` khớp nhầm với một nút khác có chữ "Add" trong tên.

Cũng nhờ POM, hành động như "mở trang với danh sách rỗng" trở thành một phương thức có tên (`todoPage.open()` xóa `taskflow.todos` trong localStorage rồi reload) thay vì ba dòng lặp lại ở mỗi test.

## 3. Fixtures: tiêm dependency thay vì `new`

Fixture là cơ chế "dependency injection" của Playwright. Thay vì mỗi test tự khởi tạo page object, ta mở rộng `test` một lần ở [tests/fixtures/index.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/fixtures/index.ts):

```ts
import { test as base, expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { users } from '../data/factories';
import { HomePage, LessonPage, LoginPage, TodoPage } from '../pages';

interface Fixtures {
  homePage: HomePage;
  loginPage: LoginPage;
  todoPage: TodoPage;
  lessonPage: LessonPage;
  api: ApiClient;    // client ẩn danh (không token)
  qaApi: ApiClient;  // đã đăng nhập qa@demo.dev
  devApi: ApiClient; // đã đăng nhập dev@demo.dev
}

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  todoPage: async ({ page }, use) => use(new TodoPage(page)),
  lessonPage: async ({ page }, use) => use(new LessonPage(page)),
  api: async ({ request }, use) => use(new ApiClient(request)),
  qaApi: async ({ request }, use) => use(await new ApiClient(request).signIn(users.qa)),
  devApi: async ({ request }, use) => use(await new ApiClient(request).signIn(users.dev)),
});

export { expect };
```

Lợi ích: (1) test ngắn gọn, chỉ khai báo thứ nó cần; (2) fixture **lazy**, chỉ được tạo khi test dùng, nên test UI không tốn công đăng nhập API; (3) có bước teardown sau `use()` nếu cần dọn dẹp; (4) kiểu TypeScript đầy đủ, nên agent AI (bài 1) gợi ý chính xác hơn vì thấy rõ "hợp đồng" của từng fixture.

Mọi spec import `test` từ đây, **không** import trực tiếp từ `@playwright/test`:

```ts
import { test, expect } from '../fixtures';
import { wrongPasswordUser } from '../data/factories';

test('@regression wrong password shows an error', async ({ loginPage, page }) => {
  await loginPage.goto();
  await loginPage.login(wrongPasswordUser());
  await expect(loginPage.error).toHaveText('Invalid email or password');
  await expect(page).toHaveURL(/\/demo\/$/);
});
```

## 4. storageState + projects/dependencies: đăng nhập một lần

Đăng nhập bằng UI trong mỗi test vừa chậm vừa dễ flaky. Cách chuẩn: một project `setup` đăng nhập và lưu trạng thái ra file; các project khác khai báo `dependencies: ['setup']` rồi dùng lại file đó. Demo TaskFlow giữ phiên trong `localStorage`, và `storageState` lưu được cả localStorage của origin.

```ts
// tests/setup/auth.setup.ts
import { test as setup } from '../fixtures';
import { users } from '../data/factories';
import { AUTH_FILE } from '../../playwright.config';

setup('log into the demo app and store the session', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(users.qa);
  await loginPage.expectLoggedIn();
  await loginPage.page.context().storageState({ path: AUTH_FILE });
});
```

```ts
// playwright.config.ts (rút gọn)
export const AUTH_FILE = 'playwright/.auth/user.json';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'ui',
      testMatch: 'ui/**/*.spec.ts',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
    { name: 'api', testMatch: 'api/**/*.spec.ts' },
    { name: 'visual', testMatch: 'visual/**/*.spec.ts', use: { /* ... */ } },
  ],
});
```

Hai điểm cần nhớ:

- `playwright/.auth/` chứa phiên đăng nhập, phải nằm trong `.gitignore` (repo đã làm).
- Test **đăng nhập** thì ngược lại: phải chạy với phiên trống. Xem [tests/ui/login.spec.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/ui/login.spec.ts):

```ts
test.describe('Login (anonymous visitor)', () => {
  // Negative and positive login flows must not reuse the stored session.
  test.use({ storageState: { cookies: [], origins: [] } });
  // ...
});
```

Chạy thử:

```bash
npx playwright test --project=ui          # tự chạy setup trước
npx playwright test --project=ui --ui     # chế độ UI để debug
npx playwright show-report                # mở HTML report
```

Các spec UI của repo nằm ở [tests/ui/](https://github.com/nguyenvanlinh14/qa-agent-portfolio/tree/main/tests/ui).

## 5. Locator priority

Thứ tự ưu tiên (đúng như trong `CLAUDE.md`):

| Ưu tiên | Locator | Khi nào dùng |
|---|---|---|
| 1 | `getByRole('button', { name })` | Mọi thứ có role: nút, link, heading, checkbox, list |
| 2 | `getByLabel(...)` | Ô nhập form |
| 3 | `getByTestId('remaining')` | Không có role/nhãn đủ rõ; dùng `data-testid` |
| 4 | `getByText`, `getByPlaceholder` | Chỉ khi các cách trên không khớp |
| 5 | CSS | Phương án cuối, kèm comment giải thích. Không XPath |

Vì sao? Role + name giống cách người dùng và công nghệ hỗ trợ nhìn trang; còn CSS như `.btn.primary:nth-child(2)` vỡ ngay khi đổi style. Hãy thu hẹp phạm vi bằng chaining và `filter()` thay vì `nth()`:

```ts
const row = page.getByRole('listitem').filter({ hasText: title });
await row.getByRole('checkbox').check();
```

## 6. Web-first assertions

`expect(locator)` tự **retry** đến khi đúng hoặc hết timeout (7 giây trong cấu hình của repo), nên bạn không cần `waitForTimeout`:

```ts
// Tốt: retry tự động
await expect(todoPage.items).toHaveCount(2);
await expect(todoPage.remaining).toHaveText('1 item left');
await expect(todoPage.item(title)).toBeVisible();
await expect(page).toHaveURL(/\/demo\/todos\.html$/);

// Xấu: chụp một lần rồi so sánh -> flaky
expect(await todoPage.items.count()).toBe(2);

// Xấu: ngủ cố định
await page.waitForTimeout(2000);
```

Một spec hoàn chỉnh, rút từ [tests/ui/todos.spec.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/ui/todos.spec.ts):

```ts
import { test, expect } from '../fixtures';
import { aTodo } from '../data';

test.describe('Todos', () => {
  test.beforeEach(async ({ todoPage }) => {
    await todoPage.open();
  });

  test('@smoke adding a todo lists it', async ({ todoPage }) => {
    const { title } = aTodo().build();
    await todoPage.add(title);
    await expect(todoPage.item(title)).toBeVisible();
    await expect(todoPage.newTodo).toBeEmpty();
  });

  test('@regression remaining counter tracks open todos', async ({ todoPage }) => {
    const first = aTodo().build().title;
    const second = aTodo().build().title;
    await expect(todoPage.remaining).toHaveText('0 items left');
    await todoPage.add(first);
    await expect(todoPage.remaining).toHaveText('1 item left');
    await todoPage.add(second);
    await todoPage.toggle(first);
    await expect(todoPage.remaining).toHaveText('1 item left');
  });
});
```

Dữ liệu sinh bằng builder trong [tests/data/](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/data/todo-builder.ts): `aTodo()` cho sẵn tiêu đề duy nhất (`"Todo [3fa9c1d2]"`), và bạn chỉ ghi đè thứ test thật sự quan tâm (`withPrefix('Open')`, `done()`...). Nhờ đó mỗi test có dữ liệu riêng và không đụng nhau khi chạy song song.

## 7. Tags

Gắn tag ngay đầu tên test (hoặc dùng tùy chọn `{ tag: '@smoke' }`), rồi lọc bằng `--grep`:

```bash
npx playwright test --grep @smoke             # nhanh, chạy sau mỗi commit
npx playwright test --grep @regression        # đầy đủ, chạy trước release
npx playwright test --grep-invert @slow       # bỏ nhóm chậm
```

Quy ước của repo: `@smoke` = vài chục giây, đường đi quan trọng nhất; `@regression` = phần còn lại. Mỗi test **phải** có một trong hai tag.

## Lỗi thường gặp / anti-patterns

1. **Page object "thần thánh"**: một class 800 dòng cho cả app. Tách theo trang hoặc thành phần.
2. **Assertion ẩn trong page object** (`assertLoggedIn()` ở mọi nơi): khó tái sử dụng, nguồn kỳ vọng bị giấu. Trả về locator, để spec assert. (Repo có `expectLoggedIn()` ở `LoginPage` chỉ để dùng cho bước setup, nơi không có "kỳ vọng nghiệp vụ" nào đáng bàn.)
3. **`waitForTimeout` / `sleep`**: luôn có web-first assertion thay thế.
4. **Locator theo CSS hoặc index** (`.nth(3)`): vỡ khi thứ tự đổi.
5. **Đăng nhập qua UI trong mỗi test**: dùng `storageState`.
6. **Test phụ thuộc nhau** (test 2 cần todo do test 1 tạo): mỗi test tự tạo dữ liệu của mình.
7. **Import `test` từ `@playwright/test` ở một số file và từ fixtures ở file khác**: bạn mất fixture; quy tắc số 8 trong `CLAUDE.md` cấm điều này.
8. **Commit `playwright/.auth/user.json`**: lộ phiên đăng nhập.
9. **Magic string** (`'Buy milk'` rải rác): dùng builder để tiêu đề duy nhất và có ý nghĩa.

## Bài tập thực hành

1. Chạy `npx playwright test --project=ui --headed` và quan sát project `setup` chạy trước.
2. Thêm test cho bộ lọc **All** vào `tests/ui/todos.spec.ts`, có tag `@regression`, dùng `aTodo()` và `todoPage.filter(...)`.
3. Đổi nhãn nút "Sign in" trong bản sao của `site/demo/index.html` thành "Log in". Bao nhiêu file test phải sửa? (Đáp án đúng khi POM tốt: một, `login.page.ts`.)
4. Viết thêm một fixture `todoPageWithItems` đã `open()` và thêm sẵn hai todo, rồi dùng nó trong hai test.
5. Viết test "ký tự đặc biệt trong tiêu đề" (`<b>x</b>`) và kiểm tra nó hiển thị như văn bản, không như HTML.
6. Chạy `npx playwright test --grep @smoke --repeat-each=5` để kiểm tra độ ổn định của nhóm smoke.

## Checklist tóm tắt

- [ ] Mỗi trang là một page object kế thừa `BasePage`; chỉ có locator và hành động.
- [ ] Spec import `test`/`expect` từ `tests/fixtures`, nhận `homePage`, `loginPage`, `todoPage`, `api` qua fixture.
- [ ] Project `setup` đăng nhập một lần; `ui` dùng `dependencies: ['setup']` + `storageState`.
- [ ] Test đăng nhập dùng `storageState` rỗng.
- [ ] Locator theo thứ tự: role → label → test id → text → CSS.
- [ ] Chỉ dùng web-first assertions; không `waitForTimeout`.
- [ ] Dữ liệu từ builder/factory; test độc lập và chạy song song được.
- [ ] Mỗi test có tag `@smoke` hoặc `@regression`.
- [ ] `playwright/.auth/` và `reports/` nằm trong `.gitignore`.
