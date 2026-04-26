## Description
<!-- Brief summary of the change -->

## Related Issue
<!-- Link to issue if applicable -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation
- [ ] Migration

## Safety Checklist
**Read [CLAUDE.md](../CLAUDE.md) before submitting.** All changes must pass the Four Safety Pillars:

- [ ] **Pillar 1**: Will not crash tenants mid-service (no unhandled realtime errors, no provider crashes, handles mobile network loss)
- [ ] **Pillar 2**: Will not erase tenant data, even temporarily (no destructive migrations, snapback logic for optimistic updates, cart/session/language persist)
- [ ] **Pillar 3**: Will not reset tenant state (no `localStorage.clear()`, no unexpected signout, realtime reconnect preserves optimistic state)
- [ ] **Pillar 4**: Building on solid foundations (reuse existing primitives, tenant-scoped via RLS, proper role checks, append-only migrations)

## Testing
- [ ] Tests added/updated
- [ ] Manual testing on 2+ tenant slugs
- [ ] Tested as customer + staff + owner roles
- [ ] Tested on Slow 3G throttle (if KDS/checkout)
- [ ] Tested on Safari iOS private mode (if localStorage)

## Database Changes
- [ ] No migrations in this PR
- [ ] Migration(s) tested on staging Supabase
- [ ] Migration is idempotent (safe to run twice)
- [ ] No destructive changes without explicit approval

## Deployment Notes
<!-- Any special deployment instructions, feature flags, or rollback concerns? -->
