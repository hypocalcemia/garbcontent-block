# 🛡️ GarbContent-Block 
### *Clean up the noise. Fix your YouTube discovery.*

[![Version](https://img.shields.io/badge/version-1.0.0--alpha-blue.svg)](https://github.com/your-username/garbcontent-block)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/your-username/garbcontent-block/graphs/commit-activity)

**GarbContent-Block** is a simple, fast browser extension built to do one thing: filter out the junk. This isn't a complex ad-blocker—it's a tool to hide AI-generated "slop" and regional content that clutters your search results.



## Why I built this
YouTube’s search and discovery are currently being flooded by two big problems:

1. **The Language Mismatch:** You search for a technical tutorial in English, but the results are packed with Indian-language videos (Also called hindi). If you don't speak the language, those results are just dead weight in your feed.
2. **The AI-Slop Wave:** Millions of low-effort, AI-voiced videos are being mass-uploaded daily. They farm views but offer zero real help.

### The Stats
* **Quality over Quantity:** In just 48 hours, the filter list grew from **2 channels to over ~~160~~ **313**!.
* **Real Impact:** By removing these hubs, you’re effectively hiding thousands of low-quality videos from your search results instantly.
* **Speed:** Since this runs as an extension, it scans the page as you scroll—zero lag, no waiting.
---
## 📂 Filter Lists
We categorize our filters to keep the blocking precise. You can find these in the `/filters` directory:

### 🏛️ Official Lists (Verified by Maintainer)
* **`AI_Filter.json`**: Targets known "slop" factories and mass-produced AI content.
* **`Hindi_Filter.json`**: Targets regional Indian content to keep English discovery clean.

### 🤝 Community & Extra Filters
* **Community Submissions**: Experimental blocks or niche filters submitted by users. 
* **Custom Rules**: Have a specific niche (like "Crypto-scams" or "Misleading Content") you want gone? Check the `extra filters` issues to see what we're building next.
---
## ✅ What it does
* **Hides AI "Farms":** We target channels that mass-produce low-value, synthetic content.
* **Hindi Content Filter:** A dedicated list to keep your English-speaking discovery focused on languages you actually understand.
* **Community Driven:** The blacklist is updated constantly by people who are tired of seeing the same garbage in their feeds.
---

## 📊 Project History
This project is moving fast. Here is how it’s scaled in just the first few days:

| Date | Progress | Total Channels Filtered |
| :--- | :--- | :--- |
| **Feb 08, 2026** | **Moved to Extension Alpha (Updated)** | **313** |
| <s>Feb 08, 2026</s> | <s>Moved to Extension Alpha</s> | <s>163</s> |
| Feb 07, 2026 | First major list update | 80+ |
| Feb 06, 2026 | Initial Script Launch | 2 |
---

## 🛠️ How to use it (Developer Alpha)
Until the extension is live on the official stores, you can load it manually:

1. **Download** or clone this repo.
2. Open your browser and go to `chrome://extensions` (works on Brave/Edge/Chrome).
3. Turn on **Developer Mode** (the toggle in the top right).
4. Click **Load Unpacked** and select this folder.
5. Refresh YouTube and watch the feed clean itself up.
---

## 🤝 Help Me Clean This Up
I can't find every bad channel alone. If you're tired of seeing a specific channel or a new type of "slop," here is how you can help:

* **Add it yourself:** If you know GitHub, edit the JSON files in the `filters/` folder and send a Pull Request. I’ll merge them as fast as I can.
* **Report a channel:** Just [open an issue](https://github.com/your-username/garbcontent-block/issues) and paste the `@handle`. Tell me if it's AI slop or regional content, and I'll add it to the main list.
* **New Ideas:** If you have an idea for a new filter (like blocking a different language or a specific niche), open an issue labeled `extra filters` and let's talk about it.

---
### *Built to curate, not just block.*
[Report a Channel](https://github.com/hypocalcemia/garbcontent-block/issues) | [Submit a Filter](https://github.com/hypocalcemia/garbcontent-block/pulls)
