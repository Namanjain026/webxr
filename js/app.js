/**
 * Main WebXR Cinema Application Engine
 * Handles Video Playback, Canvas Test Generator, Dynamic Screen Glow,
 * Spatial Audio, 2D HUD Sync, and 3D VR Menu interactions.
 */

window.CinemaApp = {
    video: null,
    canvasGen: null,
    canvasCtx: null,
    audioCtx: null,
    pannerNode: null,
    screenGlowLight: null,
    hlsInstance: null,
    isPlaying: false,
    useDemoGenerator: true,
    animFrameId: null,

    init: function () {
        this.video = document.getElementById('cinema-video');
        this.screenGlowLight = document.getElementById('screen-glow-light');
        
        this.setupDemoCanvasGenerator();
        this.setupEventListeners();
        this.setupDynamicScreenGlow();
        this.setupSpatialAudio();
        this.applyTheme('grand-velvet');
    },

    setupDemoCanvasGenerator: function () {
        this.canvasGen = document.createElement('canvas');
        this.canvasGen.width = 1280;
        this.canvasGen.height = 720;
        this.canvasCtx = this.canvasGen.getContext('2d');

        // Bouncing DVD ball physics
        this.ball = { x: 640, y: 360, vx: 5, vy: 4, r: 40, color: '#00f0ff' };
    },

    startDemoGenerator: function () {
        const self = this;
        let angle = 0;

        function renderFrame() {
            if (!self.useDemoGenerator) return;

            const ctx = self.canvasCtx;
            const w = self.canvasGen.width;
            const h = self.canvasGen.height;

            // Background Gradient
            angle += 0.01;
            const r1 = Math.sin(angle) * 50 + 60;
            const g1 = Math.cos(angle * 0.8) * 50 + 60;
            const b1 = Math.sin(angle * 1.2) * 80 + 120;
            ctx.fillStyle = `rgb(${r1}, ${g1}, ${b1})`;
            ctx.fillRect(0, 0, w, h);

            // Animated grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;
            const gridOffset = (angle * 100) % 80;
            for (let x = gridOffset; x < w; x += 80) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = gridOffset; y < h; y += 80) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            // Bouncing ball
            self.ball.x += self.ball.vx;
            self.ball.y += self.ball.vy;
            if (self.ball.x - self.ball.r < 0 || self.ball.x + self.ball.r > w) {
                self.ball.vx *= -1;
                self.ball.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
            }
            if (self.ball.y - self.ball.r < 0 || self.ball.y + self.ball.r > h) {
                self.ball.vy *= -1;
                self.ball.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
            }

            ctx.shadowColor = self.ball.color;
            ctx.shadowBlur = 30;
            ctx.fillStyle = self.ball.color;
            ctx.beginPath();
            ctx.arc(self.ball.x, self.ball.y, self.ball.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Center Title Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 56px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('VR CINEMA 3D ENGINE', w / 2, h / 2 - 20);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '24px Outfit, sans-serif';
            ctx.fillText('Load your local video file or enjoy the live demo stream', w / 2, h / 2 + 30);

            // Clock Timestamp
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100);
            ctx.fillStyle = '#ffb703';
            ctx.font = 'bold 36px monospace';
            ctx.fillText(timeStr, w / 2, h / 2 + 90);

            // Update texture on A-Frame screen element
            const screenEl = document.getElementById('cinema-screen');
            if (screenEl && screenEl.object3DMap.mesh) {
                const material = screenEl.object3DMap.mesh.material;
                if (material && material.map) {
                    material.map.needsUpdate = true;
                }
            }

            self.animFrameId = requestAnimationFrame(renderFrame);
        }

        renderFrame();
    },

    setupEventListeners: function () {
        // Play / Pause Toggle
        document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
        document.getElementById('vr-play-btn').addEventListener('click', () => this.togglePlay());

        // Seek Bar Scrubbing
        const scrubBar = document.getElementById('scrub-bar');
        scrubBar.addEventListener('input', (e) => {
            if (!this.useDemoGenerator && this.video.duration) {
                const targetTime = (e.target.value / 100) * this.video.duration;
                this.video.currentTime = targetTime;
            }
        });

        // Volume Slider
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });

        // File Input Picker
        const fileInput = document.getElementById('video-file-input');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadLocalVideoFile(file);
            }
        });

        // URL / Stream Link Input Button
        const btnUrlStream = document.getElementById('btn-url-stream');
        if (btnUrlStream) {
            btnUrlStream.addEventListener('click', () => {
                const url = prompt('Enter Direct Video or HLS Stream URL (.mp4, .mkv, .webm, .m3u8):');
                if (url) this.loadVideoUrl(url);
            });
        }

        // Screen Size Selector
        const sizeSelect = document.getElementById('select-screen-size');
        sizeSelect.addEventListener('change', (e) => this.setScreenSize(e.target.value));

        // Theme Selector
        const themeSelect = document.getElementById('select-theme');
        themeSelect.addEventListener('change', (e) => this.applyTheme(e.target.value));

        // 3D Stereo Mode Selector
        const stereoSelect = document.getElementById('select-stereo-mode');
        stereoSelect.addEventListener('change', (e) => this.setStereoMode(e.target.value));

        // Seat Selector Buttons
        document.querySelectorAll('.btn-seat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const seatKey = e.currentTarget.getAttribute('data-seat');
                const manager = document.getElementById('rig').components['vr-controller-manager'];
                if (manager) manager.moveToSeat(seatKey);
            });
        });

        // Mobile QR Modal Trigger
        document.getElementById('btn-qr-modal').addEventListener('click', () => {
            if (window.NetworkQR) window.NetworkQR.show();
        });

        // Video Timeupdate for HUD progress bar
        this.video.addEventListener('timeupdate', () => {
            if (!this.useDemoGenerator && this.video.duration) {
                const pct = (this.video.currentTime / this.video.duration) * 100;
                scrubBar.value = pct;
                document.getElementById('time-current').innerText = this.formatTime(this.video.currentTime);
                document.getElementById('time-duration').innerText = this.formatTime(this.video.duration);
            }
        });

        // 3D VR Floating Menu Raycast Event Listeners
        this.setup3DVRMenuEvents();
    },

    setup3DVRMenuEvents: function () {
        const vrSeekBack = document.getElementById('vr-seek-back-btn');
        if (vrSeekBack) {
            vrSeekBack.addEventListener('click', () => this.seekDelta(-10));
        }

        const vrSeekFwd = document.getElementById('vr-seek-fwd-btn');
        if (vrSeekFwd) {
            vrSeekFwd.addEventListener('click', () => this.seekDelta(10));
        }

        const vrThemeBtn = document.getElementById('vr-theme-btn');
        if (vrThemeBtn) {
            vrThemeBtn.addEventListener('click', () => {
                const themes = ['grand-velvet', 'cyberpunk', 'cozy-home'];
                const cur = document.getElementById('select-theme').value;
                const nextIdx = (themes.indexOf(cur) + 1) % themes.length;
                const nextTheme = themes[nextIdx];
                document.getElementById('select-theme').value = nextTheme;
                this.applyTheme(nextTheme);
            });
        }

        const vrStereoBtn = document.getElementById('vr-stereo-btn');
        if (vrStereoBtn) {
            vrStereoBtn.addEventListener('click', () => {
                const modes = ['mono', 'sbs', 'ou'];
                const cur = document.getElementById('select-stereo-mode').value;
                const nextIdx = (modes.indexOf(cur) + 1) % modes.length;
                const nextMode = modes[nextIdx];
                document.getElementById('select-stereo-mode').value = nextMode;
                this.setStereoMode(nextMode);
            });
        }
    },

    togglePlay: function () {
        const playBtn = document.getElementById('btn-play');
        const vrPlayText = document.getElementById('vr-play-text');

        if (this.useDemoGenerator) {
            this.isPlaying = !this.isPlaying;
            if (this.isPlaying) {
                if (!this.animFrameId) this.startDemoGenerator();
            } else {
                if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        } else {
            if (this.video.paused) {
                this.video.play();
                this.isPlaying = true;
            } else {
                this.video.pause();
                this.isPlaying = false;
            }
        }

        playBtn.innerText = this.isPlaying ? '⏸ Pause' : '▶ Play';
        if (vrPlayText) vrPlayText.setAttribute('value', this.isPlaying ? 'PAUSE' : 'PLAY');
    },

    loadLocalVideoFile: function (file) {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.useDemoGenerator = false;

        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }

        const fileName = file.name.toLowerCase();
        const objectUrl = URL.createObjectURL(file);

        if (fileName.endsWith('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            this.hlsInstance = new Hls();
            this.hlsInstance.loadSource(objectUrl);
            this.hlsInstance.attachMedia(this.video);
            this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                this.video.play();
                this.isPlaying = true;
                document.getElementById('btn-play').innerText = '⏸ Pause';
            });
        } else {
            this.video.src = objectUrl;
            this.video.load();
            this.video.play().then(() => {
                this.isPlaying = true;
                document.getElementById('btn-play').innerText = '⏸ Pause';
            }).catch(err => {
                console.log('Video play trigger:', err);
                this.isPlaying = false;
                document.getElementById('btn-play').innerText = '▶ Play';
            });
        }
        
        // Re-point screen texture to HTML5 video element
        const screenEl = document.getElementById('cinema-screen');
        if (screenEl) screenEl.setAttribute('src', '#cinema-video');
    },

    loadVideoUrl: function (urlStr) {
        if (!urlStr || !urlStr.trim()) return;
        urlStr = urlStr.trim();

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.useDemoGenerator = false;

        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }

        if (urlStr.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            this.hlsInstance = new Hls();
            this.hlsInstance.loadSource(urlStr);
            this.hlsInstance.attachMedia(this.video);
            this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                this.video.play();
                this.isPlaying = true;
                document.getElementById('btn-play').innerText = '⏸ Pause';
            });
        } else {
            this.video.src = urlStr;
            this.video.load();
            this.video.play().then(() => {
                this.isPlaying = true;
                document.getElementById('btn-play').innerText = '⏸ Pause';
            }).catch(err => {
                console.log('Video URL play trigger:', err);
                this.isPlaying = false;
                document.getElementById('btn-play').innerText = '▶ Play';
            });
        }

        const screenEl = document.getElementById('cinema-screen');
        if (screenEl) screenEl.setAttribute('src', '#cinema-video');
    },

    seekDelta: function (seconds) {
        if (!this.useDemoGenerator && this.video.duration) {
            this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
        }
    },

    setVolume: function (vol) {
        this.video.volume = vol;
    },

    setScreenSize: function (preset) {
        const screen = document.getElementById('cinema-screen');
        if (!screen) return;

        if (preset === 'imax') {
            screen.setAttribute('scale', '1.4 1.4 1.4');
        } else if (preset === 'ultrawide') {
            screen.setAttribute('scale', '1.6 1.0 1.2');
        } else { // standard
            screen.setAttribute('scale', '1.0 1.0 1.0');
        }
    },

    setStereoMode: function (mode) {
        const screen = document.getElementById('cinema-screen');
        if (screen) {
            screen.setAttribute('stereo-video', `mode: ${mode}`);
        }
    },

    applyTheme: function (themeName) {
        const grandVelvetEnv = document.getElementById('env-grand-velvet');
        const cyberpunkEnv = document.getElementById('env-cyberpunk');
        const cozyHomeEnv = document.getElementById('env-cozy-home');

        if (grandVelvetEnv) grandVelvetEnv.setAttribute('visible', themeName === 'grand-velvet');
        if (cyberpunkEnv) cyberpunkEnv.setAttribute('visible', themeName === 'cyberpunk');
        if (cozyHomeEnv) cozyHomeEnv.setAttribute('visible', themeName === 'cozy-home');

        // Adjust ambient ceiling lighting color & intensity
        const ambientLight = document.getElementById('ambient-light');
        if (ambientLight) {
            if (themeName === 'cyberpunk') {
                ambientLight.setAttribute('light', 'color: #0d1b2a; intensity: 0.35');
            } else if (themeName === 'cozy-home') {
                ambientLight.setAttribute('light', 'color: #3d2b1f; intensity: 0.45');
            } else {
                ambientLight.setAttribute('light', 'color: #1a1c23; intensity: 0.4');
            }
        }
    },

    setupDynamicScreenGlow: function () {
        // Sample screen canvas pixels at 10 FPS to update screen glow spotlight
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 32;
        glowCanvas.height = 18;
        const glowCtx = glowCanvas.getContext('2d');

        setInterval(() => {
            if (!this.screenGlowLight) return;

            let source = null;
            if (this.useDemoGenerator && this.canvasGen) {
                source = this.canvasGen;
            } else if (!this.video.paused && this.video.readyState >= 2) {
                source = this.video;
            }

            if (!source) return;

            glowCtx.drawImage(source, 0, 0, 32, 18);
            const imgData = glowCtx.getImageData(0, 0, 32, 18).data;

            let r = 0, g = 0, b = 0;
            const count = imgData.length / 4;

            for (let i = 0; i < imgData.length; i += 4) {
                r += imgData[i];
                g += imgData[i + 1];
                b += imgData[i + 2];
            }

            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);

            const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const intensity = 0.5 + luminance * 1.5;

            this.screenGlowLight.setAttribute('light', `color: ${hexColor}; intensity: ${intensity.toFixed(2)}`);
        }, 100);
    },

    setupSpatialAudio: function () {
        // Web Audio API spatial panner attached to screen position
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            const source = this.audioCtx.createMediaElementSource(this.video);
            this.pannerNode = this.audioCtx.createPanner();
            
            this.pannerNode.panningModel = 'HRTF';
            this.pannerNode.distanceModel = 'inverse';
            this.pannerNode.refDistance = 1;
            this.pannerNode.maxDistance = 10000;
            this.pannerNode.rolloffFactor = 1;
            
            // Screen 3D position (0, 3, -8)
            this.pannerNode.setPosition(0, 3, -8);
            
            source.connect(this.pannerNode);
            this.pannerNode.connect(this.audioCtx.destination);
        } catch (e) {
            console.log('[Spatial Audio] Initialized with standard audio pipeline fallback.');
        }
    },

    formatTime: function (sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.CinemaApp.init();
    // Start initial demo generator canvas stream
    window.CinemaApp.startDemoGenerator();
});
