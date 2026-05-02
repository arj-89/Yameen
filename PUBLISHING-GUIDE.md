# يمين — Store Publishing Guide

## Pre-flight Checklist

Before submitting to any store, you need:

- [x] Extension zip (yameen.zip) — ready
- [x] manifest.json (Chrome MV3) — ready
- [x] manifest-firefox.json (Firefox MV2) — ready
- [x] Privacy policy page hosted at a public URL — ready (privacy.html)
- [x] Icons 16/48/128px — ready
- [ ] Chrome Web Store developer account ($5 one-time)
- [ ] Firefox Add-on developer account (free)
- [ ] Apple Developer account ($99/year — you may already have one)
- [ ] Screenshots: 1280x800px (at least 1, up to 5)
- [ ] Small promo tile: 440x280px
- [x] Privacy policy URL: https://yameen.bixet.tech/privacy.html
- [x] Landing page URL: https://yameen.bixet.tech

---

## 1. Site Hosting

The landing page and privacy policy are hosted at **https://yameen.bixet.tech** via Coolify.

- Landing page: https://yameen.bixet.tech
- Privacy policy: https://yameen.bixet.tech/privacy.html

Deployment happens automatically — git push to GitHub, Coolify picks it up.

---

## 2. Chrome Web Store

### Step 1: Create Developer Account
1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay the $5 one-time fee
4. Verify your email and enable 2-step verification (required)

### Step 2: Prepare the Zip
The extension zip should have manifest.json at the root. Don't include `manifest-firefox.json` or the `site/` folder in this zip.

### Step 3: Upload
1. Click "New Item" → upload yameen.zip
2. If valid, you'll see the listing editor

### Step 4: Fill In Store Listing

**Store name:** يمين — Arabic RTL for AI & Productivity

**Short description (max 132 chars):**
> إضافة تكتشف العربية تلقائياً وتعيد اتجاه النص. تدعم Claude, ChatGPT, Gemini, Grok, Notion وأكثر من 20 منصة.

**Detailed description (copy this):**

```
يمين — Arabic RTL for AI & Productivity

إضافة متصفح تكتشف النص العربي تلقائياً وتحوّل اتجاهه من اليسار إلى اليمين. صُممت للقارئ العربي الذي يستخدم منصات الذكاء الاصطناعي وأدوات الإنتاجية يومياً.

المميزات:
• كشف تلقائي — يفحص كل فقرة ويطبّق RTL فقط على المحتوى العربي
• الكود في مكانه — كتل الكود تبقى LTR دائماً
• اختيار الأرقام — أرقام عربية (1,2,3) أو هندية (١,٢,٣)
• ثلاث مستويات — Off / Auto / Force
• بث مباشر — يتابع النص أثناء كتابة الردود
• خصوصية مطلقة — بدون تتبع، بدون تحليلات

المنصات المدعومة:
Claude · ChatGPT · Gemini · Grok · DeepSeek · Perplexity · Mistral · Copilot · Poe · HuggingChat · AI Studio · LM Arena · Notion · Coda · Google Docs · Linear · ClickUp

يمين لا يجمع أي بيانات ولا يتصل بأي خادم خارجي. كل العمليات تحدث محلياً في متصفحك.

---

Yameen automatically detects Arabic text and fixes the reading direction (RTL) across 20+ AI and productivity platforms. Install once, read naturally.

Features:
• Auto-detection — scans every paragraph, applies RTL only to Arabic content
• Code protection — code blocks stay LTR
• Numeral choice — Western (1,2,3) or Eastern (١,٢,٣) numerals
• Three modes — Off / Auto / Force
• Live streaming — updates direction as responses stream in
• Privacy-first — zero tracking, zero analytics

Supports: Claude, ChatGPT, Gemini, Grok, DeepSeek, Perplexity, Notion, Coda, and 12+ more platforms.
```

**Category:** Accessibility

**Language:** Arabic (+ English)

### Step 5: Graphics

**Store icon:** Already have 128x128 (icons/icon128.png)

**Screenshots (1280x800):**
Take these screenshots manually:
1. Open Claude, send a message in Arabic, show the RTL-fixed result
2. Show the popup settings panel
3. Show ChatGPT with Arabic text fixed
4. Show the before/after comparison

**Tip:** Use macOS screenshot (Cmd+Shift+4), resize to 1280x800 in Preview.

**Small promo tile (440x280):**
Create a simple graphic with:
- Dark background (#080808)
- يمين logo (golden icon)
- Text: "Arabic RTL for AI"
- Supported platform logos

### Step 6: Privacy Practices

On the "Privacy practices" tab:
- **Single purpose description:** "Detects Arabic text on AI chat and productivity platforms and applies right-to-left text direction for proper readability."
- **Does your extension request permissions?** Yes
  - `storage` → "Saves user preferences (RTL mode and numeral choice) locally in the browser"
  - `activeTab` → "Identifies the current platform (e.g. Claude, ChatGPT) to show in the popup"
- **Are you using remote code?** No
- **Does your extension collect any data?** No — select nothing

**Privacy policy URL:** https://yameen.bixet.tech/privacy.html

### Step 7: Distribution
- Visibility: Public
- Distribution: All regions
- Free

### Step 8: Submit
Click "Submit for review." Typical review: 1-3 business days. You'll get an email when approved.

### Permission Justifications (copy these exactly)

**storage:** "Used to persist user preferences (RTL mode selection: Off/Auto/Force, and numeral format: Western/Eastern) locally in the browser. No data is transmitted externally."

**activeTab:** "Used to read the current tab's URL to determine which supported platform the user is on (e.g. Claude, ChatGPT, Notion) and display the platform name in the extension popup. No page content is read or transmitted."

---

## 3. Firefox Add-ons

### Step 1: Create Account
Go to https://addons.mozilla.org/developers/ and create a free account.

### Step 2: Prepare the Zip
1. Copy all extension files to a new folder
2. Replace `manifest.json` with `manifest-firefox.json` (rename it to `manifest.json`)
3. Delete the Chrome manifest
4. Zip the folder

### Step 3: Submit
1. Click "Submit a New Add-on"
2. Upload the zip
3. Choose: "On this site" (for listing on Firefox Add-ons)
4. Fill in the listing details (use the same copy as Chrome)
5. Submit for review

Firefox reviews typically take 1-5 days.

---

## 4. Safari (Mac App Store)

### Step 1: Convert the Extension
Open Terminal and run:

```bash
xcrun safari-web-extension-converter /path/to/yameen \
  --app-name "يمين" \
  --bundle-identifier "dev.arj.yameen" \
  --swift
```

This creates an Xcode project that wraps the extension in a macOS app.

### Step 2: Open in Xcode
The converter opens Xcode automatically. If not:
1. Open the generated `.xcodeproj` file
2. Select your development team (Signing & Capabilities)
3. Set the deployment target to macOS 12.0+

### Step 3: Test Locally
1. Press Cmd+R to build and run
2. Open Safari → Settings → Extensions → enable يمين
3. Test on claude.ai, chatgpt.com, etc.

### Step 4: Archive & Upload
1. Product → Archive
2. Distribute App → App Store Connect
3. Upload

### Step 5: App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Create a new macOS app
3. Fill in details:
   - Name: يمين — Arabic RTL for AI
   - Category: Utilities
   - Description: Use the same Arabic copy
   - Screenshots: 1280x800 macOS screenshots
   - Privacy URL: https://yameen.bixet.tech/privacy.html
4. Submit for review

Apple reviews typically take 1-3 days.

**Note:** The `chrome.storage.sync` API maps to Safari's `browser.storage.sync` — the converter handles this automatically. Test the popup settings after conversion to confirm.

### Safari-Specific Considerations
- Safari Web Extensions require a native macOS app wrapper
- The app shows in the Applications folder but its only purpose is to host the extension
- Users enable it in Safari → Settings → Extensions
- You need an Apple Developer account ($99/year)

---

## 5. Post-Launch

After publishing on all three stores:

1. **Update the landing page** with direct store links:
   - Chrome Web Store URL
   - Firefox Add-ons URL
   - Mac App Store URL

2. **Share on social media** — the Saudi tech community is active on X/Twitter. The comparison table against اتجاه is your strongest marketing asset.

3. **Respond to reviews** — especially in the first week. Quick responses signal an active developer.

4. **Monitor for DOM changes** — AI platforms update their UIs frequently. Set up a simple test workflow: visit each platform weekly and verify RTL still works.
