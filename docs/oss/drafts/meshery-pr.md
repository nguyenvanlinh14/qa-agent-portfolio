<!-- Tiêu đề PR: [UI] Replace waitForTimeout in user preference e2e spec with a web-first assertion
     Chỉ tick "I signed my commits" — commit đã có Signed-off-by. Đọc chính sách AI trên docs.meshery.io trước khi gửi. -->
**Notes for Reviewers**

- This PR fixes # (no issue; small e2e reliability cleanup)

`ui/tests/e2e/userpreference.spec.ts` was the only spec still using `page.waitForTimeout(2000)`: after clicking a preference switch it slept 2 s and then branched on the switch state. The switch updates on click and the test already awaits the matching POST and its 200 response, so this replaces the sleep and the if/else with a web-first assertion:

```ts
await expect(prefSwitch).toBeChecked({ checked: !wasChecked });
```

Note: the old sleep implicitly also checked that the switch did not flip back within 2 s. I found no code that flips it back; happy to add an explicit check if you want that covered.

**Before / after** (Local provider, server built from source, static UI build, `--repeat-each=5`):

```
before: 10 passed (+ setup), ~8.0 s per test
after:  10 passed (+ setup), ~6.3 s per test
```

Changing the expectation to `checked: wasChecked` makes the test fail, so the assertion is not vacuous. `prettier --check` and `eslint` pass on the touched file. Not run: the `chromium-meshery-provider` project (needs a remote token) and the full suite.

AI assistance: I used Claude (an AI coding assistant) to help find and draft this change. I reviewed it and ran the spec myself as described above. The commit carries an `Assisted-by` trailer.

**[Signed commits](https://github.com/meshery/meshery/blob/master/CONTRIBUTING.md#signing-off-on-commits-developer-certificate-of-origin)**
- [x] Yes, I signed my commits.
