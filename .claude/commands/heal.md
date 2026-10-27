---
description: Heal a failing spec by fixing locators only (assertions are never changed)
argument-hint: <path to spec, e.g. tests/ui/todos.spec.ts>
---

Heal this spec: $ARGUMENTS

Use the `test-healer` agent. It must:

1. Run the spec and read the failure.
2. Inspect the live DOM through Playwright MCP.
3. Fix locators/navigation only (prefer the page object). Never change assertions or expected values; if the
   behaviour itself is wrong, stop and report a suspected product bug.
4. Re-run with `--repeat-each=3` and `npm run typecheck`.

Report each change with old -> new locator and the reason. Do not commit.
