---
name: ridendine-live-verification
description: Run RideNDine live browser verification and feedback loops from a Codex plugin context. Use for UI route checks, clicked interaction proof, console/network collection, and user-facing E2E reports.
---

# RideNDine Live Verification

Use repo scripts first:

```bash
pnpm agent:tools:doctor
pnpm agent:chef-admin:live
pnpm agent:chef-admin:live:local
```

Report:

- base URL
- routes
- clicked controls
- console/page/network issues
- artifact paths under `.codex-artifacts/`

If local Supabase is unavailable, classify the result as `LIVE_PARTIAL`, not full E2E.
