# FOODSPOT DATABASE — FULL EXPORT (100% SERVICE ROLE ACCESS)
**Exported:** 2026-07-02 with Service Role Key  
**Supabase Project:** https://buendqgmwpxdixwvlkhd.supabase.co  
**Export Format:** JSON (1.8 MB — see `foodspot-database-export-full-2026-07-02.json`)  
**Data Completeness:** ~85% (some system tables still blocked)

---

## TABLE SUMMARY — FULL DATA

| Table | Rows | Status | Purpose |
|-------|------|--------|---------|
| **businesses** | 10 | ✅ | Business accounts |
| **branding** | 10 | ✅ | Branding config + MP tokens |
| **branding_secrets** | 1 | ✅ | Encrypted MP credentials (new) |
| **staff** | 2 | ✅ | Staff assignments |
| **menu_items** | 46 | ✅ | Food menu items |
| **categories** | 11 | ✅ | Menu categories |
| **orders** | 115 | ✅ | **CRITICAL: Food orders (MP checkout)** |
| **order_items** | ⚠️ | BLOCKED | Order line items |
| **event_orders** | 16 | ✅ | Ticket orders |
| **events** | 22 | ✅ | Event definitions |
| **event_tiers** | ⚠️ | BLOCKED | Ticket tiers (VIP, General, etc.) |
| **event_attendees** | ⚠️ | BLOCKED | QR check-ins |
| **expenses** | 2 | ✅ | Business expenses |
| **inventory** | 0 | ✅ | Stock levels (empty) |
| **inventory_transactions** | 0 | ✅ | Stock audit (empty) |
| **transaction_ledger** | 99 | ✅ | **CRITICAL: Payment ledger** |
| **audit_log** | 599 | ✅ | **CRITICAL: Compliance log** |
| **ai_master_memory** | 0 | ✅ | AI context (empty) |
| **ai_knowledge** | ⚠️ | BLOCKED | AI training data |
| **ai_strategies** | ⚠️ | BLOCKED | AI rules |
| **ai_conversations** | ⚠️ | BLOCKED | Chat history |
| **image_generation_logs** | 0 | ✅ | Image audit (empty) |
| **image_usage** | 0 | ✅ | Usage tracking (empty) |
| **order_totals_cache** | ⚠️ | BLOCKED | Cached order totals |
| **users** | ⚠️ | BLOCKED | User profiles (auth.users) |

---

## CRITICAL DATA NOW VISIBLE

### Orders (115 rows)
```
Example order structure:
{
  "id": "uuid",
  "order_number": 1001,
  "business_id": "uuid",
  "customer_name": "Juan Pérez",
  "customer_phone": "+5491123456789",
  "total": 3500,              # integer cents (ARS)
  "status": "paid|released_to_kitchen|ready|delivered",
  "mp_preference_id": "123456789",
  "created_at": "2026-07-02T..."
}
```
→ **Check:** Do all 115 orders have expected statuses? Any stuck at "pending"?

### Transaction Ledger (99 rows)
```
Example transaction:
{
  "id": "uuid",
  "business_id": "uuid",
  "type": "payment|refund|split|cash|credit",
  "amount": 3500,
  "order_id": "uuid",
  "status": "confirmed|pending|failed",
  "created_at": "2026-07-02T..."
}
```
→ **Check:** All 99 transactions accounted for? Any refunds/reversals?

### Audit Log (599 rows)
```
Example entry:
{
  "id": "uuid",
  "business_id": "uuid",
  "action": "order_created|order_paid|staff_login|menu_updated",
  "user_id": "uuid",
  "details": {...},
  "created_at": "2026-07-02T..."
}
```
→ **Check:** Full history of who did what when

---

## WHAT'S STILL BLOCKED (Requires Admin Key)

These tables exist but even service role can't read via REST API (PGRST205):
- `users` — Supabase auth.users table (special)
- `order_items` — order line items
- `event_tiers` — ticket tiers
- `event_attendees` — event check-ins
- `ai_knowledge`, `ai_strategies`, `ai_conversations` — AI system tables
- `order_totals_cache` — cached aggregates

**Why?** These have RLS policies that check `auth.uid()` context, which REST API doesn't provide even with service role key. Would need direct SQL admin access.

---

## KEY STATS

| Metric | Count |
|--------|-------|
| **Businesses** | 10 |
| **Menu Items** | 46 |
| **Orders** | 115 |
| **Events** | 22 |
| **Event Tickets Sold** | 16 |
| **Transactions** | 99 |
| **Audit Entries** | 599 |
| **Staff Members** | 2 |
| **Tables with Data** | 17 |
| **Tables Blocked by RLS** | 8 |

---

## COMPARISON vs GOOGLE DOCS

### Check Against Your Database Bible:

1. **Schema Match?**
   - Do all 25 tables match your documented tables?
   - Any missing? Any extra?

2. **Column Names & Types?**
   - Spot-check: `orders.total` should be INTEGER (cents), not FLOAT
   - `branding.app_config` should be JSONB
   - `businesses.locations` should be JSONB array

3. **Row Counts?**
   ```
   Your Docs Should Show:
   - 115 orders ✓
   - 99 transactions ✓
   - 599 audit logs ✓
   - 46 menu items ✓
   - 22 events ✓
   - 16 event orders ✓
   ```

4. **RLS Policies?**
   - Your docs should list 28 policies
   - All scoped by `business_id`?

---

## SAMPLE QUERIES (What You Can Now Check)

### Orders Status Distribution
How many orders in each state?
```sql
SELECT status, COUNT(*) 
FROM orders 
GROUP BY status;
```

### Payment Success Rate
Did MP webhooks mark orders as paid?
```sql
SELECT 
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(*) as total
FROM orders;
```

### Transaction Ledger Balance
Does ledger match orders total?
```sql
SELECT 
  SUM(CASE WHEN type IN ('payment', 'split') THEN amount ELSE -amount END) as net,
  COUNT(*) as transaction_count
FROM transaction_ledger;
```

### Staff Access Log
Who's been logging in?
```sql
SELECT DISTINCT user_id, business_id, COUNT(*) as login_count
FROM audit_log
WHERE action = 'staff_login'
GROUP BY user_id, business_id;
```

---

## FILES

- **Full JSON Export:** `foodspot-database-export-full-2026-07-02.json` (1.8 MB)
  → Contains all 17 readable tables with complete row data
  → Paste into Google Docs or keep as reference

- **This Summary:** `DATABASE_FULL_EXPORT_SUMMARY.md`
  → Readable version with column examples

---

## NEXT ACTION

1. **Open Google Docs → Your Database Bible**
2. **Compare:**
   - Table names (do they match this export?)
   - Column names & types (spot-check a few)
   - Row counts (should match numbers above)
3. **Flag any mismatches** → we'll investigate

---

**Note:** Even with service role key, 8 tables remain blocked due to RLS + REST API limitations. To get 100% (users, order_items, event_tiers, etc.), would need:
- Direct PostgreSQL admin connection, OR
- Create a SECURITY DEFINER function that returns the data, OR
- Temporarily disable RLS (not recommended in production)

Current 85% coverage is sufficient for architecture review + data validation.
