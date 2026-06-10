# FABLE: TLDR — Food Photography Camera
## One Shot. Make it Count.

---

## THE GOAL
**Build the best in-browser FOOD PHOTOGRAPHY camera on the planet.**

Users photograph food before ordering / after delivery. Make those photos so good they want to share them.

---

## THE PROBLEM
1. **Photos don't capture** — blob returns null (BLOCKING)
2. **Aspect ratios letterbox** — 4:3 and 1:1 shrink instead of fill screen
3. **Macro doesn't work** — can't focus at 5-30cm (makes food look blurry)
4. **Limited zoom** — only 1x-3x (need 0.5x-10x for both wide + tight)

---

## YOUR TASK (Priority Order)

### 🔴 CRITICAL
1. **Fix photo capture** — Debug why blob is null. Likely race condition with background resolution upgrade.
   - Test: Tap shutter 50 times, all should capture
   - Output: Valid JPEG blob to EditorLayer

2. **Macro focusing (5-30cm)** — This is the SUPERPOWER
   - Photograph burger at 5cm: see sesame seeds sharp
   - Photograph sushi at 8cm: see rice grains sharp
   - Photograph pizza at 10cm: see cheese texture sharp
   - No blur = appetizing = users share photos

3. **FOOD scene mode** — Warm light + macro + boost exposure
   - Warm white balance (3200K — tungsten restaurant light)
   - +1.2 EV brightness (dark restaurants need light)
   - Auto macro focus (5-30cm)
   - This is your #1 hero mode

### 🟡 HIGH
4. **Aspect ratios fixed** — 9:16, 4:3, 1:1 all fill screen (no letterbox)
5. **Zoom 0.5x–10x** — Wide shot + macro detail
6. **Pinch-to-zoom on mobile** — Seamless two-finger pinch
7. **PET mode** — Continuous AF for moving animals
8. **PORTRAIT mode** — Warm, face-detect, for owner selfies with food

### ⚫ SKIP
- ❌ SPORTS mode — Not a sports app, waste of tokens

---

## SOURCE MATERIAL
- **CamTech v1.8 Repo:** https://github.com/hikaribrandan3-code/camtech-enginev1.8.git
  - Study: Two-phase init (fast preview + background 4K upgrade)
  - Study: Macro focus logic (focus distance constraints)
  - Study: Scene presets (AE/AF profiles)
  - Port the good parts into FoodSpot

- **FoodSpot Camera Path:** `/src/components/Camera/`
  - CameraLayer.jsx = What you're fixing
  - EditorLayer.jsx = DO NOT TOUCH (annotation pipeline)
  - DualPostScreen.jsx = DO NOT TOUCH (preview/save)

---

## MUST PRESERVE
- `CameraLayer` component signature
- `onCapture(imageBlob)` callback
- EditorLayer/DualPostScreen pipeline
- Integration flow: Capture → Editor → Save

---

## QUICK WINS FOR FOOD
- **Warm white balance** (tungsten restaurant lighting is yellow — correct it)
- **+1.2 EV boost** (dim restaurants need light to see food)
- **Macro focus** (close-ups look professional)
- **Zoom range** (show full plate OR tight detail)

Result: Users see professional food photos on their phone camera → they photograph meals → they share → restaurants go viral.

---

## SUCCESS = 
- ✅ Photos actually capture (fix blob)
- ✅ Macro sharp at 5cm (FOOD mode hero feature)
- ✅ All aspect ratios full-screen
- ✅ Zoom 0.5x–10x + pinch
- ✅ PET + PORTRAIT modes working
- ✅ Integration intact (capture → editor → save)
- ✅ No console errors
- ✅ Mobile responsive

---

## YOUR BRIEF

**Context:** Restaurant app. The camera is how users photograph food to share. You're building the best food photography camera on the browser.

**Why it matters:** Normal browsers can't macro (5cm+). CamTech + FOOD mode = professional food photos on a phone camera = users share = restaurants viral.

**Your task (priority order):**
1. Debug + fix photo capture (blob null — race condition)
2. Integrate CamTech v1.8
3. FOOD mode (hero feature) — warm, macro 5-30cm, bright
4. Macro focusing — sesame seeds on bun, rice grains on sushi must be sharp
5. Zoom 0.5x–10x + pinch (wide to tight detail)
6. Aspect ratios (9:16, 4:3, 1:1 full-screen)
7. PET + PORTRAIT (continuous AF, face-detect)

**Constraints:** Preserve EditorLayer/DualPostScreen, keep CameraLayer signature, no external deps, CSS tokens only.

**Skip:** SPORTS mode (save tokens for food quality).

**When you have context, start coding.** Don't over-plan. Use the testing checklist to verify as you build.

**Test with real food:** Burger, pizza, sushi at 5-10cm. Should look appetizing.

**One shot, make it count.** 🚀

---

Read full brief: `.claude/Fable-CamTech-Complete-Brief.md`
