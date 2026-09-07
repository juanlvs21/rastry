import type { ElectrobunConfig } from "electrobun";

const version = process.env.RASTRY_VERSION ?? "0.0.0";

export default {
  app: {
    name: "Rastry",
    identifier: "dev.rastry.desktop",
    version,
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
