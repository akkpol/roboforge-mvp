import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "./",
  build: {
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: "../dist-device",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[hash][extname]",
        chunkFileNames: "assets/[hash].js",
        entryFileNames: "assets/[hash].js",
      },
    },
    sourcemap: false,
    target: "es2020",
  },
  define: {
    "import.meta.env.VITE_APP_MODE": JSON.stringify(
      mode === "device" ? "device" : "public",
    ),
  },
  plugins: [preact()],
  root: "device",
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
}));
