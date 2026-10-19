/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      /* Шрифт и gif должны кэшироваться для офлайн-запуска */
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ttf,woff,woff2,gif}"],
        /* Фото клуба и галереи ПГУ — отдельно от precache, кэшируются при первом просмотре */
        runtimeCaching: [
          {
            urlPattern: /\/(club|pgu-gallery)\/.+\.jpg$/,
            handler: "CacheFirst",
            options: {
              cacheName: "app-photos",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "Твой выбор",
        short_name: "Твой выбор",
        description:
          "Профориентационные тесты направления «Экономика» ПГУ им. Шолом-Алейхема",
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: "ru",
        background_color: "#fff7ed",
        theme_color: "#c2410c",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
