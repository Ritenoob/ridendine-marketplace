# Branch Triage — 2026-05-18

Snapshot of all local and remote branches with disposition recommendations. Compiled for `docs/plans/2026-05-18-production-readiness-stabilization.md` Task 1.

**⛔ This document is advisory — it does NOT execute deletions.** Sean approves and runs the `git push origin --delete <branch>` and `git branch -D <branch>` commands. Verify each disposition before acting.

## How to read

Each row reports `master ahead / branch ahead` from `git rev-list --left-right --count master...<branch>`. Branch ahead > 0 means the branch carries commits not in master — investigate before deleting. PR numbers correspond to merge commits in `git log --merges`.

## Local branches

| Branch | master ahead | branch ahead | Last subject | Recommended disposition |
|--------|--------------|--------------|--------------|--------------------------|
| `master` | — | — | (current) | KEEP |
| `claude/docs-shipped-report` | 0 | 4 | docs: post-merge shipping confirmation report | **VERIFY MERGED** — corresponds to PR #33 (merge commit `552deab`); if PR was squash-merged, the 4 individual commits won't match master hashes but content is in. Diff vs master with `git diff master..claude/docs-shipped-report -- docs/`; if empty, DELETE. |
| `claude/fix-payments-system` | 0 | 3 | fix(payments): repair production checkout — scheduled orders + Stripe env + webhook race | **REVIEW BEFORE DELETE** — 3 unmerged commits touching checkout/Stripe; cross-reference against `docs/superpowers/plans/2026-05-16-marketplace-completion.md` Task 1 (payment lifecycle) which is already `[x]`. If the work is captured there, DELETE; if not, MERGE first. |
| `claude/pedantic-mahavira-2a34e0` | 0 | 13 | docs: post-merge shipping confirmation report | **INVESTIGATE** — 13 unmerged commits is too many to delete blindly. Run `git log master..claude/pedantic-mahavira-2a34e0 --oneline` and confirm with author. |
| `claude/seed-sean-super-admin` | 0 | 2 | feat(seed): promote sean@ridendine.ca to multi-role test super-admin | **MERGE OR DELETE** — small focused branch; if super-admin seed already lives in `supabase/seeds/seed.sql`, DELETE; else MERGE. |

## Remote branches (origin/*)

### Already-merged via PR (safe to delete on origin)

| Branch | PR | Disposition |
|--------|-----|-------------|
| `origin/claude/goofy-perlman-3736ac` | #18–#23 (six merges) | DELETE on origin — its work landed in master via #23 (commit `bb23cec`). |
| `origin/complete/phase-c-and-d-final` | #29 (commit `552deab` predecessor) | DELETE on origin — merged. |
| `origin/docs/prod-fixes-2026-05-14` | #27 (commit `e85ad1f`) | DELETE on origin — merged. |
| `origin/docs/known-issues-2026-05-14` | not in merge log; master is 8 ahead | **VERIFY** — content may have been copy-pasted into master; if so DELETE, else investigate. |
| `origin/fix/stripe-events-processed-schema` | #28 (commit `fc3e12b`) | DELETE on origin — merged. |
| `origin/fix/sla-payment-authorized-timeout` | #26 (commit `00eddb2`) | DELETE on origin — merged. |

### Stale exploration branches (master has moved on substantially)

| Branch | master ahead | branch ahead | Last commit date | Disposition |
|--------|--------------|--------------|------------------|-------------|
| `origin/copilot/audit-repository-structure-and-issues` | 168 | 2 | 2026-03-31 | **REVIEW** then DELETE — 2 unique commits, but 168 commits old; likely an audit doc that's been superseded by `docs/REVIEW_2026-05-13.md`. |
| `origin/ridendine-prelaunch-repair-checkpoint` | 102 | 0 | 2026-05-02 | DELETE on origin — branch has nothing master doesn't. |
| `origin/copilot/zero-drift-git-audit-sync` | 101 | 0 | 2026-05-03 | DELETE on origin. |
| `origin/rebuild/local` | 75 | 0 | 2026-05-06 | DELETE on origin. |
| `origin/codex-publish-current-work` | 54 | 0 | 2026-05-10 | DELETE on origin. |
| `origin/copilot/fix-ci-lint-typecheck-test-build` | 50 | 0 | 2026-05-10 | DELETE on origin. |

## Commands once dispositions confirmed

For local branches (Sean to run, NOT this plan):
```bash
git branch -D claude/docs-shipped-report   # only if 'verify merged' returns empty diff
git branch -D claude/seed-sean-super-admin # only if seed-row already in seed.sql
# DO NOT mass-delete; verify each first
```

For origin branches (Sean to run, NOT this plan):
```bash
git push origin --delete claude/goofy-perlman-3736ac
git push origin --delete complete/phase-c-and-d-final
git push origin --delete docs/prod-fixes-2026-05-14
git push origin --delete fix/stripe-events-processed-schema
git push origin --delete fix/sla-payment-authorized-timeout
git push origin --delete ridendine-prelaunch-repair-checkpoint
git push origin --delete copilot/zero-drift-git-audit-sync
git push origin --delete rebuild/local
git push origin --delete codex-publish-current-work
git push origin --delete copilot/fix-ci-lint-typecheck-test-build
# Investigate first, then maybe:
git push origin --delete copilot/audit-repository-structure-and-issues
git push origin --delete docs/known-issues-2026-05-14
```

## Working-tree CRLF noise

The ~1339 files showing as `M` in `git status` are CRLF/LF line-ending artifacts from WSL/Windows; not real code diffs. Verified by sampling `git diff master -- README.md` which shows identical content with different line endings.

The `.gitattributes` file added in this same task (root of repo) prevents recurrence — new commits store LF regardless of platform. Existing CRLF files will normalize automatically on next edit. **DO NOT run `git add --renormalize .` as a mass commit** — it produces reviewer-unreadable noise on 1300+ files and provides no functional gain.

If a clean-baseline is desired later, it should be a separate planned PR scoped to the renormalization with no other code changes.

## Out of scope of this triage

- Actually executing the deletions (operator action — Sean).
- Recovering work from any branch that turns out to have unmerged content (case-by-case via cherry-pick or new PR).
- Refining CI's branch-pruning rules — separate operational doc.
