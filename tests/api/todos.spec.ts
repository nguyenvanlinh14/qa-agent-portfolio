import { test, expect, unwrap } from '../fixtures';
import { aTodo, uniqueSuffix } from '../data';

test.describe('Todos CRUD', () => {
  test('@smoke full lifecycle: create, read, update, delete', async ({ qaApi }) => {
    const { title } = aTodo().build();

    const created = await qaApi.createTodo(title);
    expect(created.status).toBe(201);
    const todo = unwrap(created);
    expect(todo).toMatchObject({ title, done: false, owner: 'qa@demo.dev' });
    expect(todo.id).toBeTruthy();

    const fetched = await qaApi.getTodo(todo.id);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(todo);

    const updated = await qaApi.updateTodo(todo.id, { done: true });
    expect(updated.status).toBe(200);
    expect(updated.body?.done).toBe(true);

    const deleted = await qaApi.deleteTodo(todo.id);
    expect(deleted.status).toBe(204);

    const gone = await qaApi.getTodo(todo.id);
    expect(gone.status).toBe(404);
  });

  test('@regression created todo appears in the list', async ({ qaApi }) => {
    const todo = unwrap(await qaApi.createTodo(aTodo().build().title));
    const list = await qaApi.listTodos();
    expect(list.status).toBe(200);
    expect(list.body?.map((t) => t.id)).toContain(todo.id);
  });

  test('@regression update can rename a todo', async ({ qaApi }) => {
    const todo = unwrap(await qaApi.createTodo(aTodo().build().title));
    const newTitle = `Renamed ${uniqueSuffix()}`;
    const res = await qaApi.updateTodo(todo.id, { title: newTitle });
    expect(res.status).toBe(200);
    expect(res.body?.title).toBe(newTitle);
  });

  test('@regression title is trimmed on create', async ({ qaApi }) => {
    const title = aTodo().build().title;
    const res = await qaApi.createTodo(`   ${title}   `);
    expect(res.status).toBe(201);
    expect(res.body?.title).toBe(title);
  });

  test('@regression a title of exactly 120 characters is accepted', async ({ qaApi }) => {
    const res = await qaApi.createTodo(aTodo().withTitleLength(120).build().title);
    expect(res.status).toBe(201);
  });
});

test.describe('Todos authorization', () => {
  test('@smoke listing without a token returns 401', async ({ api }) => {
    const res = await api.listTodos();
    expect(res.status).toBe(401);
    expect(res.error).toBe('unauthorized');
  });

  test('@regression creating without a token returns 401', async ({ api }) => {
    const res = await api.createTodo(aTodo().build().title);
    expect(res.status).toBe(401);
  });

  test('@regression an invalid token returns 401', async ({ api }) => {
    const res = await api.withToken(`bogus-${uniqueSuffix()}`).listTodos();
    expect(res.status).toBe(401);
  });
});

test.describe('Todos validation', () => {
  test('@regression empty title returns 422', async ({ qaApi }) => {
    const res = await qaApi.createTodo('');
    expect(res.status).toBe(422);
    expect(res.error).toBe('title is required');
  });

  test('@regression whitespace-only title returns 422', async ({ qaApi }) => {
    const res = await qaApi.createTodo('    ');
    expect(res.status).toBe(422);
  });

  test('@regression title longer than 120 characters returns 422', async ({ qaApi }) => {
    const res = await qaApi.createTodo(aTodo().withTitleLength(121).build().title);
    expect(res.status).toBe(422);
    expect(res.error).toBe('title must be <= 120 chars');
  });
});

test.describe('Todos not found', () => {
  const unknownId = () => `00000000-0000-4000-8000-${uniqueSuffix()}0000`;

  test('@regression getting an unknown id returns 404', async ({ qaApi }) => {
    const res = await qaApi.getTodo(unknownId());
    expect(res.status).toBe(404);
    expect(res.error).toBe('todo not found');
  });

  test('@regression updating an unknown id returns 404', async ({ qaApi }) => {
    const res = await qaApi.updateTodo(unknownId(), { done: true });
    expect(res.status).toBe(404);
  });

  test('@regression deleting an unknown id returns 404', async ({ qaApi }) => {
    const res = await qaApi.deleteTodo(unknownId());
    expect(res.status).toBe(404);
  });
});

test.describe('Todos isolation between users', () => {
  test('@smoke another user does not see my todos in the list', async ({ qaApi, devApi }) => {
    const mine = unwrap(await qaApi.createTodo(aTodo().build().title));
    const theirs = await devApi.listTodos();
    expect(theirs.status).toBe(200);
    expect(theirs.body?.map((t) => t.id)).not.toContain(mine.id);
  });

  test('@regression another user cannot read my todo by id', async ({ qaApi, devApi }) => {
    const mine = unwrap(await qaApi.createTodo(aTodo().build().title));
    expect((await devApi.getTodo(mine.id)).status).toBe(404);
  });

  test('@regression another user cannot update my todo', async ({ qaApi, devApi }) => {
    const mine = unwrap(await qaApi.createTodo(aTodo().build().title));
    expect((await devApi.updateTodo(mine.id, { done: true })).status).toBe(404);
    expect((await qaApi.getTodo(mine.id)).body?.done).toBe(false);
  });

  test('@regression another user cannot delete my todo', async ({ qaApi, devApi }) => {
    const mine = unwrap(await qaApi.createTodo(aTodo().build().title));
    expect((await devApi.deleteTodo(mine.id)).status).toBe(404);
    expect((await qaApi.getTodo(mine.id)).status).toBe(200);
  });
});
