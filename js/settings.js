/**
 * Settings & VR-Box Profile State Manager
 * Handles persistent localStorage configuration for VR headsets and screen adjustments.
 */

window.VRCinemaSettings = {
    STORAGE_KEY: 'vr_cinema_box_profile_v1',

    // Default Profile State
    defaults: {
        sourceType: 'local-video', // 'local-video' | 'image' | 'youtube'
        displayMode: '2d',         // '2d' | 'sbs'
        screenScale: 1.0,          // Screen Zoom
        screenDistance: 4.0,       // Distance from camera (z-axis)
        screenOffsetX: 0,          // Fine X alignment
        screenOffsetY: 0,          // Fine Y alignment
        leftMaskWidth: 1.0,        // Left eye mask width scale
        rightMaskWidth: 1.0,       // Right eye mask width scale
        leftXOffset: 0,            // Left eye mask X shift (px)
        rightXOffset: 0,           // Right eye mask X shift (px)
        yOffset: 0,                // Vertical mask shift (px)
        centerGap: 0,              // Separation between eye viewports (px)
        gyroEnabled: true,         // Gyroscope head tracking active
        gyroSensitivity: 1.0,      // Gyro multiplier
        showCalibrationGrid: false // Test grid / crosshair pattern
    },

    state: {},

    init: function () {
        this.load();
    },

    load: function () {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.state = Object.assign({}, this.defaults, JSON.parse(saved));
            } else {
                this.state = Object.assign({}, this.defaults);
            }
        } catch (e) {
            console.warn('[Settings] Failed to read localStorage:', e);
            this.state = Object.assign({}, this.defaults);
        }
        return this.state;
    },

    save: function () {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
            console.log('[Settings] Profile saved successfully.');
        } catch (e) {
            console.error('[Settings] Failed to save profile to localStorage:', e);
        }
    },

    reset: function () {
        this.state = Object.assign({}, this.defaults);
        this.save();
        return this.state;
    },

    get: function (key) {
        return this.state[key];
    },

    set: function (key, value) {
        this.state[key] = value;
    },

    update: function (partialObj) {
        Object.assign(this.state, partialObj);
    }
};

window.VRCinemaSettings.init();
