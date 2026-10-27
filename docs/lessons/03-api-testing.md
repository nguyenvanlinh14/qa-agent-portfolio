---
title: API Testing với Playwright — typed ApiClient, test dương/âm, cách ly dữ liệu và contract checks
short: API Testing
icon: api
---

# API Testing với Playwright request context

## Mục tiêu bài học

Sau bài này bạn sẽ:

- Dùng `APIRequestContext` của Playwright để test REST API mà **không cần mở trình duyệt**.
- Xây một **typed `ApiClient`** để spec ngắn gọn, có kiểu dữ liệu và dễ viết test âm tính.
- Viết bộ test **positive / negative** đúng mã trạng thái: 200/201/204, 400, 401, 404, 422.
- Đảm bảo **cách ly dữ liệu** giữa các test chạy song song và **dọn dẹp** những gì mình tạo ra.
- Thêm **contract checks** (kiểm tra hình dạng response) để bắt thay đổi phá vỡ hợp đồng API.

API được test là SUT của repo, [server/app.mjs](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/server/app.mjs), chạy ở `http://localhost:4173`:

| Endpoint | Hành vi |
|---|---|
| `GET /api/health` | `200 { status: 'ok', uptime }` |
| `POST /api/auth/login` `{ email, password }` | `200 { token, user: { email } }`; `400` thiếu trường; `401` sai thông tin |
| `GET /api/todos` | Danh sách todo **của user hiện tại**; `401` nếu không có Bearer token |
| `POST /api/todos` `{ title }` | `201` todo mới; `422` nếu title rỗng hoặc dài hơn 120 ký tự |
| `GET/PATCH/DELETE /api/todos/:id` | `200` / `200` / `204`; `404` nếu không tồn tại hoặc thuộc user khác |
| `POST /api/test/reset` | Xóa **toàn bộ** todo và token. **Không** gọi từ test chạy song song |

Tài khoản demo công khai: `qa@demo.dev` / `Passw0rd!` (và `dev@demo.dev` với cùng mật khẩu, dùng cho test cách ly giữa hai user).

## 1. Khái niệm

### Vì sao test API bằng Playwright?

Test API nhanh hơn UI hàng chục lần, ít flaky hơn, và chỉ ra lỗi chính xác hơn (lớp nào hỏng). Chúng cũng bổ trợ cho UI test: dùng API để **chuẩn bị dữ liệu** (tạo todo qua API thay vì click 10 lần) và để **kiểm tra trạng thái** sau thao tác UI. Playwright đã có sẵn `request` fixture, nên không cần thêm thư viện HTTP, và cùng một runner, cùng báo cáo, cùng cấu hình retry.

Trong `playwright.config.ts`, project `api` không khai báo trình duyệt: [playwright.config.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/playwright.config.ts).

```ts
{ name: 'api', testMatch: 'api/**/*.spec.ts' }
```

`baseURL` lấy từ `use.baseURL`, nên mọi đường dẫn trong spec chỉ cần `/api/...`.

### Kim tự tháp test và vị trí của API test

UI test kiểm tra "người dùng làm được việc này không", API test kiểm tra "hệ thống tuân thủ hợp đồng không". Một API test tốt phải trả lời được: *đầu vào nào*, *mã trạng thái nào*, *body có hình dạng gì*, *trạng thái hệ thống sau đó ra sao*.

## 2. Typed ApiClient

Gọi `request.post(...)` thẳng trong spec dẫn đến lặp URL, header, parse JSON và rất khó đọc. Giải pháp là một lớp mỏng bọc `APIRequestContext`: [tests/fixtures/api-client.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/fixtures/api-client.ts). Điểm thiết kế đáng học:

```ts
export interface Todo {
  id: string;
  title: string;
  done: boolean;
  owner: string;
  createdAt: string;
}

/** Typed result: `body` on success (2xx), `error` message on failure. */
export type ApiResult<T> =
  | { ok: true; status: number; body: T; error?: undefined }
  | { ok: false; status: number; body?: undefined; error: string };

/** Returns the body of a successful result or fails loudly with the server's error. */
export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`Expected success but got ${result.status}: ${result.error}`);
  return result.body;
}
```

Ý tưởng chính: **mỗi lời gọi trả về `ApiResult` thay vì ném lỗi khi gặp 4xx**. Test âm tính cần *đọc* status 401/422, còn test dương tính dùng `unwrap()` để "thành công hoặc nổ ngay với thông báo rõ ràng". Client có các phương thức tương ứng từng endpoint:

```ts
export class ApiClient {
  constructor(private readonly request: APIRequestContext, private token?: string) {}

  withToken(token: string): ApiClient { return new ApiClient(this.request, token); }
  async signIn(credentials: Credentials): Promise<ApiClient> { /* login rồi withToken */ }

  async health(): Promise<ApiResult<HealthBody>> { /* GET /api/health */ }
  async login(email: string, password: string): Promise<ApiResult<LoginBody>> { /* ... */ }
  async loginRaw(data: unknown): Promise<ApiResult<LoginBody>> { /* body tùy ý cho test âm */ }
  async listTodos(): Promise<ApiResult<Todo[]>> { /* ... */ }
  async createTodo(title: string): Promise<ApiResult<Todo>> { /* ... */ }
  async updateTodo(id: string, patch: TodoPatch): Promise<ApiResult<Todo>> { /* PATCH */ }
  async deleteTodo(id: string): Promise<ApiResult<undefined>> { /* ... */ }
}
```

`loginRaw(data: unknown)` là chi tiết nhỏ nhưng quan trọng: client có kiểu chặt cho đường dương, nhưng vẫn cho phép gửi body "sai kiểu" để test `400`.

Các fixture dựng sẵn trong [tests/fixtures/index.ts](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/tests/fixtures/index.ts):

| Fixture | Ý nghĩa |
|---|---|
| `api` | Client ẩn danh, không token |
| `qaApi` | Đã đăng nhập `qa@demo.dev` |
| `devApi` | Đã đăng nhập `dev@demo.dev` |

## 3. Ví dụ chạy được: positive tests

Tạo `tests/api/todos.spec.ts` (các spec API nằm trong [tests/api/](https://github.com/nguyenvanlinh14/qa-agent-portfolio/tree/main/tests/api)):

```ts
import { test, expect, unwrap } from '../fixtures';
import { aTodo } from '../data';

test.describe('Todos API: happy path', () => {
  test('@smoke health endpoint reports ok', async ({ api }) => {
    const res = await api.health();
    expect(res.status).toBe(200);
    expect(res.body?.status).toBe('ok');
  });

  test('@smoke login returns a token and the user', async ({ api }) => {
    const res = await api.login('qa@demo.dev', 'Passw0rd!');
    expect(res.status).toBe(200);
    expect(res.body?.token).toEqual(expect.any(String));
    expect(res.body?.user).toEqual({ email: 'qa@demo.dev' });
  });

  test('@smoke create then read a todo', async ({ qaApi }) => {
    const { title } = aTodo().build();
    const created = unwrap(await qaApi.createTodo(title));

    try {
      expect(created).toMatchObject({ title, done: false, owner: 'qa@demo.dev' });
      const fetched = unwrap(await qaApi.getTodo(created.id));
      expect(fetched).toEqual(created);
    } finally {
      await qaApi.deleteTodo(created.id); // dọn dẹp dù assertion có fail
    }
  });

  test('@regression patch marks a todo done', async ({ qaApi }) => {
    const created = unwrap(await qaApi.createTodo(aTodo().build().title));
    try {
      const updated = unwrap(await qaApi.updateTodo(created.id, { done: true }));
      expect(updated.done).toBe(true);
      expect(updated.title).toBe(created.title); // field khác không bị đổi
    } finally {
      await qaApi.deleteTodo(created.id);
    }
  });

  test('@regression delete removes the todo', async ({ qaApi }) => {
    const created = unwrap(await qaApi.createTodo(aTodo().build().title));
    const del = await qaApi.deleteTodo(created.id);
    expect(del.status).toBe(204);
    expect((await qaApi.getTodo(created.id)).status).toBe(404);
  });
});
```

Lưu ý: `expect(res.status).toBe(200)` là assertion thường (dữ liệu đã có sẵn trong bộ nhớ, không cần retry); khác với UI, nơi bạn luôn dùng web-first assertion.

## 4. Negative tests: 400 / 401 / 404 / 422

Test âm tính là nơi API test cho giá trị lớn nhất. Dùng `test.describe` + `for...of` (hoặc `test.step`) để tạo bảng case:

```ts
import { test, expect } from '../fixtures';
import { aTodo, wrongPasswordUser, unknownUser } from '../data';

test.describe('Auth API: negative', () => {
  const badBodies: Array<[string, unknown]> = [
    ['missing password', { email: 'qa@demo.dev' }],
    ['missing email', { password: 'Passw0rd!' }],
    ['non-string fields', { email: 123, password: true }],
    ['empty object', {}],
  ];

  for (const [name, body] of badBodies) {
    test(`@regression login rejects ${name} with 400`, async ({ api }) => {
      const res = await api.loginRaw(body);
      expect(res.status).toBe(400);
      expect(res.error).toBe('email and password are required');
    });
  }

  test('@regression wrong password returns 401', async ({ api }) => {
    const { email, password } = wrongPasswordUser();
    const res = await api.login(email, password);
    expect(res.status).toBe(401);
    expect(res.error).toBe('invalid credentials');
  });

  test('@regression unknown user returns 401', async ({ api }) => {
    const { email, password } = unknownUser();
    expect((await api.login(email, password)).status).toBe(401);
  });
});

test.describe('Todos API: negative', () => {
  test('@smoke todos require a token', async ({ api }) => {
    const res = await api.listTodos();
    expect(res.status).toBe(401);
  });

  test('@regression a made-up token is rejected', async ({ api }) => {
    const res = await api.withToken('not-a-real-token').listTodos();
    expect(res.status).toBe(401);
  });

  test('@regression blank title returns 422', async ({ qaApi }) => {
    const res = await qaApi.createTodo('   ');
    expect(res.status).toBe(422);
    expect(res.error).toBe('title is required');
  });

  test('@regression title over 120 chars returns 422', async ({ qaApi }) => {
    const res = await qaApi.createTodo(aTodo().withTitleLength(121).build().title);
    expect(res.status).toBe(422);
  });

  test('@regression title of exactly 120 chars is accepted (boundary)', async ({ qaApi }) => {
    const res = await qaApi.createTodo(aTodo().withTitleLength(120).build().title);
    expect(res.status).toBe(201);
    if (res.ok) await qaApi.deleteTodo(res.body.id);
  });

  test('@regression unknown id returns 404', async ({ qaApi }) => {
    const res = await qaApi.getTodo('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
```

Điểm kỹ thuật: **phân tích giá trị biên** (120 chấp nhận, 121 từ chối), **một sai phạm mỗi case** (để biết chính xác điều kiện nào gây lỗi), và kiểm tra cả **thông điệp lỗi** chứ không chỉ mã trạng thái, nếu thông điệp là một phần hợp đồng.

## 5. Cách ly dữ liệu và dọn dẹp

SUT lưu todo trong bộ nhớ, dùng chung cho mọi worker. Playwright chạy các file spec song song (`fullyParallel: true`), nên nếu hai test cùng giả định "danh sách đang rỗng", chúng sẽ giẫm chân nhau.

Ba nguyên tắc của repo:

1. **Dữ liệu duy nhất cho mỗi test.** `aTodo()` tạo tiêu đề dạng `Todo [3fa9c1d2]`; bạn không bao giờ assert "danh sách có đúng 1 phần tử" trên tài nguyên dùng chung, mà assert "danh sách *chứa* todo của tôi":

```ts
test('@regression created todo appears in the list', async ({ qaApi }) => {
  const created = unwrap(await qaApi.createTodo(aTodo().build().title));
  try {
    const list = unwrap(await qaApi.listTodos());
    expect(list.map((t) => t.id)).toContain(created.id);
  } finally {
    await qaApi.deleteTodo(created.id);
  }
});
```

2. **Cách ly theo user.** Todo thuộc về `owner`; user khác không thấy và không sửa được. Đây là test an toàn quan trọng (kiểm soát truy cập), dùng hai fixture `qaApi` và `devApi`:

```ts
test('@regression a user cannot see or touch another user\'s todo', async ({ qaApi, devApi }) => {
  const mine = unwrap(await qaApi.createTodo(aTodo().build().title));
  try {
    expect((await devApi.getTodo(mine.id)).status).toBe(404);
    expect((await devApi.updateTodo(mine.id, { done: true })).status).toBe(404);
    expect((await devApi.deleteTodo(mine.id)).status).toBe(404);

    const theirList = unwrap(await devApi.listTodos());
    expect(theirList.map((t) => t.id)).not.toContain(mine.id);

    expect(unwrap(await qaApi.getTodo(mine.id)).done).toBe(false); // vẫn nguyên vẹn
  } finally {
    await qaApi.deleteTodo(mine.id);
  }
});
```

Server trả `404` (không phải `403`) cho tài nguyên của người khác, để không lộ sự tồn tại của nó; test này ghi lại quyết định thiết kế đó.

3. **Dọn dẹp trong `finally`** (hoặc fixture có teardown), để test fail giữa chừng không để rác lại. Với nhiều test cần dọn, bạn có thể viết một fixture:

```ts
const test = base.extend<{ todo: Todo }>({
  todo: async ({ qaApi }, use) => {
    const created = unwrap(await qaApi.createTodo(aTodo().build().title));
    await use(created);
    await qaApi.deleteTodo(created.id); // chạy cả khi test fail
  },
});
```

**Cấm `POST /api/test/reset` trong test song song**: endpoint này xóa todo và token của *tất cả* test đang chạy, gây lỗi 401/404 ngẫu nhiên rất khó truy nguyên. Nó chỉ chấp nhận được trong một khối `describe.serial` là người dùng API duy nhất tại thời điểm đó (quy tắc 10 trong [CLAUDE.md](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/CLAUDE.md)).

## 6. Contract checks

Test chức năng nói "hành vi đúng"; **contract check** nói "hình dạng đúng". Khi backend đổi tên field `createdAt` thành `created_at`, các test chỉ kiểm tra `title` vẫn xanh, trong khi client thật sự gãy. Hãy khóa hình dạng response:

```ts
test('@regression todo response matches the contract', async ({ qaApi }) => {
  const created = unwrap(await qaApi.createTodo(aTodo().build().title));
  try {
    expect(created).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      title: expect.any(String),
      done: expect.any(Boolean),
      owner: 'qa@demo.dev',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(Object.keys(created).sort()).toEqual(['createdAt', 'done', 'id', 'owner', 'title']);
  } finally {
    await qaApi.deleteTodo(created.id);
  }
});

test('@regression error responses share one shape', async ({ api, qaApi }) => {
  for (const res of [await api.listTodos(), await qaApi.createTodo(''), await qaApi.getTodo('nope')]) {
    expect(res.ok).toBe(false);
    expect(res.error).toEqual(expect.any(String));
  }
});
```

`toEqual` với asymmetric matcher (`expect.any`, `expect.stringMatching`) bắt cả field thiếu lẫn field thừa. Với API lớn hơn, bạn có thể thay bằng JSON Schema, nhưng nguyên tắc không đổi: *hợp đồng được kiểm tra bằng máy, không bằng mắt*. Cũng nhớ kiểm tra header khi nó quan trọng: `res.headers()['content-type']` chứa `application/json`.

## 7. Dùng API để tăng tốc UI test

Cùng `ApiClient` có thể chuẩn bị dữ liệu cho UI test (khi app dùng backend thật). Demo TaskFlow trên Pages lưu todo trong `localStorage` nên UI không đi qua `/api`, nhưng mô hình vẫn giống hệt: **arrange bằng API, act bằng UI, assert bằng UI (và/hoặc API)**. Điều này giúp UI test ngắn, ổn định và đúng một mục đích.

Chạy:

```bash
npx playwright test --project=api                 # toàn bộ API test
npx playwright test --project=api --grep @smoke   # chỉ smoke
npx playwright test tests/api/todos.spec.ts --repeat-each=5 --workers=4
```

`--repeat-each` với nhiều worker là cách rẻ nhất để phát hiện test không cách ly được.

## Lỗi thường gặp / anti-patterns

1. **Chỉ test happy path.** Phần lớn bug nằm ở 4xx: thiếu validate, sai mã trạng thái, lộ dữ liệu giữa user.
2. **Chỉ assert status code.** `200` với body rỗng vẫn là bug. Kiểm tra body và hình dạng.
3. **Phụ thuộc thứ tự test** (test B dùng todo do test A tạo). Mỗi test tự tạo và tự dọn.
4. **Assert trên trạng thái dùng chung** ("danh sách có đúng 3 phần tử") khi chạy song song.
5. **Gọi `/api/test/reset` trong test song song**: phá dữ liệu của test khác.
6. **Hard-code dữ liệu** (`'Buy milk'`): va chạm giữa test và không đọc được ý định. Dùng `aTodo()`.
7. **Không dọn dẹp** khi test fail: dùng `try/finally` hoặc fixture có teardown.
8. **Token thật trong repo.** Chỉ dùng tài khoản demo công khai; secrets thật nằm ở biến môi trường.
9. **Bắt lỗi bằng `try/catch` nuốt exception**: test luôn xanh. Dùng `ApiResult` và `unwrap`.
10. **Gộp nhiều sai phạm vào một case âm tính**: không biết điều kiện nào được kiểm tra.

## Bài tập thực hành

1. Chạy `npm run serve` và thử tay bằng `curl`:
   ```bash
   curl -s -X POST localhost:4173/api/auth/login -H 'content-type: application/json' \
     -d '{"email":"qa@demo.dev","password":"Passw0rd!"}'
   ```
   Sau đó dùng token nhận được để gọi `GET /api/todos` với header `Authorization: Bearer <token>`.
2. Viết `tests/api/todos.spec.ts` gồm đủ năm test dương tính ở mục 3 và chạy với `--repeat-each=5`.
3. Bổ sung bảng case âm tính cho `PATCH /api/todos/:id` (JSON sai, `done` không phải boolean). Quan sát server làm gì và quyết định test nên khẳng định điều gì.
4. Viết test cách ly: `devApi` không thấy, không sửa, không xóa todo của `qaApi`.
5. Viết contract test cho `GET /api/health` (có `status` là string và `uptime` là number dương).
6. Thêm một fixture `todo` có teardown (mục 5) và dùng nó trong hai test.
7. (Nâng cao) Thêm một test cố tình dùng `/api/test/reset` trong `describe.serial`, rồi chạy cùng bộ test song song và xem điều gì xảy ra. Vì sao quy tắc 10 tồn tại?

## Checklist tóm tắt

- [ ] Project `api` không mở trình duyệt; spec dùng `ApiClient` có kiểu, không gọi `request.*` thô.
- [ ] Mỗi endpoint có test dương **và** âm: 400, 401, 404, 422 và giá trị biên.
- [ ] Assert cả status, body và (khi quan trọng) thông điệp lỗi.
- [ ] Dữ liệu duy nhất mỗi test (`aTodo()`); không phụ thuộc thứ tự.
- [ ] Dọn dẹp bằng `try/finally` hoặc fixture teardown.
- [ ] Có test cách ly giữa hai user (`qaApi` vs `devApi`).
- [ ] Có contract check cho hình dạng response thành công và lỗi.
- [ ] Không gọi `/api/test/reset` trong test song song; không có secret thật trong repo.
