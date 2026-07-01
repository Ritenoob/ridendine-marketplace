# Codex Plugin Scaffold

Repo-local scaffold:

```text
plugins/ridendine-agent-kit/
```

This scaffold packages RideNDine agent guidance for Codex plugin development. It is not auto-installed.

## Validate

```bash
python3 /home/nygma/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/ridendine-agent-kit
```

## Contents

- `.codex-plugin/plugin.json` - plugin manifest.
- `.mcp.json` - plugin-local MCP placeholder.
- `skills/` - plugin skill entrypoints.
- `scripts/` - reserved for plugin helpers.
- `assets/` - reserved for templates or screenshots.

## Install Policy

Do not add this plugin to a personal or team marketplace until:

1. The manifest validates.
2. Skills contain no placeholder instructions.
3. MCP server choices are verified on the target machine.
4. The user explicitly asks to install or publish it.
