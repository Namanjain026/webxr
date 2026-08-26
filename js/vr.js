/**
 * Two-Eye VR Scissor Renderer & Cinema Scene Manager
 * Features:
 * - Scissor dual-viewport stereo rendering (Left Eye / Right Eye)
 * - Independent 3D screen planes (Zoom, Distance, Position X/Y)
 * - Independent lens mask & viewport alignment (Mask Width, Offsets, Center Gap)
 * - 2D and Side-by-Side (SBS 3D) UV cropping
 * - Dynamic Calibration Test Grid Texture
 */

window.VRCinemaVR = {
    renderer: null,
    scene: null,
    cameraLeft: null,
    cameraRight: null,
    
    // Cinema Screen Meshes
    screenMeshLeft: null,
    screenMeshRight: null,

    // Materials
    screenMaterialLeft: null,
    screenMaterialRight: null,
    
    // Textures
    videoTexture: null,
    activeTexture: null,
    gridTexture: null,
    defaultPlaceholderTexture: null,

    init: function (canvasElement, videoElement) {
        this.container = document.getElementById('vr-viewport');
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvasElement,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setScissorTest(true);

        // 2. 3D Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050508);

        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        // 3. Stereo Cameras
        const aspect = (width / 2) / height;
        this.cameraLeft = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.cameraRight = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

        // Stereo IPD (Inter-Pupillary Distance: 64mm)
        this.cameraLeft.position.set(-0.032, 0, 0);
        this.cameraRight.position.set(0.032, 0, 0);

        // 4. Default Placeholder & Video Textures
        this.createDefaultTextures(videoElement);

        // 5. Create Cinema Screens
        this.createCinemaScreens();

        // 6. Window Resize Handler
        window.addEventListener('resize', this.onWindowResize.bind(this));
    },

    createDefaultTextures: function (videoElement) {
        // Video Texture
        this.videoTexture = new THREE.VideoTexture(videoElement);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.colorSpace = THREE.SRGBColorSpace;

        // Test Grid Canvas Texture
        this.gridTexture = this.generateTestGridTexture();

        // Placeholder Canvas Texture
        this.defaultPlaceholderTexture = this.generatePlaceholderTexture();

        // Active texture defaults to placeholder
        this.activeTexture = this.defaultPlaceholderTexture;
    },

    generatePlaceholderTexture: function () {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // Dark VR Cinema gradient background
        const grad = ctx.createRadialGradient(960, 540, 100, 960, 540, 1000);
        grad.addColorStop(0, '#1a1c29');
        grad.addColorStop(1, '#08090f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);

        // Cinema Screen Frame
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
        ctx.lineWidth = 8;
        ctx.strokeRect(40, 40, 1840, 1000);

        // VR Icon & Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 54px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎬 VR Cinema Player', 960, 480);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '32px sans-serif';
        ctx.fillText('Tap ☰ Menu to load a Local Video, Image, or YouTube Stream', 960, 560);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    },

    generateTestGridTexture: function () {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Dark background
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, 1024, 1024);

        // Grid lines
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        const step = 64;
        for (let x = 0; x <= 1024; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1024);
            ctx.stroke();
        }
        for (let y = 0; y <= 1024; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1024, y);
            ctx.stroke();
        }

        // Center Crosshair
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 6;

        ctx.beginPath();
        ctx.moveTo(512, 0);
        ctx.lineTo(512, 1024);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 512);
        ctx.lineTo(1024, 512);
        ctx.stroke();

        // Concentric Circles
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 4;
        [128, 256, 384, 480].forEach(radius => {
            ctx.beginPath();
            ctx.arc(512, 512, radius, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VR BOX ALIGNMENT GRID', 512, 450);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    },

    createCinemaScreens: function () {
        // Plane Geometry: 16:9 aspect ratio (16m wide x 9m high)
        const planeGeo = new THREE.PlaneGeometry(16, 9);

        // Left Screen Material
        this.screenMaterialLeft = new THREE.MeshBasicMaterial({
            map: this.activeTexture,
            side: THREE.DoubleSide
        });

        // Right Screen Material
        this.screenMaterialRight = new THREE.MeshBasicMaterial({
            map: this.activeTexture,
            side: THREE.DoubleSide
        });

        // Left Eye Screen Mesh
        this.screenMeshLeft = new THREE.Mesh(planeGeo, this.screenMaterialLeft);
        this.screenMeshLeft.position.set(0, 0, -4.0);
        this.scene.add(this.screenMeshLeft);

        // Right Eye Screen Mesh
        this.screenMeshRight = new THREE.Mesh(planeGeo.clone(), this.screenMaterialRight);
        this.screenMeshRight.position.set(0, 0, -4.0);
        this.scene.add(this.screenMeshRight);

        // Render layers: 1 for Left Eye, 2 for Right Eye
        this.screenMeshLeft.layers.set(1);
        this.screenMeshRight.layers.set(2);
        this.cameraLeft.layers.enable(1);
        this.cameraRight.layers.enable(2);
    },

    setMediaTexture: function (texture) {
        this.activeTexture = texture;
        this.screenMaterialLeft.map = texture;
        this.screenMaterialRight.map = texture;
        this.screenMaterialLeft.needsUpdate = true;
        this.screenMaterialRight.needsUpdate = true;
    },

    setVideoSourceActive: function () {
        this.setMediaTexture(this.videoTexture);
    },

    setPlaceholderActive: function () {
        this.setMediaTexture(this.defaultPlaceholderTexture);
    },

    updateScreenGeometryAndUVs: function (settings) {
        const isSBS = (settings.displayMode === 'sbs');
        const showGrid = settings.showCalibrationGrid;

        const currentTex = showGrid ? this.gridTexture : this.activeTexture;
        this.screenMaterialLeft.map = currentTex;
        this.screenMaterialRight.map = currentTex;

        // Apply UV Mappings
        if (isSBS && !showGrid) {
            // Left Eye UV: Left Half (0.0 to 0.5)
            this.screenMaterialLeft.map.repeat.set(0.5, 1.0);
            this.screenMaterialLeft.map.offset.set(0.0, 0.0);

            // Right Eye UV: Right Half (0.5 to 1.0)
            this.screenMaterialRight.map.repeat.set(0.5, 1.0);
            this.screenMaterialRight.map.offset.set(0.5, 0.0);
        } else {
            // 2D Full Texture Mapping for both eyes
            this.screenMaterialLeft.map.repeat.set(1.0, 1.0);
            this.screenMaterialLeft.map.offset.set(0.0, 0.0);
            this.screenMaterialRight.map.repeat.set(1.0, 1.0);
            this.screenMaterialRight.map.offset.set(0.0, 0.0);
        }

        // Apply Screen Scale (Zoom) & Screen Distance & Offsets
        const scale = settings.screenScale || 1.0;
        const dist = -(settings.screenDistance || 4.0);
        const posX = settings.screenOffsetX || 0;
        const posY = settings.screenOffsetY || 0;

        // Left Eye Screen Transform
        this.screenMeshLeft.scale.set(scale, scale, 1);
        this.screenMeshLeft.position.set(posX, posY, dist);

        // Right Eye Screen Transform
        this.screenMeshRight.scale.set(scale, scale, 1);
        this.screenMeshRight.position.set(posX, posY, dist);
    },

    render: function (settings) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update Screen Planes & Materials
        this.updateScreenGeometryAndUVs(settings);

        // Apply Head Tracking Gyro to Cameras
        if (window.VRCinemaGyro) {
            window.VRCinemaGyro.applyToCamera(this.cameraLeft);
            window.VRCinemaGyro.applyToCamera(this.cameraRight);
        }

        // Two-Eye Viewport Calculations (with Center Gap & Offsets)
        const halfWidth = width / 2;
        const centerGap = settings.centerGap || 0;
        const yOffset = settings.yOffset || 0;

        // Left Eye Viewport & Scissor Box
        const leftMaskW = (halfWidth - (centerGap / 2)) * (settings.leftMaskWidth || 1.0);
        const leftX = (settings.leftXOffset || 0) + ((halfWidth - leftMaskW) / 2);
        const leftY = yOffset;

        // Right Eye Viewport & Scissor Box
        const rightMaskW = (halfWidth - (centerGap / 2)) * (settings.rightMaskWidth || 1.0);
        const rightX = halfWidth + (centerGap / 2) + (settings.rightXOffset || 0) + ((halfWidth - rightMaskW) / 2);
        const rightY = yOffset;

        // 1. Render Left Eye View
        this.renderer.setViewport(leftX, leftY, leftMaskW, height);
        this.renderer.setScissor(leftX, leftY, leftMaskW, height);
        this.renderer.render(this.scene, this.cameraLeft);

        // 2. Render Right Eye View
        this.renderer.setViewport(rightX, rightY, rightMaskW, height);
        this.renderer.setScissor(rightX, rightY, rightMaskW, height);
        this.renderer.render(this.scene, this.cameraRight);
    },

    onWindowResize: function () {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = (width / 2) / height;

        this.cameraLeft.aspect = aspect;
        this.cameraLeft.updateProjectionMatrix();

        this.cameraRight.aspect = aspect;
        this.cameraRight.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }
};
