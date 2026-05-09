(function () {
  "use strict";

  const storage = (typeof browser !== 'undefined' ? browser : chrome).storage;

  const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

  const EASTERN_TO_WESTERN = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  const WESTERN_TO_EASTERN = {'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩'};
  const originalTextNodes = new WeakMap();

  // element → {attrName: valueBeforeYameen} — populated before every mutation.
  const modifiedElements = new Map();

  let mode = "auto";
  let numerals = "western";
  let threshold = 0.12;
  let obs; // assigned below after MutationObserver construction

  // Save original attribute value before Yameen's first mutation of that attribute on el.
  function track(el, attrName) {
    if (!modifiedElements.has(el)) modifiedElements.set(el, {});
    const state = modifiedElements.get(el);
    if (!(attrName in state)) state[attrName] = el.getAttribute(attrName);
  }

  // Restore one attribute to its pre-Yameen value and stop tracking it on el.
  function untrack(el, attrName) {
    const state = modifiedElements.get(el);
    if (!state || !(attrName in state)) return;
    const original = state[attrName];
    if (original === null) {
      el.removeAttribute(attrName);
    } else {
      el.setAttribute(attrName, original);
    }
    delete state[attrName];
    if (Object.keys(state).length === 0) modifiedElements.delete(el);
  }

  // Named so it can be added and removed symmetrically.
  function onInput(e) {
    if (mode === "off") return;
    const t = e.target;
    if (t.matches?.('[contenteditable="true"], textarea, .ProseMirror, [role="textbox"]')) {
      handleInputs();
    }
  }

  // Full teardown: disconnect observer, remove listener, restore every mutated element.
  function teardownAll() {
    obs.disconnect();
    document.removeEventListener("input", onInput, true);

    for (const [el, attrs] of modifiedElements) {
      for (const [attr, original] of Object.entries(attrs)) {
        if (original === null) {
          el.removeAttribute(attr);
        } else {
          el.setAttribute(attr, original);
        }
      }
    }
    modifiedElements.clear();
    restoreNumerals();
  }

  function loadSettings() {
    storage.sync.get(
      { mode: "auto", numerals: "western", threshold: 0.12 },
      (s) => {
        mode = s.mode;
        numerals = s.numerals;
        threshold = s.threshold;
        applyMode();
      }
    );

    storage.onChanged.addListener((changes) => {
      if (changes.mode) mode = changes.mode.newValue;
      if (changes.numerals) numerals = changes.numerals.newValue;
      if (changes.threshold) threshold = changes.threshold.newValue;
      applyMode();
    });
  }

  function applyMode() {
    teardownAll();

    if (mode === "off") return;

    document.addEventListener("input", onInput, true);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });

    if (mode === "force") {
      track(document.body, "data-ymn-mode");
      document.body.setAttribute("data-ymn-mode", "force");
    }
    if (numerals === "western") {
      track(document.body, "data-ymn-numerals");
      document.body.setAttribute("data-ymn-numerals", "western");
    }

    convertNumerals(document.body);

    if (mode === "auto") scan();
    else handleInputs();
  }

  function hasArabic(text) {
    return AR.test(text);
  }

  function arabicRatio(text) {
    if (!text) return 0;
    const clean = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#*_\[\]()>|`~\-=:;,.!?\/"'{}@^&$%+\\<>]/g, "")
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, "")
      .replace(/\s+/g, "")
      .trim();
    if (!clean.length) return 0;
    return [...clean].filter((c) => AR.test(c)).length / clean.length;
  }

  function isCode(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "PRE" || tag === "CODE") return true;
    if (el.closest("pre")) return true;
    return /code-block|CodeBlock|hljs|syntax|prism|shiki|highlight/i.test(el.className || "");
  }

  function directText(el) {
    let t = "";
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        t += n.textContent;
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const tag = n.tagName;
        if (!BLOCK_SET.has(tag) && tag !== "PRE" && tag !== "CODE") {
          t += n.textContent;
        }
      }
    }
    return t;
  }

  const LEAF_TAGS = new Set([
    "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6",
    "BLOCKQUOTE", "TD", "TH", "DT", "DD", "FIGCAPTION",
    "SUMMARY", "LABEL", "CAPTION",
  ]);

  const BLOCK_SET = new Set([
    "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6",
    "BLOCKQUOTE", "TABLE", "UL", "OL", "PRE", "DIV",
    "SECTION", "ARTICLE", "HEADER", "FOOTER", "NAV",
    "DETAILS", "SUMMARY", "FIGURE", "FIGCAPTION",
  ]);

  const CONTAINER_TAGS = new Set(["UL", "OL", "TABLE", "THEAD", "TBODY"]);

  const ALL_SELECTOR = [
    ...LEAF_TAGS, ...CONTAINER_TAGS, "DIV", "SPAN",
  ].join(",");

  function processEl(el) {
    if (isCode(el)) return;

    const tag = el.tagName;

    if (LEAF_TAGS.has(tag)) {
      const text = directText(el);
      if (text.trim().length < 2) return;
      if (hasArabic(text) && arabicRatio(text) >= threshold) {
        track(el, "data-ymn");
        el.setAttribute("data-ymn", "rtl");
      } else {
        untrack(el, "data-ymn");
      }
      return;
    }

    if (CONTAINER_TAGS.has(tag)) {
      const text = el.textContent || "";
      if (hasArabic(text) && arabicRatio(text) >= threshold) {
        track(el, "data-ymn");
        el.setAttribute("data-ymn", "rtl");
      } else {
        untrack(el, "data-ymn");
      }
      return;
    }

    if (tag === "DIV" || tag === "SPAN") {
      const dt = directText(el);
      if (dt.trim().length < 3) return;
      if (hasArabic(dt) && arabicRatio(dt) >= threshold) {
        const hasBlock = [...el.children].some((c) => BLOCK_SET.has(c.tagName));
        if (!hasBlock) {
          track(el, "data-ymn");
          el.setAttribute("data-ymn", "rtl");
        }
      } else {
        untrack(el, "data-ymn");
      }
    }
  }

  function handleInputs() {
    const inputs = document.querySelectorAll(
      '[contenteditable="true"], textarea, .ProseMirror, [role="textbox"]'
    );
    for (const el of inputs) {
      if (el.offsetHeight < 15) continue;

      if (mode === "force") {
        track(el, "data-ymn-input");
        el.setAttribute("data-ymn-input", "rtl");
      } else if (mode === "auto") {
        const text = el.textContent || el.value || "";
        if (hasArabic(text)) {
          track(el, "data-ymn-input");
          el.setAttribute("data-ymn-input", "rtl");
        } else {
          untrack(el, "data-ymn-input");
        }
      }
    }
  }

  function scan() {
    if (mode !== "auto") return;

    let roots = document.querySelectorAll(
      "main, [role='main'], [class*='onversation'], " +
      "[class*='essages'], [class*='thread'], [class*='chat'], " +
      "article, .mx-auto, [class*='response'], [class*='answer'], " +
      "[class*='notion'], [class*='page-content'], [class*='editor'], " +
      "[class*='frame'], [class*='canvas']"
    );
    if (roots.length === 0) roots = [document.body];

    for (const root of roots) {
      const els = root.querySelectorAll(ALL_SELECTOR);
      for (const el of els) processEl(el);
    }

    handleInputs();
  }

  function restoreNumerals() {
    document.querySelectorAll("[data-ymn-original]").forEach((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (originalTextNodes.has(node)) {
          node.textContent = originalTextNodes.get(node);
          originalTextNodes.delete(node);
        }
      }
      el.removeAttribute("data-ymn-original");
    });
  }

  // Converts Eastern Arabic numerals (٠-٩) to Western (0-9) in all text nodes
  // under rootNode, skipping user-editable and non-content elements.
  function convertNumerals(rootNode) {
    if (numerals !== "western") return;

    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_SKIP;
        if (parent.closest("script, style, textarea, input, pre, code")) return NodeFilter.FILTER_SKIP;
        if (parent.isContentEditable) return NodeFilter.FILTER_SKIP;
        return /[٠-٩]/.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.textContent);
      const converted = originalTextNodes.get(node).replace(/[٠-٩]/g, (c) => EASTERN_TO_WESTERN[c]);
      if (node.textContent !== converted) node.textContent = converted;
      if (node.parentElement && !node.parentElement.hasAttribute("data-ymn-original")) {
        node.parentElement.setAttribute("data-ymn-original", "1");
      }
    }
  }

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => { if (mode !== "off") applyMode(); }, 500);
    }
  }, 1000);

  let timer = null;
  obs = new MutationObserver((mutations) => {
    if (mode === "off") return;
    let needsRtlScan = false;
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) convertNumerals(node);
        }
        if (m.addedNodes.length > 0) needsRtlScan = true;
      } else if (m.type === "characterData") {
        needsRtlScan = true;
      }
    }
    if (needsRtlScan) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (mode === "auto") scan();
        else if (mode === "force") handleInputs();
      }, 120);
    }
  });

  function init() {
    loadSettings();
    setInterval(() => {
      if (mode === "off") return;
      if (mode === "auto") scan();
    }, 700);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 200);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(init, 200));
  }
})();
