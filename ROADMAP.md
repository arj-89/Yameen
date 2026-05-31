# Yameen Roadmap

_Last updated: 2026-05-31_

## Current release

**v1.4.0** — Released May 31, 2026
- Firefox AMO: approved + live
- Chrome Web Store: approved + live
- macOS App Store: submitted, awaiting Apple review

## Infrastructure in place

- **GitHub Actions secrets armed** (6 total on `arj-89/Yameen`): `FIREFOX_API_KEY`, `FIREFOX_API_SECRET`, `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`
- **Shared extension code** under `extension/` (`popup.html`, `popup.js`, `content.js`) referenced by all three browser manifests
- **Safari Xcode project** at `safari/`, deployment target macOS 11.0 (both App and Extension targets)
- **Landing page** at `yameen.bixet.tech` auto-deployed from `/site` via Coolify

---

## v1.5 — Polish + UX
1. Decouple numeral system from RTL mode (numerals should convert independently of Force/Auto/Off setting)
2. Fix list rendering on Claude (list-marker and content alignment when RTL applied to `<ol>` elements)
3. Fix paragraph bidi for mixed LTR/RTL content (wrap LTR phrases in `<span dir="ltr">` to preserve intended reading order)

## v1.6 — Hygiene & CI
- Investigate and fix failing step in `publish.yml`
- Replace dead marketplace Actions (`mnao305/chrome-extension-upload`, `trmcnvn/firefox-addon` identified as replacements)
- Rename `extension/manifest.json` → `manifest-chrome.json` for clarity (touches `publish.yml`, Safari pbxproj, `PUBLISHING-GUIDE.md`, `CONTRIBUTING.md`)
- Reconcile pbxproj `CURRENT_PROJECT_VERSION` drift with App Store Connect
- Any v1.5 follow-up fixes

## v1.7 — تصحيح / Fix feature
Keyboard layout correction. Detects text typed with the wrong keyboard layout (English keys → gibberish Arabic, or the reverse) and offers correction in place. Already scoped in `decisions.md`.

## v1.8 — Feature additions
- "Request this site" link in popup (user requests an unsupported site be added to curated list)
- Per-tab settings (separate from global preferences — needs scenario validation before scoping)

## v1.9 — Full Arabic copy system
Comprehensive Arabic copy audit and rewrite:
- UI labels, popup states, helper text
- Store listings (App Store, Chrome Web Store, AMO)
- Website (`yameen.bixet.tech`) copy
- Tagline
- All authored in Arabic via the editorial skill — not translated

## v2.0 — Marketing relaunch
- Website refresh
- All 3 store listings updated with v1.9 copy
- Product Hunt launch
- Honest competitor comparison table

## 2.1+ — Maintenance
Bug fixes and small improvements via tagged releases. No new major features unless explicitly slotted.

---

## Updating this file

Update on every release (move the released version into "Current release", remove from the future list) or when plans materially change. Source of truth for what's next; pair with `decisions.md` (locked product decisions) and `CHANGELOG.md`-style git history (what shipped when).
