// game.js - "Zen Tea Sort: Master Edition" (Bug Free)
// V2.6 - Fixed Logic, Robust Animation, Proper State Management
// Engineer: Jason

const systemInfo = tt.getSystemInfoSync();
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');

// --- 1. Configuration ---
const CONFIG = {
    COLORS: [
        'transparent',
        '#FF5252', '#448AFF', '#69F0AE', '#FFD740', 
        '#E040FB', '#FF6E40', '#607D8B', '#795548', '#FF4081'
    ],
    TUBE_WIDTH: 60,
    TUBE_HEIGHT: 240,
    TUBE_GAP: 25,
    MAX_CAPACITY: 4
};

// Canvas Setup
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// --- 2. Audio ---
const AUDIO = {
    bgm: tt.createInnerAudioContext(),
    select: tt.createInnerAudioContext(),
    pour: tt.createInnerAudioContext(),
    win: tt.createInnerAudioContext(),
    isPlaying: false,
    
    init: function() {
        this.bgm.src = 'audio/bgm.mp3';
        this.bgm.loop = true;
        this.select.src = 'audio/select.mp3';
        this.pour.src = 'audio/pour.mp3';
        this.win.src = 'audio/win.mp3';
    },
    
    play: function(name) {
        if (name === 'bgm') {
            if (!this.isPlaying) {
                this.bgm.play();
                this.isPlaying = true;
            }
            return;
        }
        if (this[name]) {
            this[name].stop();
            this[name].play();
        }
        if (name === 'select') tt.vibrateShort();
        if (name === 'win') tt.vibrateLong();
    }
};
AUDIO.init();

// --- 3. Visuals ---
const VISUALS = {
    drawTube: function(x, y, w, h, colors, isSelected) {
        const segmentH = h / CONFIG.MAX_CAPACITY;
        const rx = w / 2;          // x-radius
        const bottomCY = y + h;    // bottom ellipse center Y

        // --- Clip: Rounded Bottom ---
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 4, y + h - rx);
        ctx.quadraticCurveTo(x + 4, bottomCY, x + rx, bottomCY);
        ctx.quadraticCurveTo(x + w - 4, bottomCY, x + w - 4, y + h - rx);
        ctx.lineTo(x + w - 4, y);
        ctx.closePath();
        ctx.clip();

        // --- Liquid Layers ---
        for (let i = 0; i < colors.length; i++) {
            const colorIdx = colors[i];
            if (!colorIdx) continue;
            const hex = CONFIG.COLORS[colorIdx];
            const ly = y + h - (i + 1) * segmentH;

            ctx.fillStyle = hex;
            ctx.fillRect(x + 4, ly, w - 8, segmentH);

            // Highlight Top Edge
            const gradient = ctx.createLinearGradient(x, ly, x, ly + segmentH * 0.3);
            gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x + 4, ly, w - 8, segmentH * 0.35);
        }
        ctx.restore();

        // --- Glass Outline ---
        ctx.save();
        ctx.strokeStyle = isSelected
            ? '#FFD700'
            : 'rgba(180, 220, 255, 0.55)';
        ctx.lineWidth = isSelected ? 3.5 : 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h - rx);
        ctx.quadraticCurveTo(x, bottomCY, x + rx, bottomCY);
        ctx.quadraticCurveTo(x + w, bottomCY, x + w, y + h - rx);
        ctx.lineTo(x + w, y);
        ctx.stroke();
        ctx.restore();

        // --- Rim ---
        ctx.save();
        ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(180,220,255,0.55)';
        ctx.lineWidth = isSelected ? 3.5 : 2;
        ctx.beginPath();
        ctx.ellipse(x + rx, y, rx, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // --- Glass Shine (Left) ---
        const shine = ctx.createLinearGradient(x, y, x + w * 0.35, y);
        shine.addColorStop(0, 'rgba(255,255,255,0.0)');
        shine.addColorStop(0.4, 'rgba(255,255,255,0.22)');
        shine.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w * 0.35, h);
        ctx.clip();
        ctx.fillStyle = shine;
        ctx.fillRect(x, y, w * 0.35, h);
        ctx.restore();

        // Selected Glow
        if (isSelected) {
            ctx.save();
            const glow = ctx.createRadialGradient(x+rx, bottomCY, 0, x+rx, bottomCY, rx*2);
            glow.addColorStop(0, 'rgba(255,215,0,0.4)');
            glow.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x - rx, bottomCY - rx, w + rx*2, rx*2);
            ctx.restore();
        }
    },

    drawStream: function(sx, sy, ex, ey, color) {
        // Main Stream (Thick)
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const cpX = sx * 0.3 + ex * 0.7;
        const cpY = (sy + ey) / 2 - 40;
        ctx.quadraticCurveTo(cpX, cpY, ex, ey);
        ctx.lineWidth = 10;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.stroke();

        // Highlight (Thin)
        ctx.beginPath();
        ctx.moveTo(sx + 3, sy);
        ctx.quadraticCurveTo(cpX + 3, cpY, ex + 3, ey);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Splash Particles
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 12;
            ctx.beginPath();
            ctx.arc(
                ex + Math.cos(angle)*dist,
                ey + Math.sin(angle)*dist * 0.5,
                Math.random()*3 + 1, 0, Math.PI*2
            );
            ctx.fillStyle = color;
            ctx.globalAlpha = Math.random() * 0.7 + 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
};

// --- 4. Engine ---
class GameEngine {
    constructor() {
        this.level = 1;
        this.tubes = [];
        this.history = [];
        this.selectedTube = -1;
        
        this.anim = {
            active: false,
            source: -1,
            target: -1,
            colorId: 0, // Store INT ID
            colorHex: '', // Store HEX for draw
            moveCount: 0,
            phase: 'IDLE',
            progress: 0,
            x: 0, y: 0, angle: 0
        };

        this.initLevel(1);
    }

    initLevel(level) {
        this.level = level;
        this.history = [];
        this.selectedTube = -1;
        this.anim.active = false;

        const numColors = Math.min(3 + Math.floor((level - 1) / 2), 9);
        const numEmpty = 2;
        const numTubes = numColors + numEmpty;

        // Create Sorted
        let state = [];
        for (let i = 1; i <= numColors; i++) {
            state.push(Array(4).fill(i));
        }
        for (let i = 0; i < numEmpty; i++) {
            state.push([]);
        }

        // Shuffle (Reverse Moves)
        const moves = 50 + level * 20;
        for (let m = 0; m < moves; m++) {
            let srcIdx = Math.floor(Math.random() * numTubes);
            if (state[srcIdx].length === 0) continue;
            
            let destIdx = Math.floor(Math.random() * numTubes);
            if (srcIdx === destIdx) continue;
            if (state[destIdx].length >= 4) continue;
            
            const color = state[srcIdx].pop();
            state[destIdx].push(color);
        }
        
        this.tubes = state;
        AUDIO.play('bgm');
    }

    saveState() {
        // Deep copy needed
        const snapshot = this.tubes.map(t => [...t]);
        this.history.push(snapshot);
        if (this.history.length > 10) this.history.shift();
    }

    undo() {
        if (this.anim.active) return;
        if (this.history.length > 0) {
            this.tubes = this.history.pop();
            this.selectedTube = -1;
            tt.vibrateShort();
        }
    }

    checkWin() {
        const solved = this.tubes.every(tube =>
            tube.length === 0 ||
            (tube.length === CONFIG.MAX_CAPACITY && tube.every(c => c === tube[0]))
        );
        
        if (solved) {
            AUDIO.play('win');
            tt.showModal({
                title: '好茶！',
                content: `恭喜通过第 ${this.level} 品。`,
                confirmText: '下一品',
                showCancel: false,
                success: () => this.initLevel(this.level + 1)
            });
        }
    }

    // --- Layout Logic (Fixed) ---
    getLayout() {
        const num = this.tubes.length;
        const rows = num > 5 ? 2 : 1;
        const cols = Math.ceil(num / rows);
        
        const availW = canvas.width - 40;
        const maxTubeW = (availW - (cols - 1) * CONFIG.TUBE_GAP) / cols;
        const tubeW = Math.min(Math.max(maxTubeW, 40), 70);
        const tubeH = tubeW * 3.5;
        
        const totalW = cols * tubeW + (cols - 1) * CONFIG.TUBE_GAP;
        const startX = (canvas.width - totalW) / 2;
        
        const totalH = rows * tubeH + (rows - 1) * 80;
        const startY = (canvas.height - totalH) / 2 + 40;

        let positions = [];
        for (let i = 0; i < num; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            
            let rowOffsetX = 0;
            // Center last row
            if (r === rows - 1) {
                const itemsInLastRow = num - (r * cols);
                if (itemsInLastRow < cols) {
                    const lastRowW = itemsInLastRow * tubeW + (itemsInLastRow - 1) * CONFIG.TUBE_GAP;
                    rowOffsetX = (totalW - lastRowW) / 2;
                }
            }

            positions.push({
                x: startX + c * (tubeW + CONFIG.TUBE_GAP) + rowOffsetX,
                y: startY + r * (tubeH + 80),
                w: tubeW,
                h: tubeH
            });
        }
        return positions;
    }

    handleTouch(x, y) {
        if (this.anim.active) return;

        // UI
        if (y > canvas.height - 100) {
            if (x < canvas.width / 3) this.undo();
            else if (x > canvas.width * 2/3) this.initLevel(this.level);
            return;
        }

        const layout = this.getLayout();
        for (let i = 0; i < this.tubes.length; i++) {
            const pos = layout[i];
            if (x >= pos.x && x <= pos.x + pos.w &&
                y >= pos.y && y <= pos.y + pos.h) {
                this.handleTubeClick(i);
                return;
            }
        }
    }

    handleTubeClick(idx) {
        if (this.selectedTube === -1) {
            if (this.tubes[idx].length > 0) {
                this.selectedTube = idx;
                AUDIO.play('select');
            }
        } else {
            if (this.selectedTube === idx) {
                this.selectedTube = -1;
            } else {
                this.tryMove(this.selectedTube, idx);
            }
        }
    }

    tryMove(from, to) {
        const src = this.tubes[from];
        const dest = this.tubes[to];

        if (dest.length >= CONFIG.MAX_CAPACITY) {
            this.selectedTube = -1;
            return;
        }

        const colorId = src[src.length - 1]; // Top color ID
        
        // Valid Move?
        if (dest.length === 0 || dest[dest.length - 1] === colorId) {
            
            // Count layers
            let moveCount = 0;
            for (let i = src.length - 1; i >= 0; i--) {
                if (src[i] === colorId) moveCount++;
                else break;
            }
            // Cap by space
            moveCount = Math.min(moveCount, CONFIG.MAX_CAPACITY - dest.length);

            // Save State
            this.saveState();

            // Init Animation
            this.anim.active = true;
            this.anim.source = from;
            this.anim.target = to;
            this.anim.colorId = colorId;
            this.anim.colorHex = CONFIG.COLORS[colorId];
            this.anim.moveCount = moveCount;
            this.anim.phase = 'MOVING_UP';
            this.anim.progress = 0;
            
            this.selectedTube = -1;
            
        } else {
            this.selectedTube = -1;
            tt.vibrateShort();
        }
    }

    update() {
        if (!this.anim.active) return;

        const layout = this.getLayout();
        const srcPos = layout[this.anim.source];
        const destPos = layout[this.anim.target];
        
        const targetX = destPos.x + (destPos.w - srcPos.w)/2 - 10; // Slightly left
        const targetY = destPos.y - 60; // Above

        if (this.anim.phase === 'MOVING_UP') {
            this.anim.progress += 0.1;
            this.anim.x = srcPos.x + (targetX - srcPos.x) * this.anim.progress;
            this.anim.y = srcPos.y + (targetY - srcPos.y) * this.anim.progress;
            this.anim.angle = (Math.PI / 4) * this.anim.progress; // 45 deg

            if (this.anim.progress >= 1) {
                this.anim.phase = 'POURING';
                this.anim.progress = 0;
                AUDIO.play('pour');
            }
        }
        else if (this.anim.phase === 'POURING') {
            this.anim.progress += 0.05;
            this.anim.angle = Math.PI / 2.5; // Steeper

            if (this.anim.progress >= 1) {
                // --- COMMIT DATA ---
                for (let k = 0; k < this.anim.moveCount; k++) {
                    this.tubes[this.anim.source].pop();
                    this.tubes[this.anim.target].push(this.anim.colorId);
                }
                
                this.anim.phase = 'MOVING_BACK';
                this.anim.progress = 0;
            }
        }
        else if (this.anim.phase === 'MOVING_BACK') {
            this.anim.progress += 0.1;
            this.anim.x = targetX + (srcPos.x - targetX) * this.anim.progress;
            this.anim.y = targetY + (srcPos.y - targetY) * this.anim.progress;
            this.anim.angle = (Math.PI / 2.5) * (1 - this.anim.progress);

            if (this.anim.progress >= 1) {
                this.anim.active = false;
                this.checkWin();
            }
        }
    }

    draw() {
        // 1. Background
        const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grd.addColorStop(0, '#1B1464'); // Deep Purple-Blue
        grd.addColorStop(1, '#2E0854'); // Darker Purple
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Stars
        if (!this.stars) {
            this.stars = Array.from({length: 80}, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3
            }));
        }
        this.stars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
            ctx.fill();
        });

        // 2. Title
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`第 ${this.level} 品`, canvas.width / 2, 80);

        const layout = this.getLayout();
        
        // Draw Static Tubes
        for (let i = 0; i < this.tubes.length; i++) {
            if (this.anim.active && this.anim.source === i) continue; // Skip animating one

            const pos = layout[i];
            let drawY = pos.y;
            if (i === this.selectedTube) drawY -= 30;

            VISUALS.drawTube(pos.x, drawY, pos.w, pos.h, this.tubes[i], i === this.selectedTube);
        }

        // Draw Animating Tube
        if (this.anim.active) {
            ctx.save();
            const w = layout[this.anim.source].w;
            const h = layout[this.anim.source].h;
            
            ctx.translate(this.anim.x + w/2, this.anim.y);
            ctx.rotate(this.anim.angle);
            
            VISUALS.drawTube(-w/2, 0, w, h, this.tubes[this.anim.source], true);
            ctx.restore();

            // Stream
            if (this.anim.phase === 'POURING') {
                const destPos = layout[this.anim.target];
                const spoutX = this.anim.x + w * Math.cos(this.anim.angle);
                const spoutY = this.anim.y + w * Math.sin(this.anim.angle);

                VISUALS.drawStream(
                    spoutX, spoutY,
                    destPos.x + destPos.w/2, destPos.y + 20,
                    this.anim.colorHex
                );
            }
        }

        // Particles
        this._updateParticles();
        this._drawParticles();

        // UI
        const btnY = canvas.height - 60;
        ctx.fillStyle = '#FFF';
        ctx.font = '24px Arial';
        ctx.fillText("⟲ 悔棋", canvas.width * 0.25, btnY);
        ctx.fillText("↻ 重置", canvas.width * 0.75, btnY);
    }

    // Particle System
    _spawnParticles() {
        if (!this.particles) this.particles = [];
        const colors = ['#FF5252','#FFD740','#69F0AE','#448AFF','#E040FB','#FF6E40','#FF4081'];
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                size: Math.random() * 6 + 3,
                shape: Math.random() > 0.5 ? 'circle' : 'rect'
            });
        }
    }

    _updateParticles() {
        if (!this.particles) return;
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // gravity
            p.life -= 0.018;
            p.vx *= 0.98;
        });
    }

    _drawParticles() {
        if (!this.particles) return;
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                ctx.fill();
            } else {
                ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size * 0.5);
            }
            ctx.restore();
        });
    }
}

// Loop
const game = new GameEngine();
function loop() {
    game.update();
    game.draw();
    requestAnimationFrame(loop);
}

// Input
tt.onTouchStart((e) => {
    const t = e.touches[0];
    game.handleTouch(t.clientX, t.clientY);
});

loop();
