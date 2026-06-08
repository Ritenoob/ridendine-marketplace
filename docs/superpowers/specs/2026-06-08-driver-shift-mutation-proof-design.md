# Driver Shift Mutation Proof Design

Date: 2026-06-08
Phase: Driver Operations Expansion Phase 11
Status: Approved design; implementation plan pending spec review.

## Goal

Add a production-safe proof path for the Driver shift start/end workflow without mutating a real operator's active shift. Phase 10 proved the read contract in production; Phase 11 should prove the mutation path only when a dedicated disposable driver fixture is explicitly configured.

## Current Context

Phase 10 added:

- `GET /api/driver/shift` for authenticated Driver shift summary.
- `POST /api/driver/shift` to start a shift for an approved driver.
- `DELETE /api/driver/shift` to end a shift, with a `409 ACTIVE_DELIVERY_BLOCK` when active deliveries exist.
- Driver dashboard `Start shift` / `End shift` controls.
- Ops driver operations shift visibility.

Production smoke currently calls only read-safe Driver shift checks. That is correct for normal smoke, but it leaves one known risk: the live start/end mutation path is not exercised after deployment.

## Design Decision

Use a separate opt-in smoke script for shift mutation proof. Do not add shift mutation to the default production smoke command.

The new smoke must refuse to run unless all required safety inputs are present:

- `RIDENDINE_SHIFT_MUTATION_SMOKE=1`
- `RIDENDINE_SHIFT_MUTATION_EMAIL`
- `RIDENDINE_SHIFT_MUTATION_PASSWORD`
- `RIDENDINE_SHIFT_MUTATION_DRIVER_ID`
- `RIDENDINE_SHIFT_MUTATION_FIXTURE_OK=disposable-driver`

The fixture account must be an approved Driver app account reserved for smoke testing. It must not be the general seeded super-admin account unless a future phase explicitly creates and documents a disposable driver identity for that email.

## Approaches Considered

### Recommended: Separate Gated Mutation Smoke

Create a standalone script, likely under `scripts/smoke/driver-shift-mutation-smoke.cjs`, and wire it to a package script such as `smoke:driver-shift-mutation`.

Benefits:

- Keeps default production smoke read-only.
- Makes mutation intent explicit through env flags.
- Can fail fast when the fixture is missing, assigned active deliveries, not approved, or already in an unsafe state.
- Provides reusable proof after every deployment without risking live operations.

Trade-off:

- Requires a dedicated fixture credential to exist in production before the mutation proof can fully pass.

### Alternative: Add Mutation To Existing Production Smoke

Extend `pnpm smoke:prod` to start/end the shift.

Rejected because it would make the normal smoke suite mutate production data and would be too easy to run accidentally.

### Alternative: Contract-Only Local Test

Keep relying on local route tests and authenticated production `GET /api/driver/shift`.

Rejected because Phase 10 already does this; it does not prove live production write behavior.

## Safety Contract

The mutation smoke must perform these checks before any `POST` or `DELETE`:

1. Log in to Driver app using `RIDENDINE_SHIFT_MUTATION_EMAIL` and `RIDENDINE_SHIFT_MUTATION_PASSWORD`.
2. Call `GET /api/driver` and verify the returned driver id equals `RIDENDINE_SHIFT_MUTATION_DRIVER_ID`.
3. Verify the driver profile is approved. If the profile uses another field name for approval, the implementation should accept only the existing approved-state values already used by Driver app guards.
4. Call `GET /api/driver/shift`.
5. Refuse to run if `activeDeliveryCount > 0`.
6. Refuse to run if the shift summary driver id differs from `RIDENDINE_SHIFT_MUTATION_DRIVER_ID`.

Only after those checks may the script mutate shift state.

## Mutation Flow

The script should leave the fixture off shift when it exits successfully.

If the fixture starts off shift:

1. Call `POST /api/driver/shift`.
2. Expect `200` JSON with `isOnShift: true`, `presenceStatus: "online"`, and a non-empty `currentShiftId`.
3. Call `POST /api/driver/shift` a second time.
4. Expect idempotency: same `currentShiftId`, still on shift, no error.
5. Call `DELETE /api/driver/shift`.
6. Expect `200` JSON with `isOnShift: false`, `presenceStatus: "offline"`, and `currentShiftId: null`.
7. Call `GET /api/driver/shift`.
8. Confirm final state is off shift.

If the fixture starts on shift:

1. Refuse by default and print that the fixture is dirty.
2. Allow cleanup only when `RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT=1`.
3. When cleanup is enabled and there are no active deliveries, call `DELETE /api/driver/shift` and verify final off-shift state.
4. Do not call `POST` after cleanup in that run unless `RIDENDINE_SHIFT_MUTATION_ALLOW_RESTART_AFTER_CLEANUP=1` is also set.

This avoids accidentally extending or obscuring a stale open shift.

## Active Delivery Block Proof

The production smoke should not create or assign a delivery just to prove the `409 ACTIVE_DELIVERY_BLOCK` path. That path already has focused local route coverage from Phase 10.

Future work may add a local-only or staging-only fixture that creates an active delivery and proves the block end to end. Phase 11 is scoped to safe production start/end proof on an idle fixture.

## Documentation

Update these records during implementation:

- `docs/superpowers/plans/2026-06-07-driver-operations-expansion-results.md`
- Obsidian phased execution plan:
  `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`
- If a new smoke script is added, document required env vars and safe usage in the driver results doc.

## Tests And Verification

Implementation should use TDD:

- Unit tests for argument/env parsing.
- Unit tests for fixture safety gates.
- Unit tests for the off-shift start/idempotent-start/end happy path using mocked fetch.
- Unit tests for dirty fixture refusal when already on shift.
- Unit tests for active-delivery refusal before mutation.

Local gates before commit:

- `pnpm test:wiring-fixes`
- Focused smoke-script tests.
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm audit:guards`
- `git diff --check`

Remote gates after push:

- GitHub CI must pass.
- All four Vercel production deployments must be `READY`.
- `pnpm smoke:prod:contracts -- --require-auth` must pass with the seeded Sean smoke credentials.
- `pnpm smoke:prod` must pass with the seeded Sean smoke credentials.
- `pnpm smoke:driver-shift-mutation` may pass only when the dedicated disposable Driver fixture credentials are configured. If the fixture is not configured, the result must be recorded as blocked by missing fixture, not as a product failure.

## Success Criteria

Phase 11 is complete when:

- A guarded shift mutation smoke command exists and is tested.
- Default production smoke remains read-only for shift mutations.
- The command refuses unsafe fixtures before making any write.
- The command can prove start, idempotent start, end, and final off-shift state against a disposable driver fixture.
- Repo docs and Obsidian explain how to run the proof and what conditions block it.
- GitHub, Vercel, and normal production smokes remain green after the change.

## Rollback

Rollback is a code-only revert of the Phase 11 smoke-script commit and docs updates. No database rollback is expected because the phase should not add schema and should not change Driver app runtime behavior.

## Self-Review

- Completeness scan: no unfinished sections remain.
- Scope check: this is one bounded phase: a gated smoke proof and documentation. It does not create production users, assign deliveries, or change app behavior.
- Safety check: default production smoke remains read-only, and mutation requires explicit fixture credentials and opt-in flags.
- Ambiguity check: fixture requirements, dirty-state handling, and expected final state are explicit.
