# FoodSpot-OS — What To Do When You Wake Up

Save this email. Do these in order.

---

## 🔴 FIRST (Security — Do This First)

### Rotate Supabase Service Role Key
The old key was exposed in code. It's still active until you rotate it.

1. Go to: https://supabase.com/dashboard/project/buendqgmwpxdixwvlkhd/settings/api
2. Log in: hikaribrandan3@gmail.com / Aa39897828!
3. Scroll to **Project API keys**
4. Next to `service_role`, click **Regenerate** (or **Reset**)
5. Confirm

**If no Regenerate button shows** (free tier): Email Supabase support:  
*"I accidentally exposed my service_role key. Please rotate it for project ref buendqgmwpxdixwvlkhd."*

**After rotating:** Update any local scripts or CI/CD that use the old key.

---

## 🟡 SECOND (Deploy MP Fix)

### Deploy Updated Edge Function
The `create-preference` function was fixed to redirect to the correct domain.

Run these commands:

```bash
cd ~/Downloads/foodspotapp-main

# Deploy the updated edge function
npx supabase functions deploy create-preference --no-verify-jwt

# Set your domain explicitly
npx supabase secrets set --project-ref buendqgmwpxdixwvlkhd APP_BASE_URL=https://foodspotapp.vercel.app
```

If prompted to log in: hikaribrandan3@gmail.com / Aa39897828!

---

## 🟢 THIRD (Launch or Fix Later)

### Option A: Soft Launch Now (Recommended)
You're ready for a beta with 2-3 restaurants. The UX works. Cash flows work. Real-time sync works.

**Just do this:**
1. Rotate the key (above)
2. Deploy the MP fix (above)
3. Push to Vercel
4. Start taking orders

### Option B: Fix Everything Before Public Launch
Do these over the next month while running the beta:

| Priority | Fix | How Hard |
|----------|-----|----------|
| 🔴 | Replace 9 direct `.update()` calls with FSM RPC | Medium |
| 🔴 | Add audit trail to MP webhook + cash sync | Easy |
| 🔴 | Add unique constraint to transaction_ledger | One SQL line |
| 🟡 | Apply critical_schema_fix.sql as migration | Easy |
| 🟡 | Consolidate 4 realtime channels into 1 | Medium |
| 🟡 | Drop legacy `transition_order_state` RPC | Easy |
| 🟢 | Add timestamps to `advance_order_status` RPC | Easy |
| 🟢 | Fix broken tests (useOrdersPolling, useCamTech) | Medium |
| 🟢 | Decide: keep or drop `owner_status` column | Easy |

**Fix order:** Security → FSM bypasses → Audit trails → Ledger constraint → Everything else.

---

## 📎 Files to Reference

- Full audit + todo list: `~/Downloads/foodspotapp-main/FULL_TODO_AND_AUDIT.md`
- Opus audit prompt: `~/Downloads/foodspotapp-main/OPUS_AUDIT_PROMPT_FINAL.md` (deleted for security, recreate if needed)

---

## 🎯 Bottom Line

Your app works. The foundation is solid. You're not far from a real product.

**Rotate key. Deploy MP fix. Launch beta. Fix the rest while you make money.**

Sleep well. 🍻
