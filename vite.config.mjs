import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        dashboard: resolve(rootDir, "dashboard.html"),
        sidepanel: resolve(rootDir, "sidepanel.html"),
        offscreen: resolve(rootDir, "offscreen.html"),
        harness: resolve(rootDir, "harness/index.html"),
        "service-worker": resolve(rootDir, "src/background/service-worker.ts")
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "service-worker" || chunk.name === "offscreen"
            ? "[name].js"
            : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
