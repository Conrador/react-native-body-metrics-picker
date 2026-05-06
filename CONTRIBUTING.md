# Contributing

Thanks for helping improve this library. Short notes below keep reviews predictable; use the [issue templates](.github/ISSUE_TEMPLATE) and the PR checklist when you open a pull request.

## Branches

- **`main`** — release-ready history. Direct pushes should be rare; prefer PRs.
- **Feature / fix work** — branch off `main`, open a PR back into `main`.

### Branch names

Use lowercase, hyphens, and a short type prefix:

| Prefix     | Use for |
| ---------- | ------- |
| `feat/`    | New behaviour or API (e.g. `feat/glass-label-color`) |
| `fix/`     | Bug fixes (e.g. `fix/android-pill-clipping`) |
| `docs/`    | README, comments, contribution docs only |
| `chore/`   | Tooling, CI, deps that are not user-facing |
| `refactor/`| Internal structure without intended behaviour change |

Examples: `feat/unit-switcher-haptic`, `fix/ios-accessibility-range`, `docs/readme-props-table`.

Avoid: vague names (`update`, `wip`), only issue numbers without context (`fix-123` is OK if paired with words: `fix/123-crash-on-unit-change`).

## Issues

**Before opening an issue:** search existing issues and PRs.

**Good issues include:**

- A **clear title** (what is wrong or what you want — not only “Bug” or “Question”).
- **Environment** for bugs: React Native version, New Architecture on/off, iOS / Android (and versions), library version.
- **Expected vs actual** behaviour.
- **Minimal reproduction** when possible: small snippet, or link to a branch / repro app. Screenshots or screen recordings help for UI.

Use the right template:

- **Bug report** — crashes, wrong rendering, native/JS mismatch.
- **Feature request** — new props, platform parity, API ideas.

For **usage questions**, prefer GitHub **Discussions** (if enabled) or a minimal repro in an issue so maintainers can answer with context.

## Pull requests

1. One PR should focus on **one concern** when practical (easier review and changelog entries).
2. **Link issues** with `Fixes #123` or `See #123` in the PR description when relevant.
3. **Test** on at least one platform you touched (iOS and/or Android); note limitations in the PR if you cannot test one side.
4. **Changelog** — add a line under `[Unreleased]` in `CHANGELOG.md` for user-visible changes (see below).
5. Run **`yarn build`** and **`yarn typescript`**; fix **`yarn lint`** issues in files you change.

Maintainers may squash-merge to keep `main` history readable.

## Changelog

This project follows **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)** in **`CHANGELOG.md`**.

- **Unreleased** — accumulate changes that are on `main` but not yet released.
- On **release**, rename `[Unreleased]` to a version `## [x.y.z] - YYYY-MM-DD` and add a new empty `[Unreleased]` block at the top.

Categories we use: **Added**, **Changed**, **Fixed**, **Removed** (and **Security** if ever needed). Skip empty sections for a given release.

## Code style

- Match existing formatting; **`yarn prettier --check`** / **`yarn lint`** as above.
- Prefer **small, focused diffs**; avoid drive-by refactors in bugfix PRs unless agreed in the issue.

## License

By contributing, you agree that your contributions are licensed under the same **MIT** license as the project.
