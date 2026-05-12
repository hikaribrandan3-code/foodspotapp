#!/usr/bin/env node
/**
 * Quick Game Downloader
 * Downloads raw files from GitHub repos (no API rate limits)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const GAMES = {
  '2048': { owner: 'gabrielecirulli', repo: '2048', branch: 'master' },
  'tetris': { owner: 'jakesgordon', repo: 'javascript-tetris', branch: 'master' }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✅', path.basename(dest));
        resolve();
      });
    }).on('error', reject);
  });
}

async function downloadSimple(gameId, gameDir) {
  const g = GAMES[gameId];
  if (!g) {
    console.error('Unknown game:', gameId);
    return;
  }
  
  const baseUrl = `https://raw.githubusercontent.com/${g.owner}/${g.repo}/${g.branch}/`;
  
  fs.mkdirSync(gameDir, { recursive: true });
  
  // Download known files for 2048
  if (gameId === '2048') {
    const files = [
      'index.html',
      'style/main.css',
      'js/animframe_polyfill.js',
      'js/application.js',
      'js/bind_polyfill.js',
      'js/classlist_polyfill.js',
      'js/game_manager.js',
      'js/grid.js',
      'js/html_actuator.js',
      'js/keyboard_input_manager.js',
      'js/local_storage_manager.js',
      'js/tile.js',
      'style/fonts/clear-sans.css'
    ];
    
    for (const file of files) {
      const dest = path.join(gameDir, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      try {
        await downloadFile(baseUrl + file, dest);
      } catch (e) {
        console.log('⚠️  Skipped:', file);
      }
    }
  }
  
  // Download known files for tetris
  if (gameId === 'tetris') {
    const files = ['index.html', 'stats.js', 'texture.jpg'];
    for (const file of files) {
      const dest = path.join(gameDir, file);
      try {
        await downloadFile(baseUrl + file, dest);
      } catch (e) {
        console.log('⚠️  Failed:', file, e.message);
      }
    }
  }
  
  // Inject exit button
  injectExitButton(gameDir, gameId);
}

function injectExitButton(gameDir, gameId) {
  const indexPath = path.join(gameDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  
  let html = fs.readFileSync(indexPath, 'utf8');
  
  const exitScript = `
<script>
(function(){
  var btn = document.createElement('button');
  btn.innerHTML = '✕';
  btn.style.cssText = 'position:fixed;top:16px;right:16px;z-index:999999;width:48px;height:48px;border-radius:50%;background:rgba(0,0,0,0.7);border:2px solid rgba(255,255,255,0.3);color:white;font-size:24px;cursor:pointer;';
  btn.onclick = function() { 
    if (window.parent !== window) window.parent.postMessage({type:'GAME_EXIT',gameId:'${gameId}'}, '*');
    else history.back();
  };
  document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(btn); });
})();
</script>`;

  if (!html.includes('GAME_EXIT')) {
    html = html.replace('</body>', exitScript + '</body>');
    fs.writeFileSync(indexPath, html);
    console.log('✅ Exit button injected');
  }
}

// CLI
const gameId = process.argv[2] || '2048';
const gamesDir = path.join(__dirname, '..', 'games');
const gameDir = path.join(gamesDir, gameId);

console.log(`Downloading ${gameId}...\n`);
downloadSimple(gameId, gameDir)
  .then(() => console.log(`\n✨ Done! Game at: ${gameDir}`))
  .catch(console.error);
