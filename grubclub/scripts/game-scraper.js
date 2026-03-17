#!/usr/bin/env node
/**
 * GitHub HTML5 Game Scraper for FoodSpot Arcade
 * 
 * Usage: node game-scraper.js --repo=<owner/repo> [--category=bar|arcade|sports]
 * 
 * This script:
 * 1. Scrapes a GitHub repo for HTML5 games
 * 2. Validates it's playable (has index.html, uses canvas/DOM)
 * 3. Downloads game files
 * 4. Generates a placeholder cover
 * 5. Creates the game registry entry
 * 6. Wraps it with play/exit handlers
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Known high-quality HTML5 game repos for bar/arcade
const CURATED_GAMES = [
  {
    id: '8ball-pool',
    title: '8-Ball Pool',
    category: 'bar',
    repo: 'tobegit3hub/html5-pool',
    entryFile: 'index.html',
    description: 'Classic 8-ball pool game with realistic physics',
    tags: ['pool', 'billiards', 'sports', 'bar']
  },
  {
    id: 'html5-darts',
    title: '501 Darts',
    category: 'bar',
    repo: 'karlwestin/HTML5-Darts',
    entryFile: 'index.html',
    description: 'Classic 501 darts game for bar atmosphere',
    tags: ['darts', 'bar', 'arcade']
  },
  {
    id: 'air-hockey',
    title: 'Air Hockey',
    category: 'arcade',
    repo: 'MaximeLucas/Verlet-physics-airhockey',
    entryFile: 'index.html',
    description: 'Fast-paced air hockey with physics simulation',
    tags: ['air-hockey', 'arcade', 'multiplayer']
  },
  {
    id: 'mini-golf',
    title: 'Mini Golf',
    category: 'bar',
    repo: 'paulorely/HTML5-Mini-Golf',
    entryFile: 'index.html',
    description: 'Relaxing mini golf perfect for waiting',
    tags: ['golf', 'bar', 'casual']
  },
  {
    id: 'pinball',
    title: 'Space Pinball',
    category: 'arcade',
    repo: 'daveagill/html5-pinball',
    entryFile: 'index.html',
    description: 'Classic arcade pinball action',
    tags: ['pinball', 'arcade', 'retro']
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    category: 'addictive',
    repo: 'nevkontakte/flappybird',
    entryFile: 'index.html',
    description: 'Infuriatingly addictive bird game',
    tags: ['addictive', 'casual', 'endless']
  },
  {
    id: '2048',
    title: '2048',
    category: 'addictive',
    repo: 'gabrielecirulli/2048',
    entryFile: 'index.html',
    description: 'The number-matching puzzle that hooks you',
    tags: ['puzzle', 'addictive', 'casual']
  },
  {
    id: 'snake',
    title: 'Snake',
    category: 'classic',
    repo: 'platzhersh/html5-snake',
    entryFile: 'index.html',
    description: 'Classic snake game, always addictive',
    tags: ['classic', 'arcade', 'retro']
  },
  {
    id: 'tetris',
    title: 'Tetris',
    category: 'classic',
    repo: 'jakesgordon/javascript-tetris',
    entryFile: 'index.html',
    description: 'The legendary block-stacking game',
    tags: ['classic', 'puzzle', 'arcade']
  },
  {
    id: 'pacman',
    title: 'Pac-Man',
    category: 'classic',
    repo: 'spite/pacman',
    entryFile: 'index.html',
    description: 'The original maze chase arcade game',
    tags: ['classic', 'arcade', 'retro']
  }
];

const CONFIG = {
  gamesDir: path.join(__dirname, '../grubclub/games'),
  coversDir: path.join(__dirname, '../grubclub/assets/covers'),
  registryFile: path.join(__dirname, '../grubclub/game-registry.json'),
  maxFileSize: 10 * 1024 * 1024, // 10MB per file
  allowedExtensions: ['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.json', '.mp3', '.wav', '.ogg']
};

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Create placeholder cover using SVG template
function generateCover(game) {
  const colors = {
    bar: ['#8B4513', '#D2691E', '#F4A460'],      // Brown/wood tones
    arcade: ['#FF006E', '#8338EC', '#3A86FF'],    // Neon purple/pink/blue
    sports: ['#38B000', '#008000', '#004B23'],    // Green field
    classic: ['#FFBE0B', '#FB5607', '#FF006E'],   // Retro warm
    addictive: ['#FF006E', '#FFBE0B', '#FB5607']  // Attention-grabbing
  };
  
  const palette = colors[game.category] || colors.arcade;
  const gradientId = `grad-${game.id}`;
  
  // Emoji mapping for visual identity
  const emojiMap = {
    '8ball-pool': '🎱',
    'html5-darts': '🎯',
    'air-hockey': '🏒',
    'mini-golf': '⛳',
    'pinball': '🕹️',
    'flappy-bird': '🐦',
    '2048': '🔢',
    'snake': '🐍',
    'tetris': '🧱',
    'pacman': '👻'
  };
  
  const emoji = emojiMap[game.id] || '🎮';
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${palette[0]}"/>
      <stop offset="50%" style="stop-color:${palette[1]}"/>
      <stop offset="100%" style="stop-color:${palette[2]}"/>
    </linearGradient>
    <filter id="glow-${game.id}">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="400" height="600" fill="url(#${gradientId})"/>
  
  <!-- Decorative circles -->
  <circle cx="50" cy="100" r="80" fill="rgba(255,255,255,0.1)"/>
  <circle cx="350" cy="500" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="200" cy="300" r="150" fill="rgba(0,0,0,0.1)"/>
  
  <!-- Game Icon -->
  <text x="200" y="280" font-size="120" text-anchor="middle" filter="url(#glow-${game.id})">${emoji}</text>
  
  <!-- Title -->
  <text x="200" y="380" font-family="Arial, sans-serif" font-size="42" font-weight="bold" 
        fill="white" text-anchor="middle" filter="url(#glow-${game.id})">${game.title}</text>
  
  <!-- Category badge -->
  <rect x="150" y="420" width="100" height="30" rx="15" fill="rgba(255,255,255,0.2)"/>
  <text x="200" y="441" font-family="Arial, sans-serif" font-size="14" 
        fill="white" text-anchor="middle">${game.category.toUpperCase()}</text>
  
  <!-- Play icon hint -->
  <circle cx="200" cy="520" r="35" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="2"/>
  <polygon points="190,510 190,530 215,520" fill="white"/>
</svg>`;

  const coverPath = path.join(CONFIG.coversDir, `${game.id}.svg`);
  fs.mkdirSync(CONFIG.coversDir, { recursive: true });
  fs.writeFileSync(coverPath, svg);
  
  return `assets/covers/${game.id}.svg`;
}

// Download file from URL
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'FoodSpot-Game-Scraper' } }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

// Fetch GitHub API
function fetchGitHubAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'FoodSpot-Game-Scraper',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Get repository contents
async function getRepoContents(repo, path = '') {
  const endpoint = `/repos/${repo}/contents/${path}`;
  return fetchGitHubAPI(endpoint);
}

// Validate game structure
async function validateGame(repo) {
  log(`🔍 Validating ${repo}...`, 'cyan');
  
  try {
    const contents = await getRepoContents(repo);
    
    // Check for index.html
    const hasIndex = contents.some(item => 
      item.name.toLowerCase() === 'index.html'
    );
    
    if (!hasIndex) {
      log(`  ❌ No index.html found`, 'red');
      return { valid: false, reason: 'No index.html' };
    }
    
    // Check for game files (js, canvas, etc.)
    const hasGameFiles = contents.some(item => {
      const ext = path.extname(item.name).toLowerCase();
      return ['.js', '.html', '.css'].includes(ext);
    });
    
    if (!hasGameFiles) {
      log(`  ❌ No game files found`, 'red');
      return { valid: false, reason: 'No game files' };
    }
    
    log(`  ✅ Valid game structure`, 'green');
    return { valid: true, contents };
    
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    return { valid: false, reason: error.message };
  }
}

// Download game from GitHub
async function downloadGame(game) {
  const gameDir = path.join(CONFIG.gamesDir, game.id);
  fs.mkdirSync(gameDir, { recursive: true });
  
  log(`⬇️  Downloading ${game.title}...`, 'cyan');
  
  try {
    // Get repo contents recursively
    const downloadRecursive = async (repoPath = '', localPath = '') => {
      const items = await getRepoContents(game.repo, repoPath);
      
      if (!Array.isArray(items)) {
        // Single file
        const ext = path.extname(items.name).toLowerCase();
        if (!CONFIG.allowedExtensions.includes(ext)) return;
        if (items.size > CONFIG.maxFileSize) return;
        
        const dest = path.join(gameDir, localPath, items.name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        await downloadFile(items.download_url, dest);
        return;
      }
      
      for (const item of items) {
        const ext = path.extname(item.name).toLowerCase();
        
        if (item.type === 'dir') {
          // Skip common non-game directories
          if (['.git', 'node_modules', 'test', 'tests', 'docs', '.github'].includes(item.name)) {
            continue;
          }
          await downloadRecursive(item.path, path.join(localPath, item.name));
        } else if (item.type === 'file') {
          if (!CONFIG.allowedExtensions.includes(ext)) continue;
          if (item.size > CONFIG.maxFileSize) continue;
          
          const dest = path.join(gameDir, localPath, item.name);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          await downloadFile(item.download_url, dest);
        }
      }
    };
    
    await downloadRecursive();
    
    log(`  ✅ Downloaded to ${gameDir}`, 'green');
    return { success: true, path: gameDir };
    
  } catch (error) {
    log(`  ❌ Download failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Wrap game with exit button and integration
function wrapGame(game) {
  const gameDir = path.join(CONFIG.gamesDir, game.id);
  const indexPath = path.join(gameDir, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    log(`  ⚠️  No index.html to wrap`, 'yellow');
    return false;
  }
  
  log(`🎁 Wrapping ${game.id} with exit button...`, 'cyan');
  
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Inject exit button styles and script
  const wrapperCSS = `
<style id="foodspot-wrapper">
  #fs-exit-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(0,0,0,0.7);
    border: 2px solid rgba(255,255,255,0.3);
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }
  #fs-exit-btn:hover {
    background: rgba(255,0,0,0.8);
    transform: scale(1.1);
  }
  #fs-game-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
  }
</style>`;

  const wrapperJS = `
<script id="foodspot-exit">
(function() {
  // Notify parent when game is ready
  window.parent.postMessage({ type: 'GAME_READY', gameId: '${game.id}' }, '*');
  
  // Track score if game exposes it
  let scoreInterval = setInterval(() => {
    if (window.score !== undefined) {
      window.parent.postMessage({ 
        type: 'SCORE_UPDATE', 
        gameId: '${game.id}',
        score: window.score 
      }, '*');
    }
  }, 1000);
  
  // Create exit button
  const exitBtn = document.createElement('button');
  exitBtn.id = 'fs-exit-btn';
  exitBtn.innerHTML = '✕';
  exitBtn.onclick = () => {
    clearInterval(scoreInterval);
    window.parent.postMessage({ type: 'GAME_EXIT', gameId: '${game.id}' }, '*');
  };
  document.body.appendChild(exitBtn);
  
  // Handle high score on game over
  window.addEventListener('beforeunload', () => {
    if (window.score && window.score > 0) {
      window.parent.postMessage({
        type: 'GAME_OVER',
        gameId: '${game.id}',
        score: window.score
      }, '*');
    }
  });
})();
</script>`;

  // Inject before closing </head> and </body>
  html = html.replace('</head>', `${wrapperCSS}</head>`);
  html = html.replace('</body>', `${wrapperJS}</body>`);
  
  // If no </body>, append to end
  if (!html.includes(wrapperJS)) {
    html += wrapperJS;
  }
  
  fs.writeFileSync(indexPath, html);
  log(`  ✅ Wrapped with exit button`, 'green');
  
  return true;
}

// Load or create registry
function loadRegistry() {
  if (fs.existsSync(CONFIG.registryFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.registryFile, 'utf8'));
  }
  return { games: [], version: '1.0.0' };
}

// Save registry
function saveRegistry(registry) {
  fs.mkdirSync(path.dirname(CONFIG.registryFile), { recursive: true });
  fs.writeFileSync(CONFIG.registryFile, JSON.stringify(registry, null, 2));
}

// Add game to registry
function addToRegistry(game, coverPath) {
  const registry = loadRegistry();
  
  // Check if already exists
  const exists = registry.games.some(g => g.id === game.id);
  if (exists) {
    log(`  ℹ️  ${game.id} already in registry`, 'yellow');
    return;
  }
  
  const entry = {
    id: game.id,
    title: game.title,
    category: game.category,
    description: game.description,
    tags: game.tags,
    cover: coverPath,
    source: {
      type: 'github',
      repo: game.repo,
      entryFile: 'index.html',
      license: 'MIT (assumed from open source repo)'
    },
    integration: {
      width: 800,
      height: 600,
      aspectRatio: '4/3',
      fullscreen: true,
      exitButton: true,
      path: `games/${game.id}/index.html`
    },
    addedAt: new Date().toISOString()
  };
  
  registry.games.push(entry);
  saveRegistry(registry);
  
  log(`  ✅ Added to registry`, 'green');
}

// Import a single game
async function importGame(game) {
  log(`\n🎮 Importing: ${game.title}`, 'magenta');
  log(`   Repo: ${game.repo}`, 'reset');
  
  // Validate
  const validation = await validateGame(game.repo);
  if (!validation.valid) {
    log(`  ⚠️  Skipping: ${validation.reason}`, 'yellow');
    return false;
  }
  
  // Download
  const download = await downloadGame(game);
  if (!download.success) {
    return false;
  }
  
  // Generate cover
  const coverPath = generateCover(game);
  
  // Wrap with exit button
  wrapGame(game);
  
  // Add to registry
  addToRegistry(game, coverPath);
  
  log(`  🎉 ${game.title} ready!`, 'green');
  return true;
}

// List curated games
function listCurated() {
  log('\n📋 Curated Games Available:', 'magenta');
  CURATED_GAMES.forEach((game, i) => {
    const catColor = {
      bar: 'yellow',
      arcade: 'cyan',
      sports: 'green',
      classic: 'reset',
      addictive: 'red'
    }[game.category] || 'reset';
    
    log(`  ${i + 1}. ${game.title} [${game.category}]`, catColor);
    log(`     Repo: ${game.repo}`, 'reset');
    log(`     Tags: ${game.tags.join(', ')}`, 'reset');
  });
}

// Import all bar/arcade games
async function importAll(category = null) {
  const games = category 
    ? CURATED_GAMES.filter(g => g.category === category)
    : CURATED_GAMES;
  
  log(`\n🚀 Importing ${games.length} games...`, 'magenta');
  
  let success = 0;
  let failed = 0;
  
  for (const game of games) {
    const result = await importGame(game);
    if (result) success++;
    else failed++;
    
    // Rate limiting - be nice to GitHub
    await new Promise(r => setTimeout(r, 1000));
  }
  
  log(`\n✨ Done! ${success} imported, ${failed} failed`, 'green');
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list') || args.includes('-l')) {
    listCurated();
    return;
  }
  
  if (args.includes('--all') || args.includes('-a')) {
    const categoryArg = args.find(a => a.startsWith('--category='));
    const category = categoryArg ? categoryArg.split('=')[1] : null;
    await importAll(category);
    return;
  }
  
  const repoArg = args.find(a => a.startsWith('--repo='));
  if (repoArg) {
    const repo = repoArg.split('=')[1];
    const game = CURATED_GAMES.find(g => g.repo === repo);
    if (game) {
      await importGame(game);
    } else {
      log(`Game not in curated list. Add it first or use --all`, 'yellow');
    }
    return;
  }
  
  // Default: show help
  console.log(`
🎮 FoodSpot Game Scraper

Usage:
  node game-scraper.js --list              Show curated games
  node game-scraper.js --all               Import all curated games
  node game-scraper.js --all --category=bar Import only bar games
  node game-scraper.js --repo=owner/repo   Import specific repo

Categories: bar, arcade, sports, classic, addictive
`);
}

main().catch(console.error);
