# 🥊 Food Fight Game Audit Report

## Status: 🔴 CRITICAL ISSUES FOUND

---

## Issue 1: Iframe onLoad Not Firing (Loading Spinner Broken)

**Problem:** The `onLoad` callback on the iframe doesn't fire reliably for games loaded via `src`.

**Current Code:**
```jsx
<iframe
  src={currentGame.url}
  onLoad={() => setGameLoading(false)}  // ❌ Doesn't fire consistently
/>
```

**Why it fails:**
- Iframe `onLoad` only fires after ALL resources load
- For HTML files with embedded base64 audio, this can take 5-10 seconds
- Sometimes doesn't fire at all if resources hang

**Fix:** Use a timeout-based fallback
```jsx
// In useEffect when game loads
useEffect(() => {
  if (currentGame) {
    setGameLoading(true);
    // Fallback: hide loader after 3 seconds max
    const timer = setTimeout(() => setGameLoading(false), 3000);
    return () => clearTimeout(timer);
  }
}, [currentGame]);
```

---

## Issue 2: Food Fight Game Analysis

**File Size:** 64KB (largest game)
- Minified JavaScript: ~60KB
- Embedded base64 audio: ~40KB of that

**Code Structure:** ✅ GOOD
- Proper `requestAnimationFrame` loop
- Correct pause/resume handling
- Message event listeners for emulator controls

**Potential Problems:**

### A. Touch Button Rendering Issue
The game draws its own touch buttons on canvas:
```javascript
const TBTNS=[{k:'left',x:52,y:455,r:30,label:'◄'},...]
```

These might conflict with emulator's touch handling.

### B. State Machine Complexity
Game has 5 states:
1. `menu` - Difficulty selection
2. `charsel` - Character selection  
3. `fight` - Actual gameplay
4. `roundend` - Round over screen
5. `matchend` - Match over screen

If stuck on black screen, the `loop()` might not be running.

### C. Missing Error Handling
No `window.onerror` or try/catch in game loop.

---

## Issue 3: Sandboxing

**Current:** `sandbox="allow-scripts allow-same-origin"`

**Potential blockers:**
- `localStorage` access (if any)
- `AudioContext` autoplay policies
- Touch events might be captured by emulator before reaching game

---

## 🔧 Recommended Fixes

### Fix 1: Loading Spinner Timeout (URGENT)
```jsx
// HikariBoy.jsx
useEffect(() => {
  if (currentGame) {
    setGameLoading(true);
    // Max 2 seconds loading time
    const timer = setTimeout(() => {
      setGameLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [currentGame]);
```

### Fix 2: Remove Sandbox for Testing
```jsx
// Test if sandbox is blocking
<iframe
  sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
  // or remove sandbox entirely for testing
/>
```

### Fix 3: Debug Overlay
Add this to Food Fight temporarily:
```javascript
// At top of script
window.onerror = function(msg, url, line) {
  document.body.innerHTML = `<div style="color:red;padding:20px;">
    ERROR: ${msg}<br>Line: ${line}
  </div>`;
};
```

### Fix 4: Test Food Fight Standalone
Open directly in browser:
```
https://yourdomain.com/games/food-fight/index.html
```

If it works standalone but not in iframe = sandbox/embedding issue.

---

## 📊 Game Comparison

| Game | Size | Touch UI | Complexity | Status |
|------|------|----------|------------|--------|
| Burger Stack | 36KB | Canvas | Low | ✅ Works |
| Bubble Tea | 44KB | Canvas | Low | ✅ Works |
| Spice Invaders | 56KB | Canvas | Medium | ✅ Works |
| **Food Fight** | **64KB** | **Canvas+Touch** | **High** | **🔴 Broken** |
| Hot Dog Dash | 44KB | Canvas | Medium | ? |
| Fruit Slice | 44KB | Canvas | Low | ? |

---

## 🎯 Next Steps

1. **Test Food Fight standalone** - Open `/games/food-fight/index.html` directly
   - If works = iframe/sandbox issue
   - If broken = game code issue

2. **Add error logging** - Wrap game loop in try/catch

3. **Remove sandbox temporarily** - See if that's the blocker

4. **Fix loading spinner** - Add timeout fallback

---

## Quick Diagnosis Command

```bash
# Check if Food Fight has JS errors
node -e "
const fs = require('fs');
const html = fs.readFileSync('public/games/food-fight/index.html', 'utf8');
const script = html.match(/<script>([\\s\\S]*?)<\\/script>/)[1];
try {
  new Function(script);
  console.log('✅ JavaScript syntax OK');
} catch(e) {
  console.log('❌ Syntax error:', e.message);
}
"
```

---

*Audit: March 18, 2025*
