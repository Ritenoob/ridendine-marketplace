# Ops Export Audit Smoke

Generated: 2026-06-07T20:46:29.773Z

This smoke proof verifies that the guarded Ops CSV export endpoint returns a valid CSV response and that a successful export produces a recent audit-log row. Credential values are intentionally never printed.

## Summary

| Metric | Value |
|---|---|
| App | Ops Admin |
| Base URL | https://ops.ridendine.ca |
| Export type | orders |
| Window start | 2026-06-06T20:46:26.872Z |
| Window end | 2026-06-07T20:46:26.872Z |
| Authenticated session | Yes |
| Passed | Yes |

## Checks

| Status | Check | Last status | Notes |
|---|---|---:|---|
| PASS | ops-login | 200 | login succeeded |
| PASS | audit-before | 200 | audit recent returned 50 items |
| PASS | csv-export | 200 | CSV export returned 200 text/csv with a header row |
| PASS | export-audit-log | 200 | new export audit entry found |

## Audit Entry

| ID | Action | Entity type | Actor role | Created at |
|---|---|---|---|---|
| 159e0041-59a6-475a-9bf1-69f17febef59 | export | export | super_admin | 2026-06-07T20:46:28.883+00:00 |

## Failures

None found.
