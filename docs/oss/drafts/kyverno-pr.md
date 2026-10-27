<!-- Tiêu đề PR: test(cel): add unit tests for the bounded gzip CEL library
     Chỉ tick ô "AI Usage Policy" SAU KHI bạn đã đọc https://github.com/kyverno/community (AI_USAGE_POLICY.md). -->
## Explanation

`pkg/cel/libs/gzip` is the bounded gzip CEL library used by the vpol/mpol/gpol/dpol/ivpol compilers. `gzip.decompress` caps its output (default 10 MB) so a small payload can't expand into hundreds of MB, but the package has no tests of its own; it is only exercised indirectly by `pkg/cel/compiler` (54.1% of its statements) and a happy-path chainsaw test.

## Related issue

None found.

## What type of PR is this

/kind cleanup

## Proposed Changes

Adds `pkg/cel/libs/gzip/gzip_test.go` (table-driven, testify, no production changes) covering: round-trips (empty, UTF-8, 1 MiB), a gzip fixture produced by another encoder (taken from the kyverno/sdk tests), malformed input (empty, bad header, truncated, bad checksum), the output-cap boundary (cap, cap+1, far above) and the 10 MB default, caps built concurrently in separate environments (guards against a package-level variable; meaningful under `-race`), deterministic `gzip.compress` output (zero MTIME), argument type errors, and `Lib(nil, …)` panicking.

Direct coverage: 0% → 91.9%. `go test -race ./pkg/cel/libs/gzip` takes ~5 s (~4 s is the default-cap test with two 10 MB payloads; I can gate it on `testing.Short()` if preferred). Temporary mutations of the implementation (dropping the `+1` in the `LimitReader`, `>` → `>=`, a different default cap, a package-level cap, a non-zero ModTime) each fail at least one test.

## Checklist

- [ ] I have read the contributing guidelines and the AI Usage Policy.
- Tests only; no behaviour, docs or CLI changes.

AI assistance disclosure: I used Claude (an AI coding assistant) to help explore the repository and draft these tests. I reviewed every test and ran them locally with `-race`. The commit carries an `Assisted-by: Claude Code` trailer.
