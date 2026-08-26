/**
 * In-Headset VR Controls & Interactive Dashboard
 * Supports WebXR 6DoF Laser Pointer & Google Cardboard Fuse/Gaze Cursor
 */

AFRAME.registerComponent('vr-controller-manager', {
    init: function () {
        this.rig = document.getElementById('rig');
        this.camera = document.getElementById('vr-camera');
        this.vrMenu = document.getElementById('vr-floating-menu');
        this.gazeCursor = document.getElementById('gaze-cursor');

        this.seats = {
            center: { x: 0, y: 1.6, z: 0, rotY: 0 },
            front: { x: 0, y: 1.4, z: -3.8, rotY: 0 },
            balcony: { x: 0, y: 3.5, z: 5.5, rotY: 0 }
        };

        this.setupSceneEvents();
        this.setupVRMenuActions();
    },

    setupSceneEvents: function () {
        const scene = this.el.sceneEl;

        scene.addEventListener('enter-vr', () => {
            console.log('[VR-Controls] Entered VR mode');
            // Show gaze cursor if no motion controllers detected (Cardboard VR mode)
            if (this.gazeCursor) {
                this.gazeCursor.setAttribute('visible', 'true');
            }
            // Position VR menu nicely in front of user
            this.positionMenuInFront();
        });

        scene.addEventListener('exit-vr', () => {
            console.log('[VR-Controls] Exited VR mode');
            if (this.gazeCursor) {
                this.gazeCursor.setAttribute('visible', 'false');
            }
        });

        // Controller connected event (Hide gaze cursor if 6DoF controller active)
        this.el.addEventListener('controllerconnected', (evt) => {
            console.log('[VR-Controls] Controller connected:', evt.detail.name);
            if (this.gazeCursor) {
                this.gazeCursor.setAttribute('visible', 'false');
            }
        });
    },

    positionMenuInFront: function () {
        if (!this.vrMenu || !this.camera) return;

        // Position VR menu 2.2 meters in front of the current camera view
        const cameraObj = this.camera.getObject3D('camera');
        if (!cameraObj) return;

        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.object3D.quaternion);
        dir.y = 0; // keep level
        dir.normalize();

        const pos = this.camera.object3D.position.clone().add(dir.multiplyScalar(2.2));
        pos.y = 1.3; // eye level height

        this.vrMenu.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
        
        // Rotate menu to face camera
        const rotY = Math.atan2(
            this.camera.object3D.position.x - pos.x,
            this.camera.object3D.position.z - pos.z
        ) * (180 / Math.PI);
        this.vrMenu.setAttribute('rotation', `0 ${rotY + 180} 0`);
    },

    setupVRMenuActions: function () {
        // Toggle VR Menu Button trigger
        const toggleBtn = document.getElementById('vr-toggle-menu-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleVRMenu();
            });
        }
    },

    toggleVRMenu: function () {
        if (!this.vrMenu) return;
        const currentVis = this.vrMenu.getAttribute('visible') !== 'false';
        const nextVis = !currentVis;
        this.vrMenu.setAttribute('visible', nextVis ? 'true' : 'false');
        if (nextVis) {
            this.positionMenuInFront();
        }
    },

    moveToSeat: function (seatKey) {
        if (!this.seats[seatKey] || !this.rig) return;

        const target = this.seats[seatKey];
        
        // Smoothly animate camera rig position
        this.rig.setAttribute('animation__pos', {
            property: 'position',
            to: `${target.x} ${target.y} ${target.z}`,
            dur: 1000,
            easing: 'easeInOutQuad'
        });

        // Reposition floating menu if visible
        setTimeout(() => {
            this.positionMenuInFront();
        }, 1100);
    }
});

// Component for fuse cursor visual feedback animation
AFRAME.registerComponent('fuse-feedback', {
    init: function () {
        this.cursorRing = this.el;

        this.el.sceneEl.addEventListener('fusing', (evt) => {
            this.cursorRing.setAttribute('animation__fuse', {
                property: 'geometry.thetaLength',
                from: 360,
                to: 0,
                dur: 1500,
                easing: 'linear'
            });
            this.cursorRing.setAttribute('material', 'color', '#00f0ff');
        });

        this.el.sceneEl.addEventListener('click', () => {
            this.resetRing();
        });

        this.el.sceneEl.addEventListener('mouseleave', () => {
            this.resetRing();
        });
    },

    resetRing: function () {
        this.cursorRing.removeAttribute('animation__fuse');
        this.cursorRing.setAttribute('geometry', 'thetaLength', 360);
        this.cursorRing.setAttribute('material', 'color', '#ffffff');
    }
});
