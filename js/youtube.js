/**
 * YouTube Media Adapter
 * Parses YouTube URLs and handles YouTube video integration separately from local HTML5 video streams.
 */

window.VRCinemaYouTube = {
    activeVideoId: null,
    iframeElement: null,

    extractVideoId: function (url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    },

    loadUrl: function (url) {
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            alert('Invalid YouTube URL. Please provide a valid YouTube video or watch link.');
            return null;
        }

        this.activeVideoId = videoId;
        console.log('[YouTube] Extracted Video ID:', videoId);

        // Return YouTube embed info
        return {
            type: 'youtube',
            videoId: videoId,
            embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`
        };
    }
};
