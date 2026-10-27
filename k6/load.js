// k6 load test: ramp up to ~20 VUs over ~2 minutes, hold, ramp down.
//   k6 run k6/load.js
//   BASE_URL=http://localhost:4173 k6 run k6/load.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  stages: [
    { duration: '20s', target: 10 }, // warm up
    { duration: '30s', target: 20 }, // ramp to peak
    { duration: '50s', target: 20 }, // hold peak
    { duration: '20s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{group:::todos}': ['p(95)<300'],
  },
  tags: { suite: 'load' },
};

function login() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'qa@demo.dev', password: 'Passw0rd!' }),
    { headers: JSON_HEADERS, tags: { endpoint: 'login' } },
  );
  check(res, { 'login: status 200': (r) => r.status === 200 });
  return res.json('token');
}

export default function () {
  let token;
  group('health', () => {
    const res = http.get(`${BASE_URL}/api/health`, { tags: { endpoint: 'health' } });
    check(res, { 'health: status 200': (r) => r.status === 200 });
  });

  group('auth', () => {
    token = login();
  });

  group('todos', () => {
    const headers = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
    const ids = [];

    for (let i = 0; i < 3; i++) {
      const res = http.post(
        `${BASE_URL}/api/todos`,
        JSON.stringify({ title: `k6 load ${__VU}-${__ITER}-${i}` }),
        { headers, tags: { endpoint: 'todos_create' } },
      );
      check(res, { 'create: status 201': (r) => r.status === 201 });
      ids.push(res.json('id'));
    }

    const list = http.get(`${BASE_URL}/api/todos`, { headers, tags: { endpoint: 'todos_list' } });
    check(list, {
      'list: status 200': (r) => r.status === 200,
      'list: has created todos': (r) => ids.every((id) => r.json().some((t) => t.id === id)),
    });

    const patched = http.patch(`${BASE_URL}/api/todos/${ids[0]}`, JSON.stringify({ done: true }), {
      headers,
      tags: { endpoint: 'todos_patch' },
    });
    check(patched, { 'patch: status 200': (r) => r.status === 200 });

    for (const id of ids) {
      const res = http.del(`${BASE_URL}/api/todos/${id}`, null, {
        headers,
        tags: { endpoint: 'todos_delete' },
      });
      check(res, { 'delete: status 204': (r) => r.status === 204 });
    }
  });

  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  return {
    'reports/k6-load-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
