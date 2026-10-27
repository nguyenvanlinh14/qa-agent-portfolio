// Tiny zero-dependency server used as the System Under Test (SUT).
// - Serves the built portfolio site from ./dist (static files)
// - Exposes an in-memory REST API under /api (auth + todos CRUD)
// Used by Playwright (webServer), k6 load scripts and the Docker image.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 4173);
const ROOT = resolve(process.env.STATIC_DIR ?? 'dist');

const USERS = { 'qa@demo.dev': 'Passw0rd!', 'dev@demo.dev': 'Passw0rd!' };
const tokens = new Map(); // token -> email
let todos = [];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(payload);
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function authUser(req) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return tokens.get(token);
}

async function handleApi(req, res, url) {
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/api/health') {
    return send(res, 200, { status: 'ok', uptime: process.uptime() });
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const body = await readJson(req);
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
      return send(res, 400, { error: 'email and password are required' });
    }
    if (USERS[body.email] !== body.password) {
      return send(res, 401, { error: 'invalid credentials' });
    }
    const token = randomUUID();
    tokens.set(token, body.email);
    return send(res, 200, { token, user: { email: body.email } });
  }

  // Test-only hook so every test run can start from a clean state.
  if (req.method === 'POST' && pathname === '/api/test/reset') {
    todos = [];
    tokens.clear();
    return send(res, 204);
  }

  if (pathname === '/api/todos' || pathname.startsWith('/api/todos/')) {
    const user = authUser(req);
    if (!user) return send(res, 401, { error: 'unauthorized' });
    const id = pathname.split('/')[3];

    if (req.method === 'GET' && !id) {
      return send(res, 200, todos.filter((t) => t.owner === user));
    }
    if (req.method === 'POST' && !id) {
      const body = await readJson(req);
      const title = body?.title?.trim?.();
      if (!title) return send(res, 422, { error: 'title is required' });
      if (title.length > 120) return send(res, 422, { error: 'title must be <= 120 chars' });
      const todo = { id: randomUUID(), title, done: false, owner: user, createdAt: new Date().toISOString() };
      todos.push(todo);
      return send(res, 201, todo);
    }
    const todo = todos.find((t) => t.id === id && t.owner === user);
    if (!todo) return send(res, 404, { error: 'todo not found' });
    if (req.method === 'GET') return send(res, 200, todo);
    if (req.method === 'PATCH') {
      const body = await readJson(req);
      if (!body) return send(res, 400, { error: 'invalid json' });
      if (typeof body.title === 'string') todo.title = body.title.trim();
      if (typeof body.done === 'boolean') todo.done = body.done;
      return send(res, 200, todo);
    }
    if (req.method === 'DELETE') {
      todos = todos.filter((t) => t !== todo);
      return send(res, 204);
    }
  }

  return send(res, 404, { error: 'not found' });
}

async function handleStatic(req, res, url) {
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const data = await readFile(target);
    res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return await handleStatic(req, res, url);
  } catch (err) {
    console.error(err);
    send(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => console.log(`SUT listening on http://localhost:${PORT} (static: ${ROOT})`));
