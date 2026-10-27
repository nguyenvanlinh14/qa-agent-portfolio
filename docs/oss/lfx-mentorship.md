---
title: LFX Mentorship – kế hoạch
short: LFX Mentorship
icon: git
---

# LFX Mentorship (CNCF) – kế hoạch cho 2027 Term 1

Mục tiêu: có một con đường **có stipend** vào open source thông qua LFX Mentorship của CNCF, với vai trò QA automation engineer. Tài liệu này dựa trên dữ liệu thật trong repo [cncf/mentoring](https://github.com/cncf/mentoring) (bản clone có commit mới nhất ngày 2026-10-06, `97525d8`), thư mục `programs/lfx-mentorship/`. Ngày soạn: 2026-10-27.

> Lưu ý quan trọng: danh sách project của 2027 Term 1 **chưa tồn tại**. `2027/01-Mar-May/project_ideas.md` chỉ nói rằng proposal giờ gửi qua issue form, và README của term vẫn ghi `Status: Planning`. Mọi phân tích dưới đây là dữ liệu quá khứ (2024–2026) để dự đoán project nào hay lặp lại. Các ý tưởng đóng góp chỉ là **giả thuyết cần verify** trên issue tracker thật trước khi làm.

## 1. Timeline 2027 Term 1 (Mar–May)

Nguồn: [programs/lfx-mentorship/2027/01-Mar-May/README.md](https://github.com/cncf/mentoring/blob/main/programs/lfx-mentorship/2027/01-Mar-May/README.md). Thời lượng: ba tháng, full-time. Cột giờ Việt Nam (ICT = UTC+7) là phần quy đổi của mình, README chỉ ghi UTC.

| Mốc | Ngày (2027) theo README | Giờ Việt Nam (quy đổi) |
|---|---|---|
| Project Proposals Open | Wed Jan 6 – Wed Jan 27, 18:00 UTC | đóng lúc 01:00 sáng Thu Jan 28 |
| Mentor/Maintainer Info Sessions | Tue Jan 12 (giờ TBD, nhiều múi giờ) | TBD |
| Mentee Candidate Info Sessions | Thu Jan 28 (giờ TBD, nhiều múi giờ) | TBD |
| **Mentee Applications Open** | **Wed Feb 3, 00:00 UTC – Tue Feb 16, 23:59 UTC** | **07:00 Wed Feb 3 – 06:59 sáng Wed Feb 17** |
| Application Review Period | Wed Feb 17 – Tue Mar 2, 18:00 UTC | |
| Selection Notifications | Wed Mar 3 – Fri Mar 5 (có thể mất vài ngày để đến hết mentee) | |
| Mentorship Program Begins | Mon Mar 8 | |
| Mentorship Kick Off Call | Tue Mar 9 (giờ TBD) | |
| Midterm Mentee Evaluations | Tue Apr 20, 18:00 UTC | |
| First Stipend Payments | Wed Apr 21 | |
| Final Mentee Evaluations | Tue May 25, 18:00 UTC | |
| Second Stipend Payments | Wed May 26 | |
| Last Day of Term | Fri May 28 | |

Điều cần nhớ:

- Danh sách project chỉ rõ sau khi proposal đóng (Jan 27) và được duyệt/đăng lên LFX. Cửa sổ apply chỉ có **14 ngày** (Feb 3–16), nên phải chuẩn bị hồ sơ và đã có đóng góp **trước** Feb 3.
- Proposal được tạo bằng issue form [LFX Mentorship Program Proposal](https://github.com/cncf/mentoring/issues/new?template=lfx-program-proposal.yml); mỗi proposal phải có **Upstream Issue URL** (tracking issue trên repo của project). Vì vậy từ Jan 6 có thể theo dõi issue mới trong repo cncf/mentoring và [project board](https://github.com/orgs/cncf/projects/93) mà README nhắc để thấy proposal nào đang được duyệt (file automation của term ghi board [project 98](https://github.com/orgs/cncf/projects/98), cần verify board nào đúng).
- Mentor chịu trách nhiệm chọn mentee. Mentee sẽ bị yêu cầu nộp **Statement of Purpose** (cover letter) sau khi mentor chọn, và mentor có thể phỏng vấn (README, mục "Mentee selection process").
- Sau khi apply, đơn ở trạng thái pending đến khi mentor xem; không cần apply lại (README, mục Mentees).

## 2. Eligibility, stipend, quy tắc liên lạc

Không tự suy ra con số hay điều kiện; đọc trực tiếp các trang chính thức:

- Eligibility đầy đủ: [LFX Mentorship docs – Mentees](https://docs.linuxfoundation.org/lfx/mentorship/mentees) và [Mentee guide](https://docs.linuxfoundation.org/lfx/mentorship/mentee-guide).
- Cách apply: [Apply to a project](https://docs.linuxfoundation.org/lfx/mentorship/mentees/apply-to-a-project).
- Stipend (mức và cách trả): [Mentee stipends](https://docs.linuxfoundation.org/lfx/mentorship/mentee-stipends). README của cncf/mentoring chỉ trỏ về trang này, **không** ghi số tiền; mình cũng không ghi số ở đây. Lịch trong README của term: First Stipend Payments ngày 21/4/2027 (ngay sau Midterm Evaluations 20/4) và Second Stipend Payments ngày 26/5/2027 (ngay sau Final Evaluations 25/5). Điều kiện trả chính xác xem trang stipends.
- Guidelines chung: [LFX Mentorship guidelines](https://docs.linuxfoundation.org/lfx/mentorship).
- Việc cần tự kiểm tra trên các trang trên: quốc gia/thuế/thanh toán có hỗ trợ cho người ở Việt Nam không, số project được apply cùng lúc, yêu cầu về full-time/giờ làm việc.

**Quy tắc liên lạc (README):** KHÔNG nhắn trực tiếp (DM) program maintainers hay mentors. Dùng:

- [CNCF mentoring discussions](https://github.com/cncf/mentoring/discussions) cho câu hỏi về chương trình.
- Issue/PR trên repo của project và kênh công khai của project (Slack/Discord/community meeting do project công bố).
- `mentoring@cncf.io` chỉ cho câu hỏi **không thể** hỏi công khai.
- Vấn đề nền tảng/thanh toán: [LFX support](https://support.linuxfoundation.org/).

## 3. Phương pháp và số liệu

Parse tự động `README.md` của 9 term (2024 T1–T3, 2025 T1–T3, 2026 T1–T3); 2027 T1 chưa có project nào. Mỗi entry lấy: year/term, tên project, title, Recommended Skills/Technologies, Upstream Issue.

- Tổng **524 entry** (2024: 150, 2025: 187, 2026: 187).
- Regex QA-fit theo yêu cầu (e2e, test, playwright, ci, github actions, benchmark, performance, chaos, fuzz, conformance, coverage, validation, …) áp lên title + skills + technologies cho **146 entry**; áp thêm lên description/outcome thì 250 entry. Regex này nhiễu: ví dụ `ci` khớp "CI/CD" trong skills của Jaeger v2 (chỉ là kỹ năng nền), `validation` khớp các tính năng validate chứ không phải test.
- Vì vậy mình đọc từng entry và gán nhãn **"QA core"**: deliverable chính là test, test infrastructure, CI test pipeline, benchmark/load/perf testing, fuzzing, chaos testing hoặc conformance. Kết quả **71 entry QA core** (2024: 24, 2025: 25, 2026: 22). Danh sách đầy đủ ở Phụ lục A. Entry chỉ nhắc test như một phần phụ của feature (ví dụ "có unit test và docs") không tính.
- Ngôn ngữ trong 71 entry QA core (khớp trong skills/technologies/description): Go **60**, Kubernetes 34, GitHub Actions/CI 26, TypeScript/JavaScript 7, Playwright 4, Python 3. Tức **QA ở CNCF chủ yếu là Go + Kubernetes**; TypeScript/Playwright là ngách hiếm (Meshery và KubeStellar). Điểm này quan trọng: stack Playwright/TS của Linh là điểm mạnh nhưng nên bổ sung Go (Linh đã có nền từ k6).
- Điểm xếp hạng: **QA score = tổng trọng số theo năm (2026 ×3, 2025 ×2, 2024 ×1) của các entry QA core** của project. Sau đó cộng **stack bonus** (0–3, đánh giá chủ quan, công khai ở bảng): +3 nếu có TypeScript/Playwright/POM trực tiếp; +2 nếu kỹ năng chuyển giao rất gần (performance testing ↔ k6, Chainsaw declarative tests); +1 nếu Go + Kubernetes e2e/CI hoặc GitHub Actions; 0 còn lại.
- Hạn chế: tên project trong README không nhất quán (đã gộp `Kubearmor/KubeArmor`, `krkn/Krkn`, `kgateway/Kgateway`, các mục Volcano/kthena/AgentCube); mục `kube-burner` của 2025 T3 nằm nhầm dưới heading Kyverno nên được tính cho kube-burner. Số entry không bằng số mentee thực tế được chọn.

### Kỳ vọng ban đầu so với dữ liệu

- **Meshery**: có 3 mentorship Playwright (2024 T2, 2024 T3, 2025 T1) nhưng **không có Playwright trong năm 2026**; entry QA duy nhất 2026 là CI workflow ([2026 T2, #18795](https://github.com/meshery/meshery/issues/18795)). Nên recency làm điểm giảm.
- **Kubernetes SIG Testing**: không có entry nào về SIG Testing. Dưới mục Kubernetes chỉ có "Testeable documentation for the Pod Lifecycle events" ([2024 T3, kubernetes#126369](https://github.com/kubernetes/kubernetes/issues/126369)).
- **LitmusChaos**: QA core ở 2024 T1 và 2025 T1; 2026 T1 chỉ có entry metrics ([litmus#5338](https://github.com/litmuschaos/litmus/issues/5338)), không phải test. **Chaos Mesh** xuất hiện lại ở 2026 T2.
- **Prometheus**: 2 entry benchmark (2024 T2, 2024 T3), không có từ 2025. **OpenTelemetry**: 1 entry (2026 T1). **Kubescape**: 0 entry QA core.
- Project **không được kỳ vọng** nhưng điểm cao: Volcano (e2e suite cho Volcano/volcano-global/Kthena), kgateway, kube-burner, OpenKruise.

## 4. Bảng xếp hạng

| # | Project | QA score (có trọng số) | Entry QA core (term) | Regex-fit có trọng số (title/skills/tech) | Stack chính | Bonus | Tổng |
|---|---|---|---|---|---|---|---|
| 1 | **Volcano** (gồm volcano-global, Kthena) | 12 | 4 (2026 T1 ×3, 2026 T3) | 18 | Go, Kubernetes, Ginkgo, kind, GitHub Actions | +1 | **13** |
| 2 | **Kyverno** | 10 | 4 (2025 T1, 2025 T2, 2026 T1 ×2) | 13 | Go, Chainsaw (YAML tests), envtest, Kubernetes | +2 | **12** |
| 3 | **Meshery** | 7 | 4 (2024 T2, 2024 T3, 2025 T1, 2026 T2) | 16 | JavaScript/TS, Playwright, GitHub Workflows, React/Next.js | +3 | **10** |
| 4 | **kgateway** | 8 | 3 (2025 T2, 2026 T1 ×2) | 8 | Go, Kubernetes Gateway API, e2e | +1 | **9** |
| 5 | **kube-burner** | 7 | 3 (2025 T2, 2025 T3, 2026 T1) | 5 | Go, Kubernetes, performance testing | +2 | **9** |
| 6 | **OpenKruise** | 7 | 3 (2025 T1, 2025 T3, 2026 T2) | 16 | Go, Kubernetes, Kwok, GitHub Actions | +1 | **8** |
| 7 | LitmusChaos | 6 | 4 (2024 T1 ×2, 2025 T1 ×2) | 10 | Go, Kubernetes, chaos | +1 | 7 |
| 8 | urunc | 6 | 2 (2026 T1, 2026 T3) | 9 | Go (+ JS/Python dashboard, GitHub Actions) | +1 | 7 |
| 9 | Chaos Mesh | 6 | 2 (2026 T2 ×2) | 6 | Go, Kubernetes, Gherkin BDD | +1 | 7 |
| 10 | KubeEdge | 5 | 3 (2024 T2, 2025 T1, 2025 T2) | 34 | Go (phần lớn "benchmark" của Ianvs là AI/Python, không phải software QA) | 0 | 5 |
| 11 | Inspektor Gadget | 5 | 4 (2024 T1, 2024 T3 ×2, 2025 T1) | 5 | Go, eBPF | 0 | 5 |
| 12 | KubeSlice | 4 | 2 (2025 T3) | 4 | Go, Kubernetes, GitHub Actions | +1 | 5 |
| 13 | OpenEverest | 3 | 1 (2026 T3) | 3 | Go, TypeScript/React | +2 | 5 |
| 14 | **KubeStellar** | 2 | 1 (2025 T3) | 7 | TypeScript, Playwright, POM, GitHub Actions | +3 | 5 |

Cách đọc bảng:

- Top 6 theo tổng điểm là danh sách phân tích chi tiết ở mục 5. Nếu chỉ xét **độ khớp stack** thì KubeStellar (một entry Playwright + POM + visual regression + GitHub Actions, [2025 T3, kubestellar/ui#1334](https://github.com/kubestellar/ui/issues/1334)) khớp nhất với framework của Linh nhưng chỉ xuất hiện một lần; mục 6 xếp nó vào watch-list cùng Litmus, Chaos Mesh, urunc.
- Volcano và kgateway dẫn đầu nhờ dồn vào 2026 (trọng số ×3), nghĩa là các subrepo mới (volcano-global, Kthena) đang cần e2e; mô tả 2026 T1 của volcano-global nói thẳng dự án "currently lacks a comprehensive end-to-end (e2e) test suite".
- Kyverno có chủ đề test ở 3 trong 6 term gần nhất (2025 T1, 2025 T2, 2026 T1), hai term đầu liên tiếp. Đây là dấu hiệu tốt (không phải bảo đảm) rằng 2027 T1 cũng có.

## 5. Chi tiết top 6

Điểm vào: README của các term **không có** con trỏ "good first issue" riêng cho từng project; thứ gần nhất là **Upstream Issue** (tracking issue) của mỗi mentorship. Do đó điểm vào là: (1) đọc tracking issue cũ, (2) lọc label `good first issue` / `help wanted` trên repo (link tìm kiếm bên dưới), (3) chạy `scripts/find-good-first-issues.mjs` của repo này sau khi thêm các repo vào danh sách `REPOS`.

### 5.1 Volcano (batch scheduling cho Kubernetes)

**Mentorship QA core trong quá khứ**

| Term | Title | Issue |
|---|---|---|
| 2026 T1 | E2E Test Suite for Volcano Agent Scheduling | [volcano#4881](https://github.com/volcano-sh/volcano/issues/4881) (cùng nhóm với #4882, #4883) |
| 2026 T1 | E2E Test Suite for Volcano-global | [volcano-global#35](https://github.com/volcano-sh/volcano-global/issues/35) |
| 2026 T1 | E2E Test Suite for Kthena | [kthena#662](https://github.com/volcano-sh/kthena/issues/662) |
| 2026 T3 | Build a KVCache-aware scheduler E2E test suite | [kthena#1328](https://github.com/volcano-sh/kthena/issues/1328) |

Ngoài ra 2026 T2 có "kthena" với skill "performance benchmarking and profiling (pprof)" ([kthena#939](https://github.com/volcano-sh/kthena/issues/939)), thuộc nhóm regex-fit nhưng không tính vào QA core.

**Kỹ năng thường yêu cầu:** Go, Kubernetes, kind, docker, Ginkgo (viết e2e), viết GitHub Actions workflow và Makefile (volcano-global: "Experience with writing Workflows (CI/CD) and Makefiles"; Kthena 2026 T3: "Kind-based E2E testing, Redis, ZMQ, observability/metrics, and distributed-system debugging"). Expected outcome 2026 T1 volcano-global: framework e2e Ginkgo + Kind tích hợp GitHub Actions, script dựng Karmada multi-cluster, test case cho quota/priority, cross-cluster vcjob scheduling, tài liệu hướng dẫn mở rộng.

**Repo để đóng góp ngay:** [volcano-sh/volcano](https://github.com/volcano-sh/volcano), [volcano-sh/volcano-global](https://github.com/volcano-sh/volcano-global), [volcano-sh/kthena](https://github.com/volcano-sh/kthena). Tìm việc: [good first issue ở volcano](https://github.com/volcano-sh/volcano/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22), [kthena](https://github.com/volcano-sh/kthena/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22), [volcano-global](https://github.com/volcano-sh/volcano-global/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

**Ý tưởng đóng góp trước khi apply (cần verify trên issue thật):**

1. Đọc #35 / #662 / #1328, chạy e2e hiện có local bằng kind, rồi bổ sung **một test case còn thiếu** trong suite Ginkgo theo đúng pattern (ví dụ một kịch bản scheduling trong danh sách outcome của volcano-global) kèm cleanup tài nguyên.
2. Cải thiện workflow GitHub Actions chạy e2e (cache, log artifact khi fail, matrix kind version) hoặc sửa một test flaky. Khớp với kinh nghiệm viết và kiểm chứng CI trên runner thật ở k6#3062.

### 5.2 Kyverno (policy engine, CNCF graduated theo mô tả 2026 T3)

**Mentorship QA core trong quá khứ**

| Term | Title | Issue |
|---|---|---|
| 2025 T1 | Chainsaw Tests For New Policy Types | [kyverno#12065](https://github.com/kyverno/kyverno/issues/12065) |
| 2025 T2 | Improve Test Coverage and Docs for New Policy Types | [kyverno#13011](https://github.com/kyverno/kyverno/issues/13011) |
| 2026 T1 | Test Enhancements – Kyverno CLI Tests (envtest, fake client) | [kyverno#14629](https://github.com/kyverno/kyverno/issues/14629) |
| 2026 T1 | Test Enhancements – Testing Framework / Toolset for integration tests | [kyverno#14725](https://github.com/kyverno/kyverno/issues/14725) |

Mô tả 2026 T1 (#14725): Kyverno dùng Chainsaw cho e2e trên cluster thật, chậm và dùng cả cho case đơn giản; dự án muốn framework integration test ở mức code, không cần cluster, để chạy nhanh local và trong CI.

**Kỹ năng thường yêu cầu:** Golang, Kubernetes (ValidatingAdmissionPolicy cho policy types mới), Chainsaw, Cobra/CLI, fake client, envtest, "Go tests".

**Repo:** [kyverno/kyverno](https://github.com/kyverno/kyverno) (Chainsaw nằm ở repo riêng của Kyverno, cần verify tên repo). Tìm việc: [good first issue](https://github.com/kyverno/kyverno/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

**Ý tưởng (cần verify):**

1. Viết thêm Chainsaw test (YAML, declarative) cho một policy type/edge case chưa có coverage; đây là cửa vào dễ nhất vì không cần hiểu sâu code Go.
2. Thêm test cho `kyverno` CLI bằng Go (fake client / envtest) theo hướng #14629; hoặc chuyển một Chainsaw case đơn giản sang integration test nhanh khi #14725 đã có khung.

### 5.3 Meshery (cloud native manager)

**Mentorship QA core trong quá khứ**

| Term | Title | Issue |
|---|---|---|
| 2024 T2 | Meshery: End-to-End Testing with Playwright | [meshery#10890](https://github.com/meshery/meshery/issues/10890) |
| 2024 T3 | Meshery: End-to-End Testing with Playwright (Round 2) | [meshery#11494](https://github.com/meshery/meshery/issues/11494) |
| 2025 T1 | Expanding end-to-end test coverage in Meshery using Playwright | [meshery#13514](https://github.com/meshery/meshery/issues/13514) |
| 2026 T2 | Agentic CI Pipelines: GitHub Action Workflow Overhaul | [meshery#18795](https://github.com/meshery/meshery/issues/18795) |

Mô tả 2025 T1: Meshery dùng Playwright cho browser testing, e2e chạy với mỗi PR; project mở rộng coverage sang thêm component. Mô tả 2026 T2: audit và tái cấu trúc workflow GitHub Actions (workflow không hoạt động, pattern kém an toàn, logic trùng) rồi thêm GitHub Agentic Workflows.

**Kỹ năng thường yêu cầu:** JavaScript, Playwright, GitHub Workflows, quen React/Next.js, CI/CD; 2026 T2: GitHub Actions authoring, YAML, supply chain security (pinned actions, fork-safe triggers).

**Lưu ý recency:** ba term Playwright đều trước 2026; năm 2026 Meshery tập trung AI/MCP/Registry (ví dụ [2026 T3, meshery#19446 MCP Server](https://github.com/meshery/meshery/issues/19446), [meshery#20979](https://github.com/meshery/meshery/issues/20979)). Vẫn là project khớp stack nhất với Linh nên giữ làm lựa chọn phụ, nhưng không nên giả định 2027 T1 có Playwright.

**Repo:** [meshery/meshery](https://github.com/meshery/meshery). Tìm việc: [good first issue](https://github.com/meshery/meshery/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

**Ý tưởng (cần verify):**

1. Thêm Playwright test cho một trang/luồng UI chưa được cover theo pattern hiện có (dùng Page Object, `getByRole`), hoặc sửa một test flaky trong CI e2e hiện tại.
2. Theo hướng #18795: hardening workflow (pin action theo SHA, quyền `permissions:` tối thiểu, loại workflow trùng lặp). Rất gần với k6#3062.

### 5.4 kgateway (Gateway API, Envoy/agentgateway)

**Mentorship QA core trong quá khứ**

| Term | Title | Issue |
|---|---|---|
| 2025 T2 | Mission: Scale Possible! Build Automated Scale Tests for kgateway | [kgateway#11210](https://github.com/kgateway-dev/kgateway/issues/11210) |
| 2026 T1 | Add support for Chaos Engineering/Fault Injection | [kgateway#11188](https://github.com/kgateway-dev/kgateway/issues/11188) |
| 2026 T1 | Modernize and improve kgateway end-to-end testing | [kgateway#13351](https://github.com/kgateway-dev/kgateway/issues/13351) |

Mô tả #13351: nhiều e2e test chạy trên framework e2e tự viết, đang chậm và khó dùng; phase 1 phân tích khoảng trống và quyết định có chuyển framework không (design doc), phase 2 migrate/cải thiện một tập e2e test chạy trong CI.

**Kỹ năng:** Go, Kubernetes, Kubernetes Gateway API, kinh nghiệm end-to-end testing.

**Repo:** [kgateway-dev/kgateway](https://github.com/kgateway-dev/kgateway). Tìm việc: [good first issue](https://github.com/kgateway-dev/kgateway/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

**Ý tưởng (cần verify):**

1. Phân tích tốc độ các e2e hiện có (đo thời gian từng suite, tìm test chậm do setup lặp) và gửi PR nhỏ giảm thời gian hoặc ghi thành báo cáo trong issue #13351.
2. Thêm một e2e case cho một policy/route chưa có coverage theo pattern hiện tại; hoặc dùng k6 (thế mạnh của Linh) để thử một kịch bản scale/latency nhỏ cho #11210 và chia sẻ kết quả công khai.

### 5.5 kube-burner (performance và scale testing cho Kubernetes)

**Mentorship QA core trong quá khứ**

| Term | Title | Issue |
|---|---|---|
| 2025 T2 | Enhancements around k8s performance testing | [kube-burner issues](https://github.com/kube-burner/kube-burner/issues) (README không ghi số issue) |
| 2025 T3 | kube-burner (mục nằm dưới heading Kyverno trong README) | [kube-burner issues](https://github.com/kube-burner/kube-burner/issues) |
| 2026 T1 | Enhancements around Kubernetes performance testing | [kube-burner#1079](https://github.com/kube-burner/kube-burner/issues/1079) (umbrella issue) |

Mô tả (2026 T1): giải quyết các issue mở quan trọng và đưa ra use case/kịch bản mới để performance test bất kỳ Kubernetes distribution nào; không giới hạn issue cụ thể.

**Kỹ năng:** Golang, Kubernetes, Cloud Platforms.

**Repo:** [kube-burner/kube-burner](https://github.com/kube-burner/kube-burner). Tìm việc: [good first issue](https://github.com/kube-burner/kube-burner/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). Umbrella issue #1079 là danh sách việc được mentor chọn lọc sẵn.

**Ý tưởng (cần verify):**

1. Chọn một mục nhỏ trong umbrella issue #1079 và gửi PR (Go) có test đi kèm.
2. Thêm một workload/scenario hoặc tài liệu so sánh cách đo của kube-burner với k6 (metrics, thresholds). Đây là điểm khác biệt của Linh: kinh nghiệm k6 + thresholds (p95, error rate).

### 5.6 OpenKruise (workload automation)

**Mentorship QA core trong quá khứ**

| Term | Title | Issue |
|---|---|---|
| 2025 T1 | Implement Fuzz testing for OpenKruise | [kruise#1713](https://github.com/openkruise/kruise/issues/1713) |
| 2025 T3 | Enhance Robustness and Usability of Kruise-Game (mở rộng E2E và UT coverage) | [kruise-game#266](https://github.com/openkruise/kruise-game/issues/266) |
| 2026 T2 | Lightweight and Continuous Load Testing for OpenKruise Agents Using Kwok | [agents#314](https://github.com/openkruise/agents/issues/314) |

Mô tả 2026 T2: xây framework load test nhẹ bằng Kwok (mục tiêu mô phỏng 100.000 sandbox), GitHub Actions workflow chạy định kỳ và sinh performance report, baseline và cơ chế phát hiện regression.

**Kỹ năng:** Go, Kubernetes (CRD, controller, RBAC), Fuzz Testing, Kwok, GitHub Actions và shell scripting.

**Repo:** [openkruise/kruise](https://github.com/openkruise/kruise), [openkruise/kruise-game](https://github.com/openkruise/kruise-game), [openkruise/agents](https://github.com/openkruise/agents). Tìm việc: [good first issue ở kruise](https://github.com/openkruise/kruise/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

**Ý tưởng (cần verify):**

1. Bổ sung unit test hoặc e2e case cho kruise-game theo #266 (coverage là outcome được nêu trực tiếp).
2. Thêm Go native fuzz test cho một hàm parse/validate trong kruise (theo #1713), hoặc một job GitHub Actions nhỏ chạy fuzz/load smoke với ngưỡng rõ ràng.

## 6. Watch-list (ngoài top 6)

- **KubeStellar**: khớp stack nhất (TypeScript, Playwright, Page Object Model, WebSocket/REST mocking, visual regression trong GitHub Actions, flaky rate < 5%) – [2025 T3, kubestellar/ui#1334](https://github.com/kubestellar/ui/issues/1334). Repo: [kubestellar/ui](https://github.com/kubestellar/ui). Chỉ một lần; nếu 2027 T1 lặp lại thì đây là ứng viên số một. Rẻ để thử: dùng ngay kinh nghiệm POM/fixtures của repo portfolio.
- **LitmusChaos**: [2024 T1: litmusctl E2E #4405](https://github.com/litmuschaos/litmus/issues/4405), [Chaos Center E2E #4406](https://github.com/litmuschaos/litmus/issues/4406); [2025 T1: CI/CD integration #5038](https://github.com/litmuschaos/litmus/issues/5038), [coverage #5039](https://github.com/litmuschaos/litmus/issues/5039). Từ 2026 chỉ có chủ đề metrics.
- **Chaos Mesh**: [2026 T2: Gherkin BDD cho PodChaos/NetworkChaos E2E #4902](https://github.com/chaos-mesh/chaos-mesh/issues/4902) và [Runtime Fact Checker #4903](https://github.com/chaos-mesh/chaos-mesh/issues/4903).
- **urunc**: [2026 T1: dashboard và notification cho CI testing #106](https://github.com/urunc-dev/urunc/issues/106); [2026 T3: Fuzzing và robustness testing #852](https://github.com/urunc-dev/urunc/issues/852).
- **Podman Container Tools**: [2026 T3: Agentic CI Flake Categorization and Analysis](https://github.com/podman-container-tools/podman/issues/29265) – khớp trực tiếp hướng "AI agents trong QA workflow" và flaky triage của repo này.
- **OpenEverest**: [2026 T3: Performance Testing Plugin](https://github.com/openeverest/openeverest/issues/2464) – Go + TypeScript/React.
- **Velero**: [2026 T3: Add CSI Snapshot E2E Tests to Kind CI](https://github.com/velero-io/velero/issues/7507).

## 7. Kế hoạch chuẩn bị theo tuần (2026-10-27 → 2027-02-16)

Chiến lược: chọn **tối đa 2 project** để đóng góp liên tục. Đề xuất: **A = Volcano** (hoặc Kyverno nếu issue của Volcano khó vào), **B = Meshery** (khớp TS/Playwright, rủi ro thấp để có PR đầu tiên). Quyết định chốt ở tuần 4 dựa trên phản hồi review. Song song hoàn tất đóng góp k6 vì đây là bằng chứng hiện có.

Mọi liên lạc qua kênh công khai (comment trên issue/PR, kênh community của project, cncf/mentoring discussions). **Không DM mentor.**

| Tuần | Ngày | Việc cần làm |
|---|---|---|
| 1 | 10/27 – 11/2 | Đọc kỹ tài liệu này và README chương trình. Tạo bảng theo dõi (project, issue, trạng thái). Fork và chạy được test/e2e local của Volcano, Kyverno, Meshery. Đọc CONTRIBUTING và code of conduct từng repo. Chạy `node scripts/find-good-first-issues.mjs --detail` sau khi thêm các repo mục tiêu vào `REPOS` trong script. |
| 2 | 11/3 – 11/9 | Vào kênh community công khai của Volcano và Meshery (Slack/community meeting do README repo công bố), đọc lịch sử, chưa spam. Đọc các tracking issue cũ (#35, #662, #1328, #13514) và mọi PR đã merge cho chúng để học chuẩn review. |
| 3 | 11/10 – 11/16 | Gửi PR nhỏ đầu tiên (tài liệu hoặc một test case) cho project A. Comment công khai vào issue xin nhận việc theo quy trình của repo (không nhắn riêng). |
| 4 | 11/17 – 11/23 | PR đầu tiên cho project B (Playwright test hoặc fix flaky). Checkpoint: giữ project nào làm chính dựa trên tốc độ phản hồi, độ rõ ràng của issue; nếu Volcano im lặng, thử Kyverno (Chainsaw). |
| 5 | 11/24 – 11/30 | Địa chỉ review comments, merge PR. Mở PR cho k6#3062 (workflow đã chạy được trên runner thật, xem `docs/oss/drafts/k6-3062.md`) nếu maintainer đồng ý hướng đi. |
| 6 | 12/1 – 12/7 | PR thứ hai cho project chính, độ khó cao hơn (e2e case hoàn chỉnh kèm cleanup). Học Go phần còn thiếu: package `testing`, table-driven tests, Ginkgo/Gomega (nếu theo Volcano), fuzz tests native. |
| 7 | 12/8 – 12/14 | Tiếp tục PR chính. Với Meshery: một Playwright test mới + giảm flaky. Ghi lại số liệu (thời gian CI, flaky rate trước/sau) để đưa vào cover letter. |
| 8 | 12/15 – 12/21 | Mở PR cho k6#4260 (deriveBits, Go) nếu maintainer chấp thuận; viết test kèm theo. Giữ tần suất đóng góp đều, không cần PR lớn. |
| 9 | 12/22 – 12/28 | Tuần nghỉ lễ, nhịp nhẹ: review PR của người khác, đọc code, cải thiện tài liệu của repo portfolio ([live site](https://nguyenvanlinh14.github.io/qa-agent-portfolio/)). |
| 10 | 12/29 – 1/4 | Viết bản nháp CV và khung cover letter (mục 8). Cập nhật README portfolio: thêm mục "Open source" liệt kê PR đã merge với link. |
| 11 | 1/5 – 1/11 | **Jan 6: proposal bắt đầu mở.** Theo dõi issue mới ở cncf/mentoring và board; lọc proposal có chữ test/e2e/CI/benchmark/Playwright. Lập shortlist ban đầu. |
| 12 | 1/12 – 1/18 | **Jan 12: Mentor/Maintainer Info Session** (nếu có thể xem lại hoặc đọc ghi chú công khai). Với mỗi proposal trong shortlist, đọc Upstream Issue, đóng góp thêm một PR liên quan trực tiếp đến đề bài (đây là bằng chứng tốt nhất). |
| 13 | 1/19 – 1/25 | Đặt câu hỏi làm rõ **công khai** trong issue của proposal (không DM). Chuẩn bị bản cover letter theo từng project (mục 8). |
| 14 | 1/26 – 2/1 | **Jan 27, 18:00 UTC: proposal đóng. Jan 28: Mentee Candidate Info Session** – tham dự, ghi chú yêu cầu hồ sơ (Application Prerequisites mỗi project có thể khác: resume, cover letter, coding challenge…). Chốt danh sách 2–4 project. |
| 15 | 2/2 – 2/8 | **Feb 3, 00:00 UTC (07:00 ICT): apply mở.** Nộp đơn sớm trong tuần đầu (không dồn vào hạn chót) cho project xếp hạng cao nhất; hoàn tất coding challenge nếu có. |
| 16 | 2/9 – 2/15 | Nộp các đơn còn lại (nếu quy định cho phép nhiều đơn, xem trang eligibility). Tiếp tục đóng góp và phản hồi mọi câu hỏi công khai. |
| 17 | 2/16 | **Hạn chót 23:59 UTC (06:59 sáng Feb 17 ICT).** Kiểm tra đơn đã ở trạng thái pending, link đúng. Sau đó chờ review period Feb 17 – Mar 2 và thông báo Mar 3–5. |

Nếu không được chọn: các PR vẫn có giá trị; dùng làm cơ sở cho term Jun–Aug 2027 hoặc các chương trình trả phí khác (xem [bounties](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docs/oss/bounties.md) và [OSS Playbook](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docs/open-source-playbook.md)).

## 8. Application checklist

**Hồ sơ**

- [ ] Resume 1 trang, định hướng QA automation: Playwright + TypeScript (POM, fixtures, API client, visual tests), k6, Docker, GitHub Actions CI, AI agents trong QA workflow. Không để email hay số điện thoại cá nhân công khai trong repo; điền thông tin liên hệ ở nơi LFX yêu cầu.
- [ ] Link portfolio: <https://nguyenvanlinh14.github.io/qa-agent-portfolio/> (mã nguồn: <https://github.com/nguyenvanlinh14/qa-agent-portfolio>).
- [ ] Link GitHub profile với các PR đã gửi/đã merge vào project mục tiêu (ưu tiên PR đã merge).
- [ ] Link đóng góp k6: [grafana/k6#4260](https://github.com/grafana/k6/issues/4260) (Go, webcrypto `deriveBits`, [bản nháp đề xuất](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docs/oss/drafts/k6-4260.md)) và [grafana/k6#3062](https://github.com/grafana/k6/issues/3062) (workflow test cài đặt k6 trong CI, [bản nháp](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docs/oss/drafts/k6-3062.md), [lần chạy trên runner thật](https://github.com/nguyenvanlinh14/qa-agent-portfolio/actions/runs/40499430856)). Hiện `docs/oss/contributions.json` ghi cả hai ở stage `proposed` và chưa có PR. **Trước 03/02/2027 nên có ít nhất một PR đã mở (tốt nhất đã merge)** để link đó là bằng chứng chứ không chỉ là đề xuất.
- [ ] Hồ sơ LFX Mentorship hoàn chỉnh, đã kiểm tra eligibility (mục 2).

**Điểm cho cover letter / Statement of Purpose (điều chỉnh theo từng project)**

- [ ] Vì sao QA: bạn xây dựng và vận hành test framework thật (không chỉ viết test lẻ): page objects, fixtures, data builders, API client, visual baseline chỉ cập nhật qua workflow, quy tắc không `waitForTimeout`, web-first assertions (xem CLAUDE.md của repo portfolio).
- [ ] Bằng chứng quy trình: CI GitHub Actions chạy typecheck, test, k6 với threshold (p95, error rate), Docker image; AI agent (planner, generator, healer, triager) có human approval giữa các bước.
- [ ] Đóng góp upstream: mô tả cụ thể vấn đề, cách tái hiện, cách kiểm chứng (ví dụ workflow k6#3062 kiểm chứng trên runner thật), và phản hồi review.
- [ ] Gắn với đề bài của project: dẫn **số issue** của Upstream Issue, nêu 2–3 deliverable bạn sẽ làm trong 12 tuần, mốc midterm (20/4) và final (25/5) cụ thể, rủi ro và cách giảm (flaky, CI chậm, thiếu kiến thức Go/K8s).
- [ ] Thành thật về khoảng trống (Go/Kubernetes mức nào) và kế hoạch học đã thực hiện (PR đã gửi trong kế hoạch tuần).
- [ ] Cam kết full-time schedule của term, múi giờ làm việc, cách giao tiếp công khai với mentor.
- [ ] Không có thông tin cá nhân nhạy cảm, không có secret trong repo/PR.

**Trước khi bấm Apply**

- [ ] Đã đọc Upstream Issue và Application Prerequisites của proposal; đã trả lời mọi yêu cầu (coding challenge, câu hỏi).
- [ ] Đã có ít nhất một đóng góp liên quan trực tiếp vào repo của proposal đó.
- [ ] Đã tham dự hoặc xem lại candidate info session (28/1).
- [ ] Đã nộp trước hạn 23:59 UTC ngày 16/2, tức 06:59 sáng ngày 17/2 giờ Việt Nam.
- [ ] Không DM mentor; mọi câu hỏi hỏi công khai hoặc qua discussions của cncf/mentoring.

## Phụ lục A. Danh sách 71 entry "QA core" (2024–2026)

Mỗi dòng là một mentorship đã được tính điểm, với term và link Upstream Issue lấy từ README tương ứng trong `programs/lfx-mentorship/<năm>/<term>/README.md`. "T1" là Mar–May, "T2" Jun–Aug, "T3" Sep–Nov.

| Project | Term | Title | Upstream issue |
|---|---|---|---|
| Antrea | 2024 T1 | Replace deprecated bincover with golang built-in coverage profiling tool | https://github.com/antrea-io/antrea/issues/4962 |
| Chaos Mesh | 2026 T2 | Refactor PodChaos and NetworkChaos E2E Tests into Gherkin-based BDD Scenarios | https://github.com/chaos-mesh/chaos-mesh/issues/4902 |
| Chaos Mesh | 2026 T2 | Runtime Fact Checker for Chaos Mesh Experiments | https://github.com/chaos-mesh/chaos-mesh/issues/4903 |
| CloudNativePG | 2025 T3 | Chaos Testing | https://github.com/cloudnative-pg/cloudnative-pg/issues/8174 |
| Envoy Gateway | 2025 T1 | Integrating CNCF Fuzzing Framework for Envoy Gateway | https://github.com/envoyproxy/gateway/issues/3124 |
| Fluid | 2026 T1 | Unify and Modernize Fluid’s Unit Testing Framework and enhance testing coverage | https://github.com/fluid-cloudnative/fluid/issues/5407 |
| Flux | 2024 T1 | Conformance tests for AWS | https://github.com/fluxcd/flux2/issues/4619 |
| Inspektor Gadget | 2024 T1 | Testing framework for image-based gadgets | https://github.com/inspektor-gadget/inspektor-gadget/issues/2046 |
| Inspektor Gadget | 2024 T3 | Testing Inspektor Gadget gadgets on different kernel versions | https://github.com/inspektor-gadget/inspektor-gadget/issues/3195 |
| Inspektor Gadget | 2024 T3 | Exploring Chaos Engineering with eBPF and Inspektor Gadget | https://github.com/inspektor-gadget/inspektor-gadget/issues/3196 |
| Inspektor Gadget | 2025 T1 | Implementing unit tests | https://github.com/inspektor-gadget/inspektor-gadget/issues/3835 |
| Istio | 2024 T1 | Improve Test Coverage for Istio Ambient Mesh | https://github.com/orgs/istio/projects/9 |
| Istio | 2025 T2 | Expand testing for Multi-Cluster in Ambient | https://github.com/istio/istio/issues/56228 |
| Jaeger | 2026 T3 | Benchmarking the AI Assistant's MCP Tools and Skills | https://github.com/jaegertracing/jaeger/issues/9135 |
| K8sGPT | 2024 T1 | Enhance K8sGPT's analyzers Unit Test Coverage | https://github.com/k8sgpt-ai/k8sgpt/issues/889 |
| Karmada | 2024 T3 | Enhance Karmada controller-manager and schedule testing coverage | https://github.com/karmada-io/karmada/issues/5235 |
| Karmada | 2024 T3 | Enhance the test coverage for the Karmada search, operator, and webhook components | https://github.com/karmada-io/karmada/issues/5236 |
| KCL | 2025 T1 | A test framework developed for the KCL package management tool | https://github.com/kcl-lang/kpm/issues/593 |
| kgateway | 2025 T2 | Mission: Scale Possible! Build Automated Scale Tests for kgateway | https://github.com/kgateway-dev/kgateway/issues/11210 |
| kgateway | 2026 T1 | Add support for Chaos Engineering/Fault Injection | https://github.com/kgateway-dev/kgateway/issues/11188 |
| kgateway | 2026 T1 | Modernize and improve kgateway end-to-end testing | https://github.com/kgateway-dev/kgateway/issues/13351 |
| Kmesh | 2025 T1 | Kmesh eBPF unit test | https://github.com/kmesh-net/kmesh/issues/1209 |
| Kmesh | 2025 T1 | Add the Kmesh e2e Test | https://github.com/kmesh-net/kmesh/issues/1210 |
| Koordinator | 2026 T2 | End-to-End Performance and Scalability Test Harness for Koordinator Scheduler | https://github.com/koordinator-sh/koordinator/milestone/19 |
| kube-burner | 2025 T2 | Enhancements around k8s performance testing | https://github.com/kube-burner/kube-burner/issues |
| kube-burner | 2025 T3 | kube-burner (performance testing) | https://github.com/kube-burner/kube-burner/issues |
| kube-burner | 2026 T1 | Enhancements around k8s performance testing | https://github.com/kube-burner/kube-burner/issues/1079 |
| KubeArmor | 2024 T2 | Improve System Test Coverage and Pratices for KubeArmor | https://github.com/kubearmor/KubeArmor/issues/1749 |
| KubeArmor | 2024 T3 | Implement Fuzz testing for KubeArmor Components | https://github.com/kubearmor/KubeArmor/issues/1367 |
| KubeArmor | 2025 T3 | KubeArmor Unit Test Coverage Audit | https://github.com/kubearmor/KubeArmor/issues/2130 |
| KubeEdge | 2024 T2 | KubeEdge test cases enhancement | https://github.com/kubeedge/kubeedge/issues/5562 |
| KubeEdge | 2025 T1 | Enhance KubeEdge testing coverage | https://github.com/kubeedge/kubeedge/issues/6101 |
| KubeEdge | 2025 T2 | Automatically generate unit tests and e2e tests based on LLM | https://github.com/kubeedge/kubeedge/issues/6318 |
| Kubernetes | 2024 T3 | Testeable documentation for the Pod Lifecycle events | https://github.com/kubernetes/kubernetes/issues/126369 |
| KubeSlice | 2025 T3 | Implement Comprehensive Unit & Integration Testing for kubeslice-cli | https://github.com/kubeslice/kubeslice-cli/issues/46 |
| KubeSlice | 2025 T3 | Enhance and Automate End-to-End (E2E) Testing Across the KubeSlice Ecosystem | https://github.com/kubeslice/kubeslice/issues/56 |
| KubeStellar | 2025 T3 | Implementing End-to-End Playwright Testing for KubeStellar UI | https://github.com/kubestellar/ui/issues/1334 |
| KWOK | 2024 T2 | Enhancement of Test Cases | https://github.com/kubernetes-sigs/kwok/issues/1062 |
| Kyverno | 2025 T1 | Chainsaw Tests For New Policy Types | https://github.com/kyverno/kyverno/issues/12065 |
| Kyverno | 2025 T2 | Improve Test Coverage and Docs for New Policy Types | https://github.com/kyverno/kyverno/issues/13011 |
| Kyverno | 2026 T1 | Test Enhancements -  Kyverno CLI Tests - envtest, fake client | https://github.com/kyverno/kyverno/issues/14629 |
| Kyverno | 2026 T1 | Test Enhancements -  Testing Framework / Toolset for integration tests | https://github.com/kyverno/kyverno/issues/14725 |
| LitmusChaos | 2024 T1 | Enhancement of litmusctl: Adding E2E Tests, CRUD Probes Commands, and Package Manager Availability | https://github.com/litmuschaos/litmus/issues/4405 |
| LitmusChaos | 2024 T1 | Enhancing Chaos Center: Implementing E2E Test Cases and Addressing CVE Issues | https://github.com/litmuschaos/litmus/issues/4406 |
| LitmusChaos | 2025 T1 | Enhancing CI/CD Integration for LitmusChaos: SDK Development and Chaos-CI-Lib Revamp | https://github.com/litmuschaos/litmus/issues/5038 |
| LitmusChaos | 2025 T1 | Improve the code coverage for observability in the LitmusChaos components | https://github.com/litmuschaos/litmus/issues/5039 |
| Meshery | 2024 T2 | Meshery: End-to-End Testing with Playwright | https://github.com/meshery/meshery/issues/10890 |
| Meshery | 2024 T3 | Meshery: End-to-End Testing with Playwright (Round 2) | https://github.com/meshery/meshery/issues/11494 |
| Meshery | 2025 T1 | Expanding end-to-end test coverage in Meshery using Playwright | https://github.com/meshery/meshery/issues/13514 |
| Meshery | 2026 T2 | Agentic CI Pipelines: GitHub Action Workflow Overhaul | https://github.com/meshery/meshery/issues/18795 |
| Microcks | 2025 T1 | Improving Microcks delivery and validation with GitHub Actions CI deployment tests | https://github.com/microcks/microcks/issues/1480 |
| OpenCost | 2025 T2 | Enterprise Ready OpenCost: Integration Testing | https://github.com/opencost/opencost/issues/3141 |
| OpenEverest | 2026 T3 | Performance Testing Plugin | https://github.com/openeverest/openeverest/issues/2464 |
| OpenKruise | 2025 T1 | Implement Fuzz testing for OpenKruise | https://github.com/openkruise/kruise/issues/1713 |
| OpenKruise | 2025 T3 | Enhance Robustness and Usability of Kruise-Game | https://github.com/openkruise/kruise-game/issues/266 |
| OpenKruise | 2026 T2 | Lightweight and Continuous Load Testing for OpenKruise Agents Using Kwok | https://github.com/openkruise/agents/issues/314 |
| OpenTelemetry | 2026 T1 | Tooling for detecting impact of behavioral changes in Go libraries | https://github.com/open-telemetry/opentelemetry-go-build-tools/issues/1528 |
| Podman Container Tools | 2026 T3 | Agentic CI Flake Categorization and Analysis | https://github.com/podman-container-tools/podman/issues/29265 |
| Prometheus | 2024 T2 | Prometheus Remote Write Benchmarking Capabilities | https://github.com/prometheus/prometheus/issues/13995 |
| Prometheus | 2024 T3 | Enhance Prometheus Benchmark Suite | https://github.com/prometheus/test-infra/issues/707 |
| Service Mesh Performance | 2024 T1 | Service Mesh Performance: Adaptive Load Control with Nighthawk | https://github.com/service-mesh-performance/service-mesh-performance/issues/416 |
| Service Mesh Performance | 2024 T1 | Service Mesh Performance: Distributed Load Testing with Nighthawk | https://github.com/service-mesh-performance/service-mesh-performance/issues/415 |
| Service Mesh Performance | 2024 T3 | CNCF Project Performance Test Dashboard | https://github.com/service-mesh-performance/service-mesh-performance/issues/432 |
| urunc | 2026 T1 | Create a dashboard and a notification system for CI testing in `urunc` | https://github.com/urunc-dev/urunc/issues/106 |
| urunc | 2026 T3 | Fuzzing and robustness testing for urunc | https://github.com/urunc-dev/urunc/issues/852 |
| Velero | 2026 T3 | Add CSI Snapshot E2E Tests to Kind CI | https://github.com/velero-io/velero/issues/7507 |
| Vitess | 2024 T1 | Improve Unit Test Coverage | https://github.com/vitessio/vitess/issues/14931 |
| Volcano | 2026 T1 | E2E Test Suite for Volcano Agent Scheduling | https://github.com/volcano-sh/volcano/issues/4881 |
| Volcano | 2026 T1 | E2E Test Suite for Volcano-global | https://github.com/volcano-sh/volcano-global/issues/35 |
| Volcano | 2026 T1 | E2E Test Suite for Kthena | https://github.com/volcano-sh/kthena/issues/662 |
| Volcano | 2026 T3 | Build a KVCache-aware scheduler E2E test suite | https://github.com/volcano-sh/kthena/issues/1328 |

## Phụ lục B. Cách tái tạo số liệu

Parser đọc từng `README.md` của term, tách `### <Project>` và `#### <Entry>`, rồi bóc các trường `Description`, `Expected Outcome`, `Recommended Skills`, `Technologies`, `Upstream Issue`. Regex QA-fit theo yêu cầu: `e2e|end-to-end|test|testing|playwright|cypress|selenium|ci\b|github actions|benchmark|performance|load test|k6|chaos|fuzz|conformance|flaky|coverage|quality|validation|integration test` (không phân biệt hoa thường; khi chạy lại nên thêm ranh giới từ để tránh khớp "latest", "contest"). Nhãn QA core ở Phụ lục A là phán đoán thủ công sau khi đọc description và expected outcome; nếu không đồng ý với một nhãn, điểm của project chỉ thay đổi theo trọng số năm của entry đó.
