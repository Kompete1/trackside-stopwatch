export function createFeedbackAdapter({ audioElement, settings, onStatus }) {
  let currentSettings = settings;
  let wakeLockSentinel = null;

  function vibrate(pattern) {
    if (!currentSettings.hapticsEnabled) {
      return;
    }
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return;
    }
    navigator.vibrate(pattern);
  }

  function playClick(volume = 0.55) {
    if (!currentSettings.soundEnabled || !audioElement || currentSettings.feedbackProfile === "off") {
      return;
    }

    try {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement.volume = volume;
      audioElement.play().catch(() => {});
    } catch (_) {
      // Ignore autoplay restrictions during live timing.
    }
  }

  function tap() {
    if (currentSettings.feedbackProfile === "off") {
      return;
    }

    if (currentSettings.feedbackProfile === "strong") {
      vibrate([18, 14, 22]);
      playClick(0.72);
      return;
    }

    vibrate(18);
    playClick(0.55);
  }

  function lap(isBestLap) {
    if (currentSettings.feedbackProfile === "off") {
      return;
    }

    if (currentSettings.feedbackProfile === "strong" || isBestLap) {
      vibrate([24, 18, 28]);
      playClick(0.82);
      return;
    }

    vibrate(24);
    playClick(0.65);
  }

  async function requestWakeLock() {
    if (!currentSettings.wakeLockEnabled) {
      return false;
    }

    if (typeof navigator === "undefined" || !navigator.wakeLock || typeof navigator.wakeLock.request !== "function") {
      return false;
    }

    if (wakeLockSentinel) {
      return true;
    }

    try {
      wakeLockSentinel = await navigator.wakeLock.request("screen");
      wakeLockSentinel.addEventListener("release", () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch (_) {
      if (typeof onStatus === "function") {
        onStatus("Screen awake mode is not available right now.", "warning");
      }
      return false;
    }
  }

  async function releaseWakeLock() {
    if (!wakeLockSentinel) {
      return;
    }

    try {
      await wakeLockSentinel.release();
    } catch (_) {
      // Ignore release failures.
    } finally {
      wakeLockSentinel = null;
    }
  }

  async function syncWakeLock(shouldHold) {
    if (shouldHold && currentSettings.wakeLockEnabled) {
      await requestWakeLock();
      return;
    }

    await releaseWakeLock();
  }

  async function handleVisibilityChange(shouldHold) {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      await releaseWakeLock();
      return;
    }

    await syncWakeLock(shouldHold);
  }

  return {
    setSettings(nextSettings) {
      currentSettings = nextSettings;
    },
    playTap() {
      tap();
    },
    playLap(isBestLap = false) {
      lap(isBestLap);
    },
    syncWakeLock,
    handleVisibilityChange,
  };
}
