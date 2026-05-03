/**
 * يمين — Background Service Worker / Background Page
 *
 * Handles "Any Website" mode by dynamically registering/unregistering
 * content scripts via the scripting API. The broad <all_urls>
 * permission is optional — requested only when user enables this mode.
 */

const browserAPI = typeof browser !== "undefined" ? browser : chrome;
const DYNAMIC_SCRIPT_ID = "yameen-everywhere";

// Listen for setting changes from popup
browserAPI.storage.onChanged.addListener(async (changes) => {
  if (changes.everywhere) {
    if (changes.everywhere.newValue) {
      await registerEverywhere();
    } else {
      await unregisterEverywhere();
    }
  }
});

// On install/update, restore state
browserAPI.runtime.onInstalled.addListener(async () => {
  const { everywhere } = await browserAPI.storage.sync.get({ everywhere: false });
  if (everywhere) {
    const granted = await browserAPI.permissions.contains({ origins: ["<all_urls>"] });
    if (granted) {
      await registerEverywhere();
    } else {
      // Permission was revoked externally — flip the setting off
      await browserAPI.storage.sync.set({ everywhere: false });
    }
  }
});

async function registerEverywhere() {
  try {
    const existing = await browserAPI.scripting.getRegisteredContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
    if (existing.length > 0) return;

    await browserAPI.scripting.registerContentScripts([{
      id: DYNAMIC_SCRIPT_ID,
      matches: ["<all_urls>"],
      js: ["content.js"],
      css: ["content.css"],
      runAt: "document_idle",
    }]);
  } catch (e) {
    console.error("[yameen] Failed to register everywhere script:", e);
  }
}

async function unregisterEverywhere() {
  try {
    await browserAPI.scripting.unregisterContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
  } catch {
    // Not registered — that's fine
  }
}
