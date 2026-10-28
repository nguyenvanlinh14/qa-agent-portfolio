---
title: Design patterns trong test automation - POM, Builder, Fixture, Strategy và hơn thế
short: Design Patterns
icon: puzzle
---

# Design patterns trong test automation

> **Lưu ý:** demo app hiện là MarketFlow; các ví dụ `TodoPage` trong bài minh họa cùng những pattern đó.

Test là code, và code test bị bỏ mặc sẽ thối rữa còn nhanh hơn code sản phẩm. Design pattern không phải để "cho đẹp"; mỗi pattern là một câu trả lời đã được kiểm chứng cho một nỗi đau cụ thể: locator lặp ở 40 chỗ, dữ liệu test rối như tơ vò, setup lặp đi lặp lại, hay mỗi test đăng nhập một kiểu. Bài này đi qua sáu pattern (POM, Screenplay, Builder, Factory, Fixture, Strategy), một anti-pattern (Singleton) và cách chọn giữa chúng, với code TypeScript gắn vào các thư mục thật của repo: [`tests/pages`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/tree/main/tests/pages), [`tests/data`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/tree/main/tests/data), [`tests/fixtures`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/fixtures/index.ts).

## Mục tiêu bài học

- Nhận ra nỗi đau mà mỗi pattern giải quyết và biết khi nào *không* nên dùng nó.
- Viết Page Object sạch, Builder/Factory cho dữ liệu, fixture tự dọn dẹp.
- Dùng Strategy để chọn cách đăng nhập (UI, API, storageState) theo ngữ cảnh.
- Biết vì sao Singleton gây hại trong test chạy song song.
- Có bảng quyết định để chọn pattern cho tình huống thực tế.

## Khái niệm và ví dụ

### 1. Page Object Model (POM)

**Nỗi đau**: locator và thao tác lặp ở nhiều test; UI đổi một nút, phải sửa 30 file.
**Ý tưởng**: mỗi trang (hoặc vùng) là một class, che giấu locator và đưa ra các hành động ở mức *nghiệp vụ*.

```ts
// tests/pages/base.page.ts
import type { Locator, Page } from '@playwright/test';

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
import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import type { Credentials } from '../data/factories';

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

  async expectLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/demo\/todos\.html$/);
  }
}
```

Hai file thật nằm ở [`tests/pages/base.page.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/base.page.ts) và [`tests/pages/login.page.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/pages/login.page.ts); cùng thư mục còn `home.page.ts`, `todo.page.ts`, `lesson.page.ts`. Để ý `expectLoggedIn` là một helper `expect` nhỏ, chỉ xác nhận trạng thái *do chính hành động vừa làm gây ra*, còn nghiệp vụ lớn thì để test quyết định.

Quy tắc vàng của POM:

- Page Object **không chứa assertion về nghiệp vụ lớn**; chỉ nên có các helper `expectX` nhỏ, còn quyết định pass/fail thuộc về test.
- Trả về locator hoặc dữ liệu, đừng nuốt lỗi bằng `try/catch`.
- Dùng locator theo vai trò (`getByRole`, `getByLabel`) trước, `data-testid` sau, CSS/XPath cuối cùng.
- Một Page Object đại diện một khái niệm giao diện, không phải một "God class" cho cả ứng dụng.

Chi tiết xem bài 02.

### 2. Screenplay

**Nỗi đau**: POM phình to khi luồng nghiệp vụ chạy xuyên nhiều trang, hoặc khi nhiều vai trò (admin, khách) cùng làm một việc theo cách khác nhau.
**Ý tưởng**: nghĩ theo *diễn viên* (Actor) có *khả năng* (Ability: duyệt web, gọi API), thực hiện *nhiệm vụ* (Task) gồm các *hành động* (Action), rồi đặt *câu hỏi* (Question) về trạng thái.

```ts
// Ví dụ tối giản, không cần thư viện.
type Ability = { page: import('@playwright/test').Page };

class Actor {
  constructor(public readonly name: string, private readonly abilities: Ability) {}
  async attemptsTo(...tasks: Array<(a: Ability) => Promise<void>>) {
    for (const task of tasks) await task(this.abilities);
  }
  async asks<T>(question: (a: Ability) => Promise<T>) {
    return question(this.abilities);
  }
}

// Task: thành phần nghiệp vụ, đọc như văn xuôi.
const LogInAs = (email: string, password: string) => async ({ page }: Ability) => {
  await page.goto('/demo/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};
const AddTodo = (title: string) => async ({ page }: Ability) => {
  await page.getByLabel('New todo', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
};
// Question
const TodoTitles = async ({ page }: Ability) =>
  page.getByRole('list', { name: 'Todo list' }).getByRole('listitem').allTextContents();

// Dùng trong test:
//   const linh = new Actor('Linh', { page });
//   await linh.attemptsTo(LogInAs('qa@demo.dev', 'Passw0rd!'), AddTodo('Write lesson'));
//   expect((await linh.asks(TodoTitles)).join()).toContain('Write lesson');
```

Screenplay tăng khả năng đọc và tái sử dụng ở quy mô lớn, nhưng thêm nhiều khái niệm. Với một ứng dụng nhỏ như TaskFlow, **POM + fixture là đủ**; hãy cân nhắc Screenplay khi suite có nhiều vai trò, luồng dài và nhiều đội cùng viết.

### 3. Builder

**Nỗi đau**: tạo một object phức tạp mà chỉ cần đổi một vài trường; các test truyền cả đống tham số vô nghĩa.
**Ý tưởng**: dựng object từng bước với giá trị mặc định hợp lệ, test chỉ nêu điều *khác biệt*.

```ts
// tests/data/todo-builder.ts (rút gọn)
import { uniqueTitle } from './factories';

export interface TodoInput {
  title: string;
  done: boolean;
}

export class TodoBuilder {
  private title = uniqueTitle();
  private isDone = false;

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  /** Đúng `length` ký tự; giới hạn của API là 120. */
  withTitleLength(length: number): this {
    this.title = 'x'.repeat(length);
    return this;
  }

  done(): this {
    this.isDone = true;
    return this;
  }

  build(): TodoInput {
    return { title: this.title, done: this.isDone };
  }
}

export const aTodo = (): TodoBuilder => new TodoBuilder();

// Test chỉ nói điều quan trọng:
//   const { title } = aTodo().withTitleLength(121).build();
//   expect((await qaApi.createTodo(title)).status).toBe(422);
```

Giá trị mặc định có tính duy nhất (hậu tố UUID ngắn trong `uniqueTitle()`) giúp các test chạy song song không đụng nhau. Bản đầy đủ nằm ở [`tests/data/todo-builder.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/data/todo-builder.ts). Biên giá trị (120/121 ký tự) khớp đúng validation của [`server/app.mjs`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/server/app.mjs).

### 4. Factory

**Nỗi đau**: cần tạo nhiều loại object khác nhau, hoặc dữ liệu đã nằm sẵn trên server (qua API).
**Ý tưởng**: một hàm/đối tượng tạo ra sản phẩm đúng loại; ở test, factory thường "tạo thật" qua API để dựng tiền điều kiện.

```ts
// tests/data/factories.ts (rút gọn)
import { randomUUID } from 'node:crypto';

export interface Credentials {
  email: string;
  password: string;
}

/** Hậu tố ngẫu nhiên ngắn: mỗi test tạo dữ liệu riêng, an toàn khi chạy song song. */
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

/** Ví dụ: "Write smoke test [3fa9c1d2]". */
export function uniqueTitle(prefix = 'Todo'): string {
  return `${prefix} [${uniqueSuffix()}]`;
}

export const users = {
  qa: { email: 'qa@demo.dev', password: 'Passw0rd!' } satisfies Credentials,
  dev: { email: 'dev@demo.dev', password: 'Passw0rd!' } satisfies Credentials,
};

/** Các "biến thể xấu" tạo theo yêu cầu. */
export function wrongPasswordUser(): Credentials {
  return { email: users.qa.email, password: `wrong-${uniqueSuffix()}` };
}
export function unknownUser(): Credentials {
  return { email: `nobody-${uniqueSuffix()}@demo.dev`, password: 'Passw0rd!' };
}
```

Factory ở đây là các hàm sinh dữ liệu theo *loại* (user hợp lệ, sai mật khẩu, không tồn tại); file thật ở [`tests/data/factories.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/data/factories.ts). Khi cần dựng tiền điều kiện trên server, test gọi factory rồi đưa kết quả cho `ApiClient` (`qaApi.createTodo(aTodo().build().title)`).

Builder và Factory hay đi cùng nhau: **Builder** lo *hình dạng* của object, **Factory** lo *việc tạo ra nó ở đâu* (trong bộ nhớ, qua API, qua DB).

### 5. Fixture

**Nỗi đau**: setup/teardown lặp lại; `beforeEach`/`afterEach` rải rác; test phải biết quá nhiều cách khởi tạo.
**Ý tưởng**: khai báo "thứ test cần", framework dựng trước và dọn sau. Playwright có sẵn cơ chế này, và nó thay thế phần lớn `beforeEach/afterEach`.

```ts
// tests/fixtures/index.ts (rút gọn)
import { test as base, expect } from '@playwright/test';
import { ApiClient } from './api-client';
import { users } from '../data/factories';
import { LoginPage, TodoPage } from '../pages';

interface Fixtures {
  loginPage: LoginPage;
  todoPage: TodoPage;
  api: ApiClient;   // chưa đăng nhập
  qaApi: ApiClient; // đã đăng nhập là qa@demo.dev
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  todoPage: async ({ page }, use) => use(new TodoPage(page)),
  api: async ({ request }, use) => use(new ApiClient(request)),
  qaApi: async ({ request }, use) => use(await new ApiClient(request).signIn(users.qa)),
});

export { expect };
```

File thật: [`tests/fixtures/index.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/fixtures/index.ts). Fixture cũng có thể có bước dọn sau `use()`. Ví dụ một fixture tạo todo và xoá nó khi test kết thúc (kể cả khi test fail):

```ts
seededTodo: async ({ qaApi }, use) => {
  const todo = unwrap(await qaApi.createTodo(uniqueTitle('seed')));
  await use(todo);
  await qaApi.deleteTodo(todo.id);
},
```

Dùng trong test, không còn thấy `new`, không còn hook (ví dụ dưới là bản rút gọn, xem `tests/ui/todos.spec.ts` để có bản thật):

```ts
import { test, expect } from '../fixtures';
import { uniqueTitle } from '../data/factories';

test('add and toggle a todo @smoke', async ({ todoPage }) => {
  const title = uniqueTitle('Toggle me');
  await todoPage.open();
  await todoPage.add(title);
  await todoPage.toggle(title);
  await expect(todoPage.item(title)).toBeVisible();
});
```

Fixture có thể có phạm vi `test` (mặc định) hoặc `worker` (dựng một lần cho mỗi worker, nhanh hơn nhưng phải bất biến). Nó cũng *lazy*: fixture không được test nào dùng thì không chạy.

### 6. Strategy: chọn cách đăng nhập

**Nỗi đau**: có ba cách đăng nhập (qua UI, qua API, dùng `storageState` đã lưu), và mỗi test tự chọn rồi copy code.
**Ý tưởng**: định nghĩa một interface chung, nhiều cài đặt hoán đổi được, và chọn cài đặt tại *một chỗ*.

```ts
// ví dụ minh hoạ: tests/fixtures/auth-strategies.ts
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages';
import { users } from '../data/factories';

export interface AuthStrategy {
  readonly name: string;
  /** Làm cho `page` ở trạng thái đã đăng nhập. */
  signIn(page: Page): Promise<void>;
}

/** Đi qua form đăng nhập thật. Chậm, nhưng dùng cho chính test login. */
export const uiLogin: AuthStrategy = {
  name: 'ui',
  async signIn(page) {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.qa);
    await login.expectLoggedIn();
  },
};

/**
 * Bỏ qua form: ghi trực tiếp phiên vào localStorage trước khi trang tải.
 * Demo của repo lưu phiên ở khoá `taskflow.session` (xem site/demo/demo.js).
 */
export const seededSession: AuthStrategy = {
  name: 'seeded-session',
  async signIn(page) {
    await page.addInitScript((email) => {
      localStorage.setItem('taskflow.session', JSON.stringify({ email, at: Date.now() }));
    }, users.qa.email);
  },
};

/** Dùng file storageState do project `setup` tạo ra; project đã nạp nó nên không phải làm gì. */
export const storageStateLogin: AuthStrategy = {
  name: 'storageState',
  async signIn() {},
};

export function pickStrategy(): AuthStrategy {
  switch (process.env.AUTH_STRATEGY) {
    case 'ui': return uiLogin;
    case 'seeded': return seededSession;
    default: return storageStateLogin;
  }
}
```

Lưu ý: file `auth-strategies.ts` là ví dụ minh hoạ, repo hiện dùng cách thứ ba (project `setup` trong [`tests/setup/auth.setup.ts`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/setup/auth.setup.ts) đăng nhập một lần và lưu `storageState`). Demo giữ phiên trong `localStorage` nên cách thứ hai khả thi; còn việc đăng nhập bằng API (Bearer token) áp dụng cho `/api/*` qua `qaApi`, không áp dụng cho UI của demo. Điểm cốt lõi là test chỉ gọi `strategy.signIn(page)` và không cần biết cách nó hoạt động. Nguyên tắc chung:

| Tình huống | Strategy nên dùng |
|---|---|
| Test của chính màn hình login | `uiLogin` |
| Test cần đăng nhập nhưng không xoay quanh login | `storageStateLogin` (mặc định) |
| Cần phiên/user riêng theo từng test, không muốn tốn thời gian qua form | `seededSession` |

### 7. Singleton: anti-pattern trong test

Singleton (một instance toàn cục dùng chung) rất dễ bị cám dỗ: `Database.getInstance()`, `BrowserManager.getInstance()`, một `TestContext` toàn cục. Trong test nó gây hại vì:

- **Trạng thái dùng chung** giữa các test làm test phụ thuộc thứ tự và phá vỡ cách ly.
- **Chạy song song hỏng**: Playwright chia test cho nhiều worker (mỗi worker là một process riêng), và `fullyParallel` còn trộn thứ tự test. Singleton vừa không chia sẻ được giữa process, vừa tạo cảm giác sai lầm rằng nó chia sẻ được.
- Khó thay thế khi test (khó mock), khó đọc (phụ thuộc ẩn).

Thay thế bằng **fixture**: vòng đời rõ ràng (per-test hoặc per-worker), có teardown, và được "tiêm" qua tham số của test. Ví dụ điển hình trong repo: endpoint `/api/test/reset` xoá *toàn bộ* dữ liệu, một dạng trạng thái toàn cục, nên chỉ được dùng ở bước tuần tự, không gọi từ test chạy song song.

### Khi nào dùng gì

| Pattern | Giải quyết | Dùng khi | Tránh khi |
|---|---|---|---|
| **POM** | Locator/hành động lặp | Hầu như mọi UI test | Chỉ có 1-2 test, quá ít để trừu tượng hoá |
| **Screenplay** | Luồng nhiều trang/vai trò | Suite lớn, nhiều đội, ngôn ngữ nghiệp vụ | Dự án nhỏ, đội mới học |
| **Builder** | Object nhiều trường | Payload phức tạp, test biên | Object 1-2 trường |
| **Factory** | Tạo dữ liệu đúng loại/chỗ | Tiền điều kiện qua API/DB | Khi chỉ cần một literal |
| **Fixture** | Setup/teardown, dependency | Luôn luôn trong Playwright | Khi lạm dụng thành "God fixture" |
| **Strategy** | Nhiều cách làm một việc | Login, môi trường, nhà cung cấp | Chỉ có một cách duy nhất |
| **Singleton** | (không nên) | Hầu như không bao giờ trong test | Test song song, cần cách ly |

## Lỗi thường gặp

1. **Page Object chứa `expect` nghiệp vụ và logic rẽ nhánh**, trở thành nơi giấu test.
2. **God Page / God fixture** làm mọi thứ. Hãy tách theo khái niệm.
3. **Builder mặc định không duy nhất**, hai worker tạo cùng title và đụng nhau.
4. **Fixture tạo dữ liệu nhưng không dọn**, các lần chạy sau thấy "rác" của lần trước.
5. **Kế thừa sâu** (`AdminTodoPage extends TodoPage extends BasePage …`). Ưu tiên composition.
6. **Strategy trở thành `if (env)` rải khắp nơi** thay vì chọn ở một điểm duy nhất.
7. **Trừu tượng hoá sớm.** Hãy đợi lần lặp thứ ba rồi mới rút pattern.
8. **Dùng module-level `let` làm "trạng thái chia sẻ"** giữa các test (Singleton trá hình).

## Bài tập thực hành

1. Mở [`tests/pages`](https://github.com/nguyenvanlinh14/qa-agent-portfolio/tree/main/tests/pages) và tìm một chỗ Page Object đang làm quá nhiều. Tách nó thành hai class (ví dụ `TodoList` component và `TodoPage`).
2. Dùng `aTodo().withTitleLength(n)` viết test API kiểm tra ranh giới 120/121 ký tự (201 vs 422).
3. Viết fixture `authedPage` dùng `pickStrategy()`; chạy cùng một test với `AUTH_STRATEGY=ui` và `seeded`, so sánh thời gian.
4. Viết fixture cấp `worker` cung cấp một user duy nhất cho cả worker, và giải thích vì sao nó phải bất biến.
5. Viết lại một luồng "đăng nhập, thêm todo, kiểm tra" theo kiểu Screenplay, rồi so sánh với phiên bản POM: bạn thấy dễ đọc/ dễ bảo trì hơn ở đâu, tệ hơn ở đâu?
6. Tìm trong code (hoặc cố tình viết) một Singleton gây flaky khi chạy `--workers=4` và thay bằng fixture.

## Checklist tóm tắt

- [ ] Locator chỉ nằm trong Page Object, test đọc như đặc tả hành vi.
- [ ] Assertion nghiệp vụ nằm ở test, không nằm trong Page Object.
- [ ] Dữ liệu mặc định hợp lệ và duy nhất qua Builder; Factory quyết định chỗ tạo.
- [ ] Fixture có teardown, chọn đúng phạm vi `test` hay `worker`.
- [ ] Cách đăng nhập chọn bằng Strategy ở một điểm duy nhất.
- [ ] Không có Singleton hay biến toàn cục có thể thay đổi trong test.
- [ ] Ưu tiên composition hơn kế thừa; trừu tượng hoá khi đã lặp ba lần.
- [ ] Biết bảng "khi nào dùng gì" và có thể giải thích lựa chọn của mình.
