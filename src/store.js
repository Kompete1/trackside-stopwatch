import { cloneStateForStorage, normalizeSettings } from "./timing-engine.js";

const SESSION_KEY = "trackside-stopwatch:session";
const SETTINGS_KEY = "trackside-stopwatch:settings";

function parseJson(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_) {
    return null;
  }
}

function getStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

export const localStorageAdapter = {
  loadSession() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }
    return parseJson(storage.getItem(SESSION_KEY));
  },

  saveSession(state) {
    const storage = getStorage();
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(SESSION_KEY, JSON.stringify(cloneStateForStorage(state)));
      return true;
    } catch (_) {
      return false;
    }
  },

  clearSession() {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(SESSION_KEY);
    } catch (_) {
      // Ignore storage failures in live timing.
    }
  },

  loadSettings() {
    const storage = getStorage();
    if (!storage) {
      return normalizeSettings();
    }
    return normalizeSettings(parseJson(storage.getItem(SETTINGS_KEY)) || {});
  },

  saveSettings(settings) {
    const storage = getStorage();
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
      return true;
    } catch (_) {
      return false;
    }
  },
};
