<div align="center">

# يمين

**Arabic RTL for AI & Productivity**

Automatic right-to-left text direction for Claude, ChatGPT, Gemini, Grok, DeepSeek, Perplexity, Notion, and 13+ more platforms.

Install once. Read naturally.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=googlechrome&logoColor=white)](#)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--ons-orange?logo=firefox&logoColor=white)](#)
[![Safari](https://img.shields.io/badge/Safari-App%20Store-black?logo=safari&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)

</div>

---

## The Problem

Every AI chat and most productivity tools render Arabic text left-to-right. Paragraphs are misaligned, bullet points face the wrong way, and mixed Arabic/English content becomes unreadable. Millions of Arabic speakers deal with this daily.

## The Fix

يمين scans every text element on the page. If it detects Arabic above a configurable threshold, it flips that element to RTL — while keeping code blocks, math, and English content in LTR. No manual toggle. No configuration. Install and forget.

## Supported Platforms

| AI Chats | Productivity |
|----------|-------------|
| Claude · ChatGPT · Gemini · Grok | Notion · Coda · Google Docs |
| DeepSeek · Perplexity · Mistral | Linear · ClickUp |
| Copilot · Poe · HuggingChat | + any website (opt-in) |
| AI Studio · LM Arena · Pi · You.com | |

**"Any Website" mode** — toggle one switch and يمين works on every site. Uses optional permissions so Chrome doesn't require it at install.

## Features

- **Auto-detect** — per-element Arabic detection, not full-page toggle
- **Code protection** — `<pre>` and `<code>` always stay LTR
- **Math protection** — KaTeX and MathJax stay LTR
- **Numeral choice** — Western (1, 2, 3) or Eastern (١, ٢, ٣)
- **Three modes** — Off / Auto / Force
- **Live streaming** — updates direction as AI responses stream in
- **SPA-aware** — detects navigation in single-page apps
- **Zero tracking** — no analytics, no external connections, no data collection
- **< 10KB** — the entire extension

## Install

### Chrome / Edge / Arc / Brave / Opera
Install from [Chrome Web Store](#) — one click.

### Firefox
Install from [Firefox Add-ons](#) — one click.

### Safari
Install from [Mac App Store](#) — one click, then enable in Safari Settings → Extensions.

### Manual (Development)
```bash
git clone https://github.com/arj-89/yameen.git
cd yameen/extension
```
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select the `extension/` folder

## Settings

Click the يمين icon in your toolbar:

| Setting | Options | Default |
|---------|---------|---------|
| مستوى RTL | Off · Auto · Force | Auto |
| نظام الأرقام | أرقام عربية (1,2,3) · أرقام هندية (١,٢,٣) | أرقام عربية |
| كل المواقع | On · Off | Off |

## How It Works

1. Content script runs on matched domains (or all domains if "Any Website" is enabled)
2. `MutationObserver` watches for new/changed content (including streaming responses)
3. Every text element (`p`, `li`, `h1`–`h6`, `blockquote`, `td`, `th`, `div`, `span`) is checked
4. If 12%+ of characters are Arabic → `data-ymn="rtl"` attribute is added
5. CSS rules apply `direction: rtl` and `text-align: right` with `unicode-bidi: plaintext`
6. Code blocks, math, and UI chrome (nav, buttons) are explicitly protected as LTR
7. Western numerals enforced via `font-feature-settings: "lnum"` when selected

## Architecture

```
yameen/
├── extension/
│   ├── manifest.json          # Chrome Manifest V3
│   ├── manifest-firefox.json  # Firefox Manifest V2
│   ├── background.js          # Service worker (Any Website mode)
│   ├── content.js             # RTL detection engine
│   ├── content.css            # RTL styles
│   ├── popup.html             # Settings UI
│   ├── popup.js               # Settings logic + permission handling
│   └── icons/
├── site/                      # Landing page + privacy policy
├── scripts/
│   └── health-check.js        # Puppeteer DOM monitoring
├── .github/workflows/
│   ├── publish.yml            # Auto-publish on tag
│   └── monitor.yml            # Daily platform health check
└── README.md
```

## CI/CD

**Automated publishing** — push a version tag and the extension ships:

```bash
# Bump version in manifest.json, then:
git add -A && git commit -m "v1.0.1"
git tag v1.0.1
git push origin main --tags
```

The GitHub Action packages Chrome and Firefox zips separately and publishes to both stores.

**Daily health check** — a Puppeteer script visits each platform, injects the content script, creates a test element with Arabic text, and verifies RTL is applied. Opens a GitHub Issue if anything breaks.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

**Quick wins for contributors:**
- Add a new platform: add the URL to `manifest.json` matches + `PLATFORMS` in `popup.js`
- Improve detection: tune `content.js` threshold or add edge cases
- Add a language: Farsi, Urdu, Pashto ranges in the Arabic regex
- Fix a platform: when a site updates its DOM, update the root selectors in `content.js`

## Privacy

يمين does not collect, store, or transmit any data. All processing happens locally in your browser. See [Privacy Policy](https://yameen.bixet.tech/privacy.html).

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**صُنع للقارئ العربي**

[Website](https://yameen.bixet.tech) · [Chrome Web Store](#) · [Firefox Add-ons](#) · [Product Hunt](#)

</div>
