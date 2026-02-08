document.addEventListener("DOMContentLoaded", async () => {

    const powerToggle = document.getElementById("power-toggle");
    const powerIcon = document.getElementById("power-icon");
    const powerStatus = document.getElementById("power-status");
    const defaultFiltersEl = document.getElementById("default-filters");
    const customFiltersEl = document.getElementById("custom-filters");
    const customInput = document.getElementById("custom-url");
    const addFilterBtn = document.getElementById("add-filter");
    const saveBtn = document.getElementById("save-btn");
    const totalChannelsEl = document.getElementById("total-channels");
    const totalVideosEl = document.getElementById("total-videos");
    const logToggle = document.getElementById('log-toggle');
    const logIcon = document.getElementById('log-icon');


    const defaultFilters = {
        AI_Filter: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/AI_Filter.json",
        bangladesh: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/bangladesh.json",
        Hindi_Filter: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/Hindi_Filter.json",
        spanish: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/spanish.json",
        nepal: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/nepal.json",
        pakistan: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/Pakistan.json",
        philippines: "https://raw.githubusercontent.com/hypocalcemia/garbcontent-block/refs/heads/main/filters/PHILIPPINES.json"
    };


    chrome.storage.local.get('defaultFilters', data => {
        if (!data.defaultFilters) {
            chrome.storage.local.set({ defaultFilters });
        }
    });


    const data = await chrome.storage.local.get(['enabled', 'activeFilters', 'customFilters']);
    let enabled = data.enabled !== false;
    let activeFilters = data.activeFilters || [];
    let customFilters = data.customFilters || [];


    const logData = await chrome.storage.local.get(['loggingEnabled']);
    let loggingEnabled = !!logData.loggingEnabled;


    const updatePowerUI = () => {
        powerStatus.textContent = enabled ? "Active" : "Offline";
        powerIcon.classList.toggle("text-green-400", enabled);
        powerIcon.classList.toggle("text-zinc-400", !enabled);
        powerToggle.classList.toggle("bg-blue-600", enabled);
        powerToggle.classList.toggle("bg-zinc-800", !enabled);
    };
    updatePowerUI();


    powerToggle.onclick = async () => {
        enabled = !enabled;
        await chrome.storage.local.set({ enabled });
        updatePowerUI();
    };


    const updateLogUI = () => {
        logIcon.classList.toggle('text-green-400', loggingEnabled);
        logIcon.classList.toggle('text-zinc-400', !loggingEnabled);
    };
    updateLogUI();


    async function propagateLoggingFlag(enabled) {
        try {
            const tabs = await chrome.tabs.query({});
            for (const t of tabs) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: t.id },
                        func: (v) => { window.__GCB_LOGGING = v; },
                        args: [enabled]
                    });
                } catch (e) {
                }
            }
        } catch (e) {
        }
    }


    propagateLoggingFlag(loggingEnabled);


    logToggle.onclick = async () => {
        loggingEnabled = !loggingEnabled;
        await chrome.storage.local.set({ loggingEnabled });
        updateLogUI();
        propagateLoggingFlag(loggingEnabled);
    };


    const renderFilters = () => {
        defaultFiltersEl.innerHTML = '';
        for (let key in defaultFilters) {
            const active = activeFilters.includes(key);
            const btn = document.createElement('button');
            btn.className = `flex items-center justify-between p-2 rounded border text-sm ${active ? 'bg-white/5 border-blue-500' : 'bg-transparent border-white/10'} cursor-pointer`;
            btn.innerHTML = `<span class="truncate">${key}</span><span class="text-xs ${active ? 'text-blue-400' : 'text-zinc-400'}">${active ? 'On' : 'Off'}</span>`;
            btn.onclick = () => {
                if (activeFilters.includes(key)) {
                    activeFilters = activeFilters.filter(f => f !== key);
                } else {
                    activeFilters.push(key);
                }
                renderFilters();
            };
            defaultFiltersEl.appendChild(btn);
        }


        customFiltersEl.innerHTML = '';
        for (let url of customFilters) {
            const active = activeFilters.includes(url);
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between gap-2 p-2 rounded border';
            div.innerHTML = `
        <div class="flex-1 truncate text-sm">${url}</div>
        <div class="flex items-center gap-2">
          <button class="toggle text-sm ${active ? 'text-blue-400' : 'text-zinc-400'}">${active ? 'On' : 'Off'}</button>
          <button class="remove text-red-500">×</button>
        </div>
      `;
            const toggleBtn = div.querySelector('.toggle');
            toggleBtn.onclick = () => {
                if (activeFilters.includes(url)) activeFilters = activeFilters.filter(f => f !== url);
                else activeFilters.push(url);
                renderFilters();
            };
            const removeBtn = div.querySelector('.remove');
            removeBtn.onclick = () => {
                customFilters = customFilters.filter(f => f !== url);
                activeFilters = activeFilters.filter(f => f !== url);
                renderFilters();
            };
            customFiltersEl.appendChild(div);
        }
    };
    renderFilters();


    addFilterBtn.onclick = () => {
        const url = customInput.value.trim();
        if (!url || customFilters.includes(url)) return;
        customFilters.push(url);
        if (!activeFilters.includes(url)) activeFilters.push(url);
        customInput.value = '';
        renderFilters();
    };


    saveBtn.onclick = async () => {
        await chrome.storage.local.set({ activeFilters, customFilters, enabled });
        const toast = document.getElementById('toast');
        toast.textContent = 'Settings saved';
        toast.style.opacity = '1';
        toast.style.pointerEvents = 'auto';
        setTimeout(() => { toast.style.opacity = '0'; toast.style.pointerEvents = 'none'; }, 1500);
    };


    async function updateBlockedCounts() {
        let totalChannels = 0;
        for (let f of activeFilters) {
            const url = defaultFilters[f] || f;
            try {
                const resp = await fetch(url);
                const json = await resp.json();
                totalChannels += (json.channels || []).length;
            } catch { }
        }
        totalChannelsEl.textContent = `Blocked Channels: ${totalChannels}`;


        const [tabs] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tabs.id },
                func: () => document.querySelectorAll('ytd-rich-item-renderer[data-onyx-flagged]').length,
            }, results => {
                const blockedVideos = results?.[0]?.result || 0;
                totalVideosEl.textContent = `Blocked Videos: ${blockedVideos}`;
            });
        }
    }


    updateBlockedCounts();


    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.activeFilters || changes.blockedVideosCount)) {
            updateBlockedCounts();
            if (changes.activeFilters) activeFilters = changes.activeFilters.newValue || [];
            renderFilters();
        }
    });

});
