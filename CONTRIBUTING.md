# Contributing to يمين

Thanks for wanting to help Arabic (and RTL) speakers read the web properly.

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/yameen.git
cd yameen/extension
```

1. Open `chrome://extensions` → Developer Mode → Load unpacked → select `extension/`
2. Make your changes
3. Click the refresh icon on the extension card to reload
4. Test on the relevant platform

## Adding a New Platform

The simplest and most impactful contribution.

1. Add the URL pattern to `extension/manifest.json` under `content_scripts.matches`
2. Add the hostname → display name mapping to `extension/popup.js` in the `PLATFORMS` object
3. Test: open the platform, type or view Arabic text, verify `data-ymn="rtl"` appears on text elements
4. Submit a PR with a screenshot showing RTL applied

## Adding a New Language

يمين currently detects Arabic script. To add Farsi, Urdu, Pashto, or other RTL scripts:

1. In `extension/content.js`, expand the `AR` regex to include additional Unicode ranges
2. Test with sample text in the target language
3. Submit a PR with before/after screenshots

## Fixing a Platform

When an AI platform updates its UI (happens frequently), the root selectors in `content.js` may need updating:

1. Open DevTools on the platform
2. Find the container element for chat messages
3. Check if any of the selectors in `content.js` `scan()` function match it
4. If not, add a new selector
5. Submit a PR describing what changed

## Code Style

- No build step — the extension ships raw JS/CSS
- No external dependencies in the extension itself
- Keep `content.js` under 200 lines
- Comments where behavior isn't obvious
- Test on at least Chrome and one other browser

## Issues

- **Bug reports**: include the platform, browser, and a screenshot
- **Feature requests**: describe the use case, not just the feature
- **Platform requests**: include the URL and a screenshot of the RTL issue

## Releases

Maintainers handle releases. The flow:

1. Update version in `manifest.json` and `manifest-firefox.json`
2. Commit and tag: `git tag v1.0.X`
3. Push: `git push origin main --tags`
4. GitHub Actions handles Chrome + Firefox publishing
