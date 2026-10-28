// Live run dashboard for Playwright.
// Every run records its timeline to reports/live-events.jsonl (CI publishes it, the site replays it at /live/).
// With LIVE=1 the reporter also serves the dashboard on http://127.0.0.1:${LIVE_PORT:-5667} and pushes each event
// over Server-Sent Events while the run is going:  npm run test:live
import { createServer, type Server, type ServerResponse } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

export type LiveEvent =
  | { type: 'begin'; t: number; total: number; workers: number; projects: string[]; startedAt: string }
  | { type: 'testBegin'; t: number; id: string; title: string; file: string; project: string; worker: number; retry: number }
  | { type: 'step'; t: number; id: string; title: string }
  | { type: 'testEnd'; t: number; id: string; status: TestResult['status']; outcome: ReturnType<TestCase['outcome']>; duration: number; retry: number; error?: string; frame?: string; url?: string }
  | { type: 'end'; t: number; status: FullResult['status']; duration: number };

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jsonl': 'application/x-ndjson', '.jpg': 'image/jpeg' };

export default class LiveReporter implements Reporter {
  private readonly out = resolve(process.env.LIVE_EVENTS ?? 'reports/live-events.jsonl');
  /** Screenshots left by the `page` fixture (tests/fixtures/index.ts), renumbered frames/<n>.jpg in run order. */
  private readonly frames = join(dirname(this.out), 'live-frames');
  private frameCount = 0;
  private readonly dashboard = resolve('site/live');
  private readonly serve = process.env.LIVE === '1';
  private readonly events: LiveEvent[] = [];
  private readonly clients = new Set<ServerResponse>();
  private server?: Server;
  private start = Date.now();

  printsToStdio(): boolean {
    return false;
  }

  async onBegin(config: FullConfig, suite: Suite): Promise<void> {
    this.start = Date.now();
    mkdirSync(dirname(this.out), { recursive: true });
    writeFileSync(this.out, '');
    rmSync(this.frames, { recursive: true, force: true });
    mkdirSync(this.frames, { recursive: true });
    if (this.serve) await this.listen();
    this.emit({
      type: 'begin',
      t: 0,
      total: suite.allTests().length,
      workers: config.workers,
      projects: [...new Set(suite.allTests().map((t) => t.parent.project()?.name ?? ''))].filter(Boolean),
      startedAt: new Date(this.start).toISOString(),
    });
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    this.emit({
      type: 'testBegin',
      t: this.now(),
      id: `${test.id}#${result.retry}`,
      title: test.titlePath().slice(3).join(' › '),
      file: test.location.file.replace(`${process.cwd()}/`, ''),
      project: test.parent.project()?.name ?? '',
      worker: result.workerIndex,
      retry: result.retry,
    });
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    // Only the steps a person wrote (test.step), not every expect / locator call.
    if (step.category !== 'test.step') return;
    this.emit({ type: 'step', t: this.now(), id: `${test.id}#${result.retry}`, title: step.title });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Screenshot + URL written by the `page` fixture (tests/fixtures/index.ts) for this exact attempt.
    const raw = join(this.frames, 'raw', `${test.id}-${result.retry}`);
    let frame: string | undefined;
    let url: string | undefined;
    if (existsSync(`${raw}.jpg`)) {
      frame = `frames/${++this.frameCount}.jpg`;
      renameSync(`${raw}.jpg`, join(this.frames, `${this.frameCount}.jpg`));
      url = existsSync(`${raw}.url`) ? readFileSync(`${raw}.url`, 'utf8') : undefined;
    }
    this.emit({
      type: 'testEnd',
      t: this.now(),
      id: `${test.id}#${result.retry}`,
      status: result.status,
      outcome: test.outcome(),
      duration: result.duration,
      retry: result.retry,
      error: result.error?.message?.split('\n').find((l) => l.trim())?.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 300),
      ...(frame ? { frame, url } : {}),
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    this.emit({ type: 'end', t: this.now(), status: result.status, duration: this.now() });
    rmSync(join(this.frames, 'raw'), { recursive: true, force: true });
    if (!this.server) return;
    for (const c of this.clients) c.end();
    // A short grace period so a dashboard that is still connecting can read the final state.
    const hold = Number(process.env.LIVE_HOLD ?? 2) * 1000;
    await new Promise((r) => setTimeout(r, hold));
    this.server.close();
  }

  private now(): number {
    return Date.now() - this.start;
  }

  private emit(e: LiveEvent): void {
    this.events.push(e);
    const line = JSON.stringify(e);
    appendFileSync(this.out, `${line}\n`);
    for (const c of this.clients) c.write(`data: ${line}\n\n`);
  }

  private async listen(): Promise<void> {
    const port = Number(process.env.LIVE_PORT ?? 5667);
    this.server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        // A dashboard opened mid-run first receives everything that already happened.
        for (const e of this.events) res.write(`data: ${JSON.stringify(e)}\n\n`);
        this.clients.add(res);
        req.on('close', () => this.clients.delete(res));
        return;
      }
      const rel = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^[/\\]+/, '');
      const root = rel.startsWith('frames/') ? dirname(this.frames) : this.dashboard;
      const file = join(root, rel.startsWith('frames/') ? rel.replace(/^frames\//, 'live-frames/') : rel);
      if (!file.startsWith(root) || !existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
    });
    await new Promise<void>((ok) => this.server!.listen(port, '127.0.0.1', ok));
    const link = `http://127.0.0.1:${port}/?live=1`;
    console.log(`Live dashboard: ${link}`);
    if (process.env.LIVE_OPEN !== '0' && !process.env.CI) {
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      spawn(cmd, [link], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref();
    }
  }
}
