---
title: Paid OSS bounties
short: Bounties
icon: git
---

# Paid OSS bounties

Trang này được tạo tự động bởi workflow oss-scout (`scripts/find-bounties.mjs`) vào 2026-11-09. Script tìm các issue đang mở có nhãn bounty (ví dụ `💎 Bounty` của Algora, hoặc `[$250]` trong tiêu đề của Expensify), chưa ai nhận, cập nhật trong 120 ngày gần đây. Trước khi chấm điểm, script lọc độ tin cậy của repo để loại các repo "bounty farm" (repo lập ra chỉ để câu lượt attempt): chỉ giữ repo có từ 200★ trở lên, được tạo cách đây ít nhất 6 tháng, không phải fork hay repo đã archive, tên repo không chứa bounty/hunter/livefire/airdrop. Lịch sử đã trả thưởng được tra bằng số issue có nhãn `💰 Rewarded` của repo (cột Paid before; `0 ⚠` nghĩa là chưa thấy bằng chứng repo từng trả tiền). Issue có hơn 15 người attempt được tách sang mục Crowded, không xếp hạng. Điểm 0-100: tiền thưởng (tối đa 25, thang log, trần $1000), mức cạnh tranh theo số người đã /attempt hoặc mở PR (tối đa 30), độ tin cậy của repo (tối đa 25: số sao và lịch sử trả thưởng), độ mới (tối đa 10), độ phù hợp với QA automation (tối đa 10: ngôn ngữ TypeScript/JavaScript/Go/Python và từ khóa test, Playwright, e2e, CI, flaky, lint, cli), trừ điểm nếu chưa rõ số tiền, mô tả quá dài hoặc chưa rõ quy định AI. Issue đã được trả thưởng và repo cấm nội dung do AI tạo ra đã bị loại.

> Lưu ý: bounty rất cạnh tranh, số tiền và số lượt attempt có thể đã đổi từ lúc tạo trang. Hãy đọc kỹ CONTRIBUTING và luật của repo trước khi làm, luôn khai báo (disclose) khi có AI hỗ trợ, và đừng spam `/attempt`. Bộ lọc chỉ giảm rủi ro, không thay thế việc tự kiểm tra repo và người ra bounty. Mục AI: `disclose` nghĩa là repo yêu cầu khai báo, `unknown` nghĩa là chưa tìm thấy quy định rõ ràng. Mục Paid before: `Upwork` nghĩa là repo trả qua Upwork (không có nhãn để đếm), `?` nghĩa là chưa tra được.

## Top 20

| Score | $ | Issue | Title | Attempts | ★ stars | Paid before | Lang | AI | Updated |
|---:|---:|---|---|---:|---:|---:|---|---|---|
| 62 | $300 | [go-gitea/gitea#4898](https://github.com/go-gitea/gitea/issues/4898) | Add inline comments on commits | 10 | 59k | 5 | Go | disclose | 2026-11-01 |
| 42 | ? | [fyne-io/fyne#142](https://github.com/fyne-io/fyne/issues/142) | Add drag and drop support | 0 | 29k | 0 ⚠ | Go | unknown | 2026-11-01 |
| 41 | ? | [fyne-io/fyne#1062](https://github.com/fyne-io/fyne/issues/1062) | Android apps are lagging when enter text and scrolling | 0 | 29k | 0 ⚠ | Go | unknown | 2026-10-27 |
| 34 | ? | [shanalikhan/code-settings-sync#396](https://github.com/shanalikhan/code-settings-sync/issues/396) | Upload/Download Conflicts | 1 | 4.1k | 0 ⚠ | TypeScript | unknown | 2026-11-06 |
| 32 | ? | [Ikalus1988/MisakaNet#1258](https://github.com/Ikalus1988/MisakaNet/issues/1258) | Start here: give your coding agent a failure memory (MCP, 60 seconds) | 1 | 556 | 0 ⚠ | Python | unknown | 2026-10-30 |
| 31 | ? | [FreezingMoon/AncientBeast#2704](https://github.com/FreezingMoon/AncientBeast/issues/2704) | Undo Move mechanic \[bounty: 222 XTR\] | 3 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-11-08 |
| 30 | ? | [FreezingMoon/AncientBeast#2250](https://github.com/FreezingMoon/AncientBeast/issues/2250) | hexagon coordinate view tweaks \[bounty: 7 XTR\] | 2 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-10-31 |
| 26 | ? | [shanalikhan/code-settings-sync#143](https://github.com/shanalikhan/code-settings-sync/issues/143) | Considering disabled extensions | 3 | 4.1k | 0 ⚠ | TypeScript | unknown | 2026-11-05 |
| 26 | ? | [shanalikhan/code-settings-sync#413](https://github.com/shanalikhan/code-settings-sync/issues/413) | Suggestion: Allow upload to repository | 2 | 4.1k | 0 ⚠ | TypeScript | unknown | 2026-11-05 |
| 23 | ? | [FreezingMoon/AncientBeast#2537](https://github.com/FreezingMoon/AncientBeast/issues/2537) | indicate selected ability when targeting \[bounty: 14 XTR\] | 4 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-11-08 |
| 22 | ? | [FreezingMoon/AncientBeast#2092](https://github.com/FreezingMoon/AncientBeast/issues/2092) | less distracting HUD when in the background \[bounty: 8 XTR\] | 4 | 1.9k | 0 ⚠ | TypeScript | unknown | 2026-10-31 |
| 22 | ? | [livepeer/go-livepeer#1815](https://github.com/livepeer/go-livepeer/issues/1815) | livepeer_cli: Show estimated tx cost in a confirmation step | 2 | 587 | 0 ⚠ | Go | unknown | 2026-10-11 |
| 16 | ? | [stashapp/stash#3530](https://github.com/stashapp/stash/issues/3530) | Support multiple scenes in a single file | 4 | 13k | 0 ⚠ | Go | unknown | 2026-09-28 |
| 13 | ? | [stashapp/stash#571](https://github.com/stashapp/stash/issues/571) | Support for multiple performer images | 4 | 13k | 0 ⚠ | Go | unknown | 2026-08-24 |

## Crowded (>15 attempts)

Quá đông người, không xếp hạng (hiện 6 issue, chỉ liệt kê 6 issue tiền cao nhất).

| $ | Issue | Attempts |
|---:|---|---:|
| $250 | [onyx-dot-app/onyx#2281](https://github.com/onyx-dot-app/onyx/issues/2281) | 50 |
| $50 | [arakoodev/EdgeChains#290](https://github.com/arakoodev/EdgeChains/issues/290) | 64 |
| $30 | [arakoodev/EdgeChains#273](https://github.com/arakoodev/EdgeChains/issues/273) | 62 |
| $25 | [arakoodev/EdgeChains#279](https://github.com/arakoodev/EdgeChains/issues/279) | 38 |
| $20 | [highlight/highlight#8032](https://github.com/highlight/highlight/issues/8032) | 64 |
| $15 | [flydelabs/flyde#112](https://github.com/flydelabs/flyde/issues/112) | 42 |

## Top 10 chi tiết

<details>
<summary><b>62</b> · $300 · go-gitea/gitea#4898: Add inline comments on commits</summary>

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
<summary><b>42</b> · ? · fyne-io/fyne#142: Add drag and drop support</summary>

[Mở issue trên GitHub](https://github.com/fyne-io/fyne/issues/142)

```text
Add the events for these gestures.

Explore further what's required to integrate with system DnD
```

</details>

<details>
<summary><b>41</b> · ? · fyne-io/fyne#1062: Android apps are lagging when enter text and scrolling</summary>

[Mở issue trên GitHub](https://github.com/fyne-io/fyne/issues/1062)

```text
Since recent changes that enforce layout the general responsiveness, particularly around text and scroll, has gone down.

Some optimisations that exist in glfw may not have been ported to mobile.
```

</details>

<details>
<summary><b>34</b> · ? · shanalikhan/code-settings-sync#396: Upload/Download Conflicts</summary>

[Mở issue trên GitHub](https://github.com/shanalikhan/code-settings-sync/issues/396)

```text
[<img alt="Issuehunt badges" src="https://img.shields.io/badge/IssueHunt-%2480%20Funded-%2300A156.svg" />](https://oss.issuehunt.io/r/shanalikhan/code-settings-sync/issues/396)

First of all: Thank you! You've developed a really awesome, must-have tool!

Now, straight to my problem.
I want to keep settings synced between 2 PCs, but I'm always getting "conflicts" when downloading because the extension thinks my local settings have diverged from the gist (when IMO that's not the case, of course).

I keep getting errors like this:
> Failed to save 'settings.json': The content on disk is newer. Cl
```

</details>

<details>
<summary><b>32</b> · ? · Ikalus1988/MisakaNet#1258: Start here: give your coding agent a failure memory (MCP, 60 seconds)</summary>

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
<summary><b>31</b> · ? · FreezingMoon/AncientBeast#2704: Undo Move mechanic \[bounty: 222 XTR\]</summary>

[Mở issue trên GitHub](https://github.com/FreezingMoon/AncientBeast/issues/2704)

```text
As of #2701 brainstorm, there should be a feature to undo the very last action, called "Undo Move", which will replace the "Delay Turn" icon as soon as something happens if available, as they're mutually exclusive. This is usable only once per match round, at any point given, basically turning back time until before last action that was made. Ctrl+Z hotkeys to be used for it.

Icon for the action:
https://game-icons.net/1x1/delapouite/backward-time.html
Standard icon style: no background, white foreground, 4px black stroke.
```

</details>

<details>
<summary><b>30</b> · ? · FreezingMoon/AncientBeast#2250: hexagon coordinate view tweaks \[bounty: 7 XTR\]</summary>

[Mở issue trên GitHub](https://github.com/FreezingMoon/AncientBeast/issues/2250)

```text
Trying to improve the hexagon coordinate view, but not fully sure if this will work (or it could use tweaks along the way), so the bounty will be granted even if PR not merged if its according to specs (this rule kinda applies to most PRs), see this list:

- units should no longer be in x-ray mode because that's tedious
- coordinates should display on top of units to be properly visible
- another grid with dashed hexes should display on top of units
- dashed hexagons at 25% opacity for non-unit occupied places

The view is visible when hovering the round marker indicator from unit queue or whi
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
<summary><b>26</b> · ? · shanalikhan/code-settings-sync#413: Suggestion: Allow upload to repository</summary>

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
<summary><b>23</b> · ? · FreezingMoon/AncientBeast#2537: indicate selected ability when targeting \[bounty: 14 XTR\]</summary>

[Mở issue trên GitHub](https://github.com/FreezingMoon/AncientBeast/issues/2537)

```text
When targeting an ability, the ability's icon should be showcased above the hexagon hovered (along with its frame).

Should be temporary (like the yellow text tooltip is basically); he cancel one should show icon as well, the cancel.svg

Relies on #1584 probably, so we can load svg files as textures, based on that, icons could be added on the fly #678
```

</details>

