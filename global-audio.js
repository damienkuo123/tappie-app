/**
 * Happy Marian 3.0 - 全域通用音效與配樂引擎 (Global Audio Engine)
 * 支援：自動切換情境 BGM、麥克風錄音時自動靜音 (Auto-Ducking)、彈窗音效監聽
 */

const GlobalAudio = {
    // ==========================================
    // 1. 音效網址庫 (只存網址，不預先 new Audio，避免一起爆炸)
    // ==========================================
    soundUrls: {
        click: 'https://damienkuo123.github.io/marian-app/audio/click.m4a',
        popupOpen: 'https://damienkuo123.github.io/marian-app/audio/popupOpen.m4a',
        popupClose: 'https://damienkuo123.github.io/marian-app/audio/popupClose.m4a',
        countdown: 'https://damienkuo123.github.io/marian-app/audio/countdown.mp3',
        fireNormal: 'https://damienkuo123.github.io/marian-app/audio/fireNormal.mp3',
        fireUlt: 'https://damienkuo123.github.io/marian-app/audio/fireUlt.mp3',
        hit: 'https://damienkuo123.github.io/marian-app/audio/hit.mp3',
        cutin: 'https://damienkuo123.github.io/marian-app/audio/cutin.mp3',
        victory: 'https://damienkuo123.github.io/marian-app/audio/victory.mp3',
        shatter: 'https://damienkuo123.github.io/marian-app/audio/shatter.mp3'
    },

    // ==========================================
    // 2. 背景音樂網址庫 (BGM)
    // ==========================================
    bgmUrls: {
        dashboard: 'https://damienkuo123.github.io/marian-app/audio/cyberwave-orchestra-puzzle-game-loop-bright-casual-video-game-music-249201.mp3', 
        lobby: 'https://damienkuo123.github.io/marian-app/audio/決戦へ.mp3',
        arenaNormal: 'https://damienkuo123.github.io/marian-app/audio/wind_feelings.mp3',
        arenaBattle: 'https://damienkuo123.github.io/marian-app/audio/Devil_Disaster.mp3',
        gacha: 'https://damienkuo123.github.io/marian-app/audio/Battle_in_the_Moonlight.mp3'
    },

    currentBGM: null,       
    gachaBgmInstance: null, // 獨立紀錄抽卡音樂實體
    isDucking: false,       

    init: function() {
        this.bindClickEvents();
        this.observeModals();
        this.bindMicDucking(); 
        this.autoPlayBGM();    
        
        // 🚀 終極黑魔法：無聲過水法 (Silent Preload)
        // 只要使用者點擊畫面的任何地方，我們就瞬間創造出所有的音效物件，
        // 把它們的音量設為 0，叫它們「播放」，然後馬上「暫停」。
        // 這樣瀏覽器就會覺得：「喔，這些聲音都是使用者點擊授權的」，之後用 setTimeout 呼叫也不會被擋了！
        const unlockAllAudio = () => {
            for (let key in this.soundUrls) {
                const url = this.soundUrls[key];
                if (url) {
                    const audio = new Audio(url);
                    audio.volume = 0; // 絕對靜音
                    // 播放後立刻暫停，完成「過水」儀式
                    audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                    }).catch(e => {
                        // 如果因為檔案還沒下載完而報錯，我們就安靜地忽略它
                    });
                }
            }
            // 過水儀式只要做一次就好，做完就把這個監聽器殺掉
            document.removeEventListener('pointerdown', unlockAllAudio);
            console.log("🔓 所有戰鬥音效已取得瀏覽器播放授權！");
        };

        // 綁定在整個網頁的第一次點擊上
        document.addEventListener('pointerdown', unlockAllAudio);

        console.log("🎵 Global Audio Engine 3.1 Initialized (Safe Mode)");
    },

    // 🚀 安全播放短音效的方法：每次呼叫都動態建立一個新的 Audio 物件 (Fire and Forget)
    // 這可以完美解決連續觸發、以及手機瀏覽器緩存播放的問題
    play: function(soundName) {
        const url = this.soundUrls[soundName];
        if (!url) return;

        const audio = new Audio(url);
        
        // 設定音量
        if (soundName === 'click' || soundName === 'popupClose') audio.volume = 0.4;
        else if (soundName === 'popupOpen') audio.volume = 0.5;
        else audio.volume = 1.0;

        // 播放，失敗就算了，不報錯也不會卡住
        audio.play().catch(e => {}); 
    },

    // ==========================================
    // 自動判斷頁面與模式，播放專屬 BGM
    // ==========================================
    autoPlayBGM: function() {
        const currentPath = window.location.pathname.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        let targetUrl = null;

        if (currentPath.includes('dashboard')) {
            targetUrl = this.bgmUrls.dashboard;
        } else if (currentPath.includes('arena')) {
            if (urlParams.get('mode') === 'battle' || urlParams.get('roomId')) {
                targetUrl = this.bgmUrls.arenaBattle;
            } else {
                targetUrl = this.bgmUrls.arenaNormal;
            }
        } else if (currentPath.includes('lobby')) {
            targetUrl = this.bgmUrls.lobby;
        }

        if (targetUrl) {
            this.currentBGM = new Audio(targetUrl);
            this.currentBGM.volume = 0.15;
            this.currentBGM.loop = true;

            // 需等待使用者第一次點擊畫面才能播放
            const startBgmInteraction = () => {
                this.currentBGM.play().catch(e => {});
                document.removeEventListener('pointerdown', startBgmInteraction);
            };
            document.addEventListener('pointerdown', startBgmInteraction);
        }
    },

    // 🚀 切換到抽卡音樂
    playGachaBGM: function() {
        if (this.currentBGM) {
            this.currentBGM.pause();
        }
        
        if (!this.gachaBgmInstance) {
            this.gachaBgmInstance = new Audio(this.bgmUrls.gacha);
            this.gachaBgmInstance.volume = 0.15;
            this.gachaBgmInstance.loop = true;
        }
        
        this.gachaBgmInstance.currentTime = 0;
        this.gachaBgmInstance.play().catch(e => {});
        document.body.dataset.gachaBgmPlaying = "true";
    },

    // 🚀 恢復原本的背景音樂
    resumeNormalBGM: function() {
        if (document.body.dataset.gachaBgmPlaying) {
            if (this.gachaBgmInstance) this.gachaBgmInstance.pause();
            if (this.currentBGM) {
                this.currentBGM.play().catch(e => {});
            }
            delete document.body.dataset.gachaBgmPlaying;
        }
    },

    // 🎤 麥克風防干擾機制 (Auto-Ducking)
    bindMicDucking: function() {
        document.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#record-btn') || e.target.closest('#battle-record-btn')) {
                if (this.currentBGM && !this.currentBGM.paused) {
                    this.currentBGM.pause(); 
                    this.isDucking = true;
                }
            }
        });

        const resumeAudio = (e) => {
            if (this.isDucking && (e.target.closest('#record-btn') || e.target.closest('#battle-record-btn'))) {
                setTimeout(() => {
                    if (this.currentBGM) this.currentBGM.play().catch(e=>{}); 
                    this.isDucking = false;
                }, 500); 
            }
        };

        document.addEventListener('pointerup', resumeAudio);
        document.addEventListener('pointercancel', resumeAudio);
        document.addEventListener('pointerout', resumeAudio);
    },

    bindClickEvents: function() {
        document.addEventListener('pointerdown', (e) => {
            const target = e.target.closest('button, a, .btn, .btn-dock, .btn-play-pill, .ws-letter, .btn-image-choice');
            if (target && !target.disabled && !target.classList.contains('disabled') && target.id !== 'record-btn' && target.id !== 'battle-record-btn') {
                if (target.hasAttribute('data-no-click-sound')) return;
                this.play('click');
            }
        });
    },

    observeModals: function() {
        const displayModals = ['#summary', '#impact-overlay', '#phonic-helper-overlay', '#logModal'];
        const classModals = [{ selector: '#lb-panel', activeClass: 'open' }];

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const target = mutation.target;

                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isDisplayModal = displayModals.some(selector => target.matches(selector));
                    if (isDisplayModal) {
                        const displayStyle = window.getComputedStyle(target).display;
                        const opacityStyle = window.getComputedStyle(target).opacity;
                        if (displayStyle !== 'none' && opacityStyle !== '0' && !target.dataset.audioStateOpen) {
                            this.play('popupOpen');
                            target.dataset.audioStateOpen = "true";
                        } else if (displayStyle === 'none' && target.dataset.audioStateOpen) {
                            this.play('popupClose');
                            delete target.dataset.audioStateOpen;
                        }
                    }
                }

                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    classModals.forEach(config => {
                        if (target.matches(config.selector)) {
                            const isOpen = target.classList.contains(config.activeClass);
                            if (isOpen && !target.dataset.audioStateOpen) {
                                this.play('popupOpen');
                                target.dataset.audioStateOpen = "true";
                            } else if (!isOpen && target.dataset.audioStateOpen) {
                                this.play('popupClose');
                                delete target.dataset.audioStateOpen;
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    }
};

window.GlobalAudio = GlobalAudio;

document.addEventListener('DOMContentLoaded', () => {
    GlobalAudio.init();
});
