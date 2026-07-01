# MCP Server Guidance

## Status

No live `.mcp.json` is committed. Use `.mcp.example.json` as a template and keep machine-specific credentials out of git.

## Recommended Capabilities

| Capability | Purpose | Notes |
| --- | --- | --- |
| Filesystem | bounded repo reads/writes | scope to this checkout |
| Playwright/browser | live UI verification | prefer bundled Playwright when system Chrome is absent |
| GitHub | PR/issues/CI inspection | read-only until user asks to write |
| Supabase/Postgres | local DB inspection | local stack only by default |
| Web fetch/search | dependency/docs lookup | use primary docs for technical claims |
| Memory/search | prior decisions | optional; not a source of current truth |

## Health Contract

Before relying on MCP tooling:

1. Confirm the server exists in the active tool list or local config.
2. Run one read-only smoke check.
3. Record connected/partial/broken.
4. Name the fallback if broken.

Do not list individual MCP tool schemas in project docs; live tools are self-describing.
