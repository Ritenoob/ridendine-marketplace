# Backup & Rollback Procedures

## Database Backups (Supabase)

### Automated Backups
- Supabase Pro plan includes **daily automated backups** with 7-day retention
- Point-in-Time Recovery (PITR) available on Pro plan with up to 7 days of granularity

### Manual Backup
```bash
# Export full database via pg_dump
pg_dump $DATABASE_URL --no-owner --no-acl > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup
1. Navigate to Supabase Dashboard > Project > Database > Backups
2. Select the backup point to restore
3. For PITR: choose exact timestamp to restore to
4. Confirm restore — this replaces the current database

### Pre-Migration Backup
Before running any migration:
```bash
# Always take a snapshot before destructive migrations
pg_dump $DATABASE_URL --no-owner --no-acl > pre_migration_$(date +%Y%m%d).sql
```

## Application Rollback (Vercel)

### Instant Rollback
1. Navigate to Vercel Dashboard > Project > Deployments
2. Find the last known-good deployment
3. Click "..." menu > "Promote to Production"
4. The rollback is instant — no rebuild required

### CLI Rollback
```bash
# List recent deployments
vercel ls --prod

# Promote a specific deployment
vercel promote <deployment-url>
```

## Database Migration Rollback

Supabase migrations are forward-only. To revert:

1. Write a new "down" migration that undoes the changes
2. Test on a branch database first: `supabase db reset` on a dev branch
3. Apply to production as a new forward migration

### Common Rollback Patterns
```sql
-- Undo ADD COLUMN
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;

-- Undo ADD CONSTRAINT
ALTER TABLE table_name DROP CONSTRAINT IF EXISTS constraint_name;

-- Undo CREATE TABLE
DROP TABLE IF EXISTS table_name CASCADE;

-- Undo CREATE POLICY
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

## Recovery Targets

| Scenario | RTO | RPO |
|----------|-----|-----|
| Application crash | < 1 min (Vercel auto-restart) | 0 (stateless) |
| Bad deployment | < 5 min (Vercel rollback) | 0 |
| Database corruption | < 30 min (PITR restore) | < 5 min |
| Full outage | < 1 hour | < 1 hour |

## Emergency Contacts

- **Supabase Status**: status.supabase.com
- **Vercel Status**: vercel-status.com
- **Stripe Status**: status.stripe.com

## Runbook Verification

Test this runbook quarterly:
1. Verify Supabase backup exists and is recent
2. Test Vercel rollback on a staging deployment
3. Verify DATABASE_URL connectivity from a clean environment
