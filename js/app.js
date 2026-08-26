/**
 * Pure WebXR Cinema Engine (No Raw Three.js Hacks)
 * Handles Native Video Playback, HLS Streaming, Audio Unmuting,
 * Progress HUD Sync, and A-Frame Head-Tracked Cardboard VR Mode.
 */

window.CinemaApp = {
    video: null,
    screenEl: null,
    hlsInstance: null,

    init: function () {
        this.video = document.getElementById('cinema-video');
        this.screenEl = document.getElementById('cinema-screen');

        this.setupEventListeners();
        this.setupVideoEvents();
    },

    setupEventListeners: function () {
        // Play / Pause Button
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }

        // Scrub Bar Seeking
        const scrubBar = document.getElementById('scrub-bar');
        if (scrubBar) {
            scrubBar.addEventListener('input', (e) => {
                if (this.video && this.video.duration) {
                    const targetTime = (e.target.value / 100) * this.video.duration;
                    this.video.currentTime = targetTime;
                }
            });
        }

        // Volume Control Slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                if (this.video) {
                    this.video.volume = e.target.value / 100;
                    if (this.video.volume > 0) this.video.muted = false;
                }
            });
        }

        // Local File Input
        const fileInput = document.getElementById('video-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.loadLocalFile(file);
            });
        }

        // Stream URL Button
        const btnUrlStream = document.getElementById('btn-url-stream');
        if (btnUrlStream) {
            btnUrlStream.addEventListener('click', () => {
                const url = prompt('Enter Video or Stream URL (.mp4, .mkv, .webm, .m3u8):');
                if (url) this.loadVideoUrl(url);
            });
        }

        // 3D Stereo Video Mode (Mono, Side-by-Side 3D, Over-Under 3D)
        const stereoSelect = document.getElementById('select-stereo-mode');
        if (stereoSelect) {
            stereoSelect.addEventListener('change', (e) => {
                if (this.screenEl) {
                    this.screenEl.setAttribute('stereo-video', `mode: ${e.target.value}`);
                }
            });
        }
    },

    setupVideoEvents: function () {
        if (!this.video) return;

        // Sync HUD scrub bar on time update
        this.video.addEventListener('timeupdate', () => {
            if (this.video.duration) {
                const scrubBar = document.getElementById('scrub-bar');
                if (scrubBar) {
                    scrubBar.value = (this.video.currentTime / this.video.duration) * 100;
                }
                const curText = document.getElementById('time-current');
                const durText = document.getElementById('time-duration');
                if (curText) curText.innerText = this.formatTime(this.video.currentTime);
                if (durText) durText.innerText = this.formatTime(this.video.duration);
            }
        });

        // Update Play Button state on video play/pause
        this.video.addEventListener('play', () => this.updatePlayUI(true));
        this.video.addEventListener('pause', () => this.updatePlayUI(false));
        this.video.addEventListener('ended', () => this.updatePlayUI(false));
    },

    togglePlay: function () {
        if (!this.video) return;

        if (this.video.paused) {
            this.video.muted = false;
            this.video.play().catch(err => {
                console.warn('[Cinema Engine] Play blocked, trying muted play:', err);
                this.video.muted = true;
                this.video.play();
            });
        } else {
            this.video.pause();
        }
    },

    updatePlayUI: function (isPlaying) {
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.innerText = isPlaying ? '⏸ Pause' : '▶ Play';
        }
    },

    loadLocalFile: function (file) {
        if (!this.video) return;

        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }

        const objectUrl = URL.createObjectURL(file);
        const fileName = file.name.toLowerCase();

        this.video.muted = false;

        if (fileName.endsWith('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            this.hlsInstance = new Hls();
            this.hlsInstance.loadSource(objectUrl);
            this.hlsInstance.attachMedia(this.video);
            this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                this.startPlayback();
            });
        } else {
            this.video.src = objectUrl;
            this.video.load();
            this.startPlayback();
        }
    },

    loadVideoUrl: function (urlStr) {
        if (!this.video || !urlStr) return;
        urlStr = urlStr.trim();

        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }

        this.video.muted = false;

        if (urlStr.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            this.hlsInstance = new Hls();
            this.hlsInstance.loadSource(urlStr);
            this.hlsInstance.attachMedia(this.video);
            this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                this.startPlayback();
            });
        } else {
            this.video.src = urlStr;
            this.video.load();
            this.startPlayback();
        }
    },

    startPlayback: function () {
        if (this.screenEl) {
            // Update A-Frame screen material source
            this.screenEl.setAttribute('src', '#cinema-video');
        }

        this.video.play().then(() => {
            this.updatePlayUI(true);
        }).catch(err => {
            console.warn('[Cinema Engine] Muted playback fallback triggered:', err);
            this.video.muted = true;
            this.video.play().then(() => this.updatePlayUI(true));
        });
    },

    formatTime: function (sec) {
        if (isNaN(sec) || !isFinite(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.CinemaApp.init();
});
