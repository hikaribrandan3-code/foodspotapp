/**
 * FoodSpot Game Launcher
 * 
 * Integrates with TikTok-style scroll interface.
 * Each card shows game cover + info, tap PLAY to launch.
 */

class GameLauncher {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      onGameStart: () => {},
      onGameExit: () => {},
      onScoreUpdate: () => {},
      ...options
    };
    
    this.registry = null;
    this.currentGame = null;
    this.iframe = null;
    
    // Listen for messages from games
    window.addEventListener('message', this.handleGameMessage.bind(this));
  }

  // Load game registry
  async loadRegistry() {
    const res = await fetch('game-registry.json');
    this.registry = await res.json();
    return this.registry;
  }

  // Render game cards for TikTok scroll
  renderGameCards() {
    if (!this.registry) return;

    const cards = this.registry.games.map(game => `
      <div class="game-card" data-game-id="${game.id}">
        <div class="game-cover">
          <img src="${game.cover}" alt="${game.title}" loading="lazy" />
          <div class="game-overlay">
            <span class="category-badge" style="background: ${this.getCategoryColor(game.category)}">
              ${game.category}
            </span>
            <h3>${game.title}</h3>
            <p>${game.description}</p>
            <button class="play-btn" onclick="launcher.launch('${game.id}')">
              ▶ PLAY
            </button>
          </div>
        </div>
        <div class="game-info">
          <div class="tags">
            ${game.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = cards;
  }

  getCategoryColor(category) {
    const colors = {
      bar: '#8B4513',
      arcade: '#FF006E',
      classic: '#FB5607',
      addictive: '#FF006E',
      sports: '#38B000'
    };
    return colors[category] || '#666';
  }

  // Launch a game in fullscreen iframe
  launch(gameId) {
    const game = this.registry.games.find(g => g.id === gameId);
    if (!game) {
      console.error('Game not found:', gameId);
      return;
    }

    this.currentGame = game;
    this.options.onGameStart(game);

    // Create fullscreen container
    const overlay = document.createElement('div');
    overlay.id = 'game-overlay';
    overlay.className = 'game-overlay-fullscreen';
    
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = game.integration.path;
    this.iframe.allowFullscreen = true;
    this.iframe.sandbox = 'allow-scripts allow-same-origin allow-popups';
    
    overlay.appendChild(this.iframe);
    document.body.appendChild(overlay);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Handle messages from game iframe
  handleGameMessage(event) {
    const { type, gameId, score } = event.data;
    
    switch (type) {
      case 'GAME_READY':
        console.log('Game ready:', gameId);
        break;
        
      case 'GAME_EXIT':
        this.closeGame();
        break;
        
      case 'SCORE_UPDATE':
        this.options.onScoreUpdate(gameId, score);
        break;
        
      case 'GAME_OVER':
        this.saveHighScore(gameId, score);
        break;
    }
  }

  // Close current game
  closeGame() {
    const overlay = document.getElementById('game-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    this.iframe = null;
    document.body.style.overflow = '';
    
    if (this.currentGame) {
      this.options.onGameExit(this.currentGame);
      this.currentGame = null;
    }
  }

  // Save high score to localStorage
  saveHighScore(gameId, score) {
    const key = `foodspot-highscore-${gameId}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    if (score > current) {
      localStorage.setItem(key, score);
      console.log(`New high score for ${gameId}: ${score}`);
    }
  }

  // Get high score
  getHighScore(gameId) {
    return parseInt(localStorage.getItem(`foodspot-highscore-${gameId}`) || '0');
  }

  // Filter games by category
  filterByCategory(categoryId) {
    const cards = this.container.querySelectorAll('.game-card');
    cards.forEach(card => {
      const gameId = card.dataset.gameId;
      const game = this.registry.games.find(g => g.id === gameId);
      if (categoryId === 'all' || game.category === categoryId) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }
}

// Export for use
if (typeof module !== 'undefined') {
  module.exports = GameLauncher;
}
