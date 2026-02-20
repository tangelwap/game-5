import { _decorator, Component, Node, Sprite, Label, Color, Vec3, tween } from 'cc';
import { AdManager } from './AdManager';

const { ccclass, property } = _decorator;

@ccclass('WaterGameManager')
export class WaterGameManager extends Component {

    @property(Node)
    vialContainer: Node = null;

    @property(Label)
    levelLabel: Label = null;

    private currentLevel: number = 1;
    private selectedVial: Node | null = null;
    private moves: number = 0;

    // Game Config (Colors: 0=Red, 1=Blue, 2=Yellow, 3=Green)
    private readonly levels = {
        1: [
            [0, 1, 0, 1],
            [1, 0, 1, 0],
            [],
            []
        ],
        2: [
            [2, 2, 1, 1],
            [1, 2, 2, 1],
            [],
            []
        ]
    };

    onLoad() {
        this.loadLevel(1);
    }

    loadLevel(lvl: number) {
        this.currentLevel = lvl;
        this.levelLabel.string = `Level ${lvl}`;
        const data = this.levels[lvl] || this.levels[1];
        
        // Spawn Vials
        this.vialContainer.removeAllChildren();
        data.forEach((vialData, idx) => {
            const vial = this.createVial(vialData, idx);
            this.vialContainer.addChild(vial);
        });
    }

    createVial(colors: number[], index: number): Node {
        const node = new Node(`Vial_${index}`);
        // Add Sprite (Test Image)
        const sp = node.addComponent(Sprite);
        // sp.spriteFrame = ... (Load asset)
        
        node.setPosition(new Vec3((index % 3) * 100 - 100, Math.floor(index / 3) * -150 + 100, 0));
        
        // Add Colors (Children Nodes as Rects)
        colors.forEach((c, i) => {
            const water = new Node(`Water_${i}`);
            const spr = water.addComponent(Sprite);
            spr.color = this.getColor(c);
            water.setPosition(0, i * 25 - 37.5, 0); // Stack up
            node.addChild(water);
        });

        // Touch Event
        node.on(Node.EventType.TOUCH_END, () => {
            this.onVialClick(node);
        }, this);

        return node;
    }

    onVialClick(vial: Node) {
        if (!this.selectedVial) {
            // Select Source
            this.selectedVial = vial;
            // Highlight Animation
            tween(vial).to(0.1, { scale: new Vec3(1.1, 1.1, 1) }).start();
        } else {
            if (this.selectedVial === vial) {
                // Deselect
                tween(vial).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
                this.selectedVial = null;
            } else {
                // Try Pour
                if (this.canPour(this.selectedVial, vial)) {
                    this.pourWater(this.selectedVial, vial);
                    this.moves++;
                    this.checkWin();
                } else {
                    console.log("Cannot pour!");
                    // Shake animation
                }
                // Deselect source anyway
                tween(this.selectedVial).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
                this.selectedVial = null;
            }
        }
    }

    canPour(from: Node, to: Node): boolean {
        // Logic: Top color must match & Target has space
        // Mock logic for demo
        return true; 
    }

    pourWater(from: Node, to: Node) {
        // Animation logic here (Move top water node from -> to)
        // ...
    }

    checkWin() {
        // If all vials are single color or empty
        // ...
        // If win:
        console.log("Level Cleared!");
        // AdManager.instance.showInterstitial(); // Show Ad
        this.loadLevel(this.currentLevel + 1);
    }

    getColor(id: number): Color {
        const map = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];
        return map[id] || Color.WHITE;
    }
}
