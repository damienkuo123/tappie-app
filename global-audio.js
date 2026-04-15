/**
 * Happy Marian 3.0 - 全域通用音效與配樂引擎 (Global Audio Engine)
 * 支援：自動切換情境 BGM、麥克風錄音時自動靜音 (Auto-Ducking)、彈窗音效監聽
 */

const GlobalAudio = {
    // ==========================================
    // 1. 短音效庫 (SFX)
    // ==========================================
    sounds: {
        click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
        popupOpen: new Audio('https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'),
        popupClose: new Audio('https://assets.mixkit.co/active_storage/sfx/2361/2361-preview.mp3')
    },

    // ==========================================
    // 2. 背景音樂庫 (BGM) - 替換成你的專屬音樂網址
    // ==========================================
    bgm: {
        dashboard: new Audio('https://damienkuo123.github.io/marian-app/audio/cyberwave-orchestra-puzzle-game-loop-bright-casual-video-game-music-249201.mp3'), 
        lobby: new Audio('https://damienkuo123.github.io/marian-app/audio/決戦へ.mp3'),     // 替換為你的 Lobby 音樂
        arenaNormal: new Audio('https://damienkuo123.github.io/marian-app/audio/wind_feelings.mp3'), // 一般練習音樂
        arenaBattle: new Audio('https://damienkuo123.github.io/marian-app/audio/Devil_Disaster.mp3'), // 熱血對戰音樂
        gacha: new Audio('https://damienkuo123.github.io/marian-app/audio/wind_feelings.mp3')        // 抽卡專屬史詩音樂
    },

    currentBGM: null,       // 紀錄目前正在播放的主 BGM
    isDucking: false,       // 紀錄是否正在錄音靜音中

    init: function() {
        this.sounds.click.volume = 0.4;
        this.sounds.popupOpen.volume = 0.5;
        this.sounds.popupClose.volume = 0.4;

        // 設定所有 BGM 預設音量與循環
        for (let key in this.bgm) {
            this.bgm[key].volume = 0.15; // BGM 音量調小，不干擾人聲
            this.bgm[key].loop = true;
        }

        this.bindClickEvents();
        this.observeModals();
        this.bindMicDucking(); // 🚀 啟動麥克風防干擾監聽
        this.autoPlayBGM();    // 🚀 啟動情境 BGM 判斷
        
        console.log("🎵 Global Audio Engine 3.0 Initialized");
    },

    // ==========================================
    // 自動判斷頁面與模式，播放專屬 BGM
    // ==========================================
    autoPlayBGM: function() {
        const currentPath = window.location.pathname.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        let targetBGM = null;

        if (currentPath.includes('dashboard')) {
            targetBGM = this.bgm.dashboard;
        } else if (currentPath.includes('arena')) {
            // 🚀 判斷是否為對戰模式
            if (urlParams.get('mode') === 'battle' || urlParams.get('roomId')) {
                targetBGM = this.bgm.arenaBattle;
            } else {
                targetBGM = this.bgm.arenaNormal;
            }
        } else if (currentPath.includes('lobby')) {
            targetBGM = this.bgm.lobby; // 🚀 正確切換到 Lobby 專屬音樂
        }

        if (targetBGM) {
            this.currentBGM = targetBGM;
            // 需等待使用者第一次點擊畫面才能播放 (瀏覽器安全限制)
            const startBgmInteraction = () => {
                this.currentBGM.play().catch(e => console.warn("BGM 等待互動中...", e));
                document.removeEventListener('pointerdown', startBgmInteraction);
            };
            document.addEventListener('pointerdown', startBgmInteraction);
        }
    },

    // ==========================================
    // 🎤 麥克風防干擾機制 (Auto-Ducking)
    // ==========================================
    bindMicDucking: function() {
        // 當按下錄音鍵 (包含一般錄音與對戰錄音按鈕)
        document.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#record-btn') || e.target.closest('#battle-record-btn')) {
                if (this.currentBGM && !this.currentBGM.paused) {
                    this.currentBGM.pause(); // 🚀 錄音瞬間，暫停背景音樂
                    this.isDucking = true;
                }
            }
        });

        // 當放開錄音鍵
        const resumeAudio = (e) => {
            if (this.isDucking && (e.target.closest('#record-btn') || e.target.closest('#battle-record-btn'))) {
                setTimeout(() => {
                    if (this.currentBGM) this.currentBGM.play(); // 🚀 錄音結束，恢復播放
                    this.isDucking = false;
                }, 500); // 稍微延遲 0.5 秒恢復，避免剛放開時的雜音被錄到
            }
        };

        document.addEventListener('pointerup', resumeAudio);
        document.addEventListener('pointercancel', resumeAudio);
        document.addEventListener('pointerout', resumeAudio);
    },

    play: function(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0; 
            sound.play().catch(e => {});
        }
    },

    bindClickEvents: function() {
        document.addEventListener('pointerdown', (e) => {
            const target = e.target.closest('button, a, .btn, .btn-dock, .btn-play-pill, .ws-letter, .btn-image-choice');
            // 排除錄音按鈕，錄音按鈕有自己的物理反饋聲或不發聲
            if (target && !target.disabled && !target.classList.contains('disabled') && target.id !== 'record-btn' && target.id !== 'battle-record-btn') {
                if (target.hasAttribute('data-no-click-sound')) return;
                this.play('click');
            }
        });
    },

    // ==========================================
    // 彈窗監聽與 🎁 抽卡專屬 BGM 切換
    // ==========================================
    observeModals: function() {
        const displayModals = ['#summary', '#impact-overlay', '#phonic-helper-overlay', '#logModal'];
        const classModals = [{ selector: '#lb-panel', activeClass: 'open' }];

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const target = mutation.target;

                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    // 1. 處理一般彈窗音效
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

                    // 2. 🚀 處理史詩級結算畫面 (Epic Reward) 的專屬 BGM 覆蓋
                    if (target.matches('#epic-reward-zone')) {
                        const displayStyle = window.getComputedStyle(target).display;
                        if (displayStyle !== 'none' && !target.dataset.gachaBgmPlaying) {
                            // 暫停原本的 BGM，改播抽卡音樂
                            if (this.currentBGM) this.currentBGM.pause();
                            this.bgm.gacha.currentTime = 0;
                            this.bgm.gacha.play().catch(e=>{});
                            target.dataset.gachaBgmPlaying = "true";
                        } else if (displayStyle === 'none' && target.dataset.gachaBgmPlaying) {
                            // 抽卡結束，恢復原本的 BGM
                            this.bgm.gacha.pause();
                            if (this.currentBGM) this.currentBGM.play().catch(e=>{});
                            delete target.dataset.gachaBgmPlaying;
                        }
                    }
                        if (displayStyle !== 'none' && !target.dataset.gachaBgmPlaying) {
                            // 暫停原本的 BGM，改播抽卡音樂
                            if (this.currentBGM) this.currentBGM.pause();
                            this.bgm.gacha.currentTime = 0;
                            this.bgm.gacha.play().catch(e=>{});
                            target.dataset.gachaBgmPlaying = "true";
                        } else if (displayStyle === 'none' && target.dataset.gachaBgmPlaying) {
                            // 抽卡結束，恢復原本的 BGM
                            this.bgm.gacha.pause();
                            if (this.currentBGM) this.currentBGM.play().catch(e=>{});
                            delete target.dataset.gachaBgmPlaying;
                        }
                    }
                }

                // 處理榮譽榜等 class 變化
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

document.addEventListener('DOMContentLoaded', () => {
    GlobalAudio.init();
});
