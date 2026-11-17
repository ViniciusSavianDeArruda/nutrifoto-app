import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// No Docker, API_PROXY_TARGET aponta para o serviço do compose (http://worker:8787).
const apiTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "NutriFoto",
        short_name: "NutriFoto",
        description: "Diário alimentar com estimativa por foto.",
        lang: "pt-BR",
        start_url: "/",
        display: "standalone",
        background_color: "#F3F7F0",
        theme_color: "#16533C",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { "/api": apiTarget, "/health": apiTarget },
    // Em bind mount no Windows/macOS os eventos de arquivo não chegam ao container; o Docker liga o polling.
    watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true } : undefined,
  },
  test: { environment: "jsdom", setupFiles: ["./src/test-setup.js"], globals: true },
});
