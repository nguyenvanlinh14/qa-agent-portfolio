---
title: OSS candidates
short: OSS candidates
icon: git
---

# OSS candidates

Trang này được tạo tự động bởi workflow oss-scout (`scripts/find-good-first-issues.mjs --detail`) vào 2026-10-27. Điểm càng cao càng đáng thử trước; xem cách tính trong [OSS Playbook](https://github.com/nguyenvanlinh14/qa-agent-portfolio/blob/main/docs/open-source-playbook.md).

## microsoft/playwright

Không có issue phù hợp.

## microsoft/playwright-mcp

Không có issue phù hợp.

## grafana/k6

| Score | Issue | Title | Labels | Comments | Updated |
|---:|---|---|---|---:|---|
| 82 | [#881](https://github.com/grafana/k6/issues/881) | HTTP/2 server push | `good first issue` `feature` `lower prio` `new-http` `triage` | 1 | 2026-08-18 |
| 81 | [#4412](https://github.com/grafana/k6/issues/4412) | Optimize tests run speed (especially the functional tests) | `good first issue` `tests` `hacktoberfest` `triage` `area: browser` | 5 | 2026-09-23 |
| 80 | [#4584](https://github.com/grafana/k6/issues/4584) | Support sigv4 to push metric to AWS managed prometheus | `good first issue` `hacktoberfest` `triage` `area: prometheusrw` | 2 | 2026-07-29 |
| 79 | [#2764](https://github.com/grafana/k6/issues/2764) | Extend the \`metrics.TagSet\` API | `good first issue` `ux` `feature` `stale` | 4 | 2026-10-19 |
| 74 | [#2296](https://github.com/grafana/k6/issues/2296) | a Roadmap to target higher ES standards? ES6+ ES7+ ES8+ or ES2020 ES2021+ ? | `enhancement` `help wanted` `feature` `js-compat` `stale` | 5 | 2026-10-19 |
| 74 | [#1939](https://github.com/grafana/k6/issues/1939) | Log output as xk6 extension | `enhancement` `help wanted` `feature` `stale` | 4 | 2026-10-19 |
| 74 | [#1210](https://github.com/grafana/k6/issues/1210) | Cookies not saved during NTLM auth negotiation | `bug` `help wanted` `refactor` `evaluation needed` `stale` | 4 | 2026-10-19 |
| 74 | [#921](https://github.com/grafana/k6/issues/921) | Better metrics about sleep and group | `enhancement` `help wanted` `stale` | 2 | 2026-10-19 |
| 68 | [#238](https://github.com/grafana/k6/issues/238) | Support for QUIC protocol | `good first issue` `feature` `stale` | 7 | 2026-10-12 |

## grafana/k6-docs

Không có issue phù hợp.

## allure-framework/allure-js

Không có issue phù hợp.

## testing-library/dom-testing-library

Không có issue phù hợp.

## microsoft/playwright-vscode

Không có issue phù hợp.

## Top 10

<details>
<summary><b>82</b> · grafana/k6#881: HTTP/2 server push</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/881)

```text
We probably should consider properly implementing [HTTP/2 Server Push](https://en.wikipedia.org/wiki/HTTP/2_Server_Push), once we have the rest of the infrastructure needed for it (like per-VU event loops).
```

</details>

<details>
<summary><b>81</b> · grafana/k6#4412: Optimize tests run speed (especially the functional tests)</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/4412)

```text
This can be ongoing work. One idea is:
* Having a pool of browsers
* Sharing the pool among the tests (they don't run in parallel 10-20 tests at a time (depending on the number of cores on your machine—on the other side, it won't matter for CI. So the solution below is needed too.)
* Optimizing tests further

Advantages:
* Less local wait times
* Less CI wait times
* Can teach us how to work with a pool of browsers (pre-AWS browser farms?)

Here is the [current](https://github.com/grafana/xk6-browser/commit/47bdfb07269afbe05daeefb743b9e7d95feaaf40) Go tests run speeds:

Test | Sec
---- | ---
TestPageScreenshotFullpage|2.53
TestPageWaitForFunction/ok_func_poll_mutation|1.76
TestPageWaitForFunction/ok_expr_poll_interval|1.74
TestLifecycleNetworkIdle/doesn't_unblock...|1.69
TestWaitForFrameNa
```

</details>

<details>
<summary><b>80</b> · grafana/k6#4584: Support sigv4 to push metric to AWS managed prometheus</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/4584)

```text
Feature request: Add support for sigv4 method  to write to a remote AWS managed prometheus instance

https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write
```

</details>

<details>
<summary><b>79</b> · grafana/k6#2764: Extend the \`metrics.TagSet\` API</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/2764)

```text
### Feature Description

During the `grafana/xk6-output-prometheus-remote`'s [PR review discussions](https://github.com/grafana/xk6-output-prometheus-remote/pull/55/files#r1017897165), we found that extensions might need memory efficiently iterate on the tag/values because of a standard `Map()` is not memory efficient.

https://github.com/grafana/k6/blob/e14f14d416b0af4e495e6f565a2a9787a73ade54/metrics/tags.go#L72-L75

This leads that extensions should refer to the internals and iterate like:

https://github.com/grafana/xk6-output-prometheus-remote/blob/6c3f96add65cef26cf80fc157fa067de7c96f78b/pkg/remotewrite/prometheus.go#L12-L24

Ideally, we should be more developer friendly and provide a way to iterate on tags without casting to an underlying type (`atlas.Node`).

Also, it seems like it
```

</details>

<details>
<summary><b>74</b> · grafana/k6#2296: a Roadmap to target higher ES standards? ES6+ ES7+ ES8+ or ES2020 ES2021+ ?</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/2296)

```text
### Feature Description

the [main feature of k6](https://github.com/grafana/k6#features) still says ES6, but ES6 has existed long time (since 2015), some features are not cool enough at the end of 2021, and we have been using many newer JS features for years, like this [`optional chaining operator (?.)`](https://node.green/#ES2020-features-optional-chaining-operator-----) with babel or natively since 2020;

wish can write tests in this way, checking the response header should have `'content-type'` and should string `includes` `'application/json'`

instead of writing it the old way:

wonder what JS engine is builtin this `k6` tool?  can that bump version to target a higher version of JS standard?

many things like `URL`, `URLSearchParams` have been builtin Node.js for years;

and have to i
```

</details>

<details>
<summary><b>74</b> · grafana/k6#1939: Log output as xk6 extension</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/1939)

```text
I was reading about xk6 extension and this amazing way to provide new features to k6.

I have reviewed the code for https://github.com/li-zhixin/xk6-influxdbv2 and I was wondering if there is a similar options to extend the log support.

In fact, yesterday I have sent the PR (https://github.com/k6io/k6/pull/1938) to extend the log support for k6, but I think I would be nice to add this feature with a xk6 extension.

Checking the k6 code in https://github.com/k6io/k6/tree/master/log, I have not seen any option to extend the logger support.

So, my questions are... could we add new loggers support using xk6? If not, there is a plan to provide this support?

Thank you!

Iván
```

</details>

<details>
<summary><b>74</b> · grafana/k6#1210: Cookies not saved during NTLM auth negotiation</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/1210)

```text
Looking at the [screenshot that was posted in the community forum](https://community.k6.io/t/unauthorized-with-ntlm-auth/262/10), it seems like the current way we handle NTLM authentication looses some cookies. The current implementation basically uses [`http.RoundTripper`](https://golang.org/pkg/net/http/#RoundTripper) wrappers to handle NTLM and digest authentication: https://github.com/loadimpact/k6/blob/a8d9ee9da9d621ffcb02a5d9b832f715b47e5476/lib/netext/httpext/request.go#L277-L282

So this might also be something that affects the digest authentication as well... It's worth investigating and might affect how we implement https://github.com/loadimpact/k6/issues/800 as well. It might be necessary to scrap the current wrappers and write a new `http.Client` alternative that is able to han
```

</details>

<details>
<summary><b>74</b> · grafana/k6#921: Better metrics about sleep and group</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/921)

```text
Currently if a group includes a 10 second sleep we are going to say that the group took 10 seconds, which while correct might not be what the enduser is interested in. 
I propose that we:
1. implement #880 
2. Have the group know that there was n seconds of sleep in it's current execution - probably through some new methods on [lib.Group](https://github.com/loadimpact/k6/blob/9405ba29c68ced92c6b96974485d1541a8807f23/lib/models.go#L97-L122)
3. Add new metric `group_sleep`? 
4. Choose whether to remove the sleep time from the `group_duration` or add another metric that is the `group_duration` without the `group_sleep` or the reverse - have the `group_duration` be without the `group_sleep` but have another `full_group_duration` that includes the `group_sleep`
```

</details>

<details>
<summary><b>68</b> · grafana/k6#238: Support for QUIC protocol</summary>

[Mở issue trên GitHub](https://github.com/grafana/k6/issues/238)

```text
Hi

As discussed briefly in Slack, it'd be great to get support for the [QUIC](https://www.chromium.org/quic) transport protocol (currently an [IETF draft](https://tools.ietf.org/html/draft-hamilton-early-deployment-quic-00) though has a dedicated working group and very wide support so is extremely likely to be ratified before too long): 

There's a potentially helpful QUIC lib for Go which is used by [Caddy](https://caddyserver.com/) - [quic-go](https://github.com/lucas-clemente/quic-go) (MIT license).

QUIC is UDP-based so this might cause some issues/complexity and is worth calling out in docs as folks will need to ensure they allow udp:443 from load gen(s) to server(s)/LBs.

Please let me know if you need any more info from me.

Cheers
```

</details>

