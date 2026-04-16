/**
 * Happy Marian 3.0 - 全域通用音效與配樂引擎 (Global Audio Engine - Web Audio API Edition)
 * 解決 Safari 靜音限制、避免預載亂叫、達成零延遲完美打擊感！
 */

const GlobalAudio = {
    // 1. 音效網址庫 (改為網址對應，全面使用 mp3 確保 Safari 100% 相容)
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

    // 🚀 Web Audio API 核心組件
    audioCtx: null,
    audioBuffers: {}, 

    currentBGM: null,       
    gachaBgmInstance: null, 
    isDucking: false,       

    // =====================================
    // 🚀 專門用來在任何時候強制喚醒 AudioContext 的終極武器 (給 Arena 呼叫)
    // =====================================
    unlockWebAudio: function() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.preloadAllSounds(); 
            console.log("🔓 Web Audio API 喚醒成功，已鎖定媒體播放通道！");
        }
        
        // 針對 Safari：必須在 User Gesture 內直接呼叫 resume
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(e => console.warn("AudioContext resume failed", e));
        }
        
        // 偷偷產生一個空音訊播一下，徹底鎖定媒體通道
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(0);
            osc.stop(this.audioCtx.currentTime + 0.01);
        } catch(e) {}
    },

    init: function() {
        for (let key in this.bgm) {
            this.bgm[key].volume = 0.15; 
            this.bgm[key].loop = true;
        }

        this.bindClickEvents();
        this.observeModals();
        this.bindMicDucking(); 
        this.autoPlayBGM();    
        
        // 保留「第一次點擊全域解鎖」的機制，保護 Dashboard 和 Lobby
        const initWebAudio = () => {
            this.unlockWebAudio(); 
            document.removeEventListener('pointerdown', initWebAudio);
        };
        document.addEventListener('pointerdown', initWebAudio);

        console.log("🎵 Global Audio Engine 3.2 Initialized (Web Audio API Mode)");
    },

    // 🚀 將所有短音效下載並解碼到記憶體中 (Safari 相容版寫法)
    preloadAllSounds: function() {
        for (let key in this.soundUrls) {
            fetch(this.soundUrls[key])
                .then(response => {
                    if (!response.ok) throw new Error("網路連線失敗");
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    this.audioCtx.decodeAudioData(
                        arrayBuffer, 
                        (audioBuffer) => {
                            this.audioBuffers[key] = audioBuffer; 
                        },
                        (e) => {
                            console.warn(`音效 ${key} 解碼失敗 (可能是格式不支援):`, e);
                        }
                    );
                })
                .catch(e => console.warn(`音效 ${key} 下載失敗:`, e));
        }
    },

    // 🚀 終極播放函數：從記憶體中提取聲音，零延遲噴發！
    play: function(soundName) {
        if (!this.audioCtx || !this.audioBuffers[soundName]) return; 
        
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffers[soundName];

        const gainNode = this.audioCtx.createGain();
        
        // 🎚️ 獨立音量控制台
        let vol = 1.0;
        switch (soundName) {
            case 'click': vol = 0.8; break;
            case 'popupOpen': vol = 1.8; break;
            case 'popupClose': vol = 1.6; break;
            case 'hit': vol = 1.0; break;
            case 'countdown': vol = 1.5; break;
        }
        
        gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    },

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

    resumeNormalBGM: function() {
        if (document.body.dataset.gachaBgmPlaying) {
            if (this.gachaBgmInstance) this.gachaBgmInstance.pause();
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
            const noClickClasses = ['history-btn', 'btn-close-modal', 'btn-glory']; 
            if (target && !target.disabled && !target.classList.contains('disabled') && target.id !== 'record-btn' && target.id !== 'battle-record-btn') {
                const isNoClickClass = noClickClasses.some(cls => target.classList.contains(cls));
                if (target.hasAttribute('data-no-click-sound') || isNoClickClass) {
                    return; 
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
