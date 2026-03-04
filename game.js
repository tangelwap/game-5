// game.js - "Zen Tea Sort" (茶韵·倒水)
// A high-quality, Chinese-style water sort puzzle game.
// Engineer: Jason

const systemInfo = tt.getSystemInfoSync();
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');

// --- 1. Configuration & Constants ---
const CONFIG = {
    TEA_COLORS: [
        '#00000000', // 0: Empty (Transparent)
        '#8BC34A',   // 1: 龙井 (Longjing - Green)
        '#D32F2F',   // 2: 普洱 (Pu'er - Red)
        '#795548',   // 3: 乌龙 (Oolong - Brown)
        '#FFF176',   // 4: 茉莉 (Jasmine - Yellow)
        '#3E2723',   // 5: 黑茶 (Dark Tea)
        '#9C27B0'    // 6: 芋泥 (Taro - Special)
    ],
    TEA_NAMES: ["", "龙井", "普洱", "乌龙", "茉莉", "黑茶", "芋泥"],
    TUBE_WIDTH: 60,
    TUBE_HEIGHT: 200,
    TUBE_GAP: 20,
    MAX_CAPACITY: 4,
    ANIM_SPEED: 0.15 // Pouring speed
};

// Force Canvas Size
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// --- 2. Assets (Procedural Drawing) ---
// No external images to avoid white screen. We draw "Gaiwan" style cups.

function drawTube(x, y, w, h, colors, isSelected) {
    // 1. Draw Liquid
    const segmentH = h / CONFIG.MAX_CAPACITY;
    for (let i = 0; i < colors.length; i++) {
        const colorIdx = colors[i];
        if (colorIdx === 0) continue;
        
        ctx.fillStyle = CONFIG.TEA_COLORS[colorIdx];
        // Bottom rounded for first segment
        if (i === 0) {
            ctx.beginPath();
            ctx.moveTo(x, y + h - segmentH);
            ctx.lineTo(x, y + h - 10);
            ctx.quadraticCurveTo(x + w/2, y + h + 10, x + w, y + h - 10);
            ctx.lineTo(x + w, y + h - segmentH);
            ctx.fill();
        } else {
            ctx.fillRect(x, y + h - (i + 1) * segmentH, w, segmentH);
        }
    }

    // 2. Draw Glass/Tube Outline
    ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = isSelected ? 4 : 2;
    
    ctx.beginPath();
    ctx.moveTo(x, y); // Top Left
    ctx.lineTo(x, y + h - 10); // Bottom Left
    ctx.quadraticCurveTo(x + w/2, y + h + 10, x + w, y + h - 10); // Rounded Bottom
    ctx.lineTo(x + w, y); // Top Right
    ctx.stroke();

    // 3. Rim
    ctx.beginPath();
    ctx.ellipse(x + w/2, y, w/2, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
}

// --- 3. Game Logic (Engine) ---
class GameEngine {
    constructor() {
        this.level = 1;
        this.tubes = []; // Array of arrays
        this.history = []; // Undo stack
        this.selectedTube = -1;
        this.isAnimating = false;
        this.animState = null; // { source, target, progress }
        
        // Sound Stub
        this.sounds = {
            pour: tt.createInnerAudioContext(),
            win: tt.createInnerAudioContext()
        };
        // Ideally set src here: this.sounds.pour.src = 'audio/pour.mp3';

        this.initLevel(1);
    }

    initLevel(level) {
        this.level = level;
        this.history = [];
        this.selectedTube = -1;
        
        // Simple Level Generator (Reverse Shuffle)
        // Start sorted, then mix.
        const numColors = Math.min(3 + Math.floor(level / 2), 6); // Max 6 colors
        const numTubes = numColors + 2; // Always 2 empty
        
        // 1. Create sorted state
        let state = [];
        for (let i = 1; i <= numColors; i++) {
            state.push(Array(4).fill(i));
        }
        state.push([], []); // Empty tubes
        
        // 2. Shuffle (Reverse Moves)
        // Since we want a solvable puzzle, we just perform valid moves backwards? 
        // Actually, just random filling is risky.
        // Let's use a "Shuffle" strategy: Take top of random non-empty A, put in random non-full B.
        // Repeat N times.
        const moves = 50 + level * 10;
        for (let m = 0; m < moves; m++) {
            const from = Math.floor(Math.random() * numTubes);
            const to = Math.floor(Math.random() * numTubes);
            if (from === to) continue;
            if (state[from].length > 0 && state[to].length < 4) {
                state[to].push(state[from].pop());
            }
        }
        
        this.tubes = state;
        // Check if accidentally solved? Unlikely.
    }

    saveState() {
        // Deep copy
        const snapshot = JSON.parse(JSON.stringify(this.tubes));
        this.history.push(snapshot);
        if (this.history.length > 5) this.history.shift(); // Limit undo
    }

    undo() {
        if (this.history.length > 0) {
            this.tubes = this.history.pop();
            this.selectedTube = -1;
            tt.vibrateShort();
        }
    }

    handleTouch(x, y) {
        if (this.isAnimating) return;

        // 1. Check UI Buttons (Undo / Restart)
        if (y > canvas.height - 80) {
            if (x < canvas.width / 2) this.undo();
            else this.initLevel(this.level); // Restart
            return;
        }

        // 2. Check Tubes
        // Calculate layout
        const numTubes = this.tubes.length;
        const rows = numTubes > 6 ? 2 : 1;
        const tubesPerRow = Math.ceil(numTubes / rows);
        
        const startX = (canvas.width - (tubesPerRow * (CONFIG.TUBE_WIDTH + CONFIG.TUBE_GAP))) / 2 + CONFIG.TUBE_GAP/2;
        const startY = canvas.height / 2 - 100;

        let clickedIndex = -1;
        
        for (let i = 0; i < numTubes; i++) {
            const row = Math.floor(i / tubesPerRow);
            const col = i % tubesPerRow;
            const tx = startX + col * (CONFIG.TUBE_WIDTH + CONFIG.TUBE_GAP);
            const ty = startY + row * (CONFIG.TUBE_HEIGHT + 50);
            
            if (x >= tx && x <= tx + CONFIG.TUBE_WIDTH && 
                y >= ty && y <= ty + CONFIG.TUBE_HEIGHT) {
                clickedIndex = i;
                break;
            }
        }

        if (clickedIndex !== -1) {
            this.handleTubeClick(clickedIndex);
        }
    }

    handleTubeClick(index) {
        if (this.selectedTube === -1) {
            // Select
            if (this.tubes[index].length > 0) {
                this.selectedTube = index;
                tt.vibrateShort();
            }
        } else {
            // Move
            if (this.selectedTube === index) {
                this.selectedTube = -1; // Deselect
            } else {
                this.tryMove(this.selectedTube, index);
            }
        }
    }

    tryMove(from, to) {
        const sourceTube = this.tubes[from];
        const targetTube = this.tubes[to];

        if (sourceTube.length === 0) return; // Should not happen
        if (targetTube.length >= 4) return; // Full

        const colorToMove = sourceTube[sourceTube.length - 1];
        
        // Rule: Target must be empty OR top color must match
        if (targetTube.length === 0 || targetTube[targetTube.length - 1] === colorToMove) {
            // Valid Move
            this.saveState();
            
            // Animation logic would go here, simplified to immediate for V1
            targetTube.push(sourceTube.pop());
            this.selectedTube = -1;
            tt.vibrateShort();
            
            // Check Win
            this.checkWin();
        } else {
            // Invalid
            tt.vibrateShort(); // Double vibrate?
            this.selectedTube = -1;
        }
    }

    checkWin() {
        let completed = 0;
        for (let tube of this.tubes) {
            if (tube.length === 0) {
                completed++;
                continue;
            }
            if (tube.length < 4) return; // Not full
            const color = tube[0];
            for (let c of tube) {
                if (c !== color) return; // Mixed
            }
            completed++;
        }
        
        if (completed === this.tubes.length) {
            // Win!
            tt.showModal({
                title: '好茶！(Excellent!)',
                content: `恭喜通过第 ${this.level} 品。`,
                confirmText: '下一品',
                showCancel: false,
                success: () => {
                    this.initLevel(this.level + 1);
                }
            });
        }
    }

    draw() {
        // 1. Background (Rice Paper Color)
        ctx.fillStyle = '#F3F0E6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 2. Title
        ctx.fillStyle = '#3E2723';
        ctx.font = 'bold 30px serif';
        ctx.textAlign = 'center';
        ctx.fillText(`第 ${this.level} 品 · 问茶`, canvas.width / 2, 80);

        // 3. Tubes
        const numTubes = this.tubes.length;
        const rows = numTubes > 6 ? 2 : 1;
        const tubesPerRow = Math.ceil(numTubes / rows);
        
        const startX = (canvas.width - (tubesPerRow * (CONFIG.TUBE_WIDTH + CONFIG.TUBE_GAP))) / 2 + CONFIG.TUBE_GAP/2;
        const startY = canvas.height / 2 - 100;

        for (let i = 0; i < numTubes; i++) {
            const row = Math.floor(i / tubesPerRow);
            const col = i % tubesPerRow;
            
            let tx = startX + col * (CONFIG.TUBE_WIDTH + CONFIG.TUBE_GAP);
            let ty = startY + row * (CONFIG.TUBE_HEIGHT + 50);

            // Selected lift effect
            if (i === this.selectedTube) ty -= 20;

            drawTube(tx, ty, CONFIG.TUBE_WIDTH, CONFIG.TUBE_HEIGHT, this.tubes[i], i === this.selectedTube);
        }

        // 4. UI Buttons
        const btnY = canvas.height - 50;
        ctx.fillStyle = '#795548';
        ctx.font = '20px Arial';
        ctx.fillText("悔棋 (Undo)", canvas.width / 4, btnY);
        ctx.fillText("重置 (Reset)", canvas.width * 3 / 4, btnY);
    }
}

// --- 4. Main Loop ---
const game = new GameEngine();

function loop() {
    game.draw();
    requestAnimationFrame(loop);
}

// Input
tt.onTouchStart((e) => {
    const t = e.touches[0];
    game.handleTouch(t.clientX, t.clientY);
});

// Start
loop();
