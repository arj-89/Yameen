/**
 * يمين — Background Service Worker / Background Page
 *
 * Handles "Any Website" mode by dynamically registering/unregistering
 * content scripts via the scripting API. The broad <all_urls>
 * permission is optional — requested only when user enables this mode.
 */

const browserAPI = typeof browser !== "undefined" ? browser : chrome;
const DYNAMIC_SCRIPT_ID = "yameen-everywhere";
let firefoxContentScriptHandle = null;

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
    // Chrome MV3 path
    if (typeof chrome !== 'undefined' && chrome?.scripting?.registerContentScripts) {
      const existing = await browserAPI.scripting.getRegisteredContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
      if (existing.length > 0) return { ok: true, alreadyRegistered: true };
      await browserAPI.scripting.registerContentScripts([{
        id: DYNAMIC_SCRIPT_ID,
        matches: ["<all_urls>"],
        js: ["content.js"],
        css: ["content.css"],
        runAt: "document_idle",
      }]);
      return { ok: true };
    }
    // Firefox MV2 path
    if (typeof browser !== 'undefined' && browser?.contentScripts?.register) {
      if (firefoxContentScriptHandle) return { ok: true, alreadyRegistered: true };
      firefoxContentScriptHandle = await browser.contentScripts.register({
        matches: ["<all_urls>"],
        js: [{ file: "content.js" }],
        css: [{ file: "content.css" }],
        runAt: "document_idle",
      });
      return { ok: true };
    }
    return { ok: false, reason: "no-dynamic-api" };
  } catch (e) {
    console.error("[yameen] Failed to register everywhere script:", e);
    return { ok: false, reason: "register-threw", error: e.message };
  }
}

async function unregisterEverywhere() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.scripting?.unregisterContentScripts) {
      await browserAPI.scripting.unregisterContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
      return { ok: true };
    }
    if (firefoxContentScriptHandle) {
      await firefoxContentScriptHandle.unregister();
      firefoxContentScriptHandle = null;
      return { ok: true };
    }
    return { ok: false, reason: "no-dynamic-api" };
  } catch (e) {
    console.error("[yameen] Failed to unregister everywhere script:", e);
    return { ok: false, reason: "unregister-threw", error: e.message };
  }
}
