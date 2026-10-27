// AI triage of Playwright failures.
// Reads reports/results.json (Playwright JSON reporter), collects failed/flaky tests and asks the
// Anthropic Messages API to classify them (product bug / test bug / flaky / environment).
// Without ANTHROPIC_API_KEY it only lists the failures. Output goes to $GITHUB_STEP_SUMMARY (or stdout).
// This script never exits non-zero: triage must not break the pipeline.
import { readFile, appendFile } from 'node:fs/promises';

const REPORT = process.env.AI_TRIAGE_REPORT ?? 'reports/results.json';
const MODEL = process.env.AI_TRIAGE_MODEL ?? 'claude-sonnet-5-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_FAILURES = 10;
const MAX_ERROR_CHARS = 1500;
const TIMEOUT_MS = 60_000;

const SYSTEM_PROMPT = [
  'You are a senior QA automation engineer triaging Playwright test failures from a CI run.',
  'For each failure, give: a classification (exactly one of: product bug, test bug, flaky, environment),',
  'the likely root cause, and a concrete suggested fix. Never suggest adding sleeps or longer timeouts',
  'and never suggest weakening an assertion. If the evidence is not enough, say what is missing.',
  'Answer in concise Markdown: one short section per failure, then a one-line overall verdict.',
].join(' ');

stripAnsi.re = /\u001b\[[0-9;]*m/g;
function stripAnsi(text) {
  return String(text ?? '').replace(stripAnsi.re, '');
}

function walk(suite, trail, out) {
  const titles = suite.title && !suite.file ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      const failedRun = results.find((r) => r.status === 'failed' || r.status === 'timedOut');
      const flaky = test.status === 'flaky' || (failedRun && results.at(-1)?.status === 'passed');
      const failed = test.status === 'unexpected' || (!flaky && Boolean(failedRun));
      if (!flaky && !failed) continue;
      const error = failedRun?.error ?? failedRun?.errors?.[0] ?? {};
      const message = stripAnsi(error.message ?? failedRun?.error?.stack ?? 'No error message');
      out.push({
        kind: flaky ? 'flaky' : 'failed',
        title: [...titles, spec.title].filter(Boolean).join(' > '),
        location: `${spec.file ?? suite.file ?? 'unknown'}:${spec.line ?? 0}`,
        project: test.projectName ?? 'unknown',
        retries: results.length - 1,
        error: message.trim().slice(0, MAX_ERROR_CHARS),
      });
    }
  }
  for (const child of suite.suites ?? []) walk(child, titles, out);
}

function collect(report) {
  const out = [];
  for (const suite of report.suites ?? []) walk(suite, [], out);
  return out;
}

async function writeSummary(markdown) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) await appendFile(target, `${markdown}\n`);
  else console.log(markdown);
}

function listFailures(failures, total) {
  const lines = failures.map(
    (f) => `- **${f.kind}** \`${f.project}\` ${f.title} (\`${f.location}\`)\n  \`\`\`\n  ${f.error.split('\n').slice(0, 4).join('\n  ')}\n  \`\`\``,
  );
  const extra = total > failures.length ? `\n_…and ${total - failures.length} more not shown._` : '';
  return `${lines.join('\n')}${extra}`;
}

async function askClaude(failures) {
  const prompt = failures
    .map(
      (f, i) =>
        `### ${i + 1}. [${f.kind}] ${f.title}\nFile: ${f.location}\nProject: ${f.project}\nRetries: ${f.retries}\nError:\n${f.error}`,
    )
    .join('\n\n');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Triage these Playwright failures:\n\n${prompt}` }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Anthropic API returned ${response.status}: ${detail}`);
  }
  const data = await response.json();
  return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

async function main() {
  let report;
  try {
    report = JSON.parse(await readFile(REPORT, 'utf8'));
  } catch (error) {
    await writeSummary(`## AI triage\n\nNo readable report at \`${REPORT}\` (${error.code ?? error.message}). Nothing to triage.`);
    return;
  }

  const all = collect(report);
  if (all.length === 0) {
    await writeSummary('## AI triage\n\nNo failures. Nothing to triage.');
    return;
  }
  const failures = all.slice(0, MAX_FAILURES);
  const heading = `## AI triage\n\n${all.length} failed/flaky test(s).`;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY is not set: skipping AI triage.');
    await writeSummary(`${heading}\n\n_AI triage skipped: ANTHROPIC_API_KEY is not set. Failures listed without analysis._\n\n${listFailures(failures, all.length)}`);
    return;
  }

  try {
    const analysis = await askClaude(failures);
    await writeSummary(`${heading}\n\n${analysis || '_The model returned an empty answer._'}\n\n<sub>Model: ${MODEL}. AI-generated, verify before acting.</sub>`);
  } catch (error) {
    console.log(`AI triage failed: ${error.message}`);
    await writeSummary(`${heading}\n\n_AI triage unavailable (${error.message}). Failures listed without analysis._\n\n${listFailures(failures, all.length)}`);
  }
}

main()
  .catch((error) => console.log(`ai-triage error: ${error?.message ?? error}`))
  .finally(() => {
    process.exitCode = 0;
  });
