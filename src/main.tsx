import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { isNativeShell } from "./lib/platform";

// Register the PWA service worker on the web only. Inside the native
// (Capacitor) WKWebView shell a service worker is moot and only causes
// stale-asset/console noise, so skip it there.
if (!isNativeShell()) {
  registerSW({ immediate: true, onRegisterError() {} });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
