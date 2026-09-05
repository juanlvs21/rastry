import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Rastry",
    identifier: "dev.rastry.desktop",
    version: "0.0.0",
  },
  build: {
    mainProcess: "bun",
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
      "assets/rastry-icon.png": "assets/rastry-icon.png",
    },
    watchIgnore: ["dist/**"],
    mac: { bundleCEF: false },
    linux: { bundleCEF: false, icon: "assets/rastry-icon.png" },
    win: { bundleCEF: false, icon: "assets/rastry-icon.png" },
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
} satisfies ElectrobunConfig;
