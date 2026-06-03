import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import path from "path";

function resolveBasePath(): string {
  const configured = process.env.VITE_BASE_PATH || "/";
  if (configured === "./" || configured === ".") return "./";
  const withLeadingSlash = configured.startsWith("/") ? configured : `/${configured}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const PAGES_ORIGIN = "https://diegoavalon.github.io/eVitals";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: resolveBasePath(),
  server: {
    proxy: {
      // Forward data + report fetches to the live GitHub Pages deployment.
      // Lets `pnpm dev` work in WSL without a local Lighthouse run or Chrome.
      "/data":    { target: PAGES_ORIGIN, changeOrigin: true },
      "/reports": { target: PAGES_ORIGIN, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
