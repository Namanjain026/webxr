/**
 * Playback & Media Player Controller
 * Manages video playback state, time formatting, seeking, volume, and fullscreen modes.
 */

window.VRCinemaPlayer = {
    videoElement: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0,

    init: function (videoEl) {
        this.videoElement = videoEl;
        this.bindEvents();
    },

    bindEvents: function () {
        if (!this.videoElement) return;

        this.videoElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayBtnUI();
        });

        this.videoElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayBtnUI();
        });

        this.videoElement.addEventListener('timeupdate', () => {
            this.currentTime = this.videoElement.currentTime;
            this.duration = this.videoElement.duration || 0;
            this.updateTimeUI();
        });
    },

    togglePlay: function () {
        if (!this.videoElement || !this.videoElement.src) return;
        if (this.videoElement.paused) {
            this.videoElement.play().catch(err => console.warn('Play interrupted:', err));
        } else {
            this.videoElement.pause();
        }
    },

    seek: function (percentage) {
        if (!this.videoElement || !this.videoElement.duration) return;
        this.videoElement.currentTime = (percentage / 100) * this.videoElement.duration;
    },

    setVolume: function (val) {
        if (!this.videoElement) return;
        this.videoElement.volume = Math.max(0, Math.min(1, val));
    },

    toggleMute: function () {
        if (!this.videoElement) return;
        this.videoElement.muted = !this.videoElement.muted;
        return this.videoElement.muted;
    },

    toggleFullscreen: function () {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen error:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    },

    formatTime: function (seconds) {
        if (isNaN(seconds) || seconds === 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const hrs = Math.floor(mins / 60);
        const remainingMins = mins % 60;

        if (hrs > 0) {
            return `${hrs}:${remainingMins < 10 ? '0' : ''}${remainingMins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },

    updatePlayBtnUI: function () {
        const btn = document.getElementById('play-pause-btn');
        if (btn) {
            btn.innerHTML = this.isPlaying
                ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        }
    },

    updateTimeUI: function () {
        const currentEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration-time');
        const seekSlider = document.getElementById('seek-slider');

        if (currentEl) currentEl.innerText = this.formatTime(this.currentTime);
        if (durationEl) durationEl.innerText = this.formatTime(this.duration);

        if (seekSlider && this.duration > 0) {
            seekSlider.value = (this.currentTime / this.duration) * 100;
        }
    }
};
