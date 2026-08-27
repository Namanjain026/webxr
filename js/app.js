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

        // 3. Setup Mobile Touch Pinch-to-Zoom & Wheel Controls
        this.setupZoomAndGestureControls();

        // 4. Auto-Hide HUD logic
        this.setupHUDAutoHide();

        // 5. Start Render Loop
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

        // HUD Quick Zoom Buttons
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomResetBtn = document.getElementById('zoom-reset-btn');
        const zoomInBtn = document.getElementById('zoom-in-btn');

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                const curScale = settings.get('screenScale') || 1.0;
                const newScale = Math.max(0.4, Math.round((curScale - 0.1) * 100) / 100);
                settings.set('screenScale', newScale);
                window.VRCinemaCalibration.updateUIFromSettings();
            });
        }
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                settings.set('screenScale', 1.0);
                settings.set('screenDistance', 4.0);
                settings.set('screenOffsetX', 0);
                settings.set('screenOffsetY', 0);
                settings.set('maskSeparation', 1.0);
                window.VRCinemaCalibration.updateUIFromSettings();
                window.VRCinemaCalibration.showToast('Zoom & Position Reset');
            });
        }
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                const curScale = settings.get('screenScale') || 1.0;
                const newScale = Math.min(2.5, Math.round((curScale + 0.1) * 100) / 100);
                settings.set('screenScale', newScale);
                window.VRCinemaCalibration.updateUIFromSettings();
            });
        }
    },

    setupZoomAndGestureControls: function () {
        const viewport = document.getElementById('vr-viewport');
        if (!viewport) return;

        let touchStartDist = 0;
        let initialScale = 1.0;
        let touchStartPos = null;
        let initialOffsetX = 0;
        let initialOffsetY = 0;
        let lastTapTime = 0;

        const isInteractive = (target) => {
            return target.closest('#control-hud') || 
                   target.closest('#menu-toggle-btn') || 
                   target.closest('.modal-overlay') || 
                   target.closest('#calibration-modal');
        };

        // --- 1. Pinch-to-Zoom & Touch Drag Gestures ---
        viewport.addEventListener('touchstart', (e) => {
            if (isInteractive(e.target)) return;

            if (e.touches.length === 2) {
                // Two-finger pinch gesture start
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                initialScale = window.VRCinemaSettings.get('screenScale') || 1.0;
            } else if (e.touches.length === 1) {
                // Single finger touch - Double tap detection
                const now = Date.now();
                if (now - lastTapTime < 300) {
                    // Double tap reset
                    window.VRCinemaSettings.set('screenScale', 1.0);
                    window.VRCinemaSettings.set('screenDistance', 4.0);
                    window.VRCinemaSettings.set('screenOffsetX', 0);
                    window.VRCinemaSettings.set('screenOffsetY', 0);
                    window.VRCinemaSettings.set('maskSeparation', 1.0);
                    window.VRCinemaCalibration.updateUIFromSettings();
                    window.VRCinemaCalibration.showToast('Zoom & Position Reset');
                }
                lastTapTime = now;

                touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                initialOffsetX = window.VRCinemaSettings.get('screenOffsetX') || 0;
                initialOffsetY = window.VRCinemaSettings.get('screenOffsetY') || 0;
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (isInteractive(e.target)) return;

            if (e.touches.length === 2 && touchStartDist > 0) {
                // Pinch zoom active
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                if (currentDist > 0) {
                    const scaleFactor = currentDist / touchStartDist;
                    let newScale = initialScale * scaleFactor;
                    newScale = Math.max(0.4, Math.min(2.5, Math.round(newScale * 100) / 100));

                    window.VRCinemaSettings.set('screenScale', newScale);
                    window.VRCinemaCalibration.updateUIFromSettings();
                }
            } else if (e.touches.length === 1 && touchStartPos) {
                // Single-finger drag pan position
                const deltaX = (e.touches[0].clientX - touchStartPos.x) / window.innerWidth * 4.0;
                const deltaY = -(e.touches[0].clientY - touchStartPos.y) / window.innerHeight * 4.0;

                let newX = Math.max(-3.0, Math.min(3.0, Math.round((initialOffsetX + deltaX) * 10) / 10));
                let newY = Math.max(-3.0, Math.min(3.0, Math.round((initialOffsetY + deltaY) * 10) / 10));

                window.VRCinemaSettings.set('screenOffsetX', newX);
                window.VRCinemaSettings.set('screenOffsetY', newY);
                window.VRCinemaCalibration.updateUIFromSettings();
            }
        }, { passive: true });

        viewport.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) touchStartDist = 0;
            if (e.touches.length === 0) touchStartPos = null;
        });

        // --- 2. Mouse Wheel Scroll Zoom (Desktop / Trackpad) ---
        viewport.addEventListener('wheel', (e) => {
            if (isInteractive(e.target)) return;
            e.preventDefault();

            const currentScale = window.VRCinemaSettings.get('screenScale') || 1.0;
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            let newScale = Math.max(0.4, Math.min(2.5, Math.round((currentScale + delta) * 100) / 100));

            window.VRCinemaSettings.set('screenScale', newScale);
            window.VRCinemaCalibration.updateUIFromSettings();
        }, { passive: false });
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
