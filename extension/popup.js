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

const _hasDynamic =
  (typeof chrome !== 'undefined' && typeof chrome?.scripting?.registerContentScripts === 'function') ||
  (typeof browser !== 'undefined' && typeof browser?.contentScripts?.register === 'function');
const _isSafari = navigator.vendor.includes('Apple');
if (!_hasDynamic && !_isSafari) {
  document.getElementById('everywhere-sec').style.display = 'none';
}

const everywhereEl = document.getElementById("everywhere");
const dot = document.getElementById("p-dot");
const nm = document.getElementById("p-name");

let _currentHost = null;
let _currentName = null;

function renderBadge(everywhere) {
  dot.className = 'dot';
  if (_currentName) {
    dot.classList.add("on");
    nm.textContent = _currentName + " · نشط";
  } else if (everywhere) {
    dot.classList.add("all");
    nm.textContent = (_currentHost || "—") + " · كل المواقع";
  } else {
    dot.classList.add("off");
    nm.textContent = "غير مدعوم — فعّل \"كل المواقع\"";
  }
}

api.storage.sync.get(
  { mode: "auto", numerals: "western" },
  (s) => {
    const modeR = document.querySelector(`input[name="mode"][value="${s.mode}"]`);
    if (modeR) modeR.checked = true;

    const numR = document.querySelector(`input[name="numerals"][value="${s.numerals}"]`);
    if (numR) numR.checked = true;
    document.querySelectorAll("#num-cards .card").forEach((c) => {
      c.classList.toggle("active", c.dataset.val === s.numerals);
    });
  }
);

api.storage.local.get({ everywhere: false }, (loc) => {
  everywhereEl.checked = loc.everywhere;
  // Safari uses a static <all_urls> manifest match — no optional permission to verify.
  // permissions.contains returns false on Safari MV2 and would wrongly reset the toggle.
  if (loc.everywhere && !_isSafari) {
    api.permissions.contains({ origins: ["<all_urls>"] }, (granted) => {
      if (!granted) {
        everywhereEl.checked = false;
        api.storage.local.set({ everywhere: false });
      }
    });
  }

  api.tabs.query({ active: true, currentWindow: true }, (tabList) => {
    try {
      _currentHost = new URL(tabList[0]?.url).hostname;
      _currentName = PLATFORMS[_currentHost];
    } catch {}
    renderBadge(loc.everywhere);
  });
});

document.querySelectorAll('input[name="mode"]').forEach((r) => {
  r.addEventListener("change", () => { api.storage.sync.set({ mode: r.value }); notifySettingsChanged(); });
});

document.querySelectorAll('input[name="numerals"]').forEach((r) => {
  r.addEventListener("change", () => {
    api.storage.sync.set({ numerals: r.value });
    notifySettingsChanged();
    document.querySelectorAll("#num-cards .card").forEach((c) => {
      c.classList.toggle("active", c.dataset.val === r.value);
    });
  });
});

api.storage.onChanged.addListener((changes) => {
  if (changes.everywhere) renderBadge(changes.everywhere.newValue);
});

function showEverywhereStatus(msg, isError) {
  const el = document.getElementById('everywhere-status');
  el.textContent = msg;
  el.className = 'everywhere-status' + (isError ? ' error' : '');
  el.hidden = false;
}

function clearEverywhereStatus() {
  const el = document.getElementById('everywhere-status');
  el.hidden = true;
  el.textContent = '';
  el.className = 'everywhere-status';
}

function notifyAllTabs(msg) {
  api.tabs.query({}, (tabs) => {
    for (const t of tabs) {
      if (!t?.id) continue;
      api.tabs.sendMessage(t.id, msg, () => {
        void api.runtime.lastError;
      });
    }
  });
}

function notifyTab(value) {
  notifyAllTabs({ type: 'everywhereChanged', value });
}

function notifySettingsChanged() {
  notifyAllTabs({ type: 'settingsChanged' });
}

// Chrome: registerContentScripts; Firefox: contentScripts.register; Safari: static <all_urls> manifest match.
everywhereEl.addEventListener("change", async () => {
  clearEverywhereStatus();
  if (everywhereEl.checked) {
    if (_isSafari) {
      api.storage.local.set({ everywhere: true });
      notifyTab(true);
    } else {
      try {
        const granted = await api.permissions.request({ origins: ["<all_urls>"] });
        if (granted) {
          api.storage.local.set({ everywhere: true });
          notifyTab(true);
        } else {
          everywhereEl.checked = false;
          showEverywhereStatus("الإذن مطلوب لتفعيل كل المواقع", true);
        }
      } catch {
        everywhereEl.checked = false;
        showEverywhereStatus("هذا المتصفح لا يدعم تفعيل كل المواقع حالياً", true);
      }
    }
  } else {
    if (_isSafari) {
      api.storage.local.set({ everywhere: false });
      notifyTab(false);
    } else {
      try {
        await api.permissions.remove({ origins: ["<all_urls>"] });
      } catch {}
      api.storage.local.set({ everywhere: false });
      notifyTab(false);
    }
  }
});
