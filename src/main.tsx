import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { isNativeShell } from "./lib/platform";
import { prepareServiceWorkerState } from "./startup/nativeStartup";
import { StartupErrorBoundary } from "./startup/StartupErrorBoundary";

void prepareServiceWorkerState({
  nativeShell: isNativeShell(),
  registerWebServiceWorker: () =>
    registerSW({ immediate: true, onRegisterError() {} }),
});

createRoot(document.getElementById("root")!).render(
  <StartupErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </StartupErrorBoundary>,
);
