import { startApp } from "./src/app-controller.js";

function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

registerServiceWorker();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    startApp();
  });
} else {
  startApp();
}
