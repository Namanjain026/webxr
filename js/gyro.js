/**
 * Gyroscope & Orientation Controller with Desktop Touch/Mouse Fallback
 * Handles DeviceOrientation API, recentering, sensitivity, and desktop preview controls.
 */

window.VRCinemaGyro = {
    enabled: true,
    hasSensorData: false,
    sensitivity: 1.0,

    // Sensor Orientation Angles
    currentAngles: { alpha: 0, beta: 0, gamma: 0 },
    referenceQuat: new THREE.Quaternion(),
    rawQuat: new THREE.Quaternion(),
    outputQuat: new THREE.Quaternion(),

    // Desktop Mouse / Touch Drag Fallback
    mouseLook: {
        isDragging: false,
        previousMousePosition: { x: 0, y: 0 },
        pitch: 0, // X-axis (looking up/down)
        yaw: 0    // Y-axis (looking left/right)
    },

    init: function () {
        this.bindEvents();
        this.recenter();
    },

    bindEvents: function () {
        // Device Orientation listener
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', this.handleOrientation.bind(this), true);
        }

        // Desktop Pointer / Touch fallback
        const canvasContainer = document.getElementById('vr-viewport') || window;
        
        canvasContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('#control-hud') || e.target.closest('.modal-overlay')) return;
            this.mouseLook.isDragging = true;
            this.mouseLook.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.mouseLook.isDragging) return;
            const deltaX = e.clientX - this.mouseLook.previousMousePosition.x;
            const deltaY = e.clientY - this.mouseLook.previousMousePosition.y;

            this.mouseLook.yaw -= deltaX * 0.003 * this.sensitivity;
            this.mouseLook.pitch -= deltaY * 0.003 * this.sensitivity;

            // Clamp pitch to prevent camera flip
            this.mouseLook.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.mouseLook.pitch));

            this.mouseLook.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.mouseLook.isDragging = false;
        });

        // Touch Drag Fallback for non-gyro mobile
        let touchStart = { x: 0, y: 0 };
        canvasContainer.addEventListener('touchstart', (e) => {
            if (e.target.closest('#control-hud') || e.target.closest('.modal-overlay')) return;
            if (e.touches.length === 1) {
                touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (this.hasSensorData && this.enabled) return; // Gyro handles it if available
            if (e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - touchStart.x;
                const deltaY = e.touches[0].clientY - touchStart.y;

                this.mouseLook.yaw -= deltaX * 0.004 * this.sensitivity;
                this.mouseLook.pitch -= deltaY * 0.004 * this.sensitivity;

                this.mouseLook.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.mouseLook.pitch));

                touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });
    },

    requestPermission: async function () {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    this.enabled = true;
                    this.recenter();
                    return true;
                } else {
                    alert('Gyroscope permission was denied.');
                    return false;
                }
            } catch (e) {
                console.error('Error requesting DeviceOrientation permission:', e);
                return false;
            }
        }
        return true;
    },

    handleOrientation: function (event) {
        if (event.alpha === null || event.beta === null || event.gamma === null) return;
        this.hasSensorData = true;

        this.currentAngles = {
            alpha: event.alpha, // Yaw (Z-axis rotation, 0 to 360)
            beta: event.beta,   // Pitch (X-axis rotation, -180 to 180)
            gamma: event.gamma  // Roll (Y-axis rotation, -90 to 90)
        };

        this.computeRawQuaternion();
    },

    computeRawQuaternion: function () {
        const degToRad = Math.PI / 180;
        const alpha = (this.currentAngles.alpha || 0) * degToRad;
        const beta = (this.currentAngles.beta || 0) * degToRad;
        const gamma = (this.currentAngles.gamma || 0) * degToRad;

        // Device orientation rotation order: ZXY
        const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
        this.rawQuat.setFromEuler(euler);

        // Adjust for screen orientation (landscape vs portrait)
        const orient = (window.orientation || 0) * degToRad;
        const qOrient = new THREE.Quaternion();
        qOrient.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orient);
        this.rawQuat.multiply(qOrient);

        // Adjust coordinates from Device frame to Camera world frame (-Z forward, Y up)
        const qWorld = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
        this.rawQuat.multiply(qWorld);
    },

    recenter: function () {
        if (this.hasSensorData) {
            this.computeRawQuaternion();
            this.referenceQuat.copy(this.rawQuat).invert();
        } else {
            // Reset mouse/touch look pitch & yaw
            this.mouseLook.pitch = 0;
            this.mouseLook.yaw = 0;
        }
        console.log('[Gyro] Head tracking position recentered.');
    },

    applyToCamera: function (camera) {
        if (this.enabled && this.hasSensorData) {
            // Apply gyro sensor with reference offset
            this.outputQuat.copy(this.referenceQuat).multiply(this.rawQuat);

            // Apply sensitivity multiplier if not 1.0
            if (this.sensitivity !== 1.0) {
                this.outputQuat.slerp(new THREE.Quaternion(), 1.0 - this.sensitivity);
            }

            camera.quaternion.copy(this.outputQuat);
        } else {
            // Fallback: mouse / touch look
            const euler = new THREE.Euler(this.mouseLook.pitch, this.mouseLook.yaw, 0, 'YXZ');
            camera.quaternion.setFromEuler(euler);
        }
    }
};
