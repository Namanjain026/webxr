/**
 * Procedural Texture Generator
 * Generates dynamic high-res textures for theater materials (seats, carpet, wood, grid)
 */

window.TextureGen = {
    init: function () {
        this.generateVelvet();
        this.generateCarpet();
        this.generateWood();
        this.generateCyberGrid();
    },

    generateVelvet: function () {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#800c24';
        ctx.fillRect(0, 0, 512, 512);

        // Add soft velvet noise texture
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 1.5;
            const alpha = Math.random() * 0.15;
            ctx.fillStyle = `rgba(255, 100, 130, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Diamond upholstery seams pattern
        ctx.strokeStyle = 'rgba(40, 0, 10, 0.4)';
        ctx.lineWidth = 4;
        const step = 64;
        for (let x = -512; x < 1024; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 512, 512);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, 512);
            ctx.lineTo(x + 512, 0);
            ctx.stroke();
        }

        window.TEX_VELVET = canvas.toDataURL();
    },

    generateCarpet: function () {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0f111a';
        ctx.fillRect(0, 0, 512, 512);

        // Cinema carpet flecks (gold, red, cyan accents)
        const colors = ['#ffb703', '#ff2a5f', '#00f0ff', '#3a405a'];
        for (let i = 0; i < 20000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = Math.random() * 2;
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        window.TEX_CARPET = canvas.toDataURL();
    },

    generateWood: function () {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark mahogany acoustic wood paneling
        ctx.fillStyle = '#2b170c';
        ctx.fillRect(0, 0, 512, 512);

        // Grain lines
        ctx.strokeStyle = 'rgba(70, 40, 20, 0.3)';
        for (let y = 0; y < 512; y += 4) {
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y + (Math.random() * 4 - 2));
            ctx.stroke();
        }

        // Acoustic vertical panel slats
        ctx.fillStyle = 'rgba(10, 5, 2, 0.5)';
        for (let x = 0; x < 512; x += 32) {
            ctx.fillRect(x, 0, 4, 512);
        }

        window.TEX_WOOD = canvas.toDataURL();
    },

    generateCyberGrid: function () {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, 512, 512);

        // Neon cyan grid lines
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;

        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }

        window.TEX_CYBERGRID = canvas.toDataURL();
    }
};

window.TextureGen.init();
