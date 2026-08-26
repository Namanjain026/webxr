/**
 * Local Media Manager
 * Handles reading local files (Videos, MP4, MKV, WebM, and Images JPG, PNG, WebP) via Object URLs.
 */

window.VRCinemaLocalMedia = {
    videoElement: null,
    currentObjectURL: null,
    currentType: null, // 'video' | 'image'
    loadedTexture: null,

    init: function (videoEl) {
        this.videoElement = videoEl;
    },

    loadVideoFile: function (file) {
        if (!file) return;

        this.cleanupCurrent();

        this.currentObjectURL = URL.createObjectURL(file);
        this.currentType = 'video';

        this.videoElement.src = this.currentObjectURL;
        this.videoElement.load();
        
        console.log('[LocalMedia] Loaded local video file:', file.name);

        return new Promise((resolve, reject) => {
            this.videoElement.onloadedmetadata = () => {
                resolve({
                    type: 'video',
                    element: this.videoElement,
                    width: this.videoElement.videoWidth,
                    height: this.videoElement.videoHeight,
                    duration: this.videoElement.duration,
                    filename: file.name
                });
            };
            this.videoElement.onerror = (e) => {
                reject(e);
            };
        });
    },

    loadImageFile: function (file) {
        if (!file) return;

        this.cleanupCurrent();

        this.currentObjectURL = URL.createObjectURL(file);
        this.currentType = 'image';

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const texture = new THREE.Texture(img);
                texture.needsUpdate = true;
                texture.colorSpace = THREE.SRGBColorSpace;
                this.loadedTexture = texture;

                resolve({
                    type: 'image',
                    texture: texture,
                    image: img,
                    width: img.width,
                    height: img.height,
                    filename: file.name
                });
            };
            img.onerror = (e) => reject(e);
            img.src = this.currentObjectURL;
        });
    },

    cleanupCurrent: function () {
        if (this.currentObjectURL) {
            URL.revokeObjectURL(this.currentObjectURL);
            this.currentObjectURL = null;
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.removeAttribute('src');
            this.videoElement.load();
        }
        if (this.loadedTexture) {
            this.loadedTexture.dispose();
            this.loadedTexture = null;
        }
    }
};
