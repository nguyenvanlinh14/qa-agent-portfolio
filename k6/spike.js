// k6 spike test: quiet baseline → sudden surge → back to baseline. The question is not only "does it survive the surge"
// but "does it recover": compare p95 of the recovery phase with the baseline (k6 tags each phase via the `phase` tag).
//   k6 run k6/spike.js
//   LOW=2 PEAK=60 k6 run k6/spike.js
import { sleep } from 'k6';
import exec from 'k6/execution';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { endpointThresholds, journey } from './lib/journey.js';

const LOW = Number(__ENV.LOW || 2);
const PEAK = Number(__ENV.PEAK || 50);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: LOW,
      stages: [
        { duration: '20s', target: LOW }, // baseline
        { duration: '5s', target: PEAK }, // surge
        { duration: '30s', target: PEAK }, // hold the surge
        { duration: '5s', target: LOW }, // drop
        { duration: '30s', target: LOW }, // recovery
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    // Recovery must come back close to the baseline target, whatever happened during the surge.
    'http_req_duration{phase:baseline}': ['p(95)<300'],
    'http_req_duration{phase:recovery}': ['p(95)<300'],
    ...endpointThresholds(800),
  },
  tags: { suite: 'spike' },
};

function phase() {
  const s = exec.instance.currentTestRunDuration / 1000;
  return s < 20 ? 'baseline' : s < 60 ? 'surge' : 'recovery';
}

export default function () {
  exec.vu.metrics.tags.phase = phase();
  journey();
  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'reports/k6-spike-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
