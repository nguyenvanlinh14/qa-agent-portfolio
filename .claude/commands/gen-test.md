---
description: Plan and generate Playwright tests for a feature (planner -> human approval -> generator)
argument-hint: <feature, e.g. "screener filters">
---

Generate tests for this feature: $ARGUMENTS

Follow the workflow in `CLAUDE.md`:

1. Use the `test-planner` agent to explore the feature at http://localhost:4173 (start it with `npm run serve`
   in the background if it is not running) and write `specs/plans/<feature>.md`.
2. Show me the plan summary (scenario titles, tags, open questions) and **wait for my approval**.
3. After approval, use the `test-generator` agent to implement the specs with page objects, fixtures and
   data builders, then run them (`--repeat-each=3`) and `npm run typecheck`.
4. Report files changed, test names and tags, and results. Do not commit.
