/**
 * Network QR & Mobile Cardboard Connection Helper
 * Generates QR code and provides step-by-step connection guide for mobile VR.
 */

window.NetworkQR = {
    init: function() {
        this.setupModal();
    },

    setupModal: function() {
        const modalHtml = `
        <div id="qr-modal" class="modal-overlay hidden">
            <div class="modal-card">
                <button class="modal-close" id="qr-modal-close">&times;</button>
                <h2>📱 Connect Google Cardboard / Mobile VR</h2>
                <p class="subtitle">Stream this VR Cinema experience directly to your smartphone!</p>
                
                <div class="qr-container">
                    <div id="qr-code-canvas"></div>
                    <div class="qr-details">
                        <div class="input-group">
                            <label>Current Address:</label>
                            <div class="copy-field">
                                <input type="text" id="current-url-input" readonly />
                                <button id="btn-copy-url" class="btn-secondary">Copy</button>
                            </div>
                        </div>
                        <div class="tip-box">
                            <strong>💡 Pro-Tip for Google Cardboard:</strong>
                            <p>Mobile browsers require <code>HTTPS</code> for Gyroscope head-tracking. If accessing over Wi-Fi IP, use <strong>localtunnel</strong> on your laptop:</p>
                            <div class="code-snippet">npx localtunnel --port 8000</div>
                        </div>
                    </div>
                </div>

                <div class="instructions-steps">
                    <div class="step">
                        <span class="step-num">1</span>
                        <span>Ensure phone & laptop are on the <strong>same Wi-Fi network</strong>.</span>
                    </div>
                    <div class="step">
                        <span class="step-num">2</span>
                        <span>Scan the QR code or type the URL into Chrome/Safari on your phone.</span>
                    </div>
                    <div class="step">
                        <span class="step-num">3</span>
                        <span>Place your phone into Google Cardboard & tap <strong>"ENTER VR"</strong>.</span>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('qr-modal-close').addEventListener('click', () => this.hide());
        document.getElementById('qr-modal').addEventListener('click', (e) => {
            if (e.target.id === 'qr-modal') this.hide();
        });
        document.getElementById('btn-copy-url').addEventListener('click', () => {
            const copyText = document.getElementById('current-url-input');
            copyText.select();
            navigator.clipboard.writeText(copyText.value);
            const btn = document.getElementById('btn-copy-url');
            btn.innerText = 'Copied!';
            setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
        });
    },

    show: function() {
        const modal = document.getElementById('qr-modal');
        const input = document.getElementById('current-url-input');
        const qrContainer = document.getElementById('qr-code-canvas');
        
        const currentUrl = window.location.href;
        input.value = currentUrl;

        // Render QR Code using SVG Image API fallback & Canvas
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}&margin=10`;
        qrContainer.innerHTML = `<img src="${qrApiUrl}" alt="QR Code" width="180" height="180" class="qr-img" onerror="this.onerror=null; this.src=''; this.parentNode.innerHTML='<div class=\'qr-fallback\'>Use URL above</div>';" />`;

        modal.classList.remove('hidden');
    },

    hide: function() {
        document.getElementById('qr-modal').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.NetworkQR.init();
});
