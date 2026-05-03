const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const PLATFORMS = {
  "claude.ai":"Claude","chat.openai.com":"ChatGPT","chatgpt.com":"ChatGPT",
  "gemini.google.com":"Gemini","grok.com":"Grok","chat.deepseek.com":"DeepSeek",
  "perplexity.ai":"Perplexity","www.perplexity.ai":"Perplexity",
  "chat.mistral.ai":"Mistral","poe.com":"Poe","huggingface.co":"HuggingChat",
  "aistudio.google.com":"AI Studio","lmarena.ai":"LM Arena",
  "copilot.microsoft.com":"Copilot","you.com":"You.com","pi.ai":"Pi",
  "coral.cohere.com":"Cohere","www.notion.so":"Notion","notion.so":"Notion",
  "coda.io":"Coda","docs.google.com":"Google Docs","linear.app":"Linear",
  "clickup.com":"ClickUp","app.clickup.com":"ClickUp",
};

const everywhereEl = document.getElementById("everywhere");
const dot = document.getElementById("p-dot");
const nm = document.getElementById("p-name");

// ── Load settings + detect platform in one pass ──
browserAPI.storage.sync.get(
  { mode: "auto", numerals: "western", everywhere: false },
  (s) => {
    // Mode
    const modeR = document.querySelector(`input[name="mode"][value="${s.mode}"]`);
    if (modeR) modeR.checked = true;

    // Numerals
    const numR = document.querySelector(`input[name="numerals"][value="${s.numerals}"]`);
    if (numR) numR.checked = true;
    document.querySelectorAll("#num-cards .card").forEach((c) => {
      c.classList.toggle("active", c.dataset.val === s.numerals);
    });

    // Everywhere
    everywhereEl.checked = s.everywhere;

    // Platform indicator — uses the already-loaded `s.everywhere`
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        const host = new URL(tabs[0]?.url).hostname;
        const name = PLATFORMS[host];
        if (name) {
          dot.classList.add("on");
          nm.textContent = name + " · نشط";
        } else if (s.everywhere) {
          dot.classList.add("all");
          nm.textContent = host + " · كل المواقع";
        } else {
          dot.classList.add("off");
          nm.textContent = "غير مدعوم — فعّل \"كل المواقع\"";
        }
      } catch {}
    });

    // Reveal UI now that settings are applied
    document.body.classList.remove("loading");
  }
);

// ── Mode ──
document.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.addEventListener("change", () => browserAPI.storage.sync.set({ mode: r.value }));
});

// ── Numerals ──
document.querySelectorAll('input[name="numerals"]').forEach((r) => {
  r.addEventListener("change", () => {
    browserAPI.storage.sync.set({ numerals: r.value });
    document.querySelectorAll("#num-cards .card").forEach((c) => {
      c.classList.toggle("active", c.dataset.val === r.value);
    });
  });
});

// ── Everywhere toggle (optional permission) ──
everywhereEl.addEventListener("change", async () => {
  if (everywhereEl.checked) {
    try {
      const granted = await browserAPI.permissions.request({ origins: ["<all_urls>"] });
      if (granted) {
        browserAPI.storage.sync.set({ everywhere: true });
      } else {
        everywhereEl.checked = false;
      }
    } catch {
      // permissions.request() unavailable — revert
      everywhereEl.checked = false;
    }
  } else {
    try {
      await browserAPI.permissions.remove({ origins: ["<all_urls>"] });
    } catch {
      // ignore — permission may not have been granted
    }
    browserAPI.storage.sync.set({ everywhere: false });
  }
});
