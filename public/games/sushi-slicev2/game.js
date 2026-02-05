// ============================================
// SUSHI SLICE - One-Tap Mobile Timing Game
// With 3-Level Progression & 5 Sushi Types
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ============================================
// CONSTANTS & COLOR PALETTE
// ============================================
const COLORS = {
    mint: '#9FD5D1', salmon: '#F5A3A3', lavender: '#C5B8D9', sky: '#87CEEB', cream: '#FFF8E8',
    rice: '#FFFEF0', nori: '#2D4A3E', outline: '#2D2D2D', comboBurst: '#F5A563',
    sliceLine: '#7DF9FF', conveyorMain: '#6B7B8C', conveyorDark: '#4A5A6A', conveyorLight: '#8A9AAA',
    perfect: '#FFFFFF', good: '#90EE90', bad: '#FF6B6B', soClose: '#FFD700',
    golden: '#FFD700', bonus: '#FF69B4', forgiving: '#98FB98', speed: '#FF4500'
};

// LEVEL DEFINITIONS
const LEVELS = [
    { name: 'TRANQUILO', nameEs: 'Nivel 1: Tranquilo', speedMult: 1.0, spawnMult: 1.0, timingMult: 1.0, bgHue: 0, scoreThreshold: 0 },
    { name: 'RÁPIDO', nameEs: 'Nivel 2: Rápido', speedMult: 1.4, spawnMult: 0.85, timingMult: 0.85, bgHue: 20, scoreThreshold: 800 },
    { name: 'CAOS', nameEs: 'Nivel 3: Caos', speedMult: 1.8, spawnMult: 0.65, timingMult: 0.7, bgHue: 40, scoreThreshold: 2000 }
];

// SUSHI TYPES
const SUSHI_TYPES = {
    standard: { weight: 50, color: '#7FBFBF', points: 100, timingMult: 1.0, speedMult: 1.0, comboBonus: 0, label: '' },
    bonus: { weight: 15, color: '#FF69B4', points: 100, timingMult: 1.0, speedMult: 1.0, comboBonus: 2, label: '+COMBO' },
    forgiving: { weight: 15, color: '#98FB98', points: 80, timingMult: 1.4, speedMult: 0.85, comboBonus: 0, label: 'EASY' },
    speed: { weight: 12, color: '#FF4500', points: 150, timingMult: 0.8, speedMult: 1.6, comboBonus: 0, label: 'FAST' },
    golden: { weight: 8, color: '#FFD700', points: 300, timingMult: 1.0, speedMult: 1.0, comboBonus: 1, label: '★RARE★' }
};

const GAME_DURATION = 20;
const SLICE_LINE_X_RATIO = 0.5;
const BASE_TIMING = { perfect: 15, soClose: 30, good: 50 };
const BASE_SPAWN_INTERVAL = 1.2;

// ============================================
// GAME STATE
// ============================================
let gameState = {
    phase: 'start', hasStartedOnce: false, score: 0, combo: 0, bestCombo: 0, perfectSlices: 0,
    bestScore: 0, gameTime: GAME_DURATION, lastSliceTime: 0, comboDecayWarning: false,
    currentLevel: 0, levelUpAnim: 0, screenFlash: 0, screenFlashColor: 'white',
    conveyorShake: 0, conveyorSpeedMod: 1, vignetteAlpha: 0
};

let sushiList = [], particles = [], sparkles = [], floatingTexts = [], bgTriangles = [], clouds = [];
let sliceLine = { active: true, flickerAlpha: 1, glowIntensity: 1 };
let spawnTimer = 0;

// ============================================
// CANVAS SIZING
// ============================================
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    let width = Math.min(window.innerWidth, 800);
    let height = width / (16 / 9);
    if (height > window.innerHeight) { height = window.innerHeight; width = height * (16 / 9); }
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    return { width, height };
}
let canvasSize = resizeCanvas();
window.addEventListener('resize', () => { canvasSize = resizeCanvas(); initBackground(); });

// ============================================
// BACKGROUND
// ============================================
function initBackground() {
    bgTriangles = [];
    const bgColors = [COLORS.mint, COLORS.salmon, COLORS.lavender, COLORS.sky, '#E8D5E0'];
    for (let i = 0; i < 8; i++) {
        const w = canvasSize.width, h = canvasSize.height, cx = w / 2, cy = h * 0.4;
        const angle = (i / 8) * Math.PI * 2, nextAngle = ((i + 1) / 8) * Math.PI * 2, r = Math.max(w, h);
        bgTriangles.push({
            points: [{ x: cx, y: cy }, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }, { x: cx + Math.cos(nextAngle) * r, y: cy + Math.sin(nextAngle) * r }],
            color: bgColors[i % bgColors.length], drift: Math.random() * 0.2 - 0.1, rotation: 0
        });
    }
    clouds = [{ x: canvasSize.width * 0.1, y: canvasSize.height * 0.12, scale: 0.8 }, { x: canvasSize.width * 0.85, y: canvasSize.height * 0.08, scale: 1 }, { x: canvasSize.width * 0.6, y: canvasSize.height * 0.15, scale: 0.6 }];
}
initBackground();

// ============================================
// SUSHI CLASS
// ============================================
function pickSushiType() {
    const types = Object.entries(SUSHI_TYPES);
    const totalWeight = types.reduce((sum, [, t]) => sum + t.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const [name, type] of types) { rand -= type.weight; if (rand <= 0) return name; }
    return 'standard';
}

class Sushi {
    constructor() {
        this.sushiType = pickSushiType();
        const typeData = SUSHI_TYPES[this.sushiType];
        const level = LEVELS[gameState.currentLevel];
        this.type = Math.random() > 0.4 ? 'maki' : 'nigiri';
        this.x = -80; this.y = canvasSize.height * 0.52;
        this.width = this.type === 'nigiri' ? 90 : 70; this.height = 70;
        this.baseSpeed = 2.5 + Math.random() * 0.5;
        this.speed = this.baseSpeed * level.speedMult * typeData.speedMult;
        this.sliced = false; this.sliceGap = 0;
        this.fillColor = typeData.color;
        this.blushIntensity = 0.3 + Math.random() * 0.5;
        this.faceOffsetX = (Math.random() - 0.5) * 4; this.faceOffsetY = (Math.random() - 0.5) * 2;
        this.winking = false; this.glowPulse = 0;
    }

    getTimingZones() {
        const level = LEVELS[gameState.currentLevel];
        const typeData = SUSHI_TYPES[this.sushiType];
        const mult = level.timingMult * typeData.timingMult;
        return { perfect: BASE_TIMING.perfect * mult, soClose: BASE_TIMING.soClose * mult, good: BASE_TIMING.good * mult };
    }

    update(dt, speedMod = 1) {
        this.glowPulse += dt * 5;
        if (!this.sliced) this.x += this.speed * speedMod * (60 * dt);
        else { this.sliceGap = Math.min(this.sliceGap + 8 * dt * 60, 20); this.x += this.speed * 0.5 * speedMod * (60 * dt); }
    }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y);

        // Special glow for rare types
        if (this.sushiType === 'golden' || this.sushiType === 'bonus') {
            ctx.shadowColor = this.fillColor;
            ctx.shadowBlur = 10 + Math.sin(this.glowPulse) * 5;
        }

        if (this.sliced) { this.drawHalf(-this.sliceGap, true); this.drawHalf(this.sliceGap, false); }
        else this.drawFull();

        ctx.restore();
    }

    drawFull() {
        if (this.type === 'maki') this.drawMaki(0, 0, this.width, this.height, true);
        else this.drawNigiri(0, 0, this.width, this.height, true);
    }

    drawHalf(offsetX, isLeft) {
        ctx.save(); ctx.translate(offsetX, 0);
        ctx.beginPath();
        if (isLeft) ctx.rect(-this.width, -this.height, this.width, this.height * 2);
        else ctx.rect(0, -this.height, this.width, this.height * 2);
        ctx.clip();
        if (this.type === 'maki') this.drawMaki(0, 0, this.width, this.height, !isLeft);
        else this.drawNigiri(0, 0, this.width, this.height, !isLeft);
        ctx.restore();
    }

    drawMaki(x, y, w, h, showFace) {
        ctx.fillStyle = COLORS.nori; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 3;
        roundRect(x - w / 2, y - h / 2, w, h, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = COLORS.rice; roundRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12, 4); ctx.fill();
        ctx.fillStyle = this.fillColor;
        ctx.beginPath(); ctx.ellipse(x, y, w * 0.25, h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 2; ctx.stroke();
        if (showFace) this.drawFace(x + this.faceOffsetX, y - 5 + this.faceOffsetY);
    }

    drawNigiri(x, y, w, h, showFace) {
        ctx.fillStyle = COLORS.rice; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, y + 5, w * 0.45, h * 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = this.fillColor;
        ctx.beginPath(); ctx.ellipse(x, y - 8, w * 0.48, h * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - 10); ctx.quadraticCurveTo(x, y - 15, x + w * 0.3, y - 10); ctx.stroke();
        if (showFace) this.drawFace(x + this.faceOffsetX, y + 8 + this.faceOffsetY);
    }

    drawFace(x, y) {
        ctx.fillStyle = `rgba(255,150,150,${this.blushIntensity})`;
        ctx.beginPath(); ctx.ellipse(x - 12, y + 3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 12, y + 3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.outline;
        if (this.winking) {
            ctx.beginPath(); ctx.moveTo(x - 12, y - 2); ctx.lineTo(x - 6, y); ctx.lineTo(x - 12, y + 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + 8, y, 3, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(x - 8, y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 8, y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y + 5, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    }
}

// ============================================
// PARTICLES
// ============================================
class Particle {
    constructor(x, y, type = 'rice') {
        this.x = x; this.y = y; this.type = type;
        this.vx = (Math.random() - 0.5) * 8; this.vy = -Math.random() * 6 - 2;
        this.gravity = 0.3; this.life = 1; this.decay = 0.02 + Math.random() * 0.02;
        this.rotation = Math.random() * Math.PI * 2; this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        this.size = type === 'rice' ? 4 + Math.random() * 3 : 8 + Math.random() * 4;
    }
    update(dt) {
        this.x += this.vx * dt * 60; this.y += this.vy * dt * 60;
        this.vy += this.gravity * dt * 60; this.rotation += this.rotationSpeed * dt * 60;
        this.life -= this.decay * dt * 60;
    }
    draw() {
        if (this.life <= 0) return;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation); ctx.globalAlpha = this.life;
        ctx.fillStyle = COLORS.rice; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
    }
}

class Sparkle {
    constructor(x, y, color = COLORS.perfect) {
        this.x = x; this.y = y; this.color = color;
        this.size = 10 + Math.random() * 10; this.life = 1; this.decay = 0.03 + Math.random() * 0.02;
        this.rotation = Math.random() * Math.PI * 0.5;
        this.vx = (Math.random() - 0.5) * 3; this.vy = (Math.random() - 0.5) * 3 - 1;
    }
    update(dt) {
        this.x += this.vx * dt * 60; this.y += this.vy * dt * 60;
        this.life -= this.decay * dt * 60; this.rotation += 0.05 * dt * 60;
    }
    draw() {
        if (this.life <= 0) return;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation); ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color; ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2, outerX = Math.cos(angle) * this.size, outerY = Math.sin(angle) * this.size;
            const innerAngle = angle + Math.PI / 4, innerX = Math.cos(innerAngle) * (this.size * 0.3), innerY = Math.sin(innerAngle) * (this.size * 0.3);
            if (i === 0) ctx.moveTo(outerX, outerY); else ctx.lineTo(outerX, outerY);
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.life = 1; this.decay = 0.025; this.scale = 0.5; this.targetScale = 1;
    }
    update(dt) { this.y -= 1.5 * dt * 60; this.life -= this.decay * dt * 60; this.scale += (this.targetScale - this.scale) * 0.2; }
    draw() {
        if (this.life <= 0) return;
        ctx.save(); ctx.translate(this.x, this.y); ctx.scale(this.scale, this.scale); ctx.globalAlpha = this.life;
        ctx.font = 'bold 28px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 4; ctx.strokeText(this.text, 0, 0);
        ctx.fillStyle = this.color; ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

// ============================================
// SPAWNING & LEVEL CHECK
// ============================================
function spawnSushi() { sushiList.push(new Sushi()); }

function updateSpawning(dt) {
    const level = LEVELS[gameState.currentLevel];
    let spawnInterval = BASE_SPAWN_INTERVAL * level.spawnMult;
    if (gameState.gameTime <= 3) spawnInterval *= 0.8;
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) { spawnTimer = 0; spawnSushi(); }
}

function checkLevelUp() {
    const newLevel = LEVELS.findIndex((l, i) => i === LEVELS.length - 1 || gameState.score < LEVELS[i + 1].scoreThreshold);
    if (newLevel > gameState.currentLevel) {
        gameState.currentLevel = newLevel;
        gameState.levelUpAnim = 1;
        gameState.screenFlash = 0.3;
        gameState.screenFlashColor = LEVELS[newLevel].name === 'CAOS' ? '#FF4500' : '#FFD700';
        floatingTexts.push(new FloatingText(canvasSize.width / 2, canvasSize.height / 2 - 50, LEVELS[newLevel].nameEs, COLORS.golden));
    }
}

// ============================================
// SLICE DETECTION
// ============================================
function attemptSlice() {
    if (gameState.phase !== 'playing') return;
    const sliceX = canvasSize.width * SLICE_LINE_X_RATIO;
    let slicedAny = false;

    for (const sushi of sushiList) {
        if (sushi.sliced) continue;
        const distance = Math.abs(sushi.x - sliceX);
        const zones = sushi.getTimingZones();
        const typeData = SUSHI_TYPES[sushi.sushiType];

        if (distance <= zones.good) {
            sushi.sliced = true; slicedAny = true;
            let result, points, color;

            if (distance <= zones.perfect) {
                result = 'PERFECT!'; points = typeData.points; color = COLORS.perfect;
                gameState.combo += 1 + typeData.comboBonus; gameState.perfectSlices++; sushi.winking = true;
                spawnPerfectEffects(sushi.x, sushi.y, sushi.fillColor);
                gameState.screenFlash = 0.15; gameState.screenFlashColor = 'white'; gameState.conveyorShake = 2;
            } else if (distance <= zones.soClose) {
                result = 'SO CLOSE!'; points = Math.floor(typeData.points * 0.5); color = COLORS.soClose;
                gameState.combo += 1 + typeData.comboBonus;
                spawnSoCloseEffects(sushi.x, sushi.y, sushi.fillColor); gameState.conveyorShake = 1;
            } else {
                result = 'GOOD'; points = Math.floor(typeData.points * 0.5); color = COLORS.good;
                gameState.combo += 1 + typeData.comboBonus;
            }

            // Type label on special sushi
            if (typeData.label) floatingTexts.push(new FloatingText(sushi.x, sushi.y - 100, typeData.label, sushi.fillColor));

            const finalPoints = points * Math.max(1, gameState.combo);
            gameState.score += finalPoints;
            gameState.bestCombo = Math.max(gameState.bestCombo, gameState.combo);
            gameState.lastSliceTime = Date.now(); gameState.comboDecayWarning = false;

            floatingTexts.push(new FloatingText(sushi.x, sushi.y - 40, result, color));
            floatingTexts.push(new FloatingText(sushi.x, sushi.y - 70, `+${finalPoints}`, color));

            checkLevelUp();
            break;
        }
    }

    if (!slicedAny) {
        const closestSushi = sushiList.find(s => !s.sliced);
        if (closestSushi && Math.abs(closestSushi.x - canvasSize.width * SLICE_LINE_X_RATIO) <= 150) {
            gameState.combo = 0; gameState.vignetteAlpha = 0.3; gameState.conveyorSpeedMod = 1.3;
            floatingTexts.push(new FloatingText(canvasSize.width / 2, canvasSize.height / 2, 'MISS!', COLORS.bad));
        }
    }
}

function spawnPerfectEffects(x, y, color) {
    for (let i = 0; i < 8; i++) sparkles.push(new Sparkle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, color === COLORS.golden ? color : COLORS.perfect));
    for (let i = 0; i < 12; i++) particles.push(new Particle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, 'rice'));
}

function spawnSoCloseEffects(x, y, color) {
    for (let i = 0; i < 4; i++) sparkles.push(new Sparkle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, color));
}

// ============================================
// COMBO DECAY
// ============================================
function updateComboDecay() {
    if (gameState.combo === 0) { gameState.comboDecayWarning = false; return; }
    const timeSinceSlice = Date.now() - gameState.lastSliceTime;
    if (timeSinceSlice > 2500) { gameState.combo = 0; gameState.comboDecayWarning = false; }
    else if (timeSinceSlice > 1500) gameState.comboDecayWarning = true;
    else gameState.comboDecayWarning = false;
}

// ============================================
// DRAWING
// ============================================
function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawBackground() {
    const hueShift = LEVELS[gameState.currentLevel].bgHue;
    for (const tri of bgTriangles) {
        tri.rotation += tri.drift * 0.001;
        ctx.save(); ctx.translate(canvasSize.width / 2, canvasSize.height * 0.4); ctx.rotate(tri.rotation); ctx.translate(-canvasSize.width / 2, -canvasSize.height * 0.4);
        ctx.fillStyle = tri.color; ctx.filter = `hue-rotate(${hueShift}deg)`;
        ctx.beginPath(); ctx.moveTo(tri.points[0].x, tri.points[0].y); ctx.lineTo(tri.points[1].x, tri.points[1].y); ctx.lineTo(tri.points[2].x, tri.points[2].y); ctx.closePath(); ctx.fill();
        ctx.filter = 'none'; ctx.restore();
    }
}

function drawClouds() {
    for (const cloud of clouds) {
        ctx.save(); ctx.translate(cloud.x, cloud.y); ctx.scale(cloud.scale, cloud.scale);
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-20, 0, 20, 0, Math.PI * 2); ctx.arc(0, -10, 25, 0, Math.PI * 2); ctx.arc(25, 0, 22, 0, Math.PI * 2); ctx.arc(10, 5, 18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function drawConveyor() {
    const y = canvasSize.height * 0.68, height = 60, shakeX = gameState.conveyorShake * (Math.random() - 0.5);
    ctx.save(); ctx.translate(shakeX, 0);
    ctx.fillStyle = COLORS.conveyorMain; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 3;
    roundRect(0, y, canvasSize.width, height, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COLORS.conveyorDark;
    const stripeWidth = 20, stripeGap = 40, time = Date.now() * 0.05 * gameState.conveyorSpeedMod * LEVELS[gameState.currentLevel].speedMult;
    for (let x = -stripeWidth + (time % stripeGap); x < canvasSize.width + stripeWidth; x += stripeGap) ctx.fillRect(x, y + 5, stripeWidth, height - 10);
    ctx.fillStyle = COLORS.conveyorLight; ctx.fillRect(0, y, canvasSize.width, 4);
    ctx.fillStyle = COLORS.conveyorDark; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 2;
    for (let rx = 40; rx < canvasSize.width; rx += 80) {
        ctx.beginPath(); ctx.arc(rx, y + height + 10, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = COLORS.conveyorMain; ctx.beginPath(); ctx.arc(rx, y + height + 10, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = COLORS.conveyorDark;
    }
    ctx.restore();
}

function drawSliceLine() {
    if (!sliceLine.active) return;
    const x = canvasSize.width * SLICE_LINE_X_RATIO, topY = canvasSize.height * 0.2, bottomY = canvasSize.height * 0.75;
    let glowIntensity = sliceLine.glowIntensity;
    if (gameState.gameTime <= 3) glowIntensity = 1 + Math.sin(Date.now() * 0.01) * 0.3;
    if (gameState.currentLevel === 2) glowIntensity *= 1.3;

    const gradient = ctx.createLinearGradient(x, topY - 80, x, topY + 50);
    gradient.addColorStop(0, 'rgba(125, 249, 255, 0)');
    gradient.addColorStop(0.5, `rgba(125, 249, 255, ${0.2 * glowIntensity})`);
    gradient.addColorStop(1, `rgba(125, 249, 255, ${0.4 * glowIntensity})`);
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(x - 60, topY - 50); ctx.lineTo(x + 60, topY - 50); ctx.lineTo(x, bottomY); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = COLORS.sliceLine; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.globalAlpha = sliceLine.flickerAlpha;
    ctx.shadowColor = COLORS.sliceLine; ctx.shadowBlur = 15 * glowIntensity;
    ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, bottomY); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawUI() {
    // Level indicator (top left corner)
    const levelData = LEVELS[gameState.currentLevel];
    ctx.fillStyle = gameState.currentLevel === 2 ? '#FF4500' : (gameState.currentLevel === 1 ? COLORS.comboBurst : COLORS.mint);
    ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 2;
    roundRect(10, 10, 100, 28, 14); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 14px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.outline;
    ctx.fillText(levelData.name, 60, 28);

    // Score bubble
    const scoreX = canvasSize.width / 2, scoreY = 35;
    ctx.fillStyle = COLORS.cream; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 3;
    roundRect(scoreX - 80, scoreY - 20, 160, 40, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COLORS.outline; ctx.fillRect(scoreX - 30, 0, 60, 18); roundRect(scoreX - 35, 12, 70, 10, 3); ctx.fill();
    ctx.font = 'bold 22px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.outline; ctx.fillText(`SCORE: ${gameState.score}`, scoreX, scoreY);

    // Combo burst
    if (gameState.combo > 0) {
        const x = canvasSize.width - 60, y = 50;
        ctx.save();
        if (gameState.comboDecayWarning) ctx.translate(Math.sin(Date.now() * 0.02) * 3, 0);
        if (gameState.gameTime <= 3) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10; }
        ctx.fillStyle = COLORS.comboBurst; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 24; i++) { const angle = (i / 24) * Math.PI * 2 - Math.PI / 2, r = i % 2 === 0 ? 40 : 30, px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        if (gameState.comboDecayWarning) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
        ctx.font = 'bold 11px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.outline; ctx.fillText('COMBO:', x, y - 8);
        ctx.font = 'bold 18px Arial, sans-serif'; ctx.fillText(`x${gameState.combo}`, x, y + 12);
        ctx.restore();
    }

    // Timer bar
    const barWidth = canvasSize.width * 0.6, barHeight = 8, bx = (canvasSize.width - barWidth) / 2, by = canvasSize.height - 25;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(bx, by, barWidth, barHeight, 4); ctx.fill();
    const progress = gameState.gameTime / GAME_DURATION;
    ctx.fillStyle = gameState.gameTime <= 3 ? COLORS.bad : (gameState.gameTime <= 7 ? COLORS.comboBurst : COLORS.mint);
    roundRect(bx, by, barWidth * progress, barHeight, 4); ctx.fill();
    ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 2; roundRect(bx, by, barWidth, barHeight, 4); ctx.stroke();
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    const centerX = canvasSize.width / 2, centerY = canvasSize.height / 2;
    ctx.fillStyle = COLORS.cream; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 4;
    roundRect(centerX - 120, centerY - 60, 240, 120, 30); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 48px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.comboBurst; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 3;
    ctx.strokeText('SLICE!', centerX, centerY - 10); ctx.fillText('SLICE!', centerX, centerY - 10);
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
    ctx.font = '18px Arial, sans-serif'; ctx.fillStyle = COLORS.outline; ctx.fillText('Tap to start', centerX, centerY + 35);
    ctx.globalAlpha = 1;
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(255,248,232,0.9)'; ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    const centerX = canvasSize.width / 2, centerY = canvasSize.height / 2;
    ctx.font = 'bold 42px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.bad; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 3;
    ctx.strokeText('TIME UP!', centerX, centerY - 80); ctx.fillText('TIME UP!', centerX, centerY - 80);
    ctx.font = 'bold 56px Arial, sans-serif'; ctx.fillStyle = COLORS.outline; ctx.fillText(gameState.score, centerX, centerY);
    ctx.font = '18px Arial, sans-serif'; ctx.fillStyle = COLORS.conveyorDark; ctx.fillText(`Best: ${gameState.bestScore}`, centerX, centerY + 40);
    ctx.font = '16px Arial, sans-serif'; ctx.fillStyle = COLORS.comboBurst;
    ctx.fillText(gameState.bestCombo > gameState.perfectSlices ? `Best Combo: x${gameState.bestCombo}` : `Perfect Slices: ${gameState.perfectSlices}`, centerX, centerY + 70);
    ctx.fillStyle = COLORS.comboBurst; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 4;
    roundRect(centerX - 100, centerY + 100, 200, 55, 27); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 24px Arial, sans-serif'; ctx.fillStyle = COLORS.cream; ctx.strokeStyle = COLORS.outline; ctx.lineWidth = 2;
    ctx.strokeText('SLICE AGAIN', centerX, centerY + 128); ctx.fillText('SLICE AGAIN', centerX, centerY + 128);
}

function drawScreenEffects() {
    if (gameState.screenFlash > 0) {
        ctx.fillStyle = gameState.screenFlashColor === 'white' ? `rgba(255,255,255,${gameState.screenFlash})` : `rgba(255,100,100,${gameState.screenFlash})`;
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
    if (gameState.vignetteAlpha > 0) {
        const gradient = ctx.createRadialGradient(canvasSize.width / 2, canvasSize.height / 2, canvasSize.height * 0.3, canvasSize.width / 2, canvasSize.height / 2, canvasSize.height * 0.8);
        gradient.addColorStop(0, 'rgba(255,0,0,0)'); gradient.addColorStop(1, `rgba(255,0,0,${gameState.vignetteAlpha})`);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
}

// ============================================
// GAME LOOP
// ============================================
let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); lastTime = timestamp;
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    drawBackground(); drawClouds();

    if (gameState.phase === 'start') {
        drawConveyor(); drawSliceLine(); drawStartScreen();
    } else if (gameState.phase === 'playing') {
        gameState.gameTime -= dt;
        if (gameState.gameTime <= 0) endGame();
        updateSpawning(dt); updateComboDecay();
        for (const sushi of sushiList) sushi.update(dt, gameState.conveyorSpeedMod);
        sushiList = sushiList.filter(s => s.x < canvasSize.width + 100);
        for (const p of particles) p.update(dt); particles = particles.filter(p => p.life > 0);
        for (const s of sparkles) s.update(dt); sparkles = sparkles.filter(s => s.life > 0);
        for (const t of floatingTexts) t.update(dt); floatingTexts = floatingTexts.filter(t => t.life > 0);
        gameState.screenFlash *= 0.85; gameState.conveyorShake *= 0.85;
        gameState.conveyorSpeedMod += (1 - gameState.conveyorSpeedMod) * 0.05; gameState.vignetteAlpha *= 0.9;
        gameState.levelUpAnim *= 0.95;
        drawConveyor(); drawSliceLine();
        for (const sushi of sushiList) sushi.draw();
        for (const p of particles) p.draw(); for (const s of sparkles) s.draw(); for (const t of floatingTexts) t.draw();
        drawUI(); drawScreenEffects();
    } else if (gameState.phase === 'gameover') {
        drawConveyor(); for (const sushi of sushiList) sushi.draw(); drawGameOver();
    }
    requestAnimationFrame(gameLoop);
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================
function startGame() {
    gameState.hasStartedOnce = true; gameState.phase = 'playing';
    gameState.score = 0; gameState.combo = 0; gameState.bestCombo = 0; gameState.perfectSlices = 0;
    gameState.gameTime = GAME_DURATION; gameState.lastSliceTime = Date.now(); gameState.currentLevel = 0;
    sushiList = []; particles = []; sparkles = []; floatingTexts = []; spawnTimer = 0;
    sliceLine.active = true; sliceLine.flickerAlpha = 1;
    spawnSushi();
}

function endGame() {
    gameState.phase = 'gameover'; gameState.bestScore = Math.max(gameState.bestScore, gameState.score);
    sliceLine.active = false;
}

function restartGame() {
    gameState.phase = 'playing'; gameState.score = 0; gameState.combo = 0; gameState.bestCombo = 0;
    gameState.perfectSlices = 0; gameState.gameTime = GAME_DURATION; gameState.lastSliceTime = Date.now();
    gameState.currentLevel = 0;
    sushiList = []; particles = []; sparkles = []; floatingTexts = []; spawnTimer = 0;
    sliceLine.active = true; sliceLine.flickerAlpha = 1;
    spawnSushi();
}

// ============================================
// INPUT
// ============================================
function handleTap(e) {
    e.preventDefault();
    if (gameState.phase === 'start') startGame();
    else if (gameState.phase === 'playing') attemptSlice();
    else if (gameState.phase === 'gameover') restartGame();
}
canvas.addEventListener('touchstart', handleTap, { passive: false });
canvas.addEventListener('mousedown', handleTap);
canvas.addEventListener('contextmenu', e => e.preventDefault());

requestAnimationFrame(gameLoop);
