# FoodSpot Arcade - Game Integration Pipeline

## Quick Start

```bash
# 1. Install dependencies (none needed - pure HTML/JS)

# 2. Scrape games from GitHub
cd foodspot-arcade
node scripts/game-scraper.js --list           # See available games
node scripts/game-scraper.js --all            # Import all curated games
node scripts/game-scraper.js --all --category=bar  # Import only bar games

# 3. Open arcade.html in browser
```

## How It Works

### 1. The Scraper (`scripts/game-scraper.js`)

**What it does:**
- Validates GitHub repos have playable HTML5 structure
- Downloads game files (respects rate limits, skips tests/docs)
- Generates a branded cover image (SVG with emoji + gradient)
- Wraps games with universal exit button
- Adds entry to `game-registry.json`

**Curated Games (Ready to Import):**

| Game | Category | Repo |
|------|----------|------|
| 8-Ball Pool | bar | tobegit3hub/html5-pool |
| 501 Darts | bar | karlwestin/HTML5-Darts |
| Air Hockey | arcade | MaximeLucas/Verlet-physics-airhockey |
| Mini Golf | bar | paulorely/HTML5-Mini-Golf |
| Space Pinball | arcade | daveagill/html5-pinball |
| Flappy Bird | addictive | nevkontakte/flappybird |
| 2048 | addictive | gabrielecirulli/2048 |
| Snake | classic | platzhersh/html5-snake |
| Tetris | classic | jakesgordon/javascript-tetris |
| Pac-Man | classic | spite/pacman |

### 2. The Registry (`game-registry.json`)

Central JSON file tracking all games:

```json
{
  "games": [{
    "id": "8ball-pool",
    "title": "8-Ball Pool",
    "category": "bar",
    "cover": "assets/covers/8ball-pool.svg",
    "integration": {
      "path": "games/8ball-pool/index.html",
      "fullscreen": true,
      "exitButton": true
    }
  }]
}
```

### 3. The Launcher (`scripts/game-launcher.js`)

**Features:**
- Renders game cards for TikTok-style scroll
- Launches games in fullscreen iframe
- Listens for messages from games (score updates, exit)
- Saves high scores to localStorage
- Category filtering

### 4. The UI (`styles/arcade.css`)

- Vertical snap-scroll (like TikTok)
- Category filter bar
- Play button with haptic feedback
- Fullscreen overlay for games
- Exit button injected into each game

## Adding a New Game

### Option A: From Curated List

```bash
node scripts/game-scraper.js --all --category=bar
```

### Option B: Custom GitHub Repo

1. Add to `CURATED_GAMES` array in `game-scraper.js`:

```javascript
{
  id: 'my-game',
  title: 'My Game',
  category: 'arcade',
  repo: 'owner/repo-name',
  entryFile: 'index.html',
  description: 'Short description',
  tags: ['tag1', 'tag2']
}
```

2. Run scraper:
```bash
node scripts/game-scraper.js --repo=owner/repo-name
```

### Option C: Manual Import

1. Download game files to `games/my-game/`
2. Create cover in `assets/covers/my-game.svg`
3. Add entry to `game-registry.json`

## Game Wrapper Features

Every imported game gets auto-wrapped with:

- **Exit Button (✕)** - Fixed position top-right, red on hover
- **Score Tracking** - Posts score updates to parent window
- **High Score Saving** - Persists best scores
- **Game Over Detection** - Captures final score on exit

## Message API (Game → Parent)

Games can communicate via `window.parent.postMessage`:

```javascript
// Game is ready
window.parent.postMessage({ type: 'GAME_READY', gameId: 'xxx' }, '*');

// Score update
window.parent.postMessage({ type: 'SCORE_UPDATE', gameId: 'xxx', score: 100 }, '*');

// Game over
window.parent.postMessage({ type: 'GAME_OVER', gameId: 'xxx', score: 500 }, '*');

// Exit requested (handled by injected button)
window.parent.postMessage({ type: 'GAME_EXIT', gameId: 'xxx' }, '*');
```

## File Structure

```
foodspot-arcade/
├── arcade.html              # Main TikTok-scroll UI
├── game-registry.json       # Game database
├── scripts/
│   ├── game-scraper.js     # GitHub scraper
│   └── game-launcher.js    # Launch/iframe manager
├── styles/
│   └── arcade.css          # TikTok-style UI
├── assets/
│   └── covers/             # Auto-generated game covers
└── games/                  # Downloaded game files
    ├── 8ball-pool/
    │   └── index.html      # Wrapped with exit button
    ├── 2048/
    └── ...
```

## Troubleshooting

**Rate limited by GitHub?**
- Script includes 1s delay between requests
- For bulk imports, wait a few minutes between batches

**Game doesn't launch?**
- Check browser console for CORS errors
- Some games need local server (not file://)
- Run: `python3 -m http.server 8000`

**Exit button not showing?**
- Check game has `</body>` tag (wrapper injects there)
- Some games override all styles

## Next Steps

1. **Add More Sources** - Extend scraper for Itch.io, CodePen
2. **Offline Support** - Cache games with Service Worker
3. **Social Features** - Leaderboards, share high scores
4. **Monetization** - Watch ad to unlock premium games
