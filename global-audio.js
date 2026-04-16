/**
 * Happy Marian 3.0 - 全域通用音效與配樂引擎 (Global Audio Engine - Web Audio API Edition)
 * 解決 Safari 靜音限制、避免預載亂叫、達成零延遲完美打擊感！
 */

const GlobalAudio = {
    // 1. 音效網址庫 (改為網址對應)
    soundUrls: {
        click: 'https://damienkuo123.github.io/marian-app/audio/click.mp3',
        popupOpen: 'https://damienkuo123.github.io/marian-app/audio/popupOpen.mp3',
        popupClose: 'https://damienkuo123.github.io/marian-app/audio/popupClose.mp3',
        countdown: 'https://damienkuo123.github.io/marian-app/audio/countdown.mp3',
        fireNormal: 'https://damienkuo123.github.io/marian-app/audio/fireNormal.mp3',
        fireUlt: 'https://damienkuo123.github.io/marian-app/audio/fireUlt.mp3',
        hit: 'https://damienkuo123.github.io/marian-app/audio/hit.mp3',
        cutin: 'https://damienkuo123.github.io/marian-app/audio/cutin.mp3',
        victory: 'https://damienkuo123.github.io/marian-app/audio/victory.mp3',
        shatter: 'https://damienkuo123.github.io/marian-app/audio/shatter.mp3'
    },

    // 2. 背景音樂庫 (BGM 檔案大，仍保留傳統 Audio 標籤串流播放)
    bgm: {
        dashboard: new Audio('https://damienkuo123.github.io/marian-app/audio/cyberwave-orchestra-puzzle-game-loop-bright-casual-video-game-music-249201.mp3'), 
        lobby: new Audio('https://damienkuo123.github.io/marian-app/audio/決戦へ.mp3'),     
        arenaNormal: new Audio('https://damienkuo123.github.io/marian-app/audio/wind_feelings.mp3'), 
        arenaBattle: new Audio('https://damienkuo123.github.io/marian-app/audio/Devil_Disaster.mp3'), 
        gacha: new Audio('https://damienkuo123.github.io/marian-app/audio/Battle_in_the_Moonlight.mp3')        
    },

    // 🚀 新增：Web Audio API 核心組件
    audioCtx: null,
    audioBuffers: {}, // 用來存放解碼後的純淨聲音數據

    currentBGM: null,       
    isDucking: false,       

    init: function() {
        // 設定 BGM 預設音量與循環
        for (let key in this.bgm) {
            this.bgm[key].volume = 0.1; 
            this.bgm[key].loop = true;
        }

        this.bindClickEvents();
        this.observeModals();
        this.bindMicDucking(); 
        this.autoPlayBGM();    
        
        // 🚀 核心機制：等待使用者第一次點擊，才喚醒 AudioContext 並開始下載音效！
        const initWebAudio = () => {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                this.preloadAllSounds(); // 開始默默下載短音效
                console.log("🔓 Web Audio API 喚醒成功！");
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            document.removeEventListener('pointerdown', initWebAudio);
        };
        document.addEventListener('pointerdown', initWebAudio);

        console.log("🎵 Global Audio Engine 3.2 Initialized (Web Audio API Mode)");
    },

    // 🚀 將所有短音效下載並解碼到記憶體中 (背景執行，絕對不會發出聲音)
    preloadAllSounds: function() {
        for (let key in this.soundUrls) {
            fetch(this.soundUrls[key])
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.audioCtx.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.audioBuffers[key] = audioBuffer; // 存入記憶體
                })
                .catch(e => console.warn(`音效 ${key} 載入失敗:`, e));
        }
    },

    // 🚀 終極播放函數：從記憶體中提取聲音，零延遲噴發！
    play: function(soundName) {
        if (!this.audioCtx || !this.audioBuffers[soundName]) return; // 如果還沒載入完就算了
        
        // 每次播放都要產生一個新的 Source (這是 Web Audio API 的規定)
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffers[soundName];

        // 獨立控制音量 (Web Audio API GainNode)
        const gainNode = this.audioCtx.createGain();
        
        // 🎚️ 在這裡定義每個音效的專屬音量 (範圍通常是 0.0 到 1.0，1.0 是原始音量，你甚至可以設到 1.5 放大音量)
        let vol = 1.0; // 預設值
        
        switch (soundName) {
            case 'click':
                vol = 0.8;  // 點擊聲保持低調
                break;
            case 'popupOpen':
                vol = 1.8;  // 🚀 彈窗打開調大聲一點！(原本是 0.5)
                break;
            case 'popupClose':
                vol = 1.6;  // 🚀 彈窗收起也調大一點！(原本是 0.4)
                break;
            case 'hit':
                vol = 1;  // 震動聲可以稍微收一點，以免太吵
                break;
            case 'countdown':
                vol = 2;  // 逼逼聲
                break;
            case 'cutin':
                vol = 2;  
                break;
            // 如果沒有列在上面的 (例如 fireNormal, victory)，就會自動使用預設的 vol = 1.0
        }
        
        // 將設定好的音量套用到混音器上
        gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);

        // 連接線路並發射！
        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    },

    // --- 以下為原本的 BGM 切換與監聽邏輯，完全沒變 ---

    playGachaBGM: function() {
        if (this.currentBGM) {
            this.currentBGM.pause();
        }
        this.bgm.gacha.currentTime = 0;
        this.bgm.gacha.play().catch(e => {});
        document.body.dataset.gachaBgmPlaying = "true";
    },

    resumeNormalBGM: function() {
        if (document.body.dataset.gachaBgmPlaying) {
            this.bgm.gacha.pause();
            if (this.currentBGM) {
                this.currentBGM.play().catch(e => {});
            }
            delete document.body.dataset.gachaBgmPlaying;
        }
    },

    autoPlayBGM: function() {
        const currentPath = window.location.pathname.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        let targetBGM = null;

        if (currentPath.includes('dashboard')) {
            targetBGM = this.bgm.dashboard;
        } else if (currentPath.includes('arena')) {
            if (urlParams.get('mode') === 'battle' || urlParams.get('roomId')) {
                targetBGM = this.bgm.arenaBattle;
            } else {
                targetBGM = this.bgm.arenaNormal;
            }
        } else if (currentPath.includes('lobby')) {
            targetBGM = this.bgm.lobby; 
        }

        if (targetBGM) {
            this.currentBGM = targetBGM;
            const startBgmInteraction = () => {
                this.currentBGM.play().catch(e => {});
                document.removeEventListener('pointerdown', startBgmInteraction);
            };
            document.addEventListener('pointerdown', startBgmInteraction);
        }
    },

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
            
            // 🚀 黑名單：這些按鈕按下去會觸發 Popup，所以它們不應該發出 Click 聲音，交給 Popup 負責就好
            const noClickClasses = ['history-btn', 'btn-close-modal', 'btn-glory']; 
            // 如果你的網頁裡還有其他按鈕是用來開彈窗的，也可以把它們的 class 加到上面這個陣列裡

            if (target && !target.disabled && !target.classList.contains('disabled') && target.id !== 'record-btn' && target.id !== 'battle-record-btn') {
                
                // 檢查這個按鈕是否帶有黑名單的 class
                const isNoClickClass = noClickClasses.some(cls => target.classList.contains(cls));
                
                if (target.hasAttribute('data-no-click-sound') || isNoClickClass) {
                    return; // 乖乖閉嘴
                }
                
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
