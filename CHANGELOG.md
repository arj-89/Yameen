# Changelog

All notable changes to Yameen (يمين) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-05-09

### Fixed
- **Off mode now fully clears RTL formatting.** Previously, toggling the extension off stopped new RTL detection but left `dir`, `text-align`, and `unicode-bidi` attributes on already-modified elements until page reload. Off mode now properly tracks every mutated element and restores original attributes on teardown, and disconnects all observers and listeners.
- **Numeral conversion now replaces actual text instead of using CSS.** Eastern Arabic numerals (٠-٩) are now converted to Western Arabic numerals (0-9) at the DOM text-node level via TreeWalker + MutationObserver. Previously CSS `font-feature-settings` made them visually appear Western while the underlying text stayed Eastern, breaking copy-paste, screen readers, and any script reading `textContent`. User input fields are deliberately excluded from conversion.

### Changed
- Cleaned up over-unified "Any Website" mode logic introduced during the prior cross-browser refactor. Behavior is now consistent across Chrome, Firefox, and Safari, with a single shared predicate for site-matching and minimal browser-specific code only where platform APIs differ.

### Internal
- Cross-browser test matrix added to release process.
- `decisions.md` updated with audit, fix rationale, and test results for each bug.

## [1.1.0] - 2026-04

### Added
- Multi-browser support: Chrome, Firefox, Safari builds from a unified codebase.
- Store distribution: Chrome Web Store and Firefox Add-ons submissions.

## [1.0.0] - 2026-03

### Added
- Initial release.
- Automatic RTL detection for Arabic input across 20+ AI and productivity platforms (Claude, ChatGPT, Gemini, and others).
- "Any Website" mode for unsupported sites.
- Per-site On/Off toggle via popup.
