const api = (typeof browser !== 'undefined') ? browser : chrome;

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

const _hasDynamic = typeof chrome?.scripting?.registerContentScripts === 'function';
const _isSafari = navigator.vendor.includes('Apple');
if (!_hasDynamic && !_isSafari) {
  document.getElementById('everywhere-sec').style.display = 'none';
}

const everywhereEl = document.getElementById("everywhere");
const dot = document.getElementById("p-dot");
const nm = document.getElementById("p-name");

api.storage.sync.get(
  { mode: "auto", numerals: "western", everywhere: false },
  (s) => {
    const modeR = document.querySelector(`input[name="mode"][value="${s.mode}"]`);
    if (modeR) modeR.checked = true;

    const numR = document.querySelector(`input[name="numerals"][value="${s.numerals}"]`);
    if (numR) numR.checked = true;
    document.querySelectorAll("#num-cards .card").forEach((c) => {
      c.classList.toggle("active", c.dataset.val === s.numerals);
    });

    everywhereEl.checked = s.everywhere;
    if (s.everywhere) {
      api.permissions.contains({ origins: ["<all_urls>"] }, (granted) => {
        if (!granted) {
          everywhereEl.checked = false;
          api.storage.sync.set({ everywhere: false });
        }
      });
    }

    api.tabs.query({ active: true, currentWindow: true }, (tabList) => {
      try {
        const host = new URL(tabList[0]?.url).hostname;
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
  }
);

document.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.addEventListener("change", () => api.storage.sync.set({ mode: r.value }));
});

document.querySelectorAll('input[name="numerals"]').forEach((r) => {
  r.addEventListener("change", () => {
    api.storage.sync.set({ numerals: r.value });
    document.querySelectorAll("#num-cards .card").forEach((c) => {
      c.classList.toggle("active", c.dataset.val === r.value);
    });
  });
});

// Chrome uses registerContentScripts; Safari uses optional <all_urls> permission. Hidden on Firefox only.
everywhereEl.addEventListener("change", async () => {
  if (everywhereEl.checked) {
    try {
      const granted = await api.permissions.request({ origins: ["<all_urls>"] });
      if (granted) {
        api.storage.sync.set({ everywhere: true });
      } else {
        everywhereEl.checked = false;
      }
    } catch {
      everywhereEl.checked = false;
    }
  } else {
    try {
      await api.permissions.remove({ origins: ["<all_urls>"] });
    } catch {}
    api.storage.sync.set({ everywhere: false });
  }
});
