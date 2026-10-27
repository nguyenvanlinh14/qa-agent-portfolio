// k6 smoke test: 1-2 VUs for ~30s walking the whole API journey once per iteration.
//   k6 run k6/smoke.js
//   BASE_URL=http://sut:4173 k6 run k6/smoke.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 2, duration: '30s' },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{group:::health}': ['p(95)<300'],
    'http_req_duration{group:::todos}': ['p(95)<300'],
  },
  tags: { suite: 'smoke' },
};

export default function () {
  let token;

  group('health', () => {
    const res = http.get(`${BASE_URL}/api/health`, { tags: { endpoint: 'health' } });
    check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: status ok': (r) => r.json('status') === 'ok',
    });
  });

  group('auth', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: 'qa@demo.dev', password: 'Passw0rd!' }),
      { headers: JSON_HEADERS, tags: { endpoint: 'login' } },
    );
    check(res, {
      'login: status 200': (r) => r.status === 200,
      'login: returns token': (r) => typeof r.json('token') === 'string',
    });
    token = res.json('token');
  });

  group('todos', () => {
    const headers = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };

    const created = http.post(
      `${BASE_URL}/api/todos`,
      JSON.stringify({ title: `k6 smoke ${__VU}-${__ITER}` }),
      { headers, tags: { endpoint: 'todos_create' } },
    );
    check(created, {
      'create: status 201': (r) => r.status === 201,
      'create: not done yet': (r) => r.json('done') === false,
    });
    const id = created.json('id');

    const list = http.get(`${BASE_URL}/api/todos`, { headers, tags: { endpoint: 'todos_list' } });
    check(list, {
      'list: status 200': (r) => r.status === 200,
      'list: contains created todo': (r) => r.json().some((t) => t.id === id),
    });

    const patched = http.patch(`${BASE_URL}/api/todos/${id}`, JSON.stringify({ done: true }), {
      headers,
      tags: { endpoint: 'todos_patch' },
    });
    check(patched, {
      'patch: status 200': (r) => r.status === 200,
      'patch: marked done': (r) => r.json('done') === true,
    });

    const removed = http.del(`${BASE_URL}/api/todos/${id}`, null, {
      headers,
      tags: { endpoint: 'todos_delete' },
    });
    check(removed, { 'delete: status 204': (r) => r.status === 204 });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'reports/k6-smoke-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
