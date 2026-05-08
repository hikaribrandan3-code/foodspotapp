# DATABASE GAPS REPORT
**Date:** 2026-05-08  
**Status:** 🔴 CRITICAL — 20+ missing items affecting production readiness

---

## SEVERITY LEVELS
| Level | Impact | Items |
|-------|--------|-------|
| 🔴 **CRITICAL** | App won't function | 6 |
| 🟠 **HIGH** | Missing core features | 8 |
| 🟡 **MEDIUM** | Incomplete documentation | 6 |

---

## 🔴 CRITICAL GAPS (BLOCKING PRODUCTION @ 1000 USERS)

### 1. **AI SWARM SYSTEM** ← MASSIVE UNDOCUMENTED ARCHITECTURE
**Migration:** `20260315_billion_dollar_ltm_swarm.sql`  
**Impact:** Entire agent orchestration layer missing from Bible

#### New Tables (6)
| Table | Purpose | Rows Expected |
|-------|---------|---|
| `ai_master_memory` | Central long-term memory store (pgvector embeddings) | 10K-100K |
| `agent_registry` | Agent definitions & heartbeat tracking | 5-10 |
| `captain_laws` | Platform-wide universal laws & constraints | 20-50 |
| `ai_conversations` | Thread persistence for AI chats | 1K-10K |
| `ai_knowledge` | RAG knowledge base (semantic search) | 100K+ |
| `ai_strategies` | Strategy memory with performance tracking | 1K+ |

#### New Custom Types (ENUMs)
- `memory_layer`: `captain_global`, `tenant_private`, `anonymized_network`
- `agent_type`: `coo`, `hr`, `dev`, `ceo`, `cto`, `cfo`, `cmo`, `analyst`, `orchestrator`
- `agent_status`: `initializing`, `active`, `paused`, `degraded`, `error`, `shutdown`
- `memory_entry_type`: `observation`, `decision`, `action`, `reflection`, `lesson`, `warning`, `insight`, `conversation`, `code_change`, `performance_data`, `compliance_check`
- `law_severity`: `guideline`, `standard`, `requirement`, `critical`, `cardinal`

#### New Functions (5)
- `search_memories(vector(768), memory_layer, tenant_id, agent_type, limit, min_similarity)` — Semantic search via pgvector
- `get_agent_context(agent_id, query, tenant_id, max_memories)` — Fetch agent's relevant memories + laws
- `check_law_compliance(agent_type, action_description, tenant_id)` — Verify action against laws
- `register_agent(name, type, description, model, tenant_id, capabilities, config)` — Register new agent
- `record_agent_heartbeat(agent_id, health_score)` — Update agent status

#### New Indexes (11)
- `idx_memory_layer`, `idx_memory_tenant`, `idx_memory_agent`, `idx_memory_entry_type`, `idx_memory_timestamp`, `idx_memory_importance`, `idx_memory_tags`
- `idx_memory_embedding` (pgvector ivfflat cosine search)
- `idx_agent_type`, `idx_agent_status`, `idx_agent_heartbeat`
- `idx_law_category`, `idx_law_severity`, `idx_law_active`
- `idx_law_embedding` (pgvector)
- `idx_conv_business`, `idx_conv_thread`, `idx_conv_last_message`, `idx_conv_embedding`
- `idx_knowledge_business`, `idx_knowledge_type`, `idx_knowledge_embedding`
- `idx_strategy_business`, `idx_strategy_status`, `idx_strategy_embedding`

#### New RLS Policies (6)
- `memory_captain_read` — Global memories readable by all
- `memory_tenant_isolation` — Private memories scoped to tenant
- `conv_business_isolation` — Conversations by business_id
- `knowledge_business_isolation` — Knowledge by business_id
- `strategy_business_isolation` — Strategies by business_id
- `laws_read_all` — Captain laws readable by all

#### New Triggers (4)
- `trg_ai_master_memory_updated_at` — Auto-update timestamp
- `trg_agent_registry_updated_at` — Auto-update timestamp
- `trg_captain_laws_updated_at` — Auto-update timestamp
- `trg_ai_conversations_updated_at` — Auto-update timestamp

#### Seed Data (4 Core Agents + 3 Laws)
```sql
-- Agents:
- FoodSpot-COO-OpsMonitor (coo) — monitor_kds, detect_anomalies, enforce_compliance
- FoodSpot-HR-TalentOptimizer (hr) — analyze_schedules, forecast_demand, optimize_staffing
- FoodSpotAI-Claw (dev) — self_heal, code_review, regression_prevention
- FoodSpot-Orchestrator (orchestrator) — coordinate, delegate, resolve_conflicts

-- Laws:
- OPS-001: Maximum Prep Time Variance (critical)
- SEC-001: PII Data Protection (cardinal)
- DEV-001: Regression Prevention (requirement)
```

#### Extension Dependency
⚠️ **REQUIRES:** `pgvector` extension (for embedding similarity search)  
**Install:** In Supabase Dashboard > Database > Extensions > pgvector

**Production Impact:** Without this documented, you're flying blind on:
- How agents store/retrieve context
- Legal constraints on agent actions
- Memory persistence across conversations
- Multi-tenant memory isolation

---

### 2. **AUTHENTICATION & PASSWORD RESET SYSTEM**
**Migration:** `20250424_password_reset_codes.sql`

#### New Table
| Table | Columns | Purpose |
|-------|---------|---------|
| `password_reset_codes` | id (UUID), email, code, created_at, expires_at (10 min), used | OTP-based password reset |

#### New Function
- `get_user_id_by_email(email)` — Look up auth user by email (used by edge functions)

#### RLS
- Service role only (anon/authenticated denied)

#### Indexes
- `idx_password_reset_codes_email_code` — Fast lookup
- `idx_password_reset_codes_expires_at` — Cleanup queries

**Production Impact:**
- Owner password resets broken if table not created
- Missing from multi-tenant auth flow

---

### 3. **OWNER NOTIFICATIONS & ESCALATION SYSTEM**
**Migration:** `20260213_strike15_security_notifications.sql`

#### New Table
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | PK |
| `business_id` | UUID | Tenant scoping |
| `order_id` | UUID | FK to orders |
| `message` | TEXT | Notification text |
| `type` | TEXT | 'alert', 'escalation', 'info' |
| `is_read` | BOOLEAN | Read status |
| `created_at` | TIMESTAMPTZ | Timestamp |

#### New Function
- `check_stalled_orders()` — Query orders stuck >5 min in payment states, insert escalation notifications

#### RLS Policy
- `Owners see own notifications` — Filter by business_id

**Production Impact:**
- Owners can't receive order escalation alerts
- Stuck orders go unnoticed (potential revenue loss)

---

## 🟠 HIGH GAPS (FEATURE COMPLETENESS)

### 4. **DELIVERY PROOF-OF-DELIVERY (POD) SYSTEM**
**Migration:** `2026-05-01_delivery_photo_pod.sql`

#### Orders Table Columns (NEW)
- `delivery_photo_url` (TEXT) — S3/Storage URL of proof photo
- `delivery_photo_captured_at` (TIMESTAMPTZ) — When photo was taken

#### Check Constraint
```sql
CHECK (order_type != 'dine_in' OR delivery_photo_url IS NULL)
-- Prevents nonsensical: dine-in orders can't have delivery photos
```

#### Storage Bucket
- `delivery-photos` (public read)
- Path structure: `orders/{order_id}/photo.jpg`

#### Storage RLS Policies (3)
- `Allow delivery workers to upload photos` — Authenticated users, orders/* folder
- `Allow public read of delivery photos` — Public can verify proof
- `Allow tenant deletion of their delivery photos` — Cleanup

**Production Impact:**
- Delivery tracking incomplete
- No proof-of-delivery documentation
- Customer disputes: "Did it actually arrive?"

---

### 5. **ORDERS TABLE: PAYMENT COLUMNS FRAGMENTED**
**Migrations:** `20260205163500_patch_orders_payment.sql`, `20260213_strike15_security_notifications.sql`

#### NEW COLUMNS (7)
| Column | Type | Purpose |
|--------|------|---------|
| `payment_id` | TEXT | MP payment ID (from webhook) |
| `payment_status` | TEXT | 'pending', 'paid', 'refunded', 'cancelled' |
| `paid_at` | TIMESTAMPTZ | Payment completion time |
| `mp_preference_id` | TEXT | MP checkout session ID |
| `cancel_reason` | TEXT | Why order was cancelled |
| `mp_payment_data` | JSONB | Full MP webhook payload |
| *(delivery_photo_url)* | *(TEXT)* | *(POD photo URL)* |
| *(delivery_photo_captured_at)* | *(TIMESTAMPTZ)* | *(POD timestamp)* |

#### NEW INDEX
- `idx_orders_payment_id_unique` (partial, WHERE payment_id IS NOT NULL) — Idempotency guard for webhooks

**Production Impact:**
- Payment state machine incomplete
- Webhook idempotency not obvious in Bible
- Missing audit trail columns

---

### 6. **CATEGORIES TABLE: SORT_ORDER COLUMN**
**Migration:** `add_categories_sort_order.sql`

#### New Column
- `sort_order` (INTEGER) — Position for drag-to-reorder menu sections

#### New Index
- `idx_categories_business_id_sort_order` — Efficient ordering queries

**Production Impact:**
- Menu section reordering won't work
- Query performance degrades on large menus

---

## 🟡 MEDIUM GAPS (INCOMPLETE COVERAGE)

### 7. **MISSING DETAILS ON EXISTING TABLES**

#### `orders` table — incomplete column list
Missing documented:
- `delivery_photo_url`
- `delivery_photo_captured_at`
- `mp_preference_id`
- `cancel_reason`
- `mp_payment_data`

#### `owner_notifications` table — NEW TABLE not in Bible
- 6 columns, 1 RLS policy, FK to orders

#### `categories` table — column missing
- `sort_order` for UI ordering

#### `password_reset_codes` table — NEW AUTH TABLE not in Bible
- 5 columns, 2 indexes, RLS locked to service role

---

## 📊 GAP SUMMARY TABLE

| Category | Item | Bible Status | Severity | Users @ 1000 |
|----------|------|------|----------|---|
| **AI System** | ai_master_memory | ❌ Missing | 🔴 CRITICAL | Multi-tenant memory loss |
| **AI System** | agent_registry | ❌ Missing | 🔴 CRITICAL | Agent orchestration broken |
| **AI System** | captain_laws | ❌ Missing | 🔴 CRITICAL | No constraints enforcement |
| **AI System** | 5 new functions | ❌ Missing | 🔴 CRITICAL | Agent queries broken |
| **AI System** | pgvector indexes | ❌ Missing | 🔴 CRITICAL | Semantic search fails |
| **Auth** | password_reset_codes | ❌ Missing | 🔴 CRITICAL | Owners can't reset passwords |
| **Auth** | get_user_id_by_email | ❌ Missing | 🔴 CRITICAL | Edge function lookups fail |
| **Notifications** | owner_notifications | ❌ Missing | 🔴 CRITICAL | No escalation alerts |
| **Notifications** | check_stalled_orders | ❌ Missing | 🔴 CRITICAL | Stuck orders unnoticed |
| **Delivery** | delivery_photo_url column | ❌ Missing | 🟠 HIGH | No POD tracking |
| **Delivery** | delivery_photo_captured_at | ❌ Missing | 🟠 HIGH | No POD timestamps |
| **Delivery** | storage bucket policies | ❌ Missing | 🟠 HIGH | Upload/read fails |
| **Payments** | mp_preference_id column | ⚠️ Partial | 🟠 HIGH | Checkout sessions lost |
| **Payments** | cancel_reason column | ⚠️ Partial | 🟠 HIGH | Cancellation audit incomplete |
| **Payments** | mp_payment_data JSONB | ⚠️ Partial | 🟠 HIGH | Webhook payload lost |
| **Menu** | categories.sort_order | ❌ Missing | 🟠 HIGH | Reorder UI broken |
| **Memory** | 5 memory_layer enum | ❌ Missing | 🟡 MEDIUM | Type confusion |
| **Agents** | 4 agent_type enum | ❌ Missing | 🟡 MEDIUM | Type confusion |
| **Seed Data** | 4 core agents | ❌ Missing | 🟡 MEDIUM | Swarm won't bootstrap |
| **Seed Data** | 3 captain laws | ❌ Missing | 🟡 MEDIUM | No law enforcement |

---

## 🔧 NEXT STEPS (PRIORITY ORDER)

### Immediate (This Week)
1. ✅ Add **AI Swarm** section to DATABASE_BIBLE
   - Document all 6 tables + enums + functions
   - Add pgvector extension as system requirement
   - Document seed agents & laws

2. ✅ Add **Password Reset** section
   - password_reset_codes table
   - get_user_id_by_email function
   - RLS & indexes

3. ✅ Add **Owner Notifications** section
   - owner_notifications table
   - check_stalled_orders function
   - Escalation RLS policy

4. ✅ Add **Delivery POD** section
   - New columns on orders
   - Storage bucket structure
   - 3 storage RLS policies

### This Sprint
5. ✅ Audit **orders table** — confirm all payment columns documented
6. ✅ Audit **categories table** — confirm sort_order + index documented
7. ✅ Create **DATA FLOW DIAGRAM** for:
   - Password reset (email → code → new password)
   - Order escalation (stuck order → notification → owner alert)
   - Agent memory lifecycle (observation → embedding → semantic search)

### Production Checklist
- [ ] pgvector extension verified in Supabase
- [ ] ai_master_memory replication tested
- [ ] password_reset_codes cleanup job scheduled (10 min TTL)
- [ ] owner_notifications RLS verified (business_id isolation)
- [ ] delivery-photos bucket tested (upload/read/delete)
- [ ] Agent seed data loaded on provision
- [ ] Captain's Laws seeded with 3 core laws

---

## FILES TO UPDATE

```
DATABASE_BIBLE_COMPLETE.md
  + Add AI Swarm System (1.5 sections)
  + Add Auth System (0.5 sections)
  + Add Notifications (0.5 sections)
  + Add Delivery POD (0.5 sections)
  + Expand Orders table schema (2 sections)
  + Add seed data section (0.5 sections)
  + Update production checklist (+5 items)

Total expansion: ~50-100 new lines
```

---

**Generated:** 2026-05-08  
**Scanned Migrations:** 24 files  
**Missing Items:** 20+  
**Users @ Dec 2026 Goal:** 1,000 businesses  
**Risk Level:** 🔴 CRITICAL — Deploy these gaps to production = system-wide failures
