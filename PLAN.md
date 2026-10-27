# Build plan (handed off to a Claude cloud session)

Goal: a QA Automation portfolio for Linh Nguyen (GitHub `nguyenvanlinh14`) that a recruiter can open right away,
built and **deployed entirely from GitHub** (GitHub Actions + GitHub Pages). The main message: **AI agents are
part of the testing workflow** (Claude Code, Playwright MCP, Playwright Test Agents, AI triage in CI).

Site language: English. Lessons in `docs/lessons/`: **Vietnamese**.
Don't publish personal email or phone numbers on the site; link to GitHub only.

## Done (scaffold)
- `package.json` (Playwright 1.64.1, marked 18.1.2, TypeScript) — scripts already defined.
- `server/app.mjs` — zero-dependency SUT: serves `dist/` + REST API `/api/health`, `/api/auth/login`
  (qa@demo.dev / Passw0rd!), `/api/todos` CRUD (Bearer token), `/api/test/reset`.
- `site/index.html` — portfolio template with placeholders `{{REPO_URL}} {{REPO_SLUG}} {{TEST_COUNT}}
  {{LESSON_COUNT}} {{BUILD_INFO}} {{LESSONS}} {{OSS_ISSUES}}`.
- `site/assets/style.css`, `site/demo/` (TaskFlow demo app: login + todos, localStorage-based so it runs on Pages).

## To do
1. `scripts/build-site.mjs`: copy `site/` → `dist/`, render `docs/lessons/*.md` → `dist/lessons/<slug>.html`
   (shared layout, prev/next navigation), fill in the placeholders (count tests with `playwright test --list`
   or a regex, read `dist/data/oss-issues.json` if present), and handle a missing report gracefully.
2. Playwright framework (`playwright.config.ts`, `tsconfig.json`):
   - webServer = `node server/app.mjs` on port 4173; reporters: html + json + junit + list (github in CI).
   - Projects: `setup` (log in, save storageState) → `ui` (chromium); `api` (no browser); `visual` (chromium).
   - `tests/pages/`: BasePage, HomePage, LoginPage, TodoPage. `tests/fixtures/`: test extended with page objects +
     typed `ApiClient`. `tests/data/`: builder/factory. Tags `@smoke @regression`.
   - UI: portfolio smoke (hero, lessons, links), login positive/negative, add/toggle/filter/delete todo.
   - API: health, login 200/400/401, CRUD, 401 without token, 422 validation, isolation between users.
   - Visual: home hero + demo login with `toHaveScreenshot` (mask the dynamic areas).
3. AI agent layer (the highlight):
   - `CLAUDE.md` (framework rules: locator priority, no waitForTimeout, one behaviour per test, factories, tags).
   - `.claude/agents/`: test-planner, test-generator, test-healer, flaky-triager (narrow tools + guardrails).
   - `.claude/commands/`: e.g. `/gen-test`, `/triage`.
   - `.mcp.json` with `@playwright/mcp`.
   - `scripts/ai-triage.mjs`: read the JSON report, call the Anthropic Messages API if `ANTHROPIC_API_KEY` is set
     (model `claude-sonnet-5-5`), write to `$GITHUB_STEP_SUMMARY`; skip quietly without the key.
   - `.github/workflows/claude.yml`: anthropics/claude-code-action for `@claude` mentions on PRs/issues.
4. `scripts/find-good-first-issues.mjs`: GitHub search API (GITHUB_TOKEN) for `good first issue` in
   microsoft/playwright, k6, playwright reporters…, write `dist/data/oss-issues.json`; never fail the build.
5. `k6/smoke.js`, `k6/load.js` against the API (thresholds p95<300ms, errors<1%).
   `docker/Dockerfile` (mcr.microsoft.com/playwright image) + `docker-compose.yml` (sut + tests).
6. `docs/lessons/` (Vietnamese, with runnable examples that point to files in the repo):
   01 AI Agents in QA (Claude Code, MCP, Playwright planner/generator/healer, human-in-the-loop),
   02 Playwright + POM, 03 API testing, 04 Visual testing, 05 k6, 06 Docker for QA,
   07 CI/CD architecture for tests, 08 Design patterns in test (POM, Screenplay, Builder, Factory, Fixture, Strategy).
   Plus `docs/open-source-playbook.md`: the process for finding an issue → agent drafts → human review → PR.
7. CI `.github/workflows/ci.yml` (push, PR, workflow_dispatch): typecheck → playwright (upload report artifact,
   AI triage on failure) ‖ k6 smoke → on `main`, a deploy job builds the site, copies `playwright-report` into
   `dist/report/`, fetches OSS issues, deploys with `actions/deploy-pages`.
   `.github/workflows/update-snapshots.yml` (workflow_dispatch): regenerate Linux visual baselines and commit them.
8. README.md: site link, architecture diagram (mermaid), how to run, the AI workflow.
9. Enable Pages (build_type = workflow), run update-snapshots, make CI green, check that the live site
   https://nguyenvanlinh14.github.io/qa-agent-portfolio/ loads, `/report/` works, and lessons render.
