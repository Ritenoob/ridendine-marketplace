# Rules Directory Structure

Rules in `.claude/rules/` are the modular Claude source. Root `AGENTS.md` is the Codex/cross-agent entrypoint.

| Path | Scope | Purpose |
| --- | --- | --- |
| `ridendine-marketplace-project.md` | repo-wide | Stack, structure, commands, architecture boundaries |
| `ridendine-marketplace-live-testing.md` | repo-wide | Live browser verification and feedback artifact rules |
| `ridendine-marketplace-mcp-servers.md` | repo-wide | MCP, tool, plugin, and fallback guidance |
| `chef-admin/ridendine-marketplace-chef-admin.md` | `apps/chef-admin/**` | Chef Admin route and quality-gate guidance |
| `common/ridendine-marketplace-db-boundary.md` | `apps/**`, `packages/db/**`, `supabase/**` | DB boundary and Supabase fixture rules |

Add new rules at the narrowest scope. Product/team rules should include `paths` frontmatter.
