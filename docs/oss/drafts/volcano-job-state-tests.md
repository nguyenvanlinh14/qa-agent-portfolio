# volcano-sh/volcano: unit test cho state machine của Job (`pkg/controllers/job/state`)

Trạng thái: **bản nháp, chưa liên hệ** (chưa fork, chưa mở issue/PR, chưa comment). Không truy cập được GitHub live từ sandbox, nên **phải kiểm tra trùng lặp trên tracker thật trước** (issue/PR mở có chữ "job state", "state machine", "unit test"; PR gần đây thêm test cho package khác, ví dụ #6131 `add-filewatcher-tests`, cho thấy maintainer nhận loại PR này nhưng cũng có người khác đang làm cùng kiểu).

- Repo: `volcano-sh/volcano`, clone nông tại commit `a3d50b5` (master, 2026-10-27), Go 1.26 (`go.mod`), golangci-lint pin `v2.12.2`.
- Branch local: `wip/job-state-tests` (chưa commit, chưa push), file mới `pkg/controllers/job/state/state_test.go` (+510 dòng).
- Patch: `docs/oss/drafts/volcano-job-state-tests.patch` (`git add -N` rồi `git diff`).

## 1. Cách test của Volcano (đã đọc trong code)

| Mục | Nội dung |
|---|---|
| Unit test | `make unit-test` = `go test -p 8 -race` trên mọi thư mục `pkg/` và `cmd/` có `_test.go` (Makefile:197). CI chạy `make lint`, `make verify`, `sudo make unit-test` trong `.github/workflows/code_verify.yaml` (Go 1.26.x). Có 292 file `_test.go` / 512 file `.go` không-test trong `pkg/` + `cmd/`. |
| Chuẩn viết unit test | `AGENTS.md` trỏ tới `docs/development/development.md#unit-test-standards`: ưu tiên table-driven + `t.Run`, file mới dùng `testify` (`require` cho precondition, `assert` cho check độc lập), test hàm thật qua đường chạy bình thường, **không** sửa field tuỳ ý / tạo state giả để chạm nhánh, **không** lặp ngẫu nhiên N lần, fake ở biên dependency thì được. |
| E2E | Ginkgo v2, mỗi nhóm một thư mục trong `test/e2e/` (admission, agentscheduler, cronjob, dra, gangevict, hypernode, jobp, jobseq, namespacequeue, schedulersharding, schedulingaction, schedulingbase, schedulinggates, shardingcontroller, stress, unschedulablejobcache, vcctl; `util/` là helper). `make e2e-test-<nhóm>` set `E2E_TYPE=...` rồi gọi `hack/run-e2e-kind.sh`: dựng kind (`hack/e2e-kind-config.yaml`), cài Volcano (helm), chạy `ginkgo -r ... --slow-spec-threshold=30s` (jobp thêm `--nodes=4 --randomize-all --fail-on-pending --race`). |
| CI e2e | `.github/workflows/e2e.yaml` build image một lần rồi gọi các workflow con `e2e_*.yaml` (`workflow_call`), kind `v0.32.0`; trigger: push `master`, `e2e/**`, mọi PR. |
| Lint | `make lint` = `hack/verify-golangci-lint.sh` (v2.12.2); `.golangci.yml` bật govet, depguard, ineffassign, staticcheck, unused, whitespace; loại trừ thư mục `test`. |
| Số `It(`/`Entry(` e2e | admission 112, jobp 56, hypernode 48, schedulingaction 42, jobseq 35, schedulingbase 30, gangevict 28, dra 25, namespacequeue 24, agentscheduler 15, unschedulablejobcache 13, vcctl/shardingcontroller/schedulersharding 10 mỗi nhóm, cronjob 9, stress 5, schedulinggates 3. |
| CONTRIBUTING | Cần DCO/commit message dạng `<subsystem>: <what>` + dòng trống + lý do (subject <= 70 ký tự); bot dùng `/assign`. **Mục "AI Guidance"** (CONTRIBUTING.md:124): dùng AI được phép nhưng tác giả chịu trách nhiệm từng dòng; phải **tự review và tự chạy test trước khi gửi**; **ghi rõ việc dùng AI trong issue hoặc trong mục "Special notes for your reviewer" của PR**; không dùng AI để trả lời review comment; commit message do AI sinh và PR AI lớn bị không khuyến khích. |

## 2. Bảng cơ hội tìm được (file:line)

| # | Cơ hội | Vị trí / số liệu | Nhận xét |
|---|---|---|---|
| 1 | **Package `job/state` không có `_test.go` riêng**: 11 file, ~650 dòng, là state machine của vòng đời Job (Pending/Running/Restarting/Aborting/...). Test gián tiếp trong `pkg/controllers/job/job_state_test.go` chỉ đạt **79,7%** (đo bằng `-coverpkg`). Nhánh chưa được chạm: `running.go:41-46` (RestartTask/Pod/Partition), `running.go:65-104` (minSuccess, minAvailable theo task, Failed/Completed/Pending), `pending.go:37-42`, `restarting.go:51,56,58`, `util.go:39`, `factory.go:111` (default phase) | **Đã chọn** (mục 3) | Logic nghiệp vụ quan trọng, thuần hàm, có seam sẵn (`state.SyncJob/KillJob/KillTarget`). |
| 2 | Package không có test (số dòng): `pkg/scheduler/api/devices/ascend/mindcluster/ascend310p/vnpu` 1731, `pkg/scheduler/plugins/deviceshare/devices/ascend/310p/vnpu` 1020, `pkg/scheduler/plugins/rescheduling` 651, `pkg/scheduler/uthelper` 569, `pkg/metriccollect/local` 542, `pkg/agentscheduler/framework` 460, `pkg/controllers/job/plugins/svc` 374, `pkg/scheduler/plugins/util/resourcefit` 308, `pkg/webhooks/util` 234, `pkg/cli/vjobs` 388, `pkg/controllers/hypernode/utils` 148, `pkg/scheduler/conf` 129, `pkg/scheduler/gate` 129, `pkg/controllers/job/plugins/env` 109 | đếm file `.go`/`_test.go` mỗi thư mục | Ứng viên cho PR tiếp theo; `resourcefit`, `hypernode/utils`, `scheduler/gate`, `webhooks/util` nhỏ và thuần hàm. Chưa chạy `go test -cover ./pkg/...` toàn bộ (quá lâu), chỉ đếm file. |
| 3 | `time.Sleep` trong unit test: `pkg/controllers/sharding/sharding_update_test.go:62,91,137,166,193` (300ms), `sharding_boundary_test.go:95,169,213`, `configmap_reload_test.go:409,473` (600ms), `sharding_function_test.go:92`, `sharding_performance_test.go:224`, `pkg/controllers/hypernode/hypernode_controller_test.go:355,389,408,429`, `configmap_handler_test.go:274` (1s), `pkg/scheduler/cache/cache_test.go:428,436,723,829`, `shard_coordinator_test.go:208,214`, `pkg/agentscheduler/cache/shard_coordinator_test.go:298,305`, `plugins/tdm/tdm_test.go:538`, `plugins/fairshare/persist_test.go:364`, `plugins/proportion/proportion_test.go:243` (3s), `pkg/controllers/job/job_controller_uid_test.go:381` | 29 chỗ / 14 file | Thay bằng `Eventually`/`wait.PollUntilContextTimeout` khi chờ informer/queue. Mỗi file là một PR nhỏ, nhưng đây là test dựa trên timing nên cần chạy `-race -count=20` để chứng minh. |
| 4 | `time.Sleep` trong e2e: `test/e2e/util/queue.go:74,105` (3s), `util/configmap.go:58,86`, `gangevict/gangevict.go:568,1083,1585`, `schedulingaction/fairshare.go:168`, `reclaim.go:316,362,422`, `preempt.go:486` (10s mỗi chỗ), `shardingcontroller/sharding_controller_test.go:309,475`, `admission/podgroup_validation_test.go:54` | 15 chỗ / 8 file | Cần kind để xác minh; ngoài phạm vi bản nháp này. |
| 5 | Skip có điều kiện: `test/e2e/hypernode/controller_runtime_test.go:120,151`, `controller_ownership_transition_test.go:49`, `shardingcontroller/sharding_controller_test.go:261` | 4 chỗ | Hợp lệ (theo profile/chế độ); không có `PIt/XIt/PDescribe/FlakeAttempts` nào. |
| 6 | TODO trong test: `pkg/controllers/cronjob/cronjob_controller_test.go:799` ("增加默认值" = thêm giá trị mặc định) | 1 chỗ | Lưu ý: TODO viết bằng tiếng Trung. Các `TODO` còn lại trong grep chỉ là `context.TODO()`. |
| 7 | E2E thưa so với tính năng: `test/e2e/schedulinggates` (3 `It`), `stress` (5), `cronjob` (9), `agentscheduler` (15) so với `admission` (112) | số `It` ở bảng mục 1 | Liên quan trực tiếp đề tài LFX (agent scheduling #4881). Cần kind. |

## 3. Patch làm gì và vì sao

Thêm `pkg/controllers/job/state/state_test.go` (package `state`, table-driven, `testify`, đúng "unit-test standards" của repo). Test đi qua `NewState(...).Execute(action)` thật, chỉ thay các hook `SyncJob/KillJob/KillTarget` (vốn được controller gán lúc khởi tạo, `job_controller.go:296-298`) bằng fake ghi lại lời gọi; hook gốc được khôi phục bằng `t.Cleanup`. Sau đó áp `UpdateStatusFn` mà state truyền xuống lên một `JobStatus` và kiểm tra phase, `RetryCount`, giá trị trả về `bool`, và **metric** `job_completed_phase_count` / `job_failed_phase_count` (so sánh delta vì counter là global).

| Test | Kiểm tra |
|---|---|
| `TestNewState` | 12 phase (kể cả rỗng/lạ) → đúng loại state, mặc định là pending |
| `TestTotalTaskMinAvailable` | rỗng, task không có minAvailable, override, minAvailable = 0 tường minh, hỗn hợp |
| `TestKillTargetActions` | RestartTask/Pod/Partition ở Pending và Running đi vào `KillTarget` (không phải `KillJob`) với target nguyên vẹn → Restarting, `RetryCount+1` |
| `TestKillJobActions` | 10 cặp (phase, action): restart/abort/complete/terminate/resume → retain phase (`None`/`Soft`), phase mới, retry count |
| `TestRestartingStateExecute` | dispatch Sync/RestartTask/khác; hết `MaxRetry` (=, >) → Failed + metric; `total-terminating >= status.MinAvailable` → Pending; ngược lại giữ nguyên |
| `TestPendingStateSync` | biên `MinAvailable <= running+succeeded+failed`, pending pod không được tính |
| `TestRunningStateSync` | 13 ca: replicas = 0, minSuccess, mọi pod xong với succeeded >=/< minAvailable, minSuccess không đạt, minAvailable theo task (fail / đạt / bị bỏ qua khi job minAvailable thấp / thiếu `TaskStatusCount`), `Pending > replicas-minAvailable` (biên `>` vs `=`), kèm kiểm tra metric Completed/Failed |

**Mutation check (thủ công, 13 mutant bằng `sed` rồi `git checkout`)**: đổi `>=`→`>`, `<`→`<=`, bỏ `RetryCount++`, bỏ metric Failed, đổi `*task.MinAvailable`→`task.Replicas`, sửa guard replicas = 0... Lần đầu 1 mutant sống sót (bỏ `RetryCount++` của RestartJob ở pending, chỉ test của package `job` bắt được); đã thêm `TestKillJobActions` và mutant đó bị bắt. Cuối cùng 13/13 bị kill.

## 4. Kết quả xác minh

| Lệnh | Kết quả |
|---|---|
| `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 ...` | OK |
| `go test -cover ./pkg/controllers/job/state/` (trước) | không có test file; cover riêng = 0%. `go test -coverpkg=.../job/state ./pkg/controllers/job/` (test hiện có, gián tiếp) = **79,7%** |
| `go test -count=1 -race -cover ./pkg/controllers/job/state/` (sau) | `ok`, **86,0%** cover riêng của package, 57 subtest pass |
| `go test -count=5 -shuffle=on -race ./pkg/controllers/job/state/` | `ok` (lần đầu **fail** vì tôi assert giá trị tuyệt đối của counter global khi `-count>1`; đã sửa sang so sánh delta, nên đây là bug của test nháp, không phải của Volcano) |
| `go test -coverpkg=.../job/state ./pkg/controllers/job/ ./pkg/controllers/job/state/` (gộp) | **100,0%** statements của package `state` (từ 79,7%) |
| `go test -count=1 -race ./pkg/controllers/job/...` | tất cả `ok` (test cũ không bị ảnh hưởng) |
| `go vet ./pkg/controllers/job/state/` | sạch |
| `gofmt -l pkg/controllers/job/state` | không có file nào |
| `golangci-lint v2.12.2 run ./pkg/controllers/job/state/...` (cài bằng `go install` đúng version pin, dùng `.golangci.yml` của repo) | `0 issues` |

Lưu ý môi trường: `go test -cover` trên package không có test file in `go: no such tool "covdata"` (không ảnh hưởng kết quả). Chưa chạy `make verify` / `hack/verify-gencode.sh` và chưa chạy e2e (cần kind; không đụng tới e2e).

## 5. Câu hỏi mở / rủi ro

1. **Kích thước**: 510 dòng, hơi lớn cho "newcomer PR" và CONTRIBUTING không khuyến khích PR AI lớn. Nên tách thành 2 PR: (a) `TestRunningStateSync` + `TestPendingStateSync` + `TestTotalTaskMinAvailable` (logic chưa được cover), (b) các bảng dispatch còn lại; hoặc hỏi maintainer trước.
2. Có nên đặt test ở `job/state/` (như bản nháp) hay mở rộng `pkg/controllers/job/job_state_test.go` đang dùng fake controller nặng? Bản nháp chọn gần code hơn và không cần fake controller. Phải hỏi/xem phản hồi review.
3. `restartingUpdateStatus` so sánh với `status.MinAvailable` (không phải `Spec.MinAvailable`). Test chốt hành vi hiện tại; chưa biết đây có phải chủ ý hay không, **không** coi là bug, chỉ hỏi maintainer nếu muốn đào sâu.
4. Test chốt hành vi "task `minAvailable` bị bỏ qua khi `Spec.MinAvailable < tổng task minAvailable`" (running.go:75). Nếu maintainer coi đây là hành vi ngoài ý muốn thì ca này cần đổi.
5. Chưa xác minh duplicate, chưa biết có PR đang mở trùng; chưa xác minh template PR (`.github/PULL_REQUEST_TEMPLATE.md`, xem lại khi mở PR). Không có issue gốc: theo CONTRIBUTING, PR chỉ thêm test không cần issue "bug", nhưng nên hỏi trước vì Volcano nhắc PR phải theo template.
6. Commit chưa được tạo (để Linh tự viết message theo dạng `controllers/job: add unit tests for job state machine` kèm `Signed-off-by`, vì repo không khuyến khích message do AI sinh).

## 6. Mô tả issue/PR (tiếng Anh, để Linh đăng sau khi kiểm tra trùng lặp)

**Title:** `controllers/job: add unit tests for the job state machine`

> **What this PR does**
>
> `pkg/controllers/job/state` (the Job phase state machine) has no tests of its own. Coverage today only comes indirectly from `pkg/controllers/job/job_state_test.go`: measured with `-coverpkg`, the package is at 79.7%, and these paths are not exercised: `Restart{Task,Pod,Partition}` routing to `KillTarget` in Pending/Running, the Running `SyncJob` completion logic (`minSuccess`, per-task `minAvailable`, Failed/Completed/back-to-Pending) and the `restartingUpdateStatus` boundaries.
>
> This adds a table-driven `state_test.go` that goes through `NewState(...).Execute(...)`, replaces only the `SyncJob/KillJob/KillTarget` hooks with recording fakes (restored via `t.Cleanup`), applies the returned `UpdateStatusFn` to a `JobStatus`, and asserts the resulting phase, `RetryCount`, the changed flag and the `job_completed_phase_count` / `job_failed_phase_count` metrics. Production code is not changed.
>
> **Verification**
> - `go test -race -count=5 -shuffle=on ./pkg/controllers/job/state/` passes; `go test -race ./pkg/controllers/job/...` passes
> - Coverage of `pkg/controllers/job/state`: 79.7% (indirect, existing tests) -> 100% combined; 86.0% from the new file alone
> - Manually mutated 13 conditions in `running.go`/`restarting.go`/`pending.go`/`util.go` (`>=`/`>`, dropped `RetryCount++`, dropped failure metric, ...); all are caught
> - `gofmt`, `go vet`, `golangci-lint v2.12.2` (repo config): clean
>
> **Special notes for your reviewer**
> AI assistance disclosure: I used an AI coding assistant (Claude) to help draft these tests. I reviewed every case against the code in `pkg/controllers/job/state`, ran the commands above locally, and I can explain each assertion. The tests pin the current behaviour (e.g. per-task `minAvailable` is only enforced when the job `minAvailable` >= the sum of task minAvailable); please tell me if any of that is not intended.
>
> If this is too large for one PR I can split it (Running/Pending sync + util first).

Trước khi đăng: (1) tìm trên tracker "job state" / "unit test" / `pkg/controllers/job/state` để tránh trùng; (2) đọc `.github/PULL_REQUEST_TEMPLATE.md` rồi điền theo template; (3) tự chạy lại toàn bộ lệnh ở mục 4; (4) tự viết commit message + `Signed-off-by`.
