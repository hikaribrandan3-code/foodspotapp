# Supabase Tasks - Multi-Location Bug Fixes

## 🔴 CRITICAL - Data Isolation (Bug #4)

**Task:** Verify RLS policy on `delivery_settings` table

**What to do:**
1. Go to Supabase console → Tables → `delivery_settings`
2. Click "Auth" tab → Check RLS policies
3. Verify policy exists that restricts to owner's own `business_id`

**Expected policy should look like:**
```sql
WHERE (auth.uid() = (
  SELECT auth_user_id 
  FROM businesses 
  WHERE id = business_id
))
```

**If missing:** Add the policy to prevent location owners from reading each other's delivery settings

---

## ✅ DONE (Code-level fixes)

- [x] AddLocationModal - localStorage `fs_business_id` saving
- [x] OwnerSummary - RPC error handling
- [x] LocationsHub - redirect loading state
- [x] Slug uniqueness check (client-side debounce)

---

## Status
**Supabase changes:** Needs verification only (no schema changes required)  
**Code changes:** Complete  
**Next:** You can test the app now while we verify Supabase console later
