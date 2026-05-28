# decisions.md — Yameen Engineering Notes

## 1.2 Audit (2026-05-09)

### Version confirmed

All three manifests report `"version": "1.1.0"`:

| File | Version |
|------|---------|
| `extension/manifest.json` (Chrome MV3) | 1.1.0 |
| `extension/manifest-firefox.json` (Firefox MV2) | 1.1.0 |
| `extension/manifest-safari.json` (Safari MV2) | 1.1.0 |

`popup.html` line 14 also shows `v1.1.0` in the UI header.

---

### Bug #1 — Off mode teardown

**Where the Off toggle is wired:**

- `extension/popup.js` lines 56-58: mode radio inputs call `api.storage.sync.set({ mode: r.value })` on change.
- `extension/content.js` lines 27-33 (`loadSettings`): `storage.onChanged` listener receives the change, updates the module-level `mode` variable, and immediately calls `applyMode()`.
- `extension/content.js` lines 35-48 (`applyMode`): disconnects the MutationObserver (`obs.disconnect()`), calls `clearAll()`, then returns early if `mode === "off"`.
- `extension/content.js` lines 203-210 (`clearAll`): removes `data-ymn`, `data-ymn-input`, `data-ymn-original` attributes via `querySelectorAll`, restores numeral text nodes from the `originalTextNodes` WeakMap, and removes `data-ymn-mode` / `data-ymn-numerals` from `document.body`.

**Root cause — no element tracking:**

The extension does **not** maintain a dedicated set of mutated elements. Instead it relies on `document.querySelectorAll("[data-ymn]")` at teardown time to discover what it previously changed.

Consequences:
1. If any element is removed from the DOM while still carrying `data-ymn`, it becomes invisible to `querySelectorAll` and can never be cleaned up.
2. Original attribute values are not saved before mutation. The extension adds custom `data-ymn` attributes (RTL styling is applied entirely via CSS rules keyed on those attributes — see `content.css` lines 6-10, 94-98), but if an element already had a `dir` attribute set by the page, teardown would need to restore the original value, not just remove an attribute. Currently it does not save the original value.
3. There is no WeakSet/WeakMap tracking modified elements. This is the structural gap flagged in the plan.

**RTL mutation sites (where elements are marked):**

| Location | What it does |
|----------|-------------|
| `content.js:119` (`processEl`) | `el.setAttribute("data-ymn", "rtl")` for LEAF_TAGS |
| `content.js:129` (`processEl`) | `el.setAttribute("data-ymn", "rtl")` for CONTAINER_TAGS |
| `content.js:141` (`processEl`) | `el.setAttribute("data-ymn", "rtl")` for DIV/SPAN |
| `content.js:163` (`handleInputs`) | `el.setAttribute("data-ymn-input", "rtl")` for text inputs |

**CSS that applies the visual RTL effect** (triggered by those attributes):

- `content.css:6-10`: `[data-ymn="rtl"]` → `direction: rtl`, `text-align: right`, `unicode-bidi: plaintext`
- `content.css:94-98`: `[data-ymn-input="rtl"]` → same three properties
- `content.css:19-48`: `body[data-ymn-mode="force"]` rules (force mode)

**Other event hooks that are active while On:**

- `content.js:242-248`: `document.addEventListener("input", …)` — captures input events to re-run `handleInputs()`. Checks `if (mode === "off") return` but the listener itself is never removed; it persists forever.
- `content.js:250-256`: URL-change `setInterval` (1000ms) — continues running after Off, correctly gated by `if (mode !== "off")`.
- `content.js:273-279`: 700ms scan poll — correctly gated by `if (mode === "off") return`.
- `content.js:259-271`: `MutationObserver obs` — disconnected in `applyMode()` before `clearAll()`. Correct.

The `input` event listener (line 242) is never removed regardless of mode. It only guards internally with `if (mode === "off") return`, which is sufficient for correctness, but the Plan's `teardownAll()` should formally remove it.

---

### Bug #2 — Numeral conversion

**CSS hack (current approach):**

`content.css` lines 13-16:
```css
body[data-ymn-numerals="western"] [data-ymn="rtl"],
body[data-ymn-numerals="western"] [data-ymn-input="rtl"] {
  font-feature-settings: "lnum" !important;
}
```

`content.css` line 47:
```css
body[data-ymn-mode="force"][data-ymn-numerals="western"] {
  font-feature-settings: "lnum" !important;
}
```

These rules use `font-feature-settings: "lnum"` (lining figures) to visually switch glyphs. This is the hack that must be removed. Note that `lnum` makes proportional/tabular glyphs but does NOT convert Eastern Arabic (٠-٩) to Western; the font must support the feature and the mapping. This approach is unreliable across fonts and does not change actual text content.

**Text-node replacement (partially present):**

`content.js` lines 8-9 define `EASTERN_TO_WESTERN` and `WESTERN_TO_EASTERN` maps. `content.js` lines 212-239 (`convertNumerals`) already implements a TreeWalker-based text replacement, storing original values in `originalTextNodes` WeakMap, and restoring them via `restoreNumerals()` in clearAll.

**The gap:** `convertNumerals()` is only called from `scan()` (line 186), which means it only runs on elements already marked `data-ymn="rtl"`. It does not run a full-document pass on page load, and the MutationObserver does not re-run `convertNumerals` on newly inserted nodes independently of scan. Phase 3 will extend it to a full-document TreeWalker on load plus a dedicated MutationObserver pass.

---

### Bug #3 — "Any Website" mode over-unification

**Location of "Any Website" logic:**

| File | Role |
|------|------|
| `extension/background.js` lines 37-60 | `registerEverywhere()` / `unregisterEverywhere()` using `scripting.registerContentScripts()` (Chrome MV3 scripting API only) |
| `extension/popup.js` lines 15-17, 70-88 | Shows/hides the toggle, requests `<all_urls>` optional permission, persists `everywhere` in storage |
| `extension/manifest.json` lines 19-20 | `"optional_permissions": ["<all_urls>"]` — Chrome MV3 only |
| `extension/manifest-firefox.json` | No `background` key, no `optional_permissions` |
| `extension/manifest-safari.json` | No `background` key, no `optional_permissions` |

**What makes it over-unified:**

1. `background.js` exists as a single file but only loads in Chrome (the Firefox and Safari manifests have no `background` entry). Its existence is implicitly browser-gated by the build/manifest system, not by any code-level guard.
2. `popup.js` line 15: `if (typeof chrome === 'undefined' || !chrome.scripting)` — Firefox provides a `chrome` compat object, and modern Firefox (MV3) does have `chrome.scripting`. This check is unreliable for Firefox MV2: the condition depends on runtime environment rather than explicit browser detection. The result is undefined behavior in Firefox.
3. The `everywhere` setting persists in `storage.sync` for all browsers. On Firefox and Safari where the section is hidden, an `everywhere: true` value could be left over from a Chrome install (if the user syncs storage), causing the content script to believe "everywhere" is enabled when the background dynamic injection is not running.
4. There is no single `shouldApplyRTL(url, settings)` predicate. The decision of whether to run RTL on a given page is implicit: if content.js is injected (by manifest match or dynamic registration), it runs. There is no per-URL enabled/disabled logic in content.js itself — mode is global, not per-site.

**What should stay browser-specific:** manifest keys (`optional_permissions`, `background.service_worker`), the dynamic scripting API call, and the permission request flow (Chrome only).

**What should be shared:** a single predicate that determines whether the extension is active on the current URL given the settings object. This would make content.js self-aware rather than relying purely on injection gating.

---

### Platform count

The `extension/manifest.json` content_scripts `matches` array lists 24 URL patterns covering 20 distinct services (some services have 2 entries, e.g., `chatgpt.com` + `chat.openai.com`). The "20+" claim in the README and popup UI is accurate.

---

**HARD STOP — Phase 1 complete. Awaiting review before any code changes.**

---

## Phase 2 — Bug #1 fix: Off mode teardown (2026-05-09)

### What changed

**`extension/content.js`** — only this file was modified. No CSS changes, no other files touched.

#### 1. Added `modifiedElements` tracking Map

```js
const modifiedElements = new Map(); // element → {attrName: originalValue}
```

A module-level `Map` where each key is a DOM element Yameen has mutated and each value is an object recording the attribute's value *before* Yameen touched it (`null` if the attribute was absent). Using a `Map` (not `WeakMap`) because teardown requires iteration over all tracked elements.

#### 2. Added `track()` and `untrack()` helpers

`track(el, attrName)` — called **before** every `setAttribute`. Saves the original value the first time a given attribute on a given element is mutated. Idempotent: subsequent calls on the same element/attribute are no-ops (the first snapshot is kept).

`untrack(el, attrName)` — restores a single attribute to its pre-Yameen value and removes the entry from `modifiedElements`. Used in the "element no longer qualifies" code paths that previously called `el.removeAttribute(...)` directly.

#### 3. Named `onInput` function (was anonymous)

The `input` event listener is now a named function so `document.removeEventListener` can target it precisely. Previously it was anonymous and could never be removed.

#### 4. Added `teardownAll()`, removed `clearAll()`

`teardownAll()` replaces `clearAll()`. It:
1. Calls `obs.disconnect()` to stop the MutationObserver.
2. Calls `document.removeEventListener("input", onInput, true)` to remove the input listener.
3. Iterates `modifiedElements` and restores every attribute to its pre-Yameen value (either removes it if original was `null`, or resets it to the original string if the page had its own value).
4. Calls `modifiedElements.clear()`.
5. Calls `restoreNumerals()` to revert numeral text-node changes.

The old `clearAll()` used `querySelectorAll("[data-ymn]")` at teardown time, which would miss any element that had left the DOM while still modified. The new approach captures elements at mutation time and restores them regardless of current DOM presence.

#### 5. Updated `applyMode()`

- Calls `teardownAll()` instead of `obs.disconnect() + clearAll()`.
- Re-adds `document.addEventListener("input", onInput, true)` when mode is not "off" (safe to call repeatedly — the browser deduplicates identical listener registrations).
- Calls `track(document.body, "data-ymn-mode")` and `track(document.body, "data-ymn-numerals")` before setting those attributes, so teardown can restore them the same way as any other element.

#### 6. Updated `processEl()` and `handleInputs()`

Every `el.setAttribute("data-ymn", "rtl")` and `el.setAttribute("data-ymn-input", "rtl")` is now preceded by the corresponding `track()` call. Every previous `el.removeAttribute(...)` in the "element no longer qualifies" branch is replaced by `untrack()`, which restores the original value rather than blindly removing.

#### 7. `obs` declaration moved from `const` to `let`

`obs` is now declared `let obs;` near the top of the IIFE (alongside the other module-level variables) and assigned at the same location where `new MutationObserver(...)` previously appeared. This allows `teardownAll()` (defined earlier in the file) to reference `obs` without a temporal dead zone issue — by the time `teardownAll()` is ever *called*, `obs` is always assigned.

### Why these choices

- **`Map` over `WeakMap`**: teardown requires iterating all tracked elements; `WeakMap` is not iterable. A `Set` + `WeakMap` combination would also work but adds complexity. Since teardown calls `modifiedElements.clear()`, there is no risk of the Map retaining detached elements across sessions.
- **`track` before `setAttribute`**: ensures we never miss the original value even if the element is mutated multiple times between teardown cycles.
- **`removeEventListener` in teardown**: removes the only non-gated side-effect of the extension. The `setInterval` pollers remain (they self-gate on `mode === "off"`) — removing them would require storing interval IDs and is unnecessary for correctness.

### Cross-browser

`Map`, `WeakMap`, `removeEventListener`, named function references — all universally supported in Chrome MV3, Firefox MV2, and Safari MV2. No polyfills or browser-specific code paths introduced.

### Test checklist (manual, required on all 3 browsers before Phase 3)

- [ ] Type Arabic on claude.ai → RTL applied to input
- [ ] Toggle Off → `data-ymn-input` removed from input, direction/alignment restored, no further RTL on new input
- [ ] Toggle On → RTL re-applies cleanly
- [ ] Type Arabic → get a response → Toggle Off → `data-ymn="rtl"` removed from all response elements
- [ ] Force mode → Toggle Off → `data-ymn-mode` removed from `document.body`, page returns to LTR

**HARD STOP — Phase 2 complete. Awaiting review before Phase 3.**

---

## Phase 3 — Bug #2 fix: Real numeral conversion (2026-05-09)

### What changed

**`extension/content.css`** — two rule blocks removed.
**`extension/content.js`** — `convertNumerals` rewritten; call sites reorganised.

#### CSS: `font-feature-settings` hack removed

Deleted both occurrences:

```css
/* removed: */
body[data-ymn-numerals="western"] [data-ymn="rtl"],
body[data-ymn-numerals="western"] [data-ymn-input="rtl"] {
  font-feature-settings: "lnum" !important;
}

/* removed: */
body[data-ymn-mode="force"][data-ymn-numerals="western"] {
  font-feature-settings: "lnum" !important;
}
```

These rules applied a CSS lining-figures hint that made Eastern Arabic glyphs visually resemble Western digits in fonts that support the OpenType `lnum` feature. The actual DOM text was unchanged, so copy-paste, screen readers, and `textContent` reads all returned the original Eastern digits.

#### JS: `convertNumerals` replaced with `convertNumerals(rootNode)`

**Old behaviour:** Queried `document.querySelectorAll('[data-ymn="rtl"]')` and walked text nodes only within those already-RTL-marked elements. Supported both Eastern→Western and Western→Eastern depending on the `numerals` setting.

**New behaviour:** Accepts any DOM node as `rootNode`. Walks all text nodes under it using `document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, ...)`. Converts Eastern→Western only (when `numerals === "western"`; returns immediately otherwise). Restoring to original Eastern numerals is handled by `restoreNumerals()` via `originalTextNodes` WeakMap — no Western→Eastern pass needed.

**Skip filter in `acceptNode`:**
- `parent.closest("script, style, textarea, input, pre, code")` — skips non-content and code elements.
- `parent.isContentEditable` — skips any element inside a contenteditable context (user input fields). Uses the built-in `isContentEditable` property, which walks the ancestor chain automatically; this correctly skips all chat input areas without needing custom element matching.

All text nodes that pass the filter and contain Eastern numerals are converted in-place. The original text is saved to `originalTextNodes` before the first conversion so `restoreNumerals()` can undo it on teardown.

#### New call sites for `convertNumerals`

| Call site | What it does |
|-----------|-------------|
| `applyMode()` line: `convertNumerals(document.body)` | Full-document pass run once each time the extension activates (on load, SPA navigation, or settings change). Runs before `scan()`/`handleInputs()` so numerals are converted even in non-RTL content. |
| MutationObserver callback: `convertNumerals(node)` per added element | Converts numerals in dynamically appended element nodes immediately (synchronous, no debounce). AI responses streamed into the DOM are converted token by token as they appear. |

`convertNumerals()` was removed from `scan()`. RTL detection (`scan`) and numeral conversion are now separate responsibilities.

#### MutationObserver callback restructured

The old callback used `return` inside the `for` loop, which exited the entire callback after scheduling the first RTL debounce — meaning later mutations in the same batch were never visited, and added-node numeral conversion couldn't be run per-node. The new callback:

1. Processes all mutations in the batch.
2. Calls `convertNumerals(node)` for each added element node (synchronous).
3. Sets `needsRtlScan = true` if any `childList` additions or `characterData` changes were found.
4. Schedules the debounced RTL scan once after all mutations are processed.

### Why these choices

- **Full-document TreeWalker over RTL-element-scoped query:** Numerals appear in page content that may not be Arabic-ratio-eligible (e.g., a mostly-English article with a few Eastern numeral dates). The old approach missed those. The new approach catches all visible text.
- **`isContentEditable` over `[contenteditable]` selector:** `isContentEditable` correctly follows the DOM inheritance chain — an element is considered editable if any ancestor has `contenteditable="true"` — without needing to repeat `closest("[contenteditable]")`.
- **Synchronous conversion in observer vs. debounced scan:** RTL detection is debounced (120ms) because it involves `arabicRatio` calculation over many elements. Numeral conversion is cheap (regex scan), so running it synchronously on each added node gives immediate correct display as content streams in.
- **`restoreNumerals()` unchanged:** It still finds `[data-ymn-original]` elements and restores their text nodes from `originalTextNodes`. This works correctly regardless of whether the nodes were converted from inside `scan()` (old) or from `convertNumerals(document.body)` (new).

### Cross-browser

`TreeWalker`, `NodeFilter`, `isContentEditable`, `Element.closest` — all standard, all three browsers. No differences.

### Test checklist (manual, required on all 3 browsers before Phase 4)

- [ ] Visit aljazeera.net or alarabiya.net with extension On → Eastern numerals in page text visually show as Western (0-9)
- [ ] Open DevTools → inspect a converted text node → confirm `textContent` contains `0-9`, not `٠-٩`
- [ ] Copy text containing converted numerals, paste into Notes/TextEdit → pastes as Western digits
- [ ] Type Arabic containing Eastern numerals into Claude/ChatGPT input → numerals are NOT converted in the input field
- [ ] Toggle Off → all converted text nodes restored to original Eastern numerals, `data-ymn-original` attributes removed
- [ ] Toggle On → conversion re-applies
- [ ] Numeral setting: switch from "western" to "hindi" → restores Eastern numerals in DOM

**HARD STOP — Phase 3 complete. Awaiting review before Phase 4.**

---

## Phase 4 — Bug #3 proposal: "Any Website" mode cleanup (2026-05-09)

### What is the over-unification doing wrong?

The "everywhere" feature has one working implementation (Chrome MV3 background service worker + `scripting.registerContentScripts`) and two browsers where the feature does not and cannot exist (Firefox MV2 and Safari MV2, both of which have no background script in their manifests and no access to the dynamic scripting API). The problem is that the single guard meant to communicate this boundary — the popup's hide condition on line 15 — is testing the wrong thing:

```js
// current — unreliable
if (typeof chrome === 'undefined' || !chrome.scripting) {
  document.getElementById('everywhere-sec').style.display = 'none';
}
```

**Why it's wrong:**

Firefox exposes a `chrome` compat object, so `typeof chrome === 'undefined'` is `false` in Firefox. Firefox 102+ also exposes `chrome.scripting` (for MV3 compatibility), so `!chrome.scripting` may be `false` too — meaning the section is NOT hidden on Firefox MV2 even though the feature can't work there. The toggle appears, the user enables it, `everywhere: true` is stored, but background.js never loaded (it isn't in the Firefox manifest), so no dynamic script registration ever happens. The toggle does nothing silently.

A secondary issue: the popup reads `everywhereEl.checked = s.everywhere` directly from storage without verifying the actual `<all_urls>` permission is still granted. If the permission was revoked via the browser's extension settings (not through Yameen's own UI), the toggle shows as enabled while the feature is broken.

**What is NOT broken:**

- `background.js` is correct and complete. It handles Chrome MV3 dynamic registration, verifies permission on install/update, and cleans up stale storage if permission was revoked. No change needed.
- `content.js` has no awareness of "everywhere" state and doesn't need any — it runs wherever it's injected, and injection is already gated correctly by the manifests and Chrome's scripting API. A `shouldApplyRTL(url, settings)` predicate in content.js would be redundant: if content.js is executing, injection was already authorised. The manifests are the gate, not a runtime predicate.

---

### Minimal correct fix — two changes to `popup.js` only

#### Change 1 — Fix the feature detection (line 15)

Replace the check with one that tests the exact API `background.js` calls:

```js
// before
if (typeof chrome === 'undefined' || !chrome.scripting) {

// after
if (typeof chrome?.scripting?.registerContentScripts !== 'function') {
```

`chrome.scripting.registerContentScripts` is the precise method used in `background.js` (line 42). If that method is not a function — whether because `chrome` is absent, `chrome.scripting` is absent, or `scripting` exists but the MV3-only `registerContentScripts` method doesn't — the section is hidden. This is falsifiable by the exact API boundary and requires no browser-name string matching.

This one-line change:
- Correctly hides the section on Safari (no `chrome.scripting`)
- Correctly hides the section on Firefox MV2 (no `chrome.scripting.registerContentScripts`, even if `chrome.scripting` itself exists)
- Correctly shows the section on Chrome MV3 (which has the full API)
- Will correctly show the section if Firefox ever ships MV3 support for `registerContentScripts` — no future maintenance needed

#### Change 2 — Verify actual permission state at popup open

After reading storage, check whether the `<all_urls>` permission is genuinely granted before displaying the toggle as on:

```js
everywhereEl.checked = s.everywhere;

// add after:
if (s.everywhere) {
  api.permissions.contains({ origins: ["<all_urls>"] }, (granted) => {
    if (!granted) {
      everywhereEl.checked = false;
      api.storage.sync.set({ everywhere: false });
    }
  });
}
```

This brings popup state into sync with reality in the same case that `background.js` handles on install/update, but for the popup-open case (which happens every time the user clicks the extension icon).

---

### What stays browser-specific (unchanged)

| Concern | Where it lives | Change? |
|---------|---------------|---------|
| Dynamic script registration | `background.js` + Chrome MV3 manifest | No |
| Optional `<all_urls>` permission declaration | `extension/manifest.json` only | No |
| No background script | `manifest-firefox.json`, `manifest-safari.json` | No |
| Permission request flow | `popup.js` `everywhereEl` change listener | No |

---

### What this does NOT do (by design)

- No `shouldApplyRTL` predicate in `content.js` — unnecessary because the injection gating already provides this.
- No new shared module — both changes are localised to two lines in `popup.js`.
- No change to how `background.js` works — it is already the correct canonical implementation.

---

**HARD STOP — Phase 4 proposal written. Awaiting review before any code changes.**

### Phase 4 implementation

Implemented exactly as proposed. Two edits to `extension/popup.js` only.

**Change 1 — popup.js line 15:**
```js
// before
if (typeof chrome === 'undefined' || !chrome.scripting) {
// after
if (typeof chrome?.scripting?.registerContentScripts !== 'function') {
```

**Change 2 — popup.js after `everywhereEl.checked = s.everywhere`:**
```js
if (s.everywhere) {
  api.permissions.contains({ origins: ["<all_urls>"] }, (granted) => {
    if (!granted) {
      everywhereEl.checked = false;
      api.storage.sync.set({ everywhere: false });
    }
  });
}
```

No other files touched.

### Test checklist (manual, required on all 3 browsers before Phase 5)

- [ ] **Chrome:** Open popup on claude.ai → "Any Website" section visible, toggle works, enabling requests permission, disabling removes it
- [ ] **Chrome:** Enable "Any Website", revoke `<all_urls>` permission manually via chrome://extensions → reopen popup → toggle shows as Off, storage cleared
- [ ] **Chrome:** Visit chatgpt.com (supported) → dot green, name shown
- [ ] **Chrome:** Enable "Any Website", visit an unsupported site → dot purple, host shown
- [ ] **Chrome:** Disable "Any Website", visit an unsupported site → dot grey, "غير مدعوم" shown
- [ ] **Firefox:** Open popup → "Any Website" section hidden entirely
- [ ] **Safari:** Open popup → "Any Website" section hidden entirely
- [ ] **gemini.google.com:** Arabic input → RTL applied
- [ ] **One unsupported site (e.g., github.com) on Chrome with "Any Website" On → RTL applies to Arabic input**

**HARD STOP — Phase 4 complete. Awaiting review before Phase 5.**

---

## Phase 5 — Version bump to 1.2.0 (2026-05-09)

### Files updated

| File | Change |
|------|--------|
| `extension/manifest.json` | `"version": "1.1.0"` → `"1.2.0"` |
| `extension/manifest-firefox.json` | `"version": "1.1.0"` → `"1.2.0"` |
| `extension/manifest-safari.json` | `"version": "1.1.0"` → `"1.2.0"` |
| `extension/popup.html` | `v1.1.0` → `v1.2.0` (popup header) |
| `CHANGELOG.md` | Created at repo root (Phase 5.5) |

### Files not present (nothing to update)
- No `package.json` in the repo.
- No Safari Xcode project (`.xcodeproj`, `Info.plist`, `project.pbxproj`) anywhere in the tree.
- `README.md` version badge (`version-1.1.0`) left unchanged — Phase 5.6 replaces the entire file, so editing it now would be double-work.

### Notes on CHANGELOG dates
No git tags exist (`git log --tags` returned empty). The approximate dates from the task (`2026-04` for 1.1, `2026-03` for 1.0) were used as written. Today's date `2026-05-09` was used for 1.2.0.

**HARD STOP — Phases 5 and 5.5 complete. Awaiting review before Phase 5.6.**

---

## Phase 5.6 — README rewrite (2026-05-09)

### Logo path used

`extension/icons/icon128.png` — confirmed present in the repo. No assets folder needed.

### Internal links verified

| Link | File | Present? |
|------|------|---------|
| `CHANGELOG.md` | repo root | Yes (created Phase 5.5) |
| `CONTRIBUTING.md` | repo root | Yes |
| `PUBLISHING-GUIDE.md` | repo root | Yes |
| `LICENSE` | repo root | Yes |

### Platform count

"20+" retained — matches the Phase 1 audit count of 20 distinct services across 24 URL patterns.

### Accuracy check on "How it works"

Steps 4 and 5 of the "How it works" section describe the Phase 2 and Phase 3 implementations accurately:
- Step 4 (TreeWalker + MutationObserver numeral conversion) — matches Phase 3 implementation.
- Step 5 (full teardown on Off) — matches Phase 2 implementation.

The old README's reference to `font-feature-settings: "lnum"` (step 7 in the old version) is gone. The new README does not mention it.

### Logo render verification

Cannot verify GitHub rendering until the branch is pushed (Phase 7). The path `extension/icons/icon128.png` is a standard relative path that GitHub renders correctly from the repo root.

**HARD STOP — Phase 5.6 complete. Awaiting review before Phase 6.**

---

## Phase 6 — Build and test matrix (2026-05-09)

### Build artifacts

#### Chrome — `yameen-chrome.zip`

```
manifest.json      MV3, version 1.2.0
background.js
content.js
content.css
popup.html
popup.js
icon16.png
icon32.png
icon48.png
icon128.png
```

Size: ~20 KB. `manifest.json` at zip root. Firefox and Safari manifests excluded. ✅

#### Firefox — `yameen-firefox.zip`

```
manifest.json      MV2, version 1.2.0  (renamed from manifest-firefox.json)
background.js
content.js
content.css
popup.html
popup.js
icons/
  icon16.png
  icon32.png
  icon48.png
  icon128.png
```

Size: ~20 KB. Icons in `icons/` subfolder (required by MV2 path references). ✅

#### Safari — Xcode project

No Xcode project existed in the repo (confirmed Phase 5 audit). Generated fresh via:

```bash
xcrun safari-web-extension-converter /tmp/yameen-safari-src \
  --app-name "Yameen" \
  --bundle-identifier "dev.arj.yameen" \
  --swift --no-open --force
```

Scheme names in the generated project: `Yameen (macOS)`, `Yameen (iOS)`. No "leanring-buddy" scheme exists — that note in Phase 5 applied to a pre-existing project; this repo had none, so the generated project uses the standard converted name.

```
xcodebuild -project Yameen.xcodeproj -scheme "Yameen (macOS)" \
  -configuration Release -destination "platform=macOS" build
→ ** BUILD SUCCEEDED **
```

✅

---

## 1.2 Test Matrix

Artifact checks (✅/❌ filled by build above). Browser checks require manual testing on physical installs.

### Artifacts

| Check | Result |
|-------|--------|
| Chrome zip exists, `manifest_version: 3`, `version: 1.2.0` | ✅ |
| Firefox zip exists, `manifest_version: 2`, `version: 1.2.0` | ✅ |
| Safari `xcodebuild` macOS scheme completes with no errors | ✅ |

### Chrome (manual)

| Test | Pass? |
|------|-------|
| Fresh install → extension loads without errors | ☐ |
| Arabic input on claude.ai → RTL applied to input | ☐ |
| Toggle Off → `data-ymn-input` removed, direction restored, no further RTL on new input | ☐ |
| Toggle On → RTL re-applies | ☐ |
| AI response with Arabic appears → RTL applied to response elements | ☐ |
| Toggle Off → response elements restored, `data-ymn` removed | ☐ |
| Visit aljazeera.net → Eastern numerals convert to Western in page text | ☐ |
| Inspect converted node in DevTools → `textContent` shows 0-9, not ٠-٩ | ☐ |
| Copy numeral text, paste into Notes → Western digits pasted | ☐ |
| Type Arabic with Eastern numerals in input → NOT converted in input | ☐ |
| "Any Website" toggle shows in popup | ☐ |
| Enable "Any Website" → permission prompt appears | ☐ |
| Unsupported site (e.g. github.com) with "Any Website" On → Arabic RTL applied | ☐ |
| Disable "Any Website" → reverts | ☐ |
| Revoke `<all_urls>` permission via chrome://extensions → reopen popup → toggle shows Off | ☐ |
| chatgpt.com → Arabic input → RTL applied | ☐ |
| gemini.google.com → Arabic input → RTL applied | ☐ |

### Firefox (manual)

| Test | Pass? |
|------|-------|
| Fresh install from zip → extension loads | ☐ |
| Arabic input on claude.ai → RTL applied | ☐ |
| Toggle Off → direction restored | ☐ |
| "Any Website" section hidden in popup | ☐ |
| Eastern numerals on page → convert to Western | ☐ |
| chatgpt.com → Arabic input → RTL applied | ☐ |
| gemini.google.com → Arabic input → RTL applied | ☐ |

### Safari (manual)

| Test | Pass? |
|------|-------|
| App installs and runs | ☐ |
| Enable extension in Safari Settings → Extensions | ☐ |
| Arabic input on claude.ai → RTL applied | ☐ |
| Toggle Off → direction restored | ☐ |
| "Any Website" section hidden in popup | ☐ |
| Eastern numerals on page → convert to Western | ☐ |
| chatgpt.com → Arabic input → RTL applied | ☐ |
| gemini.google.com → Arabic input → RTL applied | ☐ |

**HARD STOP — Phase 6 complete. Awaiting manual test sign-off and review before Phase 7.**

---------

## v1.5 — تصحيح / Fix (planned)

Convert text typed under the wrong keyboard layout. Examples:
- لاقشاش → hello (user wanted English, was on Arabic layout)
- lkpfh → مرحبا (user wanted Arabic, was on English layout)

This is layout conversion only. Not translation, not transliteration, not "did you mean."

### Scope

- Bidirectional: Arabic ↔ English conversion only.
- Selection-based: user selects the wrong-layout text and triggers Fix. If no selection is present at trigger time, Fix operates on the last word at the cursor.
- Triggers: keyboard shortcut + right-click context menu.
- Works inside any text input or contenteditable on any site Yameen is enabled on.
- v2.0 milestone. Do NOT bundle with v1.x bug-fix releases.

### Locked decisions

- **Default shortcut:** ⌘+Shift+F (Mac) / Ctrl+Shift+F (Windows/Linux). User-rebindable via the standard browser Extensions shortcuts page (`chrome://extensions/shortcuts` etc.).
- **Trigger fallback behavior:** if a selection exists, Fix operates on the selection. If no selection, Fix operates on the last word at the cursor position. If neither (empty input, no cursor), Fix does nothing.
- **Right-click context menu:** "تصحيح / Fix" appears only when a text selection exists in an editable field.
- **Layout setup:** lives on the Options page only. Never shown as a first-run modal, never as a popup interrupt. If the user triggers Fix before configuring layouts, Fix uses the default mapping (Mac Arabic + QWERTY) and a small toolbar badge prompts the user to confirm in Options.
- **Layouts supported at v2.0 launch:** Mac Arabic, Arabic – PC, Arabic – QWERTY (Arabic side); QWERTY only (English side). AZERTY/QWERTZ deferred until requested.
- **Visual feedback on successful Fix:**
  1. Toolbar icon badge flash with "تم / Fixed" for ~1 second.
  2. Replaced text briefly highlighted in the input for ~500ms then fades.
  3. Native ⌘+Z (Cmd+Z / Ctrl+Z) undo must restore the original text. This is non-negotiable — if undo is broken, the feature is broken.
- **No-op case:** if Fix would produce text identical to the input (e.g., user already on the correct layout, or selection is empty after trimming), do nothing silently. No toast, no badge, no error.

### Out of scope for v2.0

- Translation or "did you mean" suggestions
- Auto-detection of when Fix should trigger (no inline ghost suggestions)
- AZERTY, QWERTZ, Dvorak, Colemak
- Mobile (extension is desktop-only by platform)

### Open questions

- (none currently — revisit before v2.0 build kickoff)

---

## v1.3 — Housekeeping items to resolve before next Safari submission

### Build number source of truth (2026-05-12)

`CURRENT_PROJECT_VERSION` in `Yameen.xcodeproj/project.pbxproj` drifted from App Store Connect's actual build number (local was 2; App Store Connect had already processed build 3). Decide on one of:

1. **Auto-increment + commit** — a `scripts/bump-build.sh` helper that reads the current value, increments it, patches the pbxproj, and commits with `chore: bump build to N` before every archive. The commit keeps git and App Store Connect in sync.
2. **Manual bump + commit** — engineer manually edits `CURRENT_PROJECT_VERSION` in the pbxproj and commits the change before running Xcode → Archive. Simple, but relies on discipline.
3. **CI-driven** — set `CURRENT_PROJECT_VERSION` to `$(BUILD_NUMBER)` in build settings and let the CI runner inject it at archive time. Eliminates the file entirely as a source of truth.

**Decision required before the v1.3 Safari archive.** Until then, always verify the local pbxproj value against App Store Connect's last-processed build before bumping.

---

### Build number strategy — locked 2026-05-28

**Locked decision: Option 2 — Manual bump + commit**, with pre-archive `grep` verification.

**Current state:** App Store Connect has processed builds through build 5. Local `CURRENT_PROJECT_VERSION` in the pbxproj is `4`. Drift is 1. Next archive must use build 6.

**Rationale:** The Xcode project lives on Desktop and is not tracked in git, so a bump script (Option 1) would patch a file git never sees — the stated benefit of keeping git and App Store Connect in sync disappears. CI-driven (Option 3) requires a functioning pipeline with secrets present; that is v1.3 deferred work. Option 2 is one Build Settings edit and one commit, sufficient for a solo dev shipping occasional releases.

**Checklist for every future Safari archive:**

1. Open App Store Connect → Apps → Yameen → TestFlight → note the highest build number already processed for the current marketing version. Call it N.
2. Open `Yameen.xcodeproj` in Xcode.
3. Select the **Yameen** target → Build Settings → search `CURRENT_PROJECT_VERSION` → set value to N + 1.
4. Select the **Yameen Extension** target → same field → set to the same value. Both targets must match.
5. Save. Run this verification before touching Archive:
   ```
   grep CURRENT_PROJECT_VERSION ~/Desktop/Yameen/Yameen.xcodeproj/project.pbxproj
   ```
   Confirm the value appears twice (once per target) and both read N + 1.
6. Commit the pbxproj change: `chore: bump Safari build to N+1`.
7. Run Xcode → Product → Archive.

**Deferred research question (investigate during v1.4 planning):** Should the Safari Xcode project move from `~/Desktop/Yameen/` into the main Yameen git repo? That would make the pbxproj trackable, eliminate the drift class of problems permanently, and eventually let CI read versions directly. Risks to evaluate: archive/signing config disruption, dSYM history, repo size from xcuserdata. If migration is clean, do it. If messy, manual bump + commit remains the answer indefinitely.

---

### GitHub Actions secrets — CI blocker (2026-05-28)

⚠️ CI BLOCKER: All six GitHub Actions secrets are absent (confirmed empty in repo Settings → Secrets, 2026-05-28). `publish.yml` is now syntactically correct but WILL fail at the upload step until these are created:

- `FIREFOX_API_KEY`, `FIREFOX_API_SECRET` — from addons.mozilla.org/developers/addon/api/key/
- `CHROME_EXTENSION_ID` (= `nephalabmiodkhilmfcblhcfdebedbbp`), `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` — from Google Cloud Console OAuth2 + one-time refresh-token flow

Must be set before the next tagged release. Until then, the `publish.yml` fix is correct but inert.

#### Setup checklist

**Firefox (2 secrets)**

1. Go to addons.mozilla.org → click your avatar → Developer Hub → Manage API Keys.
2. Generate new credentials (or use existing). You will see:
   - **JWT issuer** → this is the value for `FIREFOX_API_KEY`
   - **JWT secret** → this is the value for `FIREFOX_API_SECRET`
3. In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret. Create both.

**Chrome (4 secrets)**

`CHROME_EXTENSION_ID` is already known: `nephalabmiodkhilmfcblhcfdebedbbp`. Add it as a secret as-is.

For the OAuth credentials, the Chrome Web Store API requires a Google Cloud project with the API enabled and an OAuth 2.0 client:

1. Go to console.cloud.google.com → create or select a project (e.g. "Yameen CWS").
2. APIs & Services → Enable APIs → search "Chrome Web Store API" → Enable.
3. APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type: **Desktop app** → name it anything → Create.
4. Note the **Client ID** → value for `CHROME_CLIENT_ID`.
5. Note the **Client secret** → value for `CHROME_CLIENT_SECRET`.
6. Generate the refresh token (one-time, run locally):
   - Visit this URL in a browser (substitute your client ID):
     ```
     https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&redirect_uri=urn:ietf:wg:oauth:2.0:oob&access_type=offline
     ```
   - Sign in with the Google account that owns the extension. Grant access.
   - Copy the **authorization code** from the page.
   - Exchange it for a refresh token (substitute your values):
     ```
     curl -s -X POST https://oauth2.googleapis.com/token \
       -d "code=AUTH_CODE&client_id=CLIENT_ID&client_secret=CLIENT_SECRET\
     &redirect_uri=urn:ietf:wg:oauth:2.0:oob&grant_type=authorization_code"
     ```
   - The JSON response contains `"refresh_token"` → value for `CHROME_REFRESH_TOKEN`.
7. Add all four secrets to GitHub: `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`.

**Verification:** once all 6 secrets are set, push a test tag (`v1.3.0` or similar at release time) and confirm the workflow reaches the upload steps without failing at "Set up job" or secret resolution.

---

### Store screenshots — plan locked 2026-05-28, capture deferred to v2.0

**Capture session is NOT a v1.3 task — defer to v2.0 marketing relaunch.** The popup UI will change materially in v1.4 (All Sites surface) and v1.6 (Arabic copy rewrite), so any screenshots taken before v1.6 will be stale by the time they ship. Lock the plan now, shoot then.

#### Store specs

| Store | Required dimensions | Format | Max count |
|-------|-------------------|--------|-----------|
| Chrome Web Store | Exactly 1280x800 or 640x400 | PNG or JPEG, no alpha | 5 |
| Firefox AMO | Min 165px shortest side; recommend 1280x800 | PNG or JPEG | 5 |

Use 1280x800 for both — one capture session covers both listings.

#### Shot list (execute at v2.0)

| # | Subject | Notes |
|---|---------|-------|
| 1 | Popup in situ | Open over an Arabic page (aljazeera.net or claude.ai). Show mode selector, platform dot, numeral toggle. |
| 2 | RTL on AI platform — before/after | Split or side-by-side: raw Arabic left-aligned vs. Yameen On right-aligned. Use Claude or ChatGPT. |
| 3 | RTL on a second platform | ChatGPT, Gemini, or a news site. Shows breadth. |
| 4 | Numeral conversion | Real Arabic page with dates/counts. Eastern ٢٠٢٤ → Western 2024 visible. |
| 5 | Any Website toggle (Chrome listing only) | Popup on an unsupported site (e.g. github.com) with كل المواقع enabled and RTL applied. For Firefox listing substitute with a second platform or cleaner popup shot — the toggle is hidden on Firefox. |

---

## Yameen Roadmap (locked 2026-05-28)

| Version | Theme | Summary |
|---------|-------|---------|
| v1.3 | Housekeeping | CI secrets setup (deferred — see CI blocker note above), build-number source-of-truth strategy, real store screenshots. Arms the CI pipeline for later auto-publish. |
| v1.4 | All Sites rebuild | Rip out and rebuild the كل المواقع / Any Website implementation from scratch as one shared cross-browser module with identical behavior on Chrome, Firefox, and Safari. Repositions Yameen from "Arabic RTL for AI platforms" to "Arabic RTL anywhere on the web" — curated platforms are the zero-config tier, All Sites is the opt-in best-effort tier. This is the centerpiece of the 2.0 arc. |
| v1.5 | تصحيح / Fix | Keyboard-layout correction feature, already fully specced earlier in this document. |
| v1.6 | Arabic copy system | Redesign all UI terminology authored in Arabic (not translated) — popup labels (مستوى, نظام الأرقام, النطاق), RTL-level states (currently English Off/Auto/Force → Arabic), helper text, version string, plus store listings, website copy, and a new general tagline. Comes after v1.4/v1.5 because both add new UI that needs naming. |
| v2.0 | Marketing relaunch | Website overhaul, all 3 store listings refreshed, Product Hunt relaunch. Includes an honest, factual competitor comparison table that links to competitors in the header. |
| v2.1+ | Maintenance | Bug fixes, CI-driven. |

### v1.4 — cross-browser parity defect (locked requirement)

Cross-browser parity defect to fix: the كل المواقع scope section is hidden/inert on Firefox in v1.2.0 (and was entirely absent in v1.1.0). v1.4 must surface and wire it identically on all three browsers.

### Positioning principle (locked)

All Sites mode is opt-in and best-effort by design; curated platforms remain the guaranteed tier. Positioning must never promise "works perfectly everywhere."
