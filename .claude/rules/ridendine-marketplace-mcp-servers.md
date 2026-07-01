# MCP, Plugins, And Agent Tools

## Tool Selection

- Use project scripts first.
- Use bundled Playwright through `@playwright/test` for browser checks.
- Use `impeccable detect` when installed for design feedback.
- Use Semble only after `pnpm agent:tools:doctor` reports `semble-search` healthy.
- Use direct file reads and `/usr/bin/find` when wrappers distort shell behavior.

## MCP Guidance

There is no committed live `.mcp.json` for this repo. Use `.mcp.example.json` and `docs/agent-tooling/MCP_SERVERS.md` as templates.

Document MCP health in reports:

- server/tool name
- read-only smoke command or tool call
- result
- fallback used

Do not invent MCP command names or assume a server exists. Verify with the active tool list or local config first.

## Plugin Guidance

Repo-local Codex plugin scaffold:

```text
plugins/ridendine-agent-kit/
```

This is source material for installation, not an auto-installed plugin. Validate before publishing or installing:

```bash
python3 /home/nygma/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/ridendine-agent-kit
```
