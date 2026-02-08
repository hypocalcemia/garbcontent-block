async function fetchAndStoreDefaultFilters() {
    const defaultMap = {
        AI_Filter: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/AI_Filter.json",
        bangladesh: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/bangladesh.json",
        Hindi_Filter: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/Hindi_Filter.json",
        spanish: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/spanish.json",
        nepal: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/nepal.json",
        pakistan: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/Pakistan.json",
        philippines: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/PHILIPPINES.json"
    };
    try {
        const entries = await Promise.all(Object.entries(defaultMap).map(async ([k, url]) => {
            try {
                const r = await fetch(url);
                if (!r.ok) throw new Error('bad response');
                const json = await r.json();
                const channels = (json.channels || []).map(ch => ch.replace('@','').toLowerCase());
                return [k, { url, channels }];
            } catch (e) {
                return [k, { url, channels: [] }];
            }
        }));

        const toStoreMap = Object.fromEntries(entries);
        const urlMap = {};
        const contentsMap = {};
        for (const [k, v] of Object.entries(toStoreMap)) {
            urlMap[k] = v.url;
            contentsMap[k] = v.channels;
        }

        chrome.storage.local.set({ defaultFilters: urlMap, defaultFilterContents: contentsMap, defaultFiltersLastUpdated: Date.now() });
        console.log('[GCB] Default filters and contents cached');
    } catch (e) {
        console.error('[GCB] Error caching default filters', e);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('GarbContent-Block installed');
    fetchAndStoreDefaultFilters();
    chrome.alarms.create('refreshDefaultFilters', { periodInMinutes: 15 });
});

chrome.runtime.onStartup.addListener(() => {
    fetchAndStoreDefaultFilters();
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'refreshDefaultFilters') fetchAndStoreDefaultFilters();
});
