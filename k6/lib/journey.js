// The API journey shared by the stress and spike scripts (smoke.js and load.js keep their own, simpler copies).
// Every request carries an `endpoint` tag, so thresholds and k6-compare.mjs can report each endpoint on its own.
import http from 'k6/http';
import { check, group } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';
export const ENDPOINTS = ['health', 'login', 'todos_create', 'todos_list', 'todos_patch', 'todos_delete'];
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** One threshold per endpoint: the end-of-test summary then lists p95 per endpoint, not only the overall number. */
export function endpointThresholds(p95) {
  return Object.fromEntries(ENDPOINTS.map((e) => [`http_req_duration{endpoint:${e}}`, [`p(95)<${p95}`]]));
}

export function journey() {
  group('health', () => {
    check(http.get(`${BASE_URL}/api/health`, { tags: { endpoint: 'health' } }), { 'health: 200': (r) => r.status === 200 });
  });
  let token;
  group('auth', () => {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email: 'qa@demo.dev', password: 'Passw0rd!' }), {
      headers: JSON_HEADERS,
      tags: { endpoint: 'login' },
    });
    check(res, { 'login: 200': (r) => r.status === 200 });
    token = res.json('token');
  });
  group('todos', () => {
    const headers = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
    const created = http.post(`${BASE_URL}/api/todos`, JSON.stringify({ title: `k6 ${__VU}-${__ITER}` }), { headers, tags: { endpoint: 'todos_create' } });
    check(created, { 'create: 201': (r) => r.status === 201 });
    const id = created.json('id');
    check(http.get(`${BASE_URL}/api/todos`, { headers, tags: { endpoint: 'todos_list' } }), { 'list: 200': (r) => r.status === 200 });
    check(http.patch(`${BASE_URL}/api/todos/${id}`, JSON.stringify({ done: true }), { headers, tags: { endpoint: 'todos_patch' } }), {
      'patch: 200': (r) => r.status === 200,
    });
    // Clean up what this iteration created, so a long run does not grow the in-memory store.
    check(http.del(`${BASE_URL}/api/todos/${id}`, null, { headers, tags: { endpoint: 'todos_delete' } }), { 'delete: 204': (r) => r.status === 204 });
  });
}
