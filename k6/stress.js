// k6 stress test: step the load up (5 → 10 → 20 → 40 → 80 VUs, 30 s each) to find where p95 or errors break the target.
// The run stops early (abortOnFail) once errors pass 5%, so a broken system is not hammered for the full duration.
//   k6 run k6/stress.js
//   STEPS=10,20,40 STEP=1m k6 run k6/stress.js
//   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_OPEN=true k6 run k6/stress.js   # watch it live on http://127.0.0.1:5665
import { sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { endpointThresholds, journey } from './lib/journey.js';

const STEPS = (__ENV.STEPS || '5,10,20,40,80').split(',').map(Number);
const STEP = __ENV.STEP || '30s';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      // Each step: 10 s ramp, then hold.
      stages: [...STEPS.flatMap((v) => [{ duration: '10s', target: v }, { duration: STEP, target: v }]), { duration: '10s', target: 0 }],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_duration: ['p(95)<500'],
    ...endpointThresholds(500),
  },
  tags: { suite: 'stress' },
};

export default function () {
  journey();
  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'reports/k6-stress-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
