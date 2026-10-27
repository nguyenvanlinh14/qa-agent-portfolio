<!-- Dán nguyên phần dưới vào ô mô tả PR. Tiêu đề: controllers/job: add unit tests for the job state machine -->
#### What type of PR is this?

/kind cleanup
/area controllers

#### What this PR does / why we need it:

`pkg/controllers/job/state` (the Job phase state machine) has no tests of its own. Its coverage only comes indirectly from `pkg/controllers/job/job_state_test.go` (79.7% with `-coverpkg`); `Restart{Task,Pod,Partition}` routing to `KillTarget`, the Running `SyncJob` completion logic (`minSuccess`, per-task `minAvailable`, Failed/Completed/back to Pending) and the `restartingUpdateStatus` boundaries are not exercised.

This adds a table-driven `state_test.go` that goes through `NewState(...).Execute(...)`, replaces only the `SyncJob`/`KillJob`/`KillTarget` hooks with recording fakes (restored via `t.Cleanup`), applies the returned `UpdateStatusFn` and asserts the resulting phase, `RetryCount`, the changed flag and the completed/failed phase metrics (as deltas, so `-count>1` is safe). No production code changes.

Verification:
- `go test -race -count=5 -shuffle=on ./pkg/controllers/job/state/` and `go test -race ./pkg/controllers/job/...` pass
- coverage of `pkg/controllers/job/state`: 79.7% (indirect) → 100% combined, 86.0% from the new file alone
- 13 manual mutations in `running.go` / `restarting.go` / `pending.go` / `util.go` are all caught
- `gofmt`, `go vet`, `golangci-lint v2.12.2` (repo config): clean

#### Which issue(s) this PR fixes:

None (test-only change).

#### Special notes for your reviewer:

AI assistance disclosure: I used an AI coding assistant (Claude) to help draft these tests. I reviewed every case against the code, ran the commands above locally myself and can explain each assertion.

The tests pin current behaviour, e.g. per-task `minAvailable` is only enforced when the job `minAvailable` is at least the sum of the task values. Please tell me if any of that is not intended. Happy to split this into smaller PRs (Running/Pending sync first) if you prefer.

#### Does this PR introduce a user-facing change?

```release-note
NONE
```
