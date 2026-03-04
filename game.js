// game.js - "Zen Tea Sort: Master Edition" (茶韵·倒水大师)
// V2.0 - High Fidelity, Fluid Animation, Complex Levels, Sound Integration
// Engineer: Jason

const systemInfo = tt.getSystemInfoSync();
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');

// --- 1. Configuration & Constants ---
const CONFIG = {
    // Colors: Vibrant, distinct layers. 0 is empty.
    COLORS: [
        'transparent',
        '#FF5252', // Red (Pu'er)
        '#448AFF', // Blue (Butterfly Pea)
        '#69F0AE', // Green (Longjing)
        '#FFD740', // Yellow (Jasmine)
        '#E040FB', // Purple (Taro)
        '#FF6E40', // Orange (Oolong)
        '#607D8B', // Grey (Iron Buddha)
        '#795548', // Brown (Dark Tea)
        '#FF4081'  // Pink (Rose)
    ],
    // Layout
    TUBE_WIDTH: 60,
    TUBE_HEIGHT: 240,
    TUBE_GAP: 25,
    MAX_CAPACITY: 4,
    // Animation
    POUR_SPEED: 8, // Pixels per frame
    STREAM_WIDTH: 8,
};

// Force Canvas Size
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// --- 2. Asset Management (Sound & Haptics) ---
const AUDIO = {
    bgm: tt.createInnerAudioContext(),
    select: tt.createInnerAudioContext(),
    pour: tt.createInnerAudioContext(),
    win: tt.createInnerAudioContext(),
    
    init: function() {
        this.bgm.src = 'audio/bgm.mp3'; // Gentle Guqin music
        this.bgm.loop = true;
        this.bgm.volume = 0.5;
        
        this.select.src = 'audio/select.mp3'; // "Tick" sound
        this.pour.src = 'audio/pour.mp3';     // Water flowing sound
        this.win.src = 'audio/win.mp3';       // "Ding" or Guzheng chord
    },
    
    play: function(name) {
        if (this[name]) {
            this[name].stop();
            this[name].play();
        }
        // Haptics
        if (name === 'select') tt.vibrateShort();
        if (name === 'win') tt.vibrateLong();
    }
};

// Initialize Audio
AUDIO.init();

// --- 3. Visual System (Drawing) ---
const VISUALS = {
    drawTube: function(x, y, w, h, colors, isSelected) {
        // 1. Draw Liquid Layers
        const segmentH = h / CONFIG.MAX_CAPACITY;
        
        // Draw from bottom up
        for (let i = 0; i < colors.length; i++) {
            const colorIdx = colors[i];
            if (colorIdx === 0) continue;
            
            ctx.fillStyle = CONFIG.COLORS[colorIdx];
            
            const ly = y + h - (i + 1) * segmentH;
            
            // Mask for rounded bottom (First layer)
            ctx.save();
            ctx.beginPath();
            if (i === 0) {
                ctx.moveTo(x, ly);
                ctx.lineTo(x, y + h - 15);
                ctx.quadraticCurveTo(x + w/2, y + h + 15, x + w, y + h - 15);
                ctx.lineTo(x + w, ly);
            } else {
                ctx.rect(x, ly, w, segmentH);
            }
            ctx.closePath();
            ctx.clip();
            
            // Fill color
            ctx.fillRect(x, ly, w, segmentH);
            
            // Add "Liquid" Highlight (Glass effect)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x + 5, ly, 10, segmentH);
            
            ctx.restore();
        }

        // 2. Draw Glass Container
        ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = isSelected ? 4 : 2;
        
        ctx.beginPath();
        ctx.moveTo(x, y); 
        ctx.lineTo(x, y + h - 15); 
        ctx.quadraticCurveTo(x + w/2, y + h + 15, x + w, y + h - 15); 
        ctx.lineTo(x + w, y); 
        ctx.stroke();

        // 3. Rim
        ctx.beginPath();
        ctx.ellipse(x + w/2, y, w/2, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // 4. Glass Reflection (Shininess)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + w - 10, y + 20);
        ctx.lineTo(x + w - 10, y + h - 20);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();
        ctx.restore();
    },

    drawStream: function(startX, startY, endX, endY, color) {
        // Bezier Curve for Pouring
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Control point is mid-way X, but higher Y to simulate arc
        const cpX = (startX + endX) / 2;
        const cpY = Math.min(startY, endY) - 50;
        
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        
        ctx.lineWidth = CONFIG.STREAM_WIDTH;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Splash particles at end
        ctx.fillStyle = color;
        for(let i=0; i<3; i++) {
            ctx.beginPath();
            ctx.arc(endX + (Math.random()-0.5)*10, endY + (Math.random()-0.5)*5, 3, 0, Math.PI*2);
            ctx.fill();
        }
    }
};

// --- 4. Game Engine (Logic & State) ---
class GameEngine {
    constructor() {
        this.level = 1;
        this.tubes = []; 
        this.history = []; 
        this.selectedTube = -1;
        
        // Animation State
        this.anim = {
            active: false,
            source: -1,
            target: -1,
            color: null,
            progress: 0
        };

        this.initLevel(1);
    }

    initLevel(level) {
        this.level = level;
        this.history = [];
        this.selectedTube = -1;
        this.anim.active = false;

        // COMPLEX LEVEL GENERATOR (Reverse Shuffle)
        // 1. Determine parameters based on level
        const numColors = Math.min(3 + Math.floor((level - 1) / 2), 9); 
        const numEmpty = 2;
        const numTubes = numColors + numEmpty;

        // 2. Create Solved State
        let state = [];
        for (let i = 1; i <= numColors; i++) {
            state.push(Array(4).fill(i)); // Full tubes of single color
        }
        for (let i = 0; i < numEmpty; i++) {
            state.push([]); // Empty tubes
        }

        // 3. Shuffle (Reverse Moves) - The Key to "Complex but Solvable"
        // We simulate valid reverse moves: take from A, pour to B (if B has space)
        // To make it look "messy", we must do many moves.
        const moves = 50 + level * 20;
        
        for (let m = 0; m < moves; m++) {
            // Pick random source (must not be empty)
            let srcIdx = Math.floor(Math.random() * numTubes);
            if (state[srcIdx].length === 0) continue;
            
            // Pick random dest (must have space < 4)
            let destIdx = Math.floor(Math.random() * numTubes);
            if (srcIdx === destIdx) continue;
            if (state[destIdx].length >= 4) continue;
            
            // Move one unit
            const color = state[srcIdx].pop();
            state[destIdx].push(color);
        }
        
        this.tubes = state;
        
        // Background Music
        AUDIO.bgm.play();
    }

    // Interaction
    handleTouch(x, y) {
        if (this.anim.active) return; // Block input during animation

        // UI Buttons (Bottom Area)
        if (y > canvas.height - 100) {
            if (x < canvas.width / 3) this.undo();
            else if (x > canvas.width * 2/3) this.initLevel(this.level); // Restart
            return;
        }

        // Calculate Tube Layout
        const layout = this.getLayout();
        
        for (let i = 0; i < this.tubes.length; i++) {
            const pos = layout[i];
            if (x >= pos.x && x <= pos.x + CONFIG.TUBE_WIDTH &&
                y >= pos.y && y <= pos.y + CONFIG.TUBE_HEIGHT) {
                
                this.handleTubeClick(i);
                return;
            }
        }
    }

    handleTubeClick(index) {
        if (this.selectedTube === -1) {
            // Select Source
            if (this.tubes[index].length > 0) {
                this.selectedTube = index;
                AUDIO.play('select');
            }
        } else {
            // Select Target
            if (this.selectedTube === index) {
                this.selectedTube = -1; // Deselect
            } else {
                this.tryMove(this.selectedTube, index);
            }
        }
    }

    tryMove(from, to) {
        const src = this.tubes[from];
        const dest = this.tubes[to];

        // Validations
        if (dest.length >= 4) {
            this.selectedTube = -1;
            return; 
        }
        
        const color = src[src.length - 1];
        // Rules: Target empty OR Top color matches
        if (dest.length === 0 || dest[dest.length - 1] === color) {
            
            // START ANIMATION
            this.saveState(); // Save history before move
            
            this.anim.active = true;
            this.anim.source = from;
            this.anim.target = to;
            this.anim.color = CONFIG.COLORS[color]; // Get hex color
            this.anim.progress = 0;
            
            // Actually move data AFTER animation (or during)
            // For simplicity in loop, we move data now but visually animate
            src.pop();
            dest.push(color);
            
            AUDIO.play('pour');
            this.selectedTube = -1;
            
        } else {
            // Invalid move feedback
            this.selectedTube = -1;
            tt.vibrateShort();
        }
    }

    update() {
        if (this.anim.active) {
            this.anim.progress += 0.1; // Speed
            if (this.anim.progress >= 1) {
                this.anim.active = false;
                this.checkWin();
            }
        }
    }

    checkWin() {
        let completed = 0;
        for (let tube of this.tubes) {
            if (tube.length === 0) {
                completed++;
                continue;
            }
            if (tube.length < 4) return;
            // Check uniformity
            const c = tube[0];
            if (!tube.every(x => x === c)) return;
            completed++;
        }

        if (completed === this.tubes.length) {
            AUDIO.play('win');
            tt.showModal({
                title: '好茶！(Excellent!)',
                content: `恭喜通过第 ${this.level} 品。\n进入下一品？`,
                confirmText: '继续',
                showCancel: false,
                success: () => {
                    this.initLevel(this.level + 1);
                }
            });
        }
    }

    undo() {
        if (this.history.length > 0) {
            this.tubes = this.history.pop();
            this.selectedTube = -1;
            tt.vibrateShort();
        }
    }

    saveState() {
        this.history.push(JSON.parse(JSON.stringify(this.tubes)));
        if (this.history.length > 10) this.history.shift();
    }

    getLayout() {
        const num = this.tubes.length;
        const rows = num > 6 ? 2 : 1;
        const cols = Math.ceil(num / rows);
        
        let positions = [];
        const totalW = cols * CONFIG.TUBE_WIDTH + (cols - 1) * CONFIG.TUBE_GAP;
        const startX = (canvas.width - totalW) / 2;
        const startY = (canvas.height - (rows * (CONFIG.TUBE_HEIGHT + 60))) / 2 + 50;

        for (let i = 0; i < num; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            positions.push({
                x: startX + c * (CONFIG.TUBE_WIDTH + CONFIG.TUBE_GAP),
                y: startY + r * (CONFIG.TUBE_HEIGHT + 60)
            });
        }
        return positions;
    }

    draw() {
        // 1. Background
        // Gradient for "Ink Wash" feel
        const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grd.addColorStop(0, '#eef2f3');
        grd.addColorStop(1, '#8e9eab');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Title
        ctx.fillStyle = '#37474F';
        ctx.font = 'bold 32px serif'; // Use serif for Chinese style
        ctx.textAlign = 'center';
        ctx.fillText(`第 ${this.level} 品 · 问茶`, canvas.width / 2, 80);

        // 3. Tubes
        const layout = this.getLayout();
        for (let i = 0; i < this.tubes.length; i++) {
            const pos = layout[i];
            let drawY = pos.y;
            
            // Lift animation if selected
            if (i === this.selectedTube) drawY -= 30;
            
            // If this is Animation Source, tilt it (Visual trick: just lift higher)
            if (this.anim.active && this.anim.source === i) {
                drawY -= 50;
                // Ideally rotate, but simplified for 2D Canvas performance
            }

            VISUALS.drawTube(pos.x, drawY, CONFIG.TUBE_WIDTH, CONFIG.TUBE_HEIGHT, this.tubes[i], i === this.selectedTube);
        }

        // 4. Pouring Stream Animation
        if (this.anim.active) {
            const srcPos = layout[this.anim.source];
            const destPos = layout[this.anim.target];
            
            // Start from top of source, end at top of dest
            VISUALS.drawStream(
                srcPos.x + CONFIG.TUBE_WIDTH, srcPos.y - 50, // Spout
                destPos.x + CONFIG.TUBE_WIDTH/2, destPos.y + 20, // Target center
                this.anim.color
            );
        }

        // 5. UI
        const btnY = canvas.height - 60;
        ctx.fillStyle = '#37474F';
        ctx.font = '24px Arial';
        ctx.fillText("⟲ 悔棋", canvas.width * 0.25, btnY);
        ctx.fillText("↻ 重置", canvas.width * 0.75, btnY);
    }
}

// --- 5. Main Loop ---
const game = new GameEngine();

function loop() {
    game.update();
    game.draw();
    requestAnimationFrame(loop);
}

// Input Handling
tt.onTouchStart((e) => {
    const t = e.touches[0];
    game.handleTouch(t.clientX, t.clientY);
});

// Start
loop();
