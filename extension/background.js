/**
 * يمين — Background Service Worker
 *
 * Handles "Any Website" mode by dynamically registering/unregistering
 * content scripts via chrome.scripting API. The broad <all_urls>
 * permission is optional — requested only when user enables this mode.
 */

const DYNAMIC_SCRIPT_ID = "yameen-everywhere";

// Listen for setting changes from popup
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.everywhere) {
    if (changes.everywhere.newValue) {
      await registerEverywhere();
    } else {
      await unregisterEverywhere();
    }
  }
});

// On install/update, restore state
chrome.runtime.onInstalled.addListener(async () => {
  const { everywhere } = await chrome.storage.sync.get({ everywhere: false });
  if (everywhere) {
    // Verify we still have the permission
    const granted = await chrome.permissions.contains({ origins: ["<all_urls>"] });
    if (granted) {
      await registerEverywhere();
    } else {
      // Permission was revoked externally — flip the setting off
      await chrome.storage.sync.set({ everywhere: false });
    }
  }
});

async function registerEverywhere() {
  try {
    // Check if already registered
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
    if (existing.length > 0) return;

    await chrome.scripting.registerContentScripts([{
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
    await chrome.scripting.unregisterContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
  } catch (e) {
    // Not registered — that's fine
  }
}
