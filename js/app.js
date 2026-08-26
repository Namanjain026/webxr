/**
 * VR Cinema Application Orchestrator
 * Connects UI, Media Pipeline, Gyro Sensors, VR Renderer, and Settings.
 */

window.VRCinemaApp = {
    hudTimeout: null,

    init: function () {
        console.log('[VRCinemaApp] Initializing VR Cinema Web App...');

        const videoEl = document.getElementById('hidden-video-player');
        const canvasEl = document.getElementById('vr-canvas');

        // 1. Initialize Subsystems
        window.VRCinemaSettings.init();
        window.VRCinemaGyro.init();
        window.VRCinemaLocalMedia.init(videoEl);
        window.VRCinemaPlayer.init(videoEl);
        window.VRCinemaVR.init(canvasEl, videoEl);
        window.VRCinemaCalibration.init();

        // 2. Bind UI Elements & Event Listeners
        this.bindUI();

        // 3. Auto-Hide HUD logic
        this.setupHUDAutoHide();

        // 4. Start Render Loop
        this.startRenderLoop();

        console.log('[VRCinemaApp] Initialization Complete.');
    },

    bindUI: function () {
        const settings = window.VRCinemaSettings;

        // Toggle Control Drawer (Menu Button ☰)
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const controlPanel = document.getElementById('control-hud');

        if (menuToggleBtn && controlPanel) {
            menuToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                controlPanel.classList.toggle('visible');
            });
        }

        // Close HUD when clicking background
        document.getElementById('vr-viewport').addEventListener('click', (e) => {
            if (e.target.closest('#control-hud') || e.target.closest('#menu-toggle-btn') || e.target.closest('.modal-overlay')) {
                return;
            }
            if (controlPanel && controlPanel.classList.contains('visible')) {
                controlPanel.classList.remove('visible');
            }
        });

        // 2D vs SBS Mode Selector
        const mode2DBtn = document.getElementById('mode-2d-btn');
        const modeSBSBtn = document.getElementById('mode-sbs-btn');

        if (mode2DBtn && modeSBSBtn) {
            const updateModeButtons = () => {
                const mode = settings.get('displayMode');
                mode2DBtn.classList.toggle('active', mode === '2d');
                modeSBSBtn.classList.toggle('active', mode === 'sbs');
            };
            updateModeButtons();

            mode2DBtn.addEventListener('click', () => {
                settings.set('displayMode', '2d');
                updateModeButtons();
            });

            modeSBSBtn.addEventListener('click', () => {
                settings.set('displayMode', 'sbs');
                updateModeButtons();
            });
        }

        // Play / Pause Button
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                window.VRCinemaPlayer.togglePlay();
            });
        }

        // Seek Slider
        const seekSlider = document.getElementById('seek-slider');
        if (seekSlider) {
            seekSlider.addEventListener('input', (e) => {
                window.VRCinemaPlayer.seek(e.target.value);
            });
        }

        // Volume Slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                window.VRCinemaPlayer.setVolume(e.target.value / 100);
            });
        }

        // Fullscreen Button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                window.VRCinemaPlayer.toggleFullscreen();
            });
        }

        // Recenter Gyro Button
        const recenterBtn = document.getElementById('recenter-gyro-btn');
        if (recenterBtn) {
            recenterBtn.addEventListener('click', () => {
                window.VRCinemaGyro.recenter();
                window.VRCinemaCalibration.showToast('View Recentered!');
            });
        }

        // Enable Gyro Sensor Button (Permissions on iOS)
        const enableGyroBtn = document.getElementById('enable-gyro-btn');
        if (enableGyroBtn) {
            enableGyroBtn.addEventListener('click', async () => {
                const granted = await window.VRCinemaGyro.requestPermission();
                if (granted) {
                    window.VRCinemaCalibration.showToast('Gyroscope Active!');
                }
            });
        }

        // Local Video File Input
        const videoFileInput = document.getElementById('local-video-input');
        if (videoFileInput) {
            videoFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const media = await window.VRCinemaLocalMedia.loadVideoFile(file);
                        window.VRCinemaVR.setVideoSourceActive();
                        window.VRCinemaPlayer.togglePlay();
                        settings.set('sourceType', 'local-video');
                        window.VRCinemaCalibration.showToast(`Loaded: ${file.name}`);
                    } catch (err) {
                        alert('Could not play selected video file.');
                    }
                }
            });
        }

        // Local Image File Input
        const imageFileInput = document.getElementById('local-image-input');
        if (imageFileInput) {
            imageFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const media = await window.VRCinemaLocalMedia.loadImageFile(file);
                        window.VRCinemaVR.setMediaTexture(media.texture);
                        settings.set('sourceType', 'image');
                        window.VRCinemaCalibration.showToast(`Loaded Image: ${file.name}`);
                    } catch (err) {
                        alert('Could not load selected image.');
                    }
                }
            });
        }

        // YouTube Input Modal
        const youtubeLoadBtn = document.getElementById('youtube-load-btn');
        const youtubeUrlInput = document.getElementById('youtube-url-input');

        if (youtubeLoadBtn && youtubeUrlInput) {
            youtubeLoadBtn.addEventListener('click', () => {
                const url = youtubeUrlInput.value.trim();
                const ytData = window.VRCinemaYouTube.loadUrl(url);
                if (ytData) {
                    settings.set('sourceType', 'youtube');
                    this.openYouTubeModal(ytData.embedUrl);
                }
            });
        }

        // Calibration Modal Toggle
        const openCalibBtn = document.getElementById('open-calibration-btn');
        const closeCalibBtn = document.getElementById('close-calibration-btn');
        const calibModal = document.getElementById('calibration-modal');

        if (openCalibBtn && calibModal) {
            openCalibBtn.addEventListener('click', () => {
                calibModal.classList.add('visible');
            });
        }
        if (closeCalibBtn && calibModal) {
            closeCalibBtn.addEventListener('click', () => {
                calibModal.classList.remove('visible');
            });
        }
    },

    openYouTubeModal: function (embedUrl) {
        let ytModal = document.getElementById('youtube-modal');
        if (!ytModal) {
            ytModal = document.createElement('div');
            ytModal.id = 'youtube-modal';
            ytModal.className = 'modal-overlay visible';
            ytModal.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <h3>YouTube Player Adapter</h3>
                        <button class="close-btn" id="close-yt-modal">&times;</button>
                    </div>
                    <div class="modal-body" style="padding:0;">
                        <iframe id="yt-iframe" src="${embedUrl}" width="100%" height="360" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                    </div>
                </div>
            `;
            document.body.appendChild(ytModal);

            document.getElementById('close-yt-modal').addEventListener('click', () => {
                ytModal.classList.remove('visible');
            });
        } else {
            document.getElementById('yt-iframe').src = embedUrl;
            ytModal.classList.add('visible');
        }
    },

    setupHUDAutoHide: function () {
        const hud = document.getElementById('control-hud');

        const resetTimer = () => {
            if (hud) hud.classList.remove('autohide');
            clearTimeout(this.hudTimeout);
            this.hudTimeout = setTimeout(() => {
                if (hud && !document.querySelector('.modal-overlay.visible')) {
                    hud.classList.add('autohide');
                }
            }, 4000);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('touchstart', resetTimer);
    },

    startRenderLoop: function () {
        const animate = () => {
            requestAnimationFrame(animate);
            window.VRCinemaVR.render(window.VRCinemaSettings.state);
        };
        animate();
    }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.VRCinemaApp.init();
});
