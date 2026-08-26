/**
 * Lens & VR Box Calibration Controller
 * Manages calibration modal inputs, sliders, live profile synchronization, and test grid overlays.
 */

window.VRCinemaCalibration = {
    init: function () {
        this.bindSliderEvents();
    },

    bindSliderEvents: function () {
        const settings = window.VRCinemaSettings;

        const bindings = [
            { id: 'cal-left-mask', key: 'leftMaskWidth', parse: parseFloat },
            { id: 'cal-right-mask', key: 'rightMaskWidth', parse: parseFloat },
            { id: 'cal-left-x', key: 'leftXOffset', parse: parseInt },
            { id: 'cal-right-x', key: 'rightXOffset', parse: parseInt },
            { id: 'cal-y-offset', key: 'yOffset', parse: parseInt },
            { id: 'cal-center-gap', key: 'centerGap', parse: parseInt },
            { id: 'cal-screen-scale', key: 'screenScale', parse: parseFloat },
            { id: 'cal-screen-distance', key: 'screenDistance', parse: parseFloat },
            { id: 'cal-screen-offset-x', key: 'screenOffsetX', parse: parseFloat },
            { id: 'cal-screen-offset-y', key: 'screenOffsetY', parse: parseFloat },
            { id: 'cal-gyro-sensitivity', key: 'gyroSensitivity', parse: parseFloat }
        ];

        bindings.forEach(binding => {
            const input = document.getElementById(binding.id);
            const valDisplay = document.getElementById(`${binding.id}-val`);

            if (input) {
                // Initialize input value from current settings
                const val = settings.get(binding.key);
                input.value = val;
                if (valDisplay) valDisplay.innerText = val;

                // Live Update
                input.addEventListener('input', (e) => {
                    const parsedVal = binding.parse(e.target.value);
                    settings.set(binding.key, parsedVal);
                    if (valDisplay) valDisplay.innerText = parsedVal;

                    if (binding.key === 'gyroSensitivity' && window.VRCinemaGyro) {
                        window.VRCinemaGyro.sensitivity = parsedVal;
                    }
                });
            }
        });

        // Test Grid Toggle Checkbox
        const gridCheckbox = document.getElementById('cal-show-grid');
        if (gridCheckbox) {
            gridCheckbox.checked = settings.get('showCalibrationGrid');
            gridCheckbox.addEventListener('change', (e) => {
                settings.set('showCalibrationGrid', e.target.checked);
            });
        }

        // Save Profile Button
        const saveBtn = document.getElementById('save-calibration-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                settings.save();
                this.showToast('Calibration Profile Saved!');
            });
        }

        // Reset Profile Button
        const resetBtn = document.getElementById('reset-calibration-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                settings.reset();
                this.updateUIFromSettings();
                this.showToast('Profile Reset to Defaults');
            });
        }
    },

    updateUIFromSettings: function () {
        const settings = window.VRCinemaSettings;
        const bindings = [
            { id: 'cal-left-mask', key: 'leftMaskWidth' },
            { id: 'cal-right-mask', key: 'rightMaskWidth' },
            { id: 'cal-left-x', key: 'leftXOffset' },
            { id: 'cal-right-x', key: 'rightXOffset' },
            { id: 'cal-y-offset', key: 'yOffset' },
            { id: 'cal-center-gap', key: 'centerGap' },
            { id: 'cal-screen-scale', key: 'screenScale' },
            { id: 'cal-screen-distance', key: 'screenDistance' },
            { id: 'cal-screen-offset-x', key: 'screenOffsetX' },
            { id: 'cal-screen-offset-y', key: 'screenOffsetY' },
            { id: 'cal-gyro-sensitivity', key: 'gyroSensitivity' }
        ];

        bindings.forEach(binding => {
            const input = document.getElementById(binding.id);
            const valDisplay = document.getElementById(`${binding.id}-val`);
            if (input) {
                const val = settings.get(binding.key);
                input.value = val;
                if (valDisplay) valDisplay.innerText = val;
            }
        });

        const gridCheckbox = document.getElementById('cal-show-grid');
        if (gridCheckbox) {
            gridCheckbox.checked = settings.get('showCalibrationGrid');
        }
    },

    showToast: function (message) {
        let toast = document.getElementById('toast-msg');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-msg';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
};
