<div align="center">
  <img src="extension/icons/icon128.png" alt="Yameen logo" width="128" height="128" />

  # يمين (Yameen)

  **Automatic right-to-left support for Arabic on Claude, ChatGPT, Gemini, and 20+ AI and productivity platforms.**

  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=googlechrome&logoColor=white)](https://yameen.bixet.tech)
  [![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--ons-orange?logo=firefoxbrowser&logoColor=white)](https://yameen.bixet.tech)
  [![Safari](https://img.shields.io/badge/Safari-App%20Store-lightgrey?logo=safari&logoColor=white)](https://yameen.bixet.tech)
  [![License](https://img.shields.io/github/license/arj-89/Yameen)](LICENSE)
  [![Version](https://img.shields.io/badge/version-1.2.0-green)](CHANGELOG.md)

  [Website](https://yameen.bixet.tech) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Publishing Guide](PUBLISHING-GUIDE.md)
</div>

---

## What is Yameen?

When you type Arabic into AI chat platforms, the text often renders left-to-right with broken punctuation, misordered numbers, and mangled mixed-direction content. **Yameen fixes that automatically.**

The moment you type Arabic, Yameen detects it and applies proper right-to-left formatting — `dir="rtl"`, correct text alignment, and bidirectional algorithm hints — so your input reads exactly the way it should. No keyboard shortcuts. No manual toggles per message. No friction.

## Features

- **Automatic Arabic detection.** Type one Arabic character and Yameen flips the input to RTL. Switch back to English and it flips back.
- **20+ supported platforms out of the box.** Including Claude, ChatGPT, Gemini, and other major AI and productivity tools.
- **"Any Website" mode.** Enable Yameen on any site that isn't on the supported list.
- **Real numeral conversion.** Eastern Arabic numerals (٠-٩) on page content are converted to Western (0-9) as actual text — copy-paste works, screen readers read correctly, and scripts see the right values. User input is left alone.
- **Clean Off teardown.** Toggle off and Yameen fully restores the page to its original state. No reload required.
- **Cross-browser.** Single codebase, three browsers, one consistent experience.
- **Privacy-first.** No accounts. No analytics. No network calls. Everything runs locally in your browser.

## Install

| Browser | Where |
|--------|-------|
| Chrome / Edge / Brave | [Chrome Web Store](https://yameen.bixet.tech) |
| Firefox | [Firefox Add-ons](https://yameen.bixet.tech) |
| Safari (macOS) | [Mac App Store](https://yameen.bixet.tech) |

Or visit [yameen.bixet.tech](https://yameen.bixet.tech) for the full install guide.

## How it works

1. Yameen runs as a content script on supported sites (or any site, in "Any Website" mode).
2. It listens for input events on text fields and contenteditable elements.
3. When Arabic characters are detected, it sets `dir="rtl"` and adjusts text alignment on the input.
4. A separate pass walks page text nodes and converts displayed Eastern Arabic numerals to Western, with a MutationObserver catching dynamically loaded content.
5. Toggle off, and Yameen disconnects all observers, removes all listeners, and restores every modified element to its original state.

No data leaves your browser. Ever.

## Development

```bash
git clone https://github.com/arj-89/Yameen.git
cd Yameen
# See CONTRIBUTING.md for browser-specific build instructions
```

For Safari, the Xcode project is in `extension/safari/`. Open the `.xcodeproj` file in Xcode. (Note: the inherited Xcode scheme name retains its original spelling intentionally to avoid project file conflicts.)

For publishing to stores, see [PUBLISHING-GUIDE.md](PUBLISHING-GUIDE.md).

## Tech

- **Manifest V3** across Chrome, Firefox, and Safari
- **Vanilla JavaScript** — no build step required for the core extension
- **TreeWalker + MutationObserver** for numeral conversion and dynamic content
- **WeakSet/WeakMap** for tracking modified elements without leaking memory

## Comparison

| Feature | Yameen | اتجاه |
|---------|--------|-------|
| Browsers | Chrome, Firefox, Safari | Chrome only |
| AI platforms supported | 20+ | Claude only |
| Distribution | Web stores (one click) | Manual zip install |
| Numeral conversion | Real text replacement | — |
| Open source | Yes (this repo) | — |

## Roadmap

See [CHANGELOG.md](CHANGELOG.md) for shipped versions. Open issues and discussions for what's next.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).

## Built by

[ARJ](https://github.com/arj-89) under the [Bixet](https://bixet.tech) brand.
