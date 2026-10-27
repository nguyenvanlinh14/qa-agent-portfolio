---
title: Paid OSS bounties
short: Bounties
icon: git
---

# Paid OSS bounties

Trang này được tạo tự động bởi workflow oss-scout (`scripts/find-bounties.mjs`) vào 2026-10-27. Script tìm các issue đang mở có nhãn bounty (ví dụ `💎 Bounty` của Algora, hoặc `[$250]` trong tiêu đề của Expensify), chưa ai nhận, cập nhật trong 120 ngày gần đây. Trước khi chấm điểm, script lọc độ tin cậy của repo để loại các repo "bounty farm" (repo lập ra chỉ để câu lượt attempt): chỉ giữ repo có từ 200★ trở lên, được tạo cách đây ít nhất 6 tháng, không phải fork hay repo đã archive, tên repo không chứa bounty/hunter/livefire/airdrop. Lịch sử đã trả thưởng được tra bằng số issue có nhãn `💰 Rewarded` của repo (cột Paid before; `0 ⚠` nghĩa là chưa thấy bằng chứng repo từng trả tiền). Issue có hơn 15 người attempt được tách sang mục Crowded, không xếp hạng. Điểm 0-100: tiền thưởng (tối đa 25, thang log, trần $1000), mức cạnh tranh theo số người đã /attempt hoặc mở PR (tối đa 30), độ tin cậy của repo (tối đa 25: số sao và lịch sử trả thưởng), độ mới (tối đa 10), độ phù hợp với QA automation (tối đa 10: ngôn ngữ TypeScript/JavaScript/Go/Python và từ khóa test, Playwright, e2e, CI, flaky, lint, cli), trừ điểm nếu chưa rõ số tiền, mô tả quá dài hoặc chưa rõ quy định AI. Issue đã được trả thưởng và repo cấm nội dung do AI tạo ra đã bị loại.

> Lưu ý: bounty rất cạnh tranh, số tiền và số lượt attempt có thể đã đổi từ lúc tạo trang. Hãy đọc kỹ CONTRIBUTING và luật của repo trước khi làm, luôn khai báo (disclose) khi có AI hỗ trợ, và đừng spam `/attempt`. Bộ lọc chỉ giảm rủi ro, không thay thế việc tự kiểm tra repo và người ra bounty. Mục AI: `disclose` nghĩa là repo yêu cầu khai báo, `unknown` nghĩa là chưa tìm thấy quy định rõ ràng. Mục Paid before: `Upwork` nghĩa là repo trả qua Upwork (không có nhãn để đếm), `?` nghĩa là chưa tra được.

## Top 20

| Score | $ | Issue | Title | Attempts | ★ stars | Paid before | Lang | AI | Updated |
|---:|---:|---|---|---:|---:|---:|---|---|---|
| 53 | $300 | [go-gitea/gitea#4898](https://github.com/go-gitea/gitea/issues/4898) | Add inline comments on commits | 10 | 59k | 5 | Go | disclose | 2026-07-05 |
| 34 | ? | [shanalikhan/code-settings-sync#413](https://github.com/shanalikhan/code-settings-sync/issues/413) | Suggestion: Allow upload to repository | 1 | 4.1k | 0 ⚠ | TypeScript | unknown | 2026-10-13 |
| 33 | ? | [Ikalus1988/MisakaNet#1258](https://github.com/Ikalus1988/MisakaNet/issues/1258) | Start here: give your coding agent a failure memory (MCP, 60 seconds) | 1 | 543 | 0 ⚠ | Python | unknown | 2026-10-27 |
| 31 | ? | [FreezingMoon/AncientBeast#1772](https://github.com/FreezingMoon/AncientBeast/issues/1772) | showcase ability targeting area better \[bounty: 16 XTR\] | 2 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-10-27 |
| 24 | ? | [livepeer/go-livepeer#1815](https://github.com/livepeer/go-livepeer/issues/1815) | livepeer_cli: Show estimated tx cost in a confirmation step | 2 | 587 | 0 ⚠ | Go | unknown | 2026-10-11 |
| 17 | ? | [stashapp/stash#3530](https://github.com/stashapp/stash/issues/3530) | Support multiple scenes in a single file | 4 | 13k | 0 ⚠ | Go | unknown | 2026-09-28 |
| 14 | ? | [stashapp/stash#571](https://github.com/stashapp/stash/issues/571) | Support for multiple performer images | 4 | 13k | 0 ⚠ | Go | unknown | 2026-08-24 |

## Crowded (>15 attempts)

Quá đông người, không xếp hạng (hiện 6 issue, chỉ liệt kê 6 issue tiền cao nhất).

| $ | Issue | Attempts |
|---:|---|---:|
| $250 | [onyx-dot-app/onyx#2281](https://github.com/onyx-dot-app/onyx/issues/2281) | 50 |
| $50 | [arakoodev/EdgeChains#290](https://github.com/arakoodev/EdgeChains/issues/290) | 64 |
| $30 | [arakoodev/EdgeChains#273](https://github.com/arakoodev/EdgeChains/issues/273) | 60 |
| $25 | [arakoodev/EdgeChains#279](https://github.com/arakoodev/EdgeChains/issues/279) | 27 |
| $20 | [highlight/highlight#8032](https://github.com/highlight/highlight/issues/8032) | 50 |
| $15 | [flydelabs/flyde#112](https://github.com/flydelabs/flyde/issues/112) | 32 |

## Top 10 chi tiết

<details>
<summary><b>53</b> · $300 · go-gitea/gitea#4898: Add inline comments on commits</summary>

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
<summary><b>34</b> · ? · shanalikhan/code-settings-sync#413: Suggestion: Allow upload to repository</summary>

[Mở issue trên GitHub](https://github.com/shanalikhan/code-settings-sync/issues/413)

```text
[<img alt="Issuehunt badges" src="https://img.shields.io/badge/IssueHunt-%24200%20Funded-%2300A156.svg" />](https://oss.issuehunt.io/r/shanalikhan/code-settings-sync/issues/413)

By @shanalikhan

Before starting this feature, Settings Sync required code requires refactoring. You can take https://github.com/shanalikhan/code-settings-sync/pull/937 as a baseline for refactoring to start working.

Following are the feature i see for git sync.

Originally by @smbkr

It would be useful to be able to upload the settings to a repo instead of a gist, the way that JetBrains IDEs sync, so that the change
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
<summary><b>31</b> · ? · FreezingMoon/AncientBeast#1772: showcase ability targeting area better \[bounty: 16 XTR\]</summary>

[Mở issue trên GitHub](https://github.com/FreezingMoon/AncientBeast/issues/1772)

```text
Area abilities, such as Godlet Printer, should show dashed hexagons for occupied hexagons within range to better reflect total area.
```

</details>

<details>
<summary><b>24</b> · ? · livepeer/go-livepeer#1815: livepeer_cli: Show estimated tx cost in a confirmation step</summary>

[Mở issue trên GitHub](https://github.com/livepeer/go-livepeer/issues/1815)

```text
When you use livepeer_cli to tell the node to submit a transaction there is:

- No indication of how much the transaction will cost
- No confirmation step checking with the user if they are sure they want to do this

As a result, it is easy for the following to occur:

- User spends more than they want to
- User has to guess how much ETH they need for the transactions since the failure message don't indicate how much was needed. Related to https://github.com/livepeer/go-livepeer/issues/1783
```

</details>

<details>
<summary><b>17</b> · ? · stashapp/stash#3530: Support multiple scenes in a single file</summary>

[Mở issue trên GitHub](https://github.com/stashapp/stash/issues/3530)

```text
### **Is your feature request related to a problem? Please describe.**
There are cases where a stash user would want to view scenes that may exist in a single file separately without re-encoding the source file into separate files so they can be viewed as separate scenes within stash 

### **Describe the solution you'd like**
The solution has been discussed a few times and usually revolves around utilizing a similar system to Markers to determine the start and end points of a "sub-scene" within a file that has multiple scenes while leaving the source file as is

### **Describe alternatives you
```

</details>

<details>
<summary><b>14</b> · ? · stashapp/stash#571: Support for multiple performer images</summary>

[Mở issue trên GitHub](https://github.com/stashapp/stash/issues/571)

```text
It would be great to allow save a few images at performer entity and not just one like now. I like to ocassionally surf the net searching for great profile images for girls in my database, and it would be nice to keep more that one (maybe with a limit?) and show one randomly as default or visible each session (or something like that). I mean something that don't suppose extra work to devs, just to see a little more "variety" and "eyecandy".

Maybe store a few images and the possibility to change the "default" manually from perfomers page? I dont know what would be more simple.

Sorry for my en
```

</details>

