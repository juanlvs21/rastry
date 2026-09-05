import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const electrobunViewEntry = fileURLToPath(
  new URL("./.hutch/devkit/api/browser/index.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  root: "src/mainview",
  base: "./",
  resolve: {
    alias: {
      // The npm bootstrap intentionally throws at runtime; Hutch projects the
      // browser SDK into this path during `electrobun prepare`.
      "electrobun/view": electrobunViewEntry,
    },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
