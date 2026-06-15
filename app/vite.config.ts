import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [preact()],
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
  },
  build: {
    outDir: mode === "device" ? "dist-device" : "dist",
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2020",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[hash][extname]",
        chunkFileNames: "assets/[hash].js",
        entryFileNames: "assets/[hash].js",
      },
    },
  },
}));
