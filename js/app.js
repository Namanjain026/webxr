/**
 * Native SBS VR Cinema Engine (Pure Three.js + Scissor Stereo Renderer)
 * 100% Reliable Side-by-Side Dual-Barrel Display with Gyro Head Tracking.
 */

window.SBSCinemaApp = {
    scene: null,
    renderer: null,
    cameraRig: null,
    cameraLeft: null,
    cameraRight: null,
    screenMesh: null,
    video: null,
    videoTexture: null,
    hlsInstance: null,

    // Head Tracking State
    gyroEnabled: false,
    gyroBaseQuat: new THREE.Quaternion(),
    orientationQuat: new THREE.Quaternion(),
    isPointerDown: false,
    pointerStartX: 0,
    pointerStartY: 0,
    rotYaw: 0,
    rotPitch: 0,

    init: function () {
        this.video = document.getElementById('cinema-video');
        this.setupThreeScene();
        this.setupEventListeners();
        this.setupGyroTracking();
        this.startRenderLoop();

        // Load initial default sample video
        this.loadSampleVideo();
    },

    setupThreeScene: function () {
        const canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setScissorTest(true);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0b10);

        // Camera Rig & IPD Separation (64mm standard IPD)
        this.cameraRig = new THREE.Group();
        this.cameraRig.position.set(0, 0, 3.8);
        this.scene.add(this.cameraRig);

        const aspect = (window.innerWidth / 2) / window.innerHeight;
        this.cameraLeft = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
        this.cameraLeft.position.set(-0.032, 0, 0);
        this.cameraRig.add(this.cameraLeft);

        this.cameraRight = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
        this.cameraRight.position.set(0.032, 0, 0);
        this.cameraRig.add(this.cameraRight);

        // Create Curved Screen Geometry
        const width = 7.0;
        const height = 3.9;
        const radius = 9.0;
        const segments = 32;

        const geometry = new THREE.PlaneGeometry(width, height, segments, 1);
        const pos = geometry.attributes.position;

        // Curve the screen along Z axis towards viewer
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = Math.cos((x / width) * 0.45) * 0.4 - 0.4;
            pos.setZ(i, z);
        }
        geometry.computeVertexNormals();

        // Screen Video Material
        this.videoTexture = new THREE.VideoTexture(this.video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.generateMipmaps = false;
        if (THREE.SRGBColorSpace) this.videoTexture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({ map: this.videoTexture, side: THREE.DoubleSide });
        this.screenMesh = new THREE.Mesh(geometry, material);
        this.screenMesh.position.set(0, 0, -2);
        this.scene.add(this.screenMesh);

        // Subtle Ambient Ambient Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        // Window Resize Handler
        window.addEventListener('resize', () => this.onWindowResize());
    },

    onWindowResize: function () {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);

        const aspect = (width / 2) / height;
        this.cameraLeft.aspect = aspect;
        this.cameraLeft.updateProjectionMatrix();

        this.cameraRight.aspect = aspect;
        this.cameraRight.updateProjectionMatrix();
    },

    startRenderLoop: function () {
        const self = this;

        function render() {
            requestAnimationFrame(render);

            if (self.video && !self.video.paused) {
                self.videoTexture.needsUpdate = true;

                // Sync UI scrub bar
                if (self.video.duration) {
                    const scrubBar = document.getElementById('scrub-bar');
                    if (scrubBar) scrubBar.value = (self.video.currentTime / self.video.duration) * 100;

                    const curText = document.getElementById('time-current');
                    const durText = document.getElementById('time-duration');
                    if (curText) curText.innerText = self.formatTime(self.video.currentTime);
                    if (durText) durText.innerText = self.formatTime(self.video.duration);
                }
            }

            // Apply Touch Drag Pitch/Yaw
            self.cameraRig.rotation.x = self.rotPitch;
            self.cameraRig.rotation.y = self.rotYaw;

            const w = window.innerWidth;
            const h = window.innerHeight;
            const halfW = Math.floor(w / 2);

            // Render Left Eye Scissor
            self.renderer.setViewport(0, 0, halfW, h);
            self.renderer.setScissor(0, 0, halfW, h);
            self.renderer.render(self.scene, self.cameraLeft);

            // Render Right Eye Scissor
            self.renderer.setViewport(halfW, 0, halfW, h);
            self.renderer.setScissor(halfW, 0, halfW, h);
            self.renderer.render(self.scene, self.cameraRight);
        }

        render();
    },

    setupEventListeners: function () {
        // Toggle Control Panel via Top-Right Menu Icon ☰
        const menuBtn = document.getElementById('menu-toggle-btn');
        const controlPanel = document.getElementById('control-panel');
        const closeBtn = document.getElementById('close-panel-btn');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                controlPanel.classList.toggle('hidden');
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                controlPanel.classList.add('hidden');
            });
        }

        // Play / Pause Button
        const playBtn = document.getElementById('btn-play');
        if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());

        // Scrub Bar Seeking
        const scrubBar = document.getElementById('scrub-bar');
        if (scrubBar) {
            scrubBar.addEventListener('input', (e) => {
                if (this.video && this.video.duration) {
                    this.video.currentTime = (e.target.value / 100) * this.video.duration;
                }
            });
        }

        // Volume Slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                if (this.video) {
                    this.video.volume = e.target.value / 100;
                    if (this.video.volume > 0) this.video.muted = false;
                }
            });
        }

        // File Input
        const fileInput = document.getElementById('video-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.loadLocalFile(file);
            });
        }

        // Stream URL Button
        const btnStream = document.getElementById('btn-stream-url');
        if (btnStream) {
            btnStream.addEventListener('click', () => {
                const url = prompt('Enter Video File or HLS Stream URL (.mp4, .mkv, .webm, .m3u8):');
                if (url) this.loadVideoUrl(url);
            });
        }

        // Recenter View Button
        const btnRecenter = document.getElementById('btn-recenter');
        if (btnRecenter) {
            btnRecenter.addEventListener('click', () => {
                this.rotYaw = 0;
                this.rotPitch = 0;
            });
        }

        // iOS Gyro Permission Button
        const btnGyro = document.getElementById('btn-gyro-perm');
        if (btnGyro) {
            btnGyro.addEventListener('click', () => this.requestGyroPermission());
        }

        // Touch / Mouse Drag Pan Head Tracking
        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#control-panel') || e.target.closest('#menu-toggle-btn')) return;
            this.isPointerDown = true;
            this.pointerStartX = e.clientX;
            this.pointerStartY = e.clientY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isPointerDown) return;
            const deltaX = e.clientX - this.pointerStartX;
            const deltaY = e.clientY - this.pointerStartY;
            this.pointerStartX = e.clientX;
            this.pointerStartY = e.clientY;

            this.rotYaw -= deltaX * 0.003;
            this.rotPitch -= deltaY * 0.003;
            this.rotPitch = Math.max(-1.2, Math.min(1.2, this.rotPitch));
        });

        window.addEventListener('pointerup', () => { this.isPointerDown = false; });
    },

    setupGyroTracking: function () {
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.alpha === null || e.beta === null) return;
                const alpha = THREE.MathUtils.degToRad(e.alpha || 0);
                const beta = THREE.MathUtils.degToRad(e.beta || 0);
                const gamma = THREE.MathUtils.degToRad(e.gamma || 0);

                // Convert smartphone gyro angles to camera rotation
                if (!this.isPointerDown) {
                    this.rotPitch = (beta - Math.PI / 2) * 0.6;
                    this.rotYaw = -gamma * 0.8;
                }
            }, true);
        }
    },

    requestGyroPermission: function () {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(state => {
                if (state === 'granted') alert('Gyroscope Head Tracking Enabled!');
            }).catch(console.error);
        } else {
            alert('Gyroscope Head Tracking is active! Tilt your phone to look around.');
        }
    },

    togglePlay: function () {
        if (!this.video) return;

        if (this.video.paused) {
            this.video.muted = false;
            this.video.play().then(() => this.updatePlayUI(true)).catch(err => {
                console.warn('[SBS Engine] Unmuted play blocked, retrying muted:', err);
                this.video.muted = true;
                this.video.play().then(() => this.updatePlayUI(true));
            });
        } else {
            this.video.pause();
            this.updatePlayUI(false);
        }
    },

    updatePlayUI: function (isPlaying) {
        const playBtn = document.getElementById('btn-play');
        if (playBtn) playBtn.innerText = isPlaying ? '⏸ Pause' : '▶ Play';
    },

    loadSampleVideo: function () {
        this.video.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        this.video.load();
    },

    loadLocalFile: function (file) {
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
                this.video.play();
                this.updatePlayUI(true);
            });
        } else {
            this.video.src = objectUrl;
            this.video.load();
            this.video.play().then(() => this.updatePlayUI(true));
        }

        document.getElementById('control-panel').classList.add('hidden');
    },

    loadVideoUrl: function (urlStr) {
        if (!urlStr) return;
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
                this.video.play();
                this.updatePlayUI(true);
            });
        } else {
            this.video.src = urlStr;
            this.video.load();
            this.video.play().then(() => this.updatePlayUI(true));
        }

        document.getElementById('control-panel').classList.add('hidden');
    },

    formatTime: function (sec) {
        if (isNaN(sec) || !isFinite(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.SBSCinemaApp.init();
});
