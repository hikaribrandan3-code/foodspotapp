# 🎮 GameHero Integration Guide

## Quick Start (2 minutes)

### 1. Copy GameHero.jsx to your app
```bash
cp foodspot-arcade/GameHero.jsx src/components/
```

### 2. Use it in your app
```jsx
import { GameHero } from './components/GameHero';

function ArcadeTab() {
  return (
    <div>
      <h1>🎮 Game Hero</h1>
      <GameHero 
        onGameSelect={(game) => console.log('Playing:', game.title)}
      />
    </div>
  );
}
```

### 3. Done! 🎉
You now have 24 games ready to play.

---

## How It Works

### Live Games (Instant, No Hosting)
These games load directly from GitHub Pages:
- **2048** - https://gabrielecirulli.github.io/2048/
- **Tetris** - https://jakesgordon.github.io/javascript-tetris/
- **Pac-Man** - https://spite.github.io/pacman/
- **Tic Tac Toe** - https://beumsk.github.io/Tic-Tac-Toe/
- **Connect Four** - https://kenrick95.github.io/connect-four/
- **Stack** - https://stevengoldberg.github.io/stack/

### Self-Hosted Games (Download Required)
Games without GitHub Pages need to be hosted:
- Flappy Bird
- Snake
- Darts
- Pool
- etc.

---

## Hosting Self-Hosted Games

### Step 1: Download Games
```bash
cd foodspot-arcade
node scripts/download-all.js
```

### Step 2: Copy to public folder
```bash
mkdir -p public/games
cp -r foodspot-arcade/games/* public/games/
```

### Step 3: Deploy
```bash
vercel --prod
```

---

## Game Categories

| Category | Games | Icon |
|----------|-------|------|
| Addictive | 10 games | 🔥 |
| Classic | 8 games | 👾 |
| Arcade | 1 game | 🕹️ |
| Bar | 3 games | 🍺 |

---

## Exit Button

Every game has an exit button (✕) in the top-right corner:
- Click to exit game
- Returns to game grid
- Works on all games

The exit button is injected automatically for:
- ✅ Live games (via postMessage API)
- ✅ Self-hosted games (via injected script)

---

## MIT License Compliance

### Included File
`LICENSE-ACKNOWLEDGMENTS.md` contains:
- All 24 games listed
- Repository links
- Copyright holders
- MIT license text

### Where to Show Credits
Add a "Credits" link in your app:
```jsx
<Link to="/credits">Game Credits</Link>
```

Display the content of `LICENSE-ACKNOWLEDGMENTS.md`

---

## Customizing

### Add a New Game
Edit `GameHero.jsx` and add to `GAME_CATALOG`:
```javascript
{
  id: 'my-game',
  title: 'My Game',
  category: 'addictive',
  url: 'https://example.com/game',
  isExternal: true,
  license: 'MIT',
  author: 'Author Name',
  repo: 'owner/repo',
  cover: '🎮',
  description: 'My awesome game'
}
```

### Change Colors
Edit styles in `GameHero.jsx`:
```javascript
const getCategoryColor = (cat) => ({
  bar: 'linear-gradient(135deg, #8B4513, #D2691E)',
  arcade: 'linear-gradient(135deg, #FF006E, #8338EC)',
  // ... add more
}[cat]);
```

---

## Troubleshooting

### Game doesn't load
Check browser console for CORS errors. Some games block iframe embedding.

### Exit button not working
Make sure the game iframe is same-origin or has proper postMessage handling.

### Mobile issues
Some games aren't mobile-optimized. Check `mobileOptimized: true` in catalog.

---

## Files Summary

| File | Purpose |
|------|---------|
| `GameHero.jsx` | Main React component |
| `LICENSE-ACKNOWLEDGMENTS.md` | Legal attributions |
| `scripts/download-all.js` | Download self-hosted games |
| `game-registry.json` | Game metadata |

---

## Next Steps

1. ✅ Copy `GameHero.jsx` to your app
2. ✅ Test with live games (no setup needed)
3. ⬜ Download self-hosted games when ready
4. ⬜ Add credits page
5. ⬜ Customize styling to match your brand

---

*All games are MIT licensed. FoodSpot acknowledges and thanks all open-source contributors.*
