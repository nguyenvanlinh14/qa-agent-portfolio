import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Credentials } from '../data/factories';

export interface HealthBody {
  status: string;
  uptime: number;
}

export interface LoginBody {
  token: string;
  user: { email: string };
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  owner: string;
  createdAt: string;
}

export interface TodoPatch {
  title?: string;
  done?: boolean;
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

async function toResult<T>(res: APIResponse): Promise<ApiResult<T>> {
  const status = res.status();
  const text = await res.text();
  const json: unknown = text ? JSON.parse(text) : undefined;
  if (res.ok()) return { ok: true, status, body: json as T };
  const error = (json as { error?: string } | undefined)?.error ?? res.statusText();
  return { ok: false, status, error };
}

/** Thin typed wrapper over APIRequestContext for the SUT's REST API. */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private token?: string,
  ) {}

  get isAuthenticated(): boolean {
    return this.token !== undefined;
  }

  /** A client that sends `token` as Bearer on todo calls. */
  withToken(token: string): ApiClient {
    return new ApiClient(this.request, token);
  }

  /** Logs in and returns a new authenticated client. */
  async signIn(credentials: Credentials): Promise<ApiClient> {
    const { token } = unwrap(await this.login(credentials.email, credentials.password));
    return this.withToken(token);
  }

  private get headers(): Record<string, string> {
    return this.token ? { authorization: `Bearer ${this.token}` } : {};
  }

  async health(): Promise<ApiResult<HealthBody>> {
    return toResult(await this.request.get('/api/health'));
  }

  async login(email: string, password: string): Promise<ApiResult<LoginBody>> {
    return this.loginRaw({ email, password });
  }

  /** Sends an arbitrary body, for negative tests (missing / wrongly typed fields). */
  async loginRaw(data: unknown): Promise<ApiResult<LoginBody>> {
    return toResult(await this.request.post('/api/auth/login', { data }));
  }

  async listTodos(): Promise<ApiResult<Todo[]>> {
    return toResult(await this.request.get('/api/todos', { headers: this.headers }));
  }

  async createTodo(title: string): Promise<ApiResult<Todo>> {
    return toResult(await this.request.post('/api/todos', { headers: this.headers, data: { title } }));
  }

  async getTodo(id: string): Promise<ApiResult<Todo>> {
    return toResult(await this.request.get(`/api/todos/${id}`, { headers: this.headers }));
  }

  async updateTodo(id: string, patch: TodoPatch): Promise<ApiResult<Todo>> {
    return toResult(await this.request.patch(`/api/todos/${id}`, { headers: this.headers, data: patch }));
  }

  async deleteTodo(id: string): Promise<ApiResult<undefined>> {
    return toResult(await this.request.delete(`/api/todos/${id}`, { headers: this.headers }));
  }
}
