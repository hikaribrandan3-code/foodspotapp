# Multi-Tenant Signup Setup
**Status:** Ready to deploy  
**Date:** 2026-05-08

---

## What This Does

When a user signs up:
1. ✅ Auth user created in `auth.users`
2. ✅ Demo business auto-created in `businesses` table
3. ✅ Branding config seeded with defaults
4. ✅ Demo categories + menu items created
5. ✅ Demo event created (draft status)
6. ✅ User linked to business via `owner_id`
7. ✅ RLS policies filter data by ownership

**Result:** User logs in → sees their own tenant with demo data → can customize in Settings

---

## Deployment Steps

### Step 1: Run the Migration
```bash
# In Supabase SQL Editor, run:
supabase/migrations/20260508_multi_tenant_signup.sql
```

**What it does:**
- Adds `owner_id` UUID column to `businesses`
- Creates index `idx_businesses_owner_id`
- Updates RLS policies on `businesses` and `branding`
- Creates helper function `get_user_primary_business()`

**Verify:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'businesses' AND column_name = 'owner_id';
-- Should return: owner_id
```

---

### Step 2: Deploy the Edge Function
```bash
# From project root:
supabase functions deploy create-tenant-on-signup
```

**What it does:**
- Accepts POST request with `{ user_id, email }`
- Creates business + categories + menu + event
- Returns `{ business_id, business_slug }`

**Verify:**
```bash
# Test the function
curl -X POST https://your-project.supabase.co/functions/v1/create-tenant-on-signup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-uuid",
    "email": "test@example.com"
  }'

# Should return:
# { "success": true, "business_id": "...", "business_slug": "..." }
```

---

### Step 3: Wire Auth Trigger (Frontend)

In your signup component (e.g., `src/pages/TrialSignup.jsx`):

```jsx
// After user signs up with Supabase auth
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
});

if (error) {
  console.error("Signup failed:", error);
  return;
}

const user = data.user;

// 🔥 CALL EDGE FUNCTION TO CREATE TENANT
const { data: tenantData, error: tenantError } = await supabase.functions.invoke(
  "create-tenant-on-signup",
  {
    body: {
      user_id: user.id,
      email: user.email,
    },
  }
);

if (tenantError) {
  console.error("Tenant creation failed:", tenantError);
  return;
}

const { business_slug } = tenantData;

// ✅ REDIRECT TO THEIR NEW TENANT
navigate(`/${business_slug}`);
```

---

### Step 4: Verify Multi-Tenancy

Create a 2nd test account to verify isolation:

```bash
# Account 1: hikaribrandan3@gmail.com
# Account 2: test-account-2@gmail.com

# Sign up with Account 2 → Should get its own business
# Log into Account 1 → Should see ONLY their business
# Log into Account 2 → Should see ONLY their business

# SQL verification:
SELECT email, owner_id FROM auth.users au
LEFT JOIN businesses b ON au.id = b.owner_id;

# Should show:
# hikaribrandan3@gmail.com | business-uuid-1
# test-account-2@gmail.com | business-uuid-2
```

---

## Database Changes

### `businesses` table (NEW COLUMN)
```sql
ALTER TABLE businesses ADD COLUMN owner_id UUID;
-- Links business to auth.users(id)
-- Indexed for fast lookup
-- ON DELETE CASCADE (business deleted if user deleted)
```

### RLS Policies (UPDATED)
**Before:**
```
- Anyone can read businesses
- Owner full access (header-based)
```

**After:**
```
- Anyone can read businesses (public)
- Owners see only their own (owner_id = auth.uid())
- Owners can update only their own
- Service role can insert (edge function)
```

---

## Frontend Integration Checklist

- [ ] Call `create-tenant-on-signup()` after successful `signUp()`
- [ ] Extract `business_slug` from response
- [ ] Redirect to `/${business_slug}` (customer view)
- [ ] Verify user sees demo data (menu, categories, events)
- [ ] Test with 2nd account to verify isolation
- [ ] Test back button behavior (should stay within their tenant)

---

## Edge Function API

### Request
```json
{
  "user_id": "UUID of auth.users.id",
  "email": "user@example.com",
  "user_metadata": {
    "full_name": "Optional user name"
  }
}
```

### Success Response (200)
```json
{
  "success": true,
  "business_id": "UUID",
  "business_slug": "tenant-xxxxx",
  "message": "Demo tenant created successfully"
}
```

### Error Response (400/500)
```json
{
  "error": "Error message",
  "success": false
}
```

---

## Demo Data Created

### Categories
- Entrantes
- Platos Principales
- Bebidas
- Postres

### Menu Items
- Demo Hamburguesa (1500 ARS/100)
- Demo Pizza (2000 ARS/100)

### Branding (Defaults)
```json
{
  "theme": "light",
  "primary_color": "#10B981",
  "currency": "ARS",
  "language": "es",
  "timezone": "America/Argentina/Cordoba"
}
```

### Events
- "Evento Demo - FoodSpot" (draft, next week)

---

## Production Notes

1. **Idempotency:** Function checks if user already has a business
   - Safe to call multiple times
   - Won't create duplicates

2. **Errors:** Function logs errors but continues
   - Business created even if categories fail
   - User can still see their tenant

3. **Demo Slug:** Uses `tenant-{first-8-chars-of-uuid}`
   - Example: `tenant-a0b1c2d3`
   - Prevents slug conflicts

4. **Owner Isolation:** RLS now enforces `owner_id = auth.uid()`
   - Users can't see each other's data
   - Ready for 1000 users

---

## Troubleshooting

### User signs up but doesn't see a business
**Check:**
```sql
SELECT * FROM businesses WHERE owner_id = 'their-user-id';
```
If empty → Edge function didn't run. Check logs.

### RLS: "new row violates row level security policy"
**Check:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'businesses';
```
Verify `owner_id = auth.uid()` policy exists.

### Demo data not showing
**Check:**
```sql
SELECT * FROM categories WHERE business_id = 'their-business-id';
SELECT * FROM menu_items WHERE business_id = 'their-business-id';
```

---

## Next: User Customization

Once signup works, users need to customize:
1. **Settings page** → Change business name, add logo, colors
2. **Menu Manager** → Delete demo items, add real menu
3. **Events** → Create real events (currently seeded as draft)
4. **Mercado Pago** → Connect payment (separate flow)

This is the frontend part you'll build.

---

**Deployed by:** [Your name]  
**Date:** 2026-05-08  
**Status:** ✅ Ready for testing
