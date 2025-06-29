// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["react-datepicker"],
    },
    server: {
      hmr: {
        port: 5173,
      },
    },
  },
  devToolbar: {
    enabled: false,
  },
  integrations: [react()],
});
