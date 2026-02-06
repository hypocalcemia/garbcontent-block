// ==UserScript==
// @name        Remove AI Content + Hindi Content
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/*
// @grant       none
// @version     1.0
// @author      -
// @description Removes AI and Hindi videos using filtering (descriptions, tags, channel names) with custom keyword and language detection filters; additional channels or sources must be submitted to the filter.
// ==/UserScript==

(async function() {
    'use strict';

    const filterURL = 'https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filter_ai_hindi.json';

    let filter;
    try {
        const res = await fetch(filterURL);
        filter = await res.json();
    } catch (e) {
        console.error('Failed to fetch filter JSON:', e);
        return;
    }

   
    const blocked_channels = (filter.channels || []).map(c => c.toLowerCase());
    const blocked_keywords = (filter.keywords || []).map(k => k.toLowerCase());

    const removeVideos = () => {
        document.querySelectorAll("#dismissible").forEach(videoEl => {

          const channelLink = videoEl.querySelector("#channel-name a");
            if (!channelLink) return;

            const channelNameOrHref = channelLink.getAttribute("href").toLowerCase();
            const videoText = videoEl.innerText.toLowerCase();

            if (blocked_channels.some(c => channelNameOrHref.includes(c)) ||
                blocked_keywords.some(k => videoText.includes(k))) {
                videoEl.remove();
                console.log("Removed video:", channelNameOrHref);
            }
        });
    };

    removeVideos();

    // Observe dynamically loaded videos (infinite scroll)
    const observer = new MutationObserver(removeVideos);
    observer.observe(document.body, { childList: true, subtree: true });

})();

