# kyverno/kyverno: unit test cho `pkg/cel/libs/gzip` (thư viện CEL `gzip.compress` / `gzip.decompress`)

Trạng thái: **PR [kyverno/kyverno#18317](https://github.com/kyverno/kyverno/pull/18317) đã bị đóng (2026-10-27)** — maintainer: dự án hiện *không nhận PR chỉ có unit test* vì thời gian chạy unit test đã là nút thắt; gợi ý hỏi trên Slack hoặc chọn issue có sẵn. Bài học: với Kyverno, hỏi trước trên Slack/issue rồi mới làm.
Patch: `kyverno-gzip-lib-tests.patch` (1 file mới, +291/−0, không sửa code production).

Lưu ý: không truy cập được GitHub issue/API từ sandbox, nên **chưa biết** có issue/PR trùng hay `good first issue` nào đang mở cho package này. Phải kiểm tra tracker trước khi làm tiếp (xem "Câu hỏi mở").

## 1. Bối cảnh test của Kyverno (từ `AGENTS.md`, `REVIEW.md`, `CONTRIBUTING.md`, workflow)

| Tầng | Vị trí | Chạy thế nào |
|---|---|---|
| Unit test | `*_test.go` cạnh code (466 file test / 910 file Go trong `pkg`, `cmd`, `ext`) | `make test-unit` = `go test -v -race -covermode atomic -coverprofile coverage.out ./...`; workflow `check-unit-tests.yaml` chạy trên mọi PR |
| Framework / integration (không cần cluster) | `test/integration/{dpol,gpol,ivpol,mpol,vpol,multi,reports}` + `test/integration/framework` | `check-framework.yaml` (matrix theo thư mục), bỏ qua PR chỉ sửa `docs/**`, `charts/**`, `*.md`; đây là hướng của mentorship #14725 |
| CLI test | `test/cli/**`, `make test-cli` | `check-cli-tests.yaml` |
| Chainsaw e2e (cần cluster kind) | `test/conformance/chainsaw/**` (~1000+ test) | **Không chạy tự động trên PR**: `tests-conformance.yaml` chỉ là `workflow_call`; kích hoạt bằng comment `/conformance` hoặc sau khi merge vào `main` |
| Lint | `.golangci.yml` (golangci-lint **v2.14.0**, `Makefile: GOLANGCI_LINT_VERSION`) | `check-golangci-lint.yaml`; `_test.go` bị loại khỏi linter và formatter (`exclusions.paths`) |

Quy ước khác:
- Thư viện assert: chủ yếu `testify` (`assert`/`require`), một số package dùng `gotest.tools/v3`. Table-driven + `t.Run` là phổ biến.
- PR: DCO bắt buộc (`git commit -s`), chạy `make imports fmt` rồi `make imports-check fmt-check`; template yêu cầu mục Explanation, kind, checklist.
- **Chính sách AI**: `.github/PULL_REQUEST_TEMPLATE.md` và `REVIEW.md` yêu cầu đọc `kyverno/community/AI_USAGE_POLICY.md` và **công khai việc dùng AI trong commit** bằng trailer `Co-authored-by` hoặc `Assisted-by`. Repo có sẵn `AGENTS.md`/`CLAUDE.md`, nên dùng agent là điều được dự đoán, nhưng phải disclose. (Chưa đọc được nội dung `AI_USAGE_POLICY.md` vì nằm ở repo `kyverno/community`; cần đọc trước khi mở PR.)
- Repo yêu cầu go 1.27.3 (`go.mod`); `GOTOOLCHAIN=auto` tải toolchain tự động.

## 2. Kiểm kê cơ hội (file:line, số liệu đo ngày 2026-10-27)

| # | Phát hiện | Vị trí | Số liệu | Đánh giá |
|---|---|---|---|---|
| A | Package **không có test trực tiếp**, nhưng chứa logic bảo mật (giới hạn output khi giải nén gzip trong CEL, chống zip-bomb) | `pkg/cel/libs/gzip/{impl,lib}.go` (136 dòng) | 0% coverage trực tiếp; chỉ ~54.1% gián tiếp qua `pkg/cel/compiler` (test 42s) và 1 test Shape 4 ở `pkg/cel/compiler/cost_regression_test.go:181`; chainsaw `mutating-policies/gzip` là happy path | **Đã chọn** (xem mục 3) |
| B | `time.Sleep` dài trong unit test chạy ở mọi PR | `pkg/controllers/report/aggregate/controller_test.go:164,217,273,333,384` (5 × 13 s = 65 s); `pkg/engine/context/resolvers/resolvers_test.go:66,80` (2 × 10 s = 20 s, ngay sau `informer.Start`, có thể thay bằng `WaitForCacheSync`) | ~85 s sleep cứng trong `make test-unit` | Ứng viên thứ hai: làm test deterministic và nhanh hơn; bài resolvers nhỏ, bài aggregate cần đọc kỹ controller (queue delay 10 s) |
| C | `time.Sleep` ngắn (20 ms – 3 s) | `pkg/webhooks/resource/{mpol,gpol}/handler_test.go` (200 ms × 6), `pkg/event/controller_test.go:40` (1 s), `pkg/profiling/pprof_test.go:146` (2 s), `test/integration/gpol/sync_customresource_test.go:352` (3 s), ~12 chỗ khác ở `test/integration/*` | 34 chỗ `time.Sleep` trong `_test.go` (tổng, gồm cả B) | Rủi ro flaky; nên làm từng file một |
| D | `t.Skip` | `cmd/cli/kubectl-kyverno/commands/test/command_test.go` (14 chỗ `t.Skip`, phần lớn "Test directory not found"), `pkg/engine/adapters/rclient_test.go` + `pkg/image/verifiers/ivpol/cosign/verifier_test.go` (skip khi không có mạng), `pkg/cel/policies/mpol/autogen/autogen_test.go:495,562`, `pkg/version/version_test.go:30` | 14 + 4 + 20 + 2 + 1 | Skip khi thiếu mạng là có chủ đích; 14 skip ở CLI test đáng hỏi vì sao thư mục fixture không có |
| E | Chainsaw test bị `skip: true` | `test/conformance/chainsaw/generating-policies/clone/sync/{sync-delete-policy,sync-delete-one-source,sync-delete-one-trigger}/chainsaw-test.yaml:7` | 3 test | Cần biết lý do (xem lịch sử `git log` ở bản clone đầy đủ); không verify được nếu không có cluster |
| F | Package không có file test nào | `pkg/pss/utils` (673 dòng, `mapping.go`), `pkg/informers`, `pkg/webhooks/updaterequest`, `pkg/controllers/globalcontext`, `pkg/controllers/certmanager`, `cmd/internal` (24 file, 1653 dòng), `ext/file-info`; (các package `pkg/clients/**` là wrapper sinh tự động) | xem cột vị trí | `pkg/pss/utils` là ứng viên pure-logic tiếp theo; `controllers/*` cần fake client |
| G | File lớn không có `<name>_test.go` cạnh bên (package có test khác) | `pkg/cel/compiler/guards.go` (817), `cost.go` (414), `costlib.go` (378), `pkg/policy/policy_controller.go` (536; package chỉ 30.1%), `pkg/tls/renewer.go` (288) | | Cần đọc thêm; có thể đã được test gián tiếp |
| H | Coverage thấp trong tập package đã đo | `pkg/utils/report` 28.9%, `pkg/policy` 30.1%, `ext/cluster` 35.7%, `pkg/cel/policies` 40.0%, `pkg/cel/autogen/extract` 43.6%, `pkg/validation/resource` 46.2%, `pkg/cel/matching/predicates/namespace` 49.1%, `pkg/utils/os` 50.0% | đo bằng `go test -cover` | Danh sách việc cho các PR sau |
| I | TODO trong test | `pkg/config/types_test.go:83` ("this looks strange"), `pkg/engine/pattern/pattern_test.go:501` ("Add test cases") | 2 | Việc nhỏ, nhưng nên hỏi maintainer về ý định |
| J | Tỷ lệ chainsaw/tính năng | `generating-policies` 83, `validating-policies` 65, `mutating-policies` 41, `image-validating-policies` 39 thư mục test; `namespaced-*` chỉ 3 – 6; `globalcontext` 2, `rbac` 2, `reports` 1, `mutate` 2 | đếm `chainsaw-test.yaml` | Các policy type có bản namespaced ít test hơn hẳn bản cluster-scoped; khớp hướng mentorship #12065 / #13011, nhưng cần cluster để verify nên không chọn cho lần đầu |

Đã chạy `go test -cover` cho `pkg/cel/...`, `pkg/pss/...`, `pkg/utils/...`, `pkg/toggle`, `pkg/config`, `pkg/validation`, `pkg/policy`, `ext/...`, `pkg/engine/jmespath`. Một số test **fail do sandbox không có mạng** (không phải lỗi của Kyverno): `pkg/cel/libs/imageverify` (9 test, cần registry), `pkg/cel/policies/ivpol/engine` (`Test_ImageVerifyEngine_MutatingPinsDigest`), `pkg/engine/jmespath` (`Test_IsExternalURL` với `http://google.com`, cần DNS). `./pkg/engine/variables/...` "setup failed" vì đường dẫn không tồn tại ở bản này.

## 3. Patch làm gì và vì sao chọn

`pkg/cel/libs/gzip` là bản "bounded" của thư viện gzip trong `kyverno/sdk`: `gzip.decompress` dùng `io.LimitReader(maxOutputBytes+1)` để chặn payload nén nhỏ nhưng giải nén ra hàng trăm MB (comment trong `lib.go`: 99,6 KB giải nén thành 357 MB). Cap này đang được dùng bởi 5 compiler (vpol, mpol, gpol, dpol, ivpol). Package chưa có test nào, và ranh giới của cap (đúng bằng cap / cap+1), giá trị mặc định 10 MB, cap theo từng env (không phải biến global) đều chưa được khoá bằng test. Đây là logic thuần, chạy không cần cluster, mất vài giây, và hợp với kỹ năng "Go tests" của mentorship.

`pkg/cel/libs/gzip/gzip_test.go` (package `gzip`, testify, table-driven):

| Test | Hành vi được khoá |
|---|---|
| `TestDecompress` | round-trip: rỗng, ASCII, UTF-8 nhiều byte, xuống dòng, 1 MiB nén tốt |
| `TestDecompressStandardGzipFixture` | đọc được stream gzip do encoder khác tạo (fixture base64 lấy từ test của `kyverno/sdk`) |
| `TestDecompressRejectsMalformedInput` | input rỗng, không phải gzip, header bị cắt, body bị cắt, sai checksum: có lỗi, và lỗi **không phải** `ErrOutputTooLarge` |
| `TestDecompressOutputCap` | cap=1024: 1, 1023, 1024 byte pass; 1025 và 100 KiB bị từ chối với `errors.Is(err, ErrOutputTooLarge)` |
| `TestDefaultOutputCap` | `maxOutputBytes=0` rơi về 10.000.000: đúng 10 MB pass, +1 byte bị từ chối (mất ~4 s dưới `-race`) |
| `TestOutputCapIsPerEnv` | 8 goroutine dựng env với cap khác nhau cùng lúc, không ảnh hưởng nhau (bắt lỗi quay lại biến global; có `DATA RACE` khi chạy `-race`) |
| `TestDecompressRequiresBytes` | `gzip.decompress("string")` bị từ chối lúc compile (overload bytes → string) |
| `TestCompress` | output là gzip hợp lệ, MTIME = 0 và 2 lần nén giống hệt nhau (deterministic), đối số không phải string báo lỗi lúc evaluate |
| `TestCompressDecompressRoundTrip` | `gzip.decompress(gzip.compress(x)) == x` |
| `TestLibraryMetadata`, `TestLibNilVersionPanics` | `LibraryName`, `Latest`, `Lib(nil, …)` panic với message đã ghi trong code |

Không có refactor, không đụng code production. Mutation check (sửa tạm `impl.go`/`lib.go`, rồi khôi phục): bỏ `+1` ở `LimitReader`, đổi `>` thành `>=`, đổi default 10 MB, thay `ErrOutputTooLarge` bằng lỗi khác, thay `ModTime` bằng `time.Now()`, đổi cap thành biến global (cả bản thường lẫn `-race`) đều làm ít nhất một test đỏ. Riêng mutation "bỏ dòng `ModTime`" không build được (import `time` thừa) nên đã thay bằng `time.Now()`.

## 4. Verification

Môi trường: Linux, go1.27.3 (`GOTOOLCHAIN=auto`), không có cluster, không có mạng ngoài proxy.

```
go test -race -count=1 -cover ./pkg/cel/libs/gzip
ok  github.com/kyverno/kyverno/pkg/cel/libs/gzip  4.959s  coverage: 91.9% of statements
go vet ./pkg/cel/libs/gzip          # ok
gofmt -l / goimports -l / gofumpt -l pkg/cel/libs/gzip   # không in gì
go build ./pkg/cel/...              # ok
```

Coverage của `pkg/cel/libs/gzip`:

| | Trực tiếp (chính package) | Gián tiếp |
|---|---|---|
| Trước | 0% (không có test file) | 54,1% khi chạy `go test -coverpkg=./pkg/cel/libs/gzip ./pkg/cel/compiler` (42 s) |
| Sau | **91,9%** (`decompress_string` 92,9%, `compress` 81,8%, `lib.go` 100%), chạy 5 s | không đổi |

Phần chưa phủ: nhánh lỗi `w.Write`/`w.Close` trên `bytes.Buffer` (không thể xảy ra) và lỗi `io.ReadAll` không phải của gzip.

Chưa chạy được: `golangci-lint` v2.14.0 cài được nhưng từ chối chạy ("the Go language version (go1.26) used to build golangci-lint is lower than the targeted Go version (1.27.3)"), vì `go install ...@v2.14.0` build bằng go1.26. `make install-tools` + `make lint` của repo có thể xử lý khác; cần thử khi có môi trường chuẩn. Ảnh hưởng thấp vì `.golangci.yml` loại `_test.go` khỏi linter. Chưa chạy `make test-unit` toàn bộ (rất nặng và một phần cần mạng) và chưa chạy `make verify-codegen` (patch không đụng code sinh tự động).

## 5. Câu hỏi mở / việc cần làm trước khi liên hệ

1. **Kiểm tra tracker** (issues + PRs, từ khoá `gzip`, `pkg/cel/libs/gzip`, `test coverage`) để tránh trùng; xem còn `good first issue`/`help wanted` nào liên quan. Không làm được từ sandbox.
2. Maintainer có muốn test ở mức package này, hay thích bổ sung thêm 1 case vào `pkg/cel/compiler/cost_regression_test.go`? Hiện đã có "Shape 4" kiểm tra cap bằng alloc; test mới không thay thế nó.
3. `TestDefaultOutputCap` tốn ~4 s dưới `-race` (tạo 2 payload 10 MB). Có chấp nhận không, hay nên bỏ xuống `testing.Short()`? Có thể thay bằng cách kiểm tra `l.maxOutputBytes` trực tiếp (nhanh hơn nhưng gắn với chi tiết nội bộ).
4. Fixture `kyvernoGzipB64` copy từ test của `kyverno/sdk` (Apache-2.0 cùng org); chuỗi này chỉ là dữ liệu test ngắn nhưng nên ghi nguồn trong PR.
5. Đọc `AI_USAGE_POLICY.md` (repo `kyverno/community`) để biết yêu cầu disclose chính xác; commit cần `-s` (DCO) và trailer `Assisted-by`.
6. Cách tiếp cận dài hạn: sau PR này, hai việc nhỏ tiếp theo là (B) thay `time.Sleep(10s)` bằng `cache.WaitForCacheSync` trong `pkg/engine/context/resolvers/resolvers_test.go`, và (F) table-driven test cho `pkg/pss/utils` (`PSSControlIDToName`).

## 6. Mô tả issue/PR gợi ý (tiếng Anh)

Tiêu đề: `test(cel): add unit tests for the bounded gzip CEL library`

Kiểm tra trước: tìm trên tracker các issue/PR đang mở về `pkg/cel/libs/gzip` / "gzip test". Nếu maintainer yêu cầu issue trước, mở issue ngắn với phần Explanation bên dưới rồi chờ phản hồi.

> ## Explanation
> `pkg/cel/libs/gzip` is the bounded local copy of the SDK gzip library used by the vpol/mpol/gpol/dpol/ivpol compilers. `gzip.decompress` caps its output (default 10 MB) to stop small payloads from expanding into hundreds of MB, but the package has no tests of its own; it is only exercised indirectly by `pkg/cel/compiler` (54.1% of its statements, via a 42 s test) and a happy-path chainsaw test.
>
> This PR adds table-driven unit tests (no production code changes) for: round-trips (empty, UTF-8, 1 MiB), a gzip fixture produced by another encoder, malformed input (empty, bad header, truncated, bad checksum), the output cap boundary (cap, cap+1, far above) and the 10 MB default, per-environment caps built concurrently (guards against reintroducing a package-level variable; meaningful under `-race`), deterministic `gzip.compress` output (zero MTIME), argument type errors, and `Lib(nil, …)` panicking.
>
> Direct package coverage goes from 0% to 91.9%; `go test -race ./pkg/cel/libs/gzip` takes about 5 s (about 4 s of it is the default-cap test with two 10 MB payloads; happy to gate that on `testing.Short()` if preferred).
>
> ## Related issue
> None found at the time of writing. <!-- re-check the tracker before posting -->
>
> ## What type of PR is this
> /kind cleanup
>
> ## Proposed Changes
> Adds `pkg/cel/libs/gzip/gzip_test.go`. I checked that the tests catch regressions by temporarily mutating the implementation (dropping the `+1` in the `LimitReader`, `>` to `>=`, changing the default cap, making the cap a package-level variable, using a non-zero `ModTime`); each mutation fails at least one test.
>
> ## Checklist
> - [x] I have read the contributing guidelines and the AI Usage Policy.
> - Tests only; no new or altered behaviour, so no docs/CLI changes.
>
> AI assistance disclosure: I used Claude (an AI coding assistant) to help explore the repository and draft these tests. I reviewed every test, ran them locally with `-race`, and verified them with the mutation checks above. Commit carries an `Assisted-by: Claude` trailer.

## 7. Cách áp dụng lại patch

```
git clone --depth 1 https://github.com/kyverno/kyverno && cd kyverno
git checkout -b test/gzip-cel-lib
git apply /đường/dẫn/kyverno-gzip-lib-tests.patch
GOTOOLCHAIN=auto go test -race -count=1 -cover ./pkg/cel/libs/gzip
git commit -s   # thêm trailer: Assisted-by: Claude
```
