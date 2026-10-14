import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { handleVitePreloadError } from "@/lib/chunkLoadRecovery";

// Global error capture for uncaught exceptions & promise rejections
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", handleVitePreloadError);

  window.addEventListener("error", (event) => {
    // Keep default logging, and attach additional context if needed
    console.error("[window.error]", event.error || event.message, event);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[unhandledrejection]", event.reason);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
