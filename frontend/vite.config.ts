import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA config caches only the app shell/static assets - never API responses that
// contain health-profile data (MVP Requirements 6.4).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: false, // We ship a hand-authored public/manifest.webmanifest.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        // Do NOT cache the analyze API; it returns sensitive, session-only data.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    port: 5173,
    // Proxy /api to the local Functions host during `vite dev`.
    proxy: {
      "/api": "http://localhost:7071",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
