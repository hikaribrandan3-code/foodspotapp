## AI Tool Budget & Caching Strategy (2025)

**Current Stack:**
- Gemini Pro: $20/month
- Claude Pro: $20/month  
- Kimi Pro: $40/month
- **Total: $80/month**

**Target Allocation:** 4-10% of FoodSpot revenue → AI tools
- At $2K MRR → $80-200/month for AI
- At $5K MRR → $200-500/month for AI (covers next-gen models)

**Caching Strategy (Code Optimization):**
- Cache KDS data locally — don't poll Supabase on every tick
- Menu data: Cache on load, optimistic updates only
- AI image generation: Cache generated assets, reuse before regenerating
- Analytics: Aggregate server-side, don't calculate client-side per view
- Auth state: Single source of truth, no redundant checks

**Goal:** Use expensive AI now to *build* fast, run cheap later on cached infra.
