---
description: Classify failures from the last Playwright run (product bug / test bug / flaky / environment)
---

Triage the latest test run.

Use the `flaky-triager` agent on `reports/results.json` (and `test-results/` if present). If the report does not
exist, tell me to run `npm test` first.

Return: a table of failed and flaky tests with classification and confidence, the likely root cause with
file:line evidence, and a suggested fix for each. This is read-only: do not change any files.
$ARGUMENTS
