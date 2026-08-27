/**
 * Two-Eye VR Scissor Renderer & Cinema Scene Manager
 * Features:
 * - Scissor dual-viewport stereo rendering (Left Eye / Right Eye)
 * - SVG Barrel Vignette Mask synchronization with lens calibration
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
        grad.addColorStop(0, '#1d2238');
        grad.addColorStop(1, '#090b14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);

        // Cinema Screen Frame
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 12;
        ctx.strokeRect(40, 40, 1840, 1000);

        // VR Icon & Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 58px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎬 VR Cinema Player', 960, 480);

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('Tap ☰ Menu to select a Local Video, Image, or YouTube URL', 960, 570);

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

    createCurvedScreenGeometry: function (width = 7.11, height = 4.0, segmentsX = 32, segmentsY = 32) {
        const geo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
        const posAttribute = geo.attributes.position;

        const halfW = width / 2;
        const halfH = height / 2;
        const bulgeK = 0.08; // 8% outward edge curve (barrel rectangle boundary)
        const bulgeZ = 0.35; // Outward convex 3D surface depth towards camera (+Z)

        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);

            const u = x / halfW; // -1.0 to 1.0
            const v = y / halfH; // -1.0 to 1.0

            // 1. Outward curved edges (barrel rectangle boundary)
            const newX = x * (1 + bulgeK * (1 - v * v));
            const newY = y * (1 + bulgeK * (1 - u * u));

            // 2. Outward convex 3D surface bulge towards camera (+Z)
            const newZ = bulgeZ * (1 - (u * u + v * v) / 2);

            posAttribute.setX(i, newX);
            posAttribute.setY(i, newY);
            posAttribute.setZ(i, newZ);
        }

        geo.computeVertexNormals();
        return geo;
    },

    createCinemaScreens: function () {
        // Outward Curved Cinema Screen Geometry (7.11m wide x 4.0m high, 32x32 segments)
        const curvedGeo = this.createCurvedScreenGeometry(7.11, 4.0, 32, 32);

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

        // Left Eye Screen Mesh (Dedicated to Layer 1)
        this.screenMeshLeft = new THREE.Mesh(curvedGeo, this.screenMaterialLeft);
        this.screenMeshLeft.position.set(0, 0, -4.0);
        this.screenMeshLeft.layers.set(1);
        this.cameraLeft.layers.enable(1);
        this.scene.add(this.screenMeshLeft);

        // Right Eye Screen Mesh (Dedicated to Layer 2)
        this.screenMeshRight = new THREE.Mesh(curvedGeo.clone(), this.screenMaterialRight);
        this.screenMeshRight.position.set(0, 0, -4.0);
        this.screenMeshRight.layers.set(2);
        this.cameraRight.layers.enable(2);
        this.scene.add(this.screenMeshRight);
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
        const maskSep = (settings && settings.maskSeparation !== undefined && !isNaN(settings.maskSeparation)) ? settings.maskSeparation : 1.0;

        // Calculate 3D screen X shift to match barrel mask circles separation
        const distanceFactor = Math.abs(dist) / 4.0;
        const separationXOffset = (1.0 - maskSep) * 2.5 * scale * distanceFactor;

        // Left Eye Screen Transform (shifts right towards center when maskSep < 1.0)
        this.screenMeshLeft.scale.set(scale, scale, 1);
        this.screenMeshLeft.position.set(posX + separationXOffset, posY, dist);

        // Right Eye Screen Transform (shifts left towards center when maskSep < 1.0)
        this.screenMeshRight.scale.set(scale, scale, 1);
        this.screenMeshRight.position.set(posX - separationXOffset, posY, dist);
    },

    generateBarrelPathD: function (cx, cy, rx, ry, bulge = 45, cornerRadius = 55) {
        const xL = cx - rx;
        const xR = cx + rx;
        const yT = cy - ry;
        const yB = cy + ry;
        const r = Math.min(cornerRadius, rx * 0.35, ry * 0.35);

        return `M ${xL + r} ${yT} ` +
               `Q ${cx} ${yT - bulge}, ${xR - r} ${yT} ` +
               `Q ${xR} ${yT}, ${xR} ${yT + r} ` +
               `Q ${xR + bulge} ${cy}, ${xR} ${yB - r} ` +
               `Q ${xR} ${yB}, ${xR - r} ${yB} ` +
               `Q ${cx} ${yB + bulge}, ${xL + r} ${yB} ` +
               `Q ${xL} ${yB}, ${xL} ${yB - r} ` +
               `Q ${xL - bulge} ${cy}, ${xL} ${yT + r} ` +
               `Q ${xL} ${yT}, ${xL + r} ${yT} Z`;
    },

    updateSVGBarrelMask: function (settings) {
        const leftEye = document.getElementById('mask-left-eye');
        const rightEye = document.getElementById('mask-right-eye');

        if (!leftEye || !rightEye) return;

        const leftScale = (settings && settings.leftMaskWidth !== undefined && !isNaN(settings.leftMaskWidth)) ? settings.leftMaskWidth : 1.0;
        const rightScale = (settings && settings.rightMaskWidth !== undefined && !isNaN(settings.rightMaskWidth)) ? settings.rightMaskWidth : 1.0;
        const maskSep = (settings && settings.maskSeparation !== undefined && !isNaN(settings.maskSeparation)) ? settings.maskSeparation : 1.0;

        const windowW = window.innerWidth || 1;
        const windowH = window.innerHeight || 1;

        const centerGap = ((settings.centerGap || 0) / windowW) * 1000;
        const leftXShift = ((settings.leftXOffset || 0) / windowW) * 1000;
        const rightXShift = ((settings.rightXOffset || 0) / windowW) * 1000;
        const yShift = ((settings.yOffset || 0) / windowH) * 1000;

        // ViewBox is 1000 x 1000
        const leftCX = 500 - (250 * maskSep) - (centerGap / 4) + leftXShift;
        const rightCX = 500 + (250 * maskSep) + (centerGap / 4) + rightXShift;
        const cy = 500 + yShift;

        // Base radii: rx = 220, ry = 420 (for 1000x1000 viewBox)
        const leftRX = 220 * leftScale;
        const rightRX = 220 * rightScale;
        const ry = 420;

        const pathLeft = this.generateBarrelPathD(leftCX, cy, leftRX, ry, 45, 55);
        const pathRight = this.generateBarrelPathD(rightCX, cy, rightRX, ry, 45, 55);

        leftEye.setAttribute('d', pathLeft);
        rightEye.setAttribute('d', pathRight);
    },

    render: function (settings) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update Screen Planes & Materials
        this.updateScreenGeometryAndUVs(settings);

        // Synchronize SVG Barrel Vignette Mask with calibration settings
        this.updateSVGBarrelMask(settings);

        // Apply Head Tracking Gyro to Cameras
        if (window.VRCinemaGyro) {
            window.VRCinemaGyro.applyToCamera(this.cameraLeft);
            window.VRCinemaGyro.applyToCamera(this.cameraRight);
        }

        const halfWidth = width / 2;

        // 1. Render Left Eye View (Left screen plane only)
        this.screenMeshLeft.visible = true;
        this.screenMeshRight.visible = false;
        this.renderer.setViewport(0, 0, halfWidth, height);
        this.renderer.setScissor(0, 0, halfWidth, height);
        this.renderer.render(this.scene, this.cameraLeft);

        // 2. Render Right Eye View (Right screen plane only)
        this.screenMeshLeft.visible = false;
        this.screenMeshRight.visible = true;
        this.renderer.setViewport(halfWidth, 0, halfWidth, height);
        this.renderer.setScissor(halfWidth, 0, halfWidth, height);
        this.renderer.render(this.scene, this.cameraRight);

        // Restore visibility
        this.screenMeshLeft.visible = true;
        this.screenMeshRight.visible = true;
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
