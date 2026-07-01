# Agent Stack

## Roles

| Role | Use For | Primary Evidence |
| --- | --- | --- |
| Builder | scoped code/doc fixes | diff, tests, build |
| Browser verifier | UI route and interaction checks | Playwright artifacts |
| Supabase maintainer | migrations, seeds, RLS, fixture reset | `supabase start`, seed validation |
| Wiring auditor | API/page/runtime contract drift | `scripts/wiring/*`, `docs/wiring/*` |
| UX reviewer | error, loading, empty, mobile states | screenshots/rendered DOM/design scan |

## Operating Flow

1. Read `AGENTS.md`.
2. Run `pnpm agent:tools:doctor`.
3. Start only the app needed.
4. Run focused tests.
5. Run live browser feedback.
6. Write findings with artifact paths.

## Skills

- `.claude/skills/ridendine-live-verification`
- `.claude/skills/ridendine-supabase-fixtures`

These are repo-local Claude skills. Keep them short and procedural.

## Feedback Loop

Every agent report should classify the outcome:

- `LIVE_PASS` - browser interaction and backend boundary passed.
- `LIVE_PARTIAL` - browser rendered but data/auth/Supabase blocked full proof.
- `UNIT_VERIFIED` - only non-browser tests ran.
- `BLOCKED` - named external or environment blocker prevents meaningful continuation.
