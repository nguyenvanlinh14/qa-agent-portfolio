---
title: Paid OSS bounties
short: Bounties
icon: git
---

# Paid OSS bounties

Trang này được tạo tự động bởi workflow oss-scout (`scripts/find-bounties.mjs`) vào 2026-11-23. Script tìm các issue đang mở có nhãn bounty (ví dụ `💎 Bounty` của Algora, hoặc `[$250]` trong tiêu đề của Expensify), chưa ai nhận, cập nhật trong 120 ngày gần đây. Trước khi chấm điểm, script lọc độ tin cậy của repo để loại các repo "bounty farm" (repo lập ra chỉ để câu lượt attempt): chỉ giữ repo có từ 200★ trở lên, được tạo cách đây ít nhất 6 tháng, không phải fork hay repo đã archive, tên repo không chứa bounty/hunter/livefire/airdrop. Lịch sử đã trả thưởng được tra bằng số issue có nhãn `💰 Rewarded` của repo (cột Paid before; `0 ⚠` nghĩa là chưa thấy bằng chứng repo từng trả tiền). Issue có hơn 15 người attempt được tách sang mục Crowded, không xếp hạng. Điểm 0-100: tiền thưởng (tối đa 25, thang log, trần $1000), mức cạnh tranh theo số người đã /attempt hoặc mở PR (tối đa 30), độ tin cậy của repo (tối đa 25: số sao và lịch sử trả thưởng), độ mới (tối đa 10), độ phù hợp với QA automation (tối đa 10: ngôn ngữ TypeScript/JavaScript/Go/Python và từ khóa test, Playwright, e2e, CI, flaky, lint, cli), trừ điểm nếu chưa rõ số tiền, mô tả quá dài hoặc chưa rõ quy định AI. Issue đã được trả thưởng và repo cấm nội dung do AI tạo ra đã bị loại.

> Lưu ý: bounty rất cạnh tranh, số tiền và số lượt attempt có thể đã đổi từ lúc tạo trang. Hãy đọc kỹ CONTRIBUTING và luật của repo trước khi làm, luôn khai báo (disclose) khi có AI hỗ trợ, và đừng spam `/attempt`. Bộ lọc chỉ giảm rủi ro, không thay thế việc tự kiểm tra repo và người ra bounty. Mục AI: `disclose` nghĩa là repo yêu cầu khai báo, `unknown` nghĩa là chưa tìm thấy quy định rõ ràng. Mục Paid before: `Upwork` nghĩa là repo trả qua Upwork (không có nhãn để đếm), `?` nghĩa là chưa tra được.

## Top 20

| Score | $ | Issue | Title | Attempts | ★ stars | Paid before | Lang | AI | Updated |
|---:|---:|---|---|---:|---:|---:|---|---|---|
| 61 | $300 | [go-gitea/gitea#4898](https://github.com/go-gitea/gitea/issues/4898) | Add inline comments on commits | 10 | 59k | 5 | Go | disclose | 2026-11-01 |
| 38 | ? | [Ikalus1988/MisakaNet#4876](https://github.com/Ikalus1988/MisakaNet/issues/4876) | \[Bounty\]\[$0\]\[corpus\] devops 20 篇缺 verify：补一条可执行的确认，或标记失效 | 1 | 567 | 0 ⚠ | Python | unknown | 2026-11-22 |
| 38 | ? | [Ikalus1988/MisakaNet#4874](https://github.com/Ikalus1988/MisakaNet/issues/4874) | \[Bounty\]\[$0\]\[corpus\] 48 篇 draft：每篇给一个 promote/retire 的判据 | 1 | 567 | 0 ⚠ | Python | unknown | 2026-11-22 |
| 33 | ? | [Ikalus1988/MisakaNet#1258](https://github.com/Ikalus1988/MisakaNet/issues/1258) | Start here: give your coding agent a failure memory (MCP, 60 seconds) | 1 | 567 | 0 ⚠ | Python | unknown | 2026-11-22 |
| 30 | ? | [FreezingMoon/AncientBeast#2246](https://github.com/FreezingMoon/AncientBeast/issues/2246) | cursor state to showcase active unit better \[bounty: 6 XTR\] | 3 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-11-15 |
| 30 | ? | [FreezingMoon/AncientBeast#2004](https://github.com/FreezingMoon/AncientBeast/issues/2004) | ability unit targeting tweaks \[bounty: 15 XTR\] | 2 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-11-14 |
| 26 | ? | [shanalikhan/code-settings-sync#143](https://github.com/shanalikhan/code-settings-sync/issues/143) | Considering disabled extensions | 3 | 4.1k | ? | TypeScript | unknown | 2026-11-16 |
| 22 | ? | [FreezingMoon/AncientBeast#2704](https://github.com/FreezingMoon/AncientBeast/issues/2704) | Undo Move mechanic \[bounty: 222 XTR\] | 4 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-11-14 |

## Crowded (>15 attempts)

Quá đông người, không xếp hạng (hiện 6 issue, chỉ liệt kê 6 issue tiền cao nhất).

| $ | Issue | Attempts |
|---:|---|---:|
| $250 | [onyx-dot-app/onyx#2281](https://github.com/onyx-dot-app/onyx/issues/2281) | 50 |
| $50 | [arakoodev/EdgeChains#290](https://github.com/arakoodev/EdgeChains/issues/290) | 64 |
| $30 | [arakoodev/EdgeChains#273](https://github.com/arakoodev/EdgeChains/issues/273) | 62 |
| $25 | [arakoodev/EdgeChains#279](https://github.com/arakoodev/EdgeChains/issues/279) | 41 |
| $20 | [highlight/highlight#8032](https://github.com/highlight/highlight/issues/8032) | 64 |
| $15 | [flydelabs/flyde#112](https://github.com/flydelabs/flyde/issues/112) | 42 |

## Top 10 chi tiết

<details>
<summary><b>61</b> · $300 · go-gitea/gitea#4898: Add inline comments on commits</summary>

[Mở issue trên GitHub](https://github.com/go-gitea/gitea/issues/4898)

```text
Add comments on commits (not only in PR), I would love to have this feature :smiley: 

Reference: https://github.com/go-gitea/gitea/issues/124, https://github.com/go-gitea/gitea/issues/124#issuecomment-419289878

Thanks to gitea's team and contributors :heart: 

----

Update: there were some attempts but they failed to make attachment management right. Pay more attention to:

*  Gitea binds the attachments to repo issue/comment/release. If no binding, then the attachment will be deleted. For example: `DeleteOrphanedAttachments`
* `checkStorage(&checkStorageOptions{Attachments: true})` deletes
```

</details>

<details>
<summary><b>38</b> · ? · Ikalus1988/MisakaNet#4876: \[Bounty\]\[$0\]\[corpus\] devops 20 篇缺 verify：补一条可执行的确认，或标记失效</summary>

[Mở issue trên GitHub](https://github.com/Ikalus1988/MisakaNet/issues/4876)

```text
## 背景

359 篇已发布课程**没有 `verify` 字段**——也就是"没人写过怎么确认这条经验成立"。语料的证据分级（`evidence_level`）因此有一半是自述。本任务从最大的一批开始：`domain: devops` 里 126 篇缺 `verify`，先取**创建时间最早的 20 篇**（越老越可能已经失效）。

## 范围（20 篇）

- `lessons/contrib/api-rate-limit-handling.md`
- `lessons/contrib/gfw-tls-sni-blocking-tool-layer-ineffective.md`
- `lessons/contrib/lesson-10-microservices-latency-math.md`
- `lessons/contrib/lesson-11-github-commit-signing.md`
- `lessons/contrib/lesson-13-aws-lambda-microvms.md`
- `lessons/contrib/lesson-14-api-pagination-design.md`
- `lessons/contrib/lesson-15-cloudflare-workflows-durable.md`
- `lessons/contrib
```

</details>

<details>
<summary><b>38</b> · ? · Ikalus1988/MisakaNet#4874: \[Bounty\]\[$0\]\[corpus\] 48 篇 draft：每篇给一个 promote/retire 的判据</summary>

[Mở issue trên GitHub](https://github.com/Ikalus1988/MisakaNet/issues/4874)

```text
## 背景

`lessons/` 有 48 篇 `status: draft` 的课程——它们既不进评分，也没有明确的下场。这是语料里唯一一处"写着待办、却没有判据"的堆积。

## 范围（修订 2026-11-14：只收**今天可验证**的 15 篇）

原来的范围是 48 篇。机械分档后发现那是错的范围——**63% 的 draft 根本没法在没有特定环境的机器上验证**：

| 档 | 篇数 | 为什么不能放在同一个赏金里 |
|---|---|---|
| **A 今天可验证** | **15** | 本单的正式范围（见下） |
| B 硬件/浏览器环境 | 19 | 需要 FANUC 控制器、Karel 工具链、Playwright 浏览器 |
| B 仅 Windows | 8 | 需要 Windows/PowerShell 5.1 现场 |
| B 未执行声明（E0 自述） | 2 | 提交者从未捕获输出，谁都验不了 |
| D 方法论 | 2 | 没有"故障主张"，命令无法证伪它 |

B 组另外开了一条跟踪 issue（不是赏金）：`#4889`。把 B 组塞进本单只会制造"看起来有人接、实际没人能验"的假进度。

### A 组（15 篇，本单全部范围）

- `lessons/contrib/compatibility-gate-rejection-is-v
```

</details>

<details>
<summary><b>33</b> · ? · Ikalus1988/MisakaNet#1258: Start here: give your coding agent a failure memory (MCP, 60 seconds)</summary>

[Mở issue trên GitHub](https://github.com/Ikalus1988/MisakaNet/issues/1258)

```text
> ## Start here (updated 2026-10-26)
>
> MisakaNet is a searchable memory of **650 evidence-rated failure lessons** — the errors agents and humans actually hit, with root cause, fix, and verification. Your agent can search it before it starts guessing.
>
> **60 seconds**
> - **Any MCP client** (Claude Code, Cursor, Codex, DSH): add `https://misakanet.org/mcp`
> - **DSH:** `dsh plugin --profile web add misakanet`
> - **CLI (needs a checkout):** `python3 search_knowledge.py "your error" --remote`
>
> **Pick one path**
> 1. **Search a real error** → comment `Found it` or `Did not find`; both are
```

</details>

<details>
<summary><b>30</b> · ? · FreezingMoon/AncientBeast#2246: cursor state to showcase active unit better \[bounty: 6 XTR\]</summary>

[Mở issue trên GitHub](https://github.com/FreezingMoon/AncientBeast/issues/2246)

```text
When hovering active unit, the cursor should turn into a ["progress" type of pointer ](https://www.w3schools.com/cssref/tryit.php?filename=trycss_cursor) if there's no ability selected or unit is not a viable target anyway.
```

</details>

<details>
<summary><b>30</b> · ? · FreezingMoon/AncientBeast#2004: ability unit targeting tweaks \[bounty: 15 XTR\]</summary>

[Mở issue trên GitHub](https://github.com/FreezingMoon/AncientBeast/issues/2004)

```text
When targeting an ability, the target hexagons should be using an overlapped non-spinning cursor type of hexagon on top of the filled outline hexagon. Also, if the ability only affects a hexagon of an unit, the other hexagons should be displayed as player color coded filled outline hexagons. This way we'll better indicate the range of some abilities or area effect, while also being able to click anywhere on the base of the target unit in order to select the corresponding path. Relies on #2003 to be implemented first ideally.
```

</details>

<details>
<summary><b>26</b> · ? · shanalikhan/code-settings-sync#143: Considering disabled extensions</summary>

[Mở issue trên GitHub](https://github.com/shanalikhan/code-settings-sync/issues/143)

```text
[<img alt="Issuehunt badges" src="https://img.shields.io/badge/IssueHunt-%24120%20Funded-%2300A156.svg" />](https://oss.issuehunt.io/r/shanalikhan/code-settings-sync/issues/143)

**Visual Studio Code Version :** 1.7.1
**Code Sync Settings Version :** 2.3.8
**Operating System :** W10
**Occurs On:** [Upload / Download]
**Proxy Enabled:** No

As of version 1.7, VSCode introduced _[disabled extensions](http://code.visualstudio.com/updates/v1_7#_disable-extensions)_. 

We're excited to find these supported by this beloved plugin soon, hopefully! ;) Thank you!

---

<details>
<summary>
<b>IssueHunt
```

</details>

<details>
<summary><b>22</b> · ? · FreezingMoon/AncientBeast#2704: Undo Move mechanic \[bounty: 222 XTR\]</summary>

[Mở issue trên GitHub](https://github.com/FreezingMoon/AncientBeast/issues/2704)

```text
As of #2701 brainstorm, there should be a feature to undo the very last action, called "Undo Move", which will replace the "Delay Turn" icon as soon as something happens if available, as they're mutually exclusive. This is usable only once per match round, at any point given, basically turning back time until before last action that was made. Ctrl+Z hotkeys to be used for it.

Icon for the action:
https://game-icons.net/1x1/delapouite/backward-time.html
Standard icon style: no background, white foreground, 4px black stroke.
```

</details>

