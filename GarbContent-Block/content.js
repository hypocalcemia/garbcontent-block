(async function () {
    let blockedChannels = new Set();
    let blockedVideosCount = 0;
    const processedVideoIds = new Set();

    const stored = await chrome.storage.local.get(['blockedChannels', 'blockedVideosCount']);
    if (stored.blockedChannels) blockedChannels = new Set(stored.blockedChannels);
    if (typeof stored.blockedVideosCount === 'number') blockedVideosCount = stored.blockedVideosCount;

    let lastFilters = { enabled: true, activeFilters: [], defaultFilters: {} };
    (async () => {
        try {
            const init = await new Promise(resolve => chrome.storage.local.get(['enabled', 'activeFilters', 'defaultFilters'], resolve));
            lastFilters.enabled = init && init.enabled !== false;
            lastFilters.activeFilters = (init && init.activeFilters) || [];
            lastFilters.defaultFilters = (init && init.defaultFilters) || {};
        } catch (e) {
        }
    })();

    let loggingEnabledLocal = false;
    try {
        const ld = await new Promise(resolve => chrome.storage.local.get(['loggingEnabled'], resolve));
        loggingEnabledLocal = !!(ld && ld.loggingEnabled);
    } catch (e) {
        loggingEnabledLocal = false;
    }

    function sendDebug(level, msgType, payload) {
        try {
            if (!window.__GCB_LOGGING) return;
            const time = new Date().toLocaleTimeString();
            const header = `%c[GCB] %c${msgType} %c${time}`;
            const headerStyles = ['color:#0ea5e9;font-weight:bold', 'color:#f97316', 'color:#9ca3af'].join(';');
            console.log(header, 'color:#0ea5e9;font-weight:bold', 'color:#f97316', 'color:#9ca3af');
            if (payload && typeof payload === 'object') {
                try { console.groupCollapsed('%cPayload', 'color:#34d399'); console.table(payload); console.groupEnd(); } catch (e) { console.log('Payload:', payload); }
            } else {
                console.log('Payload:', payload);
            }
        } catch (e) {
            try { console.log('[GCB] ' + msgType, payload); } catch (e2) { }
        }
    }

    try { window.__GCB_LOGGING = loggingEnabledLocal; } catch (e) { }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.loggingEnabled) {
            loggingEnabledLocal = !!changes.loggingEnabled.newValue;
            try { window.__GCB_LOGGING = loggingEnabledLocal; } catch (e) { }
            try { console.log('[GCB] loggingEnabled set to', loggingEnabledLocal); } catch (e) { }
        }
    });

    async function getActiveFilters() {
        if (!chrome?.runtime?.id) {
            return lastFilters;
        }

        try {
            const data = await new Promise((resolve, reject) => {
                try {
                    chrome.storage.local.get(['enabled', 'activeFilters', 'defaultFilters'], (result) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(result);
                        }
                    });
                } catch (e) {
                    reject(e);
                }
            });

            const res = {
                enabled: data && data.enabled !== false,
                activeFilters: (data && data.activeFilters) || [],
                defaultFilters: (data && data.defaultFilters) || {}
            };

            lastFilters = res;
            return res;

        } catch (err) {
            if (!err.message?.includes("context invalidated")) {
                console.warn('[GCB] getActiveFilters failed:', err);
            }
            return lastFilters;
        }
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;

        if (changes.activeFilters) lastFilters.activeFilters = changes.activeFilters.newValue || [];
        if (changes.enabled) {
            const isNowEnabled = changes.enabled.newValue !== false;
            lastFilters.enabled = isNowEnabled;

            if (isNowEnabled) {
                processedVideoIds.clear();
                if (window.__GCB_LOGGING) console.log('[GCB] Filter enabled: Clearing processed cache.');
            }
        }
        if (changes.defaultFilters) lastFilters.defaultFilters = changes.defaultFilters.newValue || {};

        if (changes.defaultFilterContents || changes.activeFilters || changes.defaultFilters) {
            cachedBlockedSet = null;
            if (window.__GCB_LOGGING) console.log('[GCB] Storage changed, invalidated cache');
        }
    });

    let cachedBlockedSet = null;
    let blockedSetLastLoaded = 0;
    let lastKnownActiveFiltersKey = '';
    const BLOCKED_REFRESH_MS = 15 * 60 * 1000;

    const customFilterCache = new Map();

    const lastDiagnosticLog = new Map();
    const DIAGNOSTIC_LOG_COOLDOWN_MS = 60 * 1000;

    function canonicalizeChannelName(raw) {
        if (!raw || typeof raw !== 'string') return '';
        try {
            let s = raw.trim();
            s = s.normalize ? s.normalize('NFKC') : s;
            while (s.startsWith('@')) s = s.slice(1);
            try { s = decodeURIComponent(s); } catch (e) { }
            s = s.replace(/\s+/g, ' ');
            return s.toLowerCase();
        } catch (e) {
            try { return String(raw).toLowerCase(); } catch (e2) { return ''; }
        }
    }

    function simplifyForLooseMatch(canon) {
        if (!canon) return '';
        return canon.replace(/[^a-z0-9]/g, '');
    }

    async function buildBlockedSet(activeFilters, defaultFilters) {
        const now = Date.now();
        const activeKey = JSON.stringify(activeFilters || []);

        if (cachedBlockedSet && (now - blockedSetLastLoaded) < BLOCKED_REFRESH_MS && activeKey === lastKnownActiveFiltersKey) {
            return cachedBlockedSet;
        }

        const set = new Set();

        let storedContents = {};
        try {
            const s = await new Promise(resolve => chrome.storage.local.get(['defaultFilterContents', 'defaultFiltersLastUpdated'], resolve));
            storedContents = (s && s.defaultFilterContents) || {};
        } catch (e) {
        }

        for (const f of activeFilters) {
            let added = 0;
            if (storedContents && storedContents[f] && storedContents[f].length) {
                for (const ch of storedContents[f]) {
                    const c = canonicalizeChannelName(ch.replace(/^@+/, ''));
                    if (!c) continue;
                    set.add(c);
                    const simp = simplifyForLooseMatch(c);
                    if (simp) set.add(simp);
                    added++;
                }
                if (window.__GCB_LOGGING) { sendDebug('debug', 'buildBlockedSet', { filter: f, added }); }
                continue;
            }

            if (typeof f === 'string' && /^https?:\/\//.test(f)) {
                if (customFilterCache.has(f)) {
                    const arr = customFilterCache.get(f);
                    for (const ch of arr) {
                        const c = canonicalizeChannelName(ch);
                        if (!c) continue;
                        set.add(c);
                        const simp = simplifyForLooseMatch(c);
                        if (simp) set.add(simp);
                    }
                    if (window.__GCB_LOGGING) { sendDebug('debug', 'buildBlockedSet', { filter: f, arrLength: arr.length }); }
                    continue;
                }

                try {
                    const resp = await fetch(f);
                    if (resp.ok) {
                        const json = await resp.json();
                        const arr = (json.channels || []).map(ch => canonicalizeChannelName(ch.replace(/^@+/, ''))).filter(Boolean);
                        customFilterCache.set(f, arr);
                        for (const ch of arr) {
                            set.add(ch);
                            const simp = simplifyForLooseMatch(ch);
                            if (simp) set.add(simp);
                        }
                        if (window.__GCB_LOGGING) { sendDebug('debug', 'buildBlockedSet', { filter: f, arrLength: arr.length }); }
                        continue;
                    }
                } catch (e) {
                    if (window.__GCB_LOGGING) console.warn('[GCB] buildBlockedSet: failed to fetch custom filter', f, e);
                }
            }

            const maybeUrl = defaultFilters && defaultFilters[f];
            if (maybeUrl && typeof maybeUrl === 'string') {
                if (customFilterCache.has(maybeUrl)) {
                    const arr = customFilterCache.get(maybeUrl);
                    for (const ch of arr) {
                        set.add(ch);
                        const simp = simplifyForLooseMatch(ch);
                        if (simp) set.add(simp);
                    }
                    if (window.__GCB_LOGGING) console.debug('[GCB] buildBlockedSet: used cached fallback for', f);
                    continue;
                }
                try {
                    const resp = await fetch(maybeUrl);
                    if (resp.ok) {
                        const json = await resp.json();
                        const arr = (json.channels || []).map(ch => canonicalizeChannelName(ch.replace(/^@+/, ''))).filter(Boolean);
                        customFilterCache.set(maybeUrl, arr);
                        for (const ch of arr) {
                            set.add(ch);
                            const simp = simplifyForLooseMatch(ch);
                            if (simp) set.add(simp);
                        }
                        if (window.__GCB_LOGGING) console.debug('[GCB] buildBlockedSet: fetched fallback url for', f, '=>', arr.length);
                        continue;
                    }
                } catch (e) {
                    if (window.__GCB_LOGGING) console.warn('[GCB] buildBlockedSet: failed to fetch fallback url for', f, maybeUrl, e);
                }
            }

            if (window.__GCB_LOGGING) console.debug('[GCB] buildBlockedSet: no data for filter', f);
        }

        cachedBlockedSet = set;
        blockedSetLastLoaded = now;
        lastKnownActiveFiltersKey = activeKey;

        if (window.__GCB_LOGGING) console.log('[GCB] Rebuilt blockedSet — total channels:', set.size, 'activeFilters:', activeFilters);
        return cachedBlockedSet;
    }

    function extractChannelHandleFromLink(href) {
        if (!href) return '';
        const m = href.match(/@([A-Za-z0-9_\-]+)/);
        return m ? m[1].toLowerCase() : '';
    }

    function extractVideoIdFromHref(href) {
        if (!href) return '';
        let m = href.match(/[?&]v=([^&]+)/);
        if (m) return m[1];
        m = href.match(/\/shorts\/([^/?#&]+)/);
        if (m) return m[1];
        return '';
    }

    async function scanAndRemove() {
        if (!chrome?.runtime?.id) return;

        let filters;
        try {
            filters = await getActiveFilters();
        } catch (e) {
            return;
        }

        const { enabled, activeFilters, defaultFilters } = filters;

        if (!enabled || !activeFilters || activeFilters.length === 0) return;

        const blockedSet = await buildBlockedSet(activeFilters, defaultFilters);

        const selectors = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-vertical-list-renderer, ytd-reel-item-renderer, ytd-reel-shelf-renderer, ytd-shelf-renderer';
        const containers = document.querySelectorAll(selectors);

        for (const container of containers) {
            try {
                let channel = '';

                const handleAnchor = container.querySelector('a[href*="/@"]');
                if (handleAnchor) {
                    channel = extractChannelHandleFromLink(handleAnchor.getAttribute('href'));
                }

                if (!channel) {
                    const anchors = container.querySelectorAll('a[href]');
                    for (let a of anchors) {
                        const ch = extractChannelHandleFromLink(a.getAttribute('href'));
                        if (ch) { channel = ch; break; }
                    }
                }

                if (!channel) continue;

                const channelCanon = canonicalizeChannelName(channel);
                const channelSimple = simplifyForLooseMatch(channelCanon);

                const isBlocked = (blockedSet.has(channelCanon) || (channelSimple && blockedSet.has(channelSimple)));

                if (!isBlocked) {
                    continue;
                }

                const videoLink = container.querySelector('a[href*="watch?v="]') || container.querySelector('a#video-title');
                const videoHref = videoLink ? videoLink.getAttribute('href') : '';
                const videoId = extractVideoIdFromHref(videoHref) || (channelCanon + '|' + (videoHref || '').slice(0, 50));

                if (processedVideoIds.has(videoId)) {
                    continue;
                }

                const toRemove = container.closest('ytd-video-renderer') ||
                    container.closest('ytd-rich-item-renderer') ||
                    container.closest('ytd-grid-video-renderer') ||
                    container.closest('ytd-vertical-list-renderer') ||
                    container;

                if (toRemove && toRemove.parentNode) {
                    processedVideoIds.add(videoId);

                    blockedChannels.add(channelCanon);
                    blockedVideosCount++;

                    chrome.storage.local.set({
                        blockedChannels: Array.from(blockedChannels),
                        blockedVideosCount
                    }).catch(() => { });

                    if (window.__GCB_LOGGING) {
                        console.log(`%c[GCB] Blocked: ${channelCanon}`, 'color: #ff4444; font-weight: bold;');
                    }

                    toRemove.remove();
                }

            } catch (e) {
            }
        }
    }

    let scanScheduled = false;
    let lastScanAt = 0;
    const SCAN_THROTTLE_MS = 250;

    function scheduleScanImmediate() {
        const now = Date.now();
        if (now - lastScanAt < SCAN_THROTTLE_MS) {
            if (!scanScheduled) {
                scanScheduled = true;
                setTimeout(() => {
                    scanScheduled = false;
                    lastScanAt = Date.now();
                    scanAndRemove().catch(() => { });
                }, SCAN_THROTTLE_MS - (now - lastScanAt));
            }
            return;
        }
        lastScanAt = now;
        scanAndRemove().catch(() => { });
    }

    try {
        const observer = new MutationObserver(() => scheduleScanImmediate());
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {
    }

    setInterval(() => scheduleScanImmediate(), 5000);

})();
