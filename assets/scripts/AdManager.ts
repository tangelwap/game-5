import { _decorator, Component, Node, native } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AdManager')
export class AdManager extends Component {

    private static _instance: AdManager;
    private videoAd: any = null;
    private interstitialAd: any = null;
    private bannerAd: any = null;

    // Replace with your real Douyin Ad Unit IDs
    private readonly VIDEO_ID = 'YOUR_VIDEO_AD_ID';
    private readonly INTER_ID = 'YOUR_INTER_AD_ID';
    private readonly BANNER_ID = 'YOUR_BANNER_AD_ID';

    public static get instance() {
        if (!this._instance) {
            this._instance = new AdManager();
        }
        return this._instance;
    }

    onLoad() {
        if (typeof tt !== 'undefined') {
            this.initVideoAd();
            this.initInterstitialAd();
        }
    }

    // --- Rewarded Video ---
    initVideoAd() {
        if (!tt.createRewardedVideoAd) return;
        
        this.videoAd = tt.createRewardedVideoAd({ adUnitId: this.VIDEO_ID });
        
        this.videoAd.onError((err) => {
            console.error('Video Ad Error:', err);
        });

        this.videoAd.onClose((res) => {
            if (res && res.isEnded) {
                console.log('Ad finished, grant reward!');
                // Dispatch event or callback
                // eventTarget.emit('AD_REWARD_GRANTED');
            } else {
                console.log('Ad skipped, no reward.');
            }
        });
    }

    showVideoAd(onSuccess: () => void, onFail: () => void) {
        if (!this.videoAd) {
            console.warn('Video Ad not initialized (maybe not on device?)');
            onSuccess(); // Fallback for dev
            return;
        }

        this.videoAd.show().catch(() => {
            this.videoAd.load()
                .then(() => this.videoAd.show())
                .catch(err => {
                    console.error('Failed to show video ad:', err);
                    onFail();
                });
        });
        
        // Simple callback hook for the close event
        // Note: Real implementation needs better state management
        // to handle multiple ad requests.
    }

    // --- Interstitial ---
    initInterstitialAd() {
        if (!tt.createInterstitialAd) return;
        this.interstitialAd = tt.createInterstitialAd({ adUnitId: this.INTER_ID });
    }

    showInterstitial() {
        if (this.interstitialAd) {
            this.interstitialAd.show().catch((err) => console.error(err));
        }
    }

    // --- Banner ---
    showBanner() {
        if (!tt.createBannerAd) return;
        
        const { windowWidth, windowHeight } = tt.getSystemInfoSync();
        const targetBannerWidth = 300;

        this.bannerAd = tt.createBannerAd({
            adUnitId: this.BANNER_ID,
            style: {
                left: (windowWidth - targetBannerWidth) / 2,
                top: windowHeight - 100, // Bottom align
                width: targetBannerWidth
            }
        });
        
        this.bannerAd.show();
    }
    
    hideBanner() {
        if (this.bannerAd) this.bannerAd.hide();
    }
}
