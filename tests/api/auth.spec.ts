import { test, expect } from '../fixtures';
import { unknownUser, users, wrongPasswordUser } from '../data';

test.describe('POST /api/auth/login', () => {
  test('@smoke valid credentials return 200 with a token', async ({ api }) => {
    const res = await api.login(users.qa.email, users.qa.password);
    expect(res.status).toBe(200);
    expect(res.body?.token).toBeTruthy();
    expect(res.body?.user.email).toBe(users.qa.email);
  });

  test('@regression each login issues a different token', async ({ api }) => {
    const first = await api.login(users.qa.email, users.qa.password);
    const second = await api.login(users.qa.email, users.qa.password);
    expect(first.body?.token).not.toBe(second.body?.token);
  });

  test('@regression missing body fields return 400', async ({ api }) => {
    const res = await api.loginRaw({});
    expect(res.status).toBe(400);
    expect(res.error).toBe('email and password are required');
  });

  test('@regression non-string fields return 400', async ({ api }) => {
    const res = await api.loginRaw({ email: 42, password: true });
    expect(res.status).toBe(400);
  });

  test('@regression wrong password returns 401', async ({ api }) => {
    const { email, password } = wrongPasswordUser();
    const res = await api.login(email, password);
    expect(res.status).toBe(401);
    expect(res.error).toBe('invalid credentials');
  });

  test('@regression unknown user returns 401', async ({ api }) => {
    const { email, password } = unknownUser();
    const res = await api.login(email, password);
    expect(res.status).toBe(401);
  });
});
