/**
 * Stereo Shader & Material Component for A-Frame
 * Supports Standard 2D, Side-by-Side (SBS 3D), and Over-Under (OU / Top-Bottom 3D)
 * Works in WebXR 6DoF headsets & Google Cardboard mobile VR split-screen.
 */

AFRAME.registerComponent('stereo-video', {
    schema: {
        mode: { type: 'string', default: 'mono' }, // 'mono', 'sbs', 'ou'
        eye: { type: 'string', default: 'left' }
    },

    init: function () {
        this.material = null;
        this.originalUVs = null;
        this.mesh = this.el.getObject3D('mesh');

        this.el.addEventListener('object3dset', () => {
            this.setupStereo();
        });

        if (this.mesh) {
            this.setupStereo();
        }
    },

    update: function (oldData) {
        if (oldData.mode !== this.data.mode) {
            this.applyStereoMapping();
        }
    },

    setupStereo: function () {
        this.mesh = this.el.getObject3D('mesh');
        if (!this.mesh) return;

        // Store original UV coordinates if not already saved
        const geometry = this.mesh.geometry;
        if (geometry && geometry.attributes && geometry.attributes.uv) {
            if (!this.originalUVs) {
                this.originalUVs = geometry.attributes.uv.clone();
            }
        }

        // Attach onBeforeRender hook to detect current eye render pass
        const self = this;
        this.mesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
            if (self.data.mode === 'mono') return;

            let eye = 'left';

            // Check WebXR array camera eyes or layer masks
            if (camera.isArrayCamera && camera.cameras && camera.cameras.length >= 2) {
                if (camera === camera.cameras[1]) {
                    eye = 'right';
                } else if (camera === camera.cameras[0]) {
                    eye = 'left';
                }
            } else if (camera.layers) {
                if (camera.layers.isEnabled(2)) {
                    eye = 'right';
                } else if (camera.layers.isEnabled(1)) {
                    eye = 'left';
                }
            }

            self.updateTextureOffsetScale(material, eye);
        };

        this.applyStereoMapping();
    },

    updateTextureOffsetScale: function (material, eye) {
        if (!material || !material.map) return;

        const map = material.map;

        if (this.data.mode === 'sbs') {
            // Side-by-Side: Left half = Left eye, Right half = Right eye
            map.repeat.set(0.5, 1.0);
            if (eye === 'left') {
                map.offset.set(0.0, 0.0);
            } else {
                map.offset.set(0.5, 0.0);
            }
        } else if (this.data.mode === 'ou') {
            // Over-Under (Top-Bottom): Top half = Left eye, Bottom half = Right eye
            map.repeat.set(1.0, 0.5);
            if (eye === 'left') {
                map.offset.set(0.0, 0.5);
            } else {
                map.offset.set(0.0, 0.0);
            }
        } else {
            // Mono / Standard
            map.repeat.set(1.0, 1.0);
            map.offset.set(0.0, 0.0);
        }

        map.needsUpdate = true;
    },

    applyStereoMapping: function () {
        this.mesh = this.el.getObject3D('mesh');
        if (!this.mesh) return;

        const material = this.mesh.material;
        if (material) {
            this.updateTextureOffsetScale(material, 'left');
        }
    }
});
