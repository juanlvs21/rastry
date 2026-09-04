import { BrowserView, BrowserWindow, Updater, Utils } from "electrobun/main";
import { createImageEngine } from "@rastry/image-engine";

import type { DesktopProgressEvent, DesktopRpcSchema } from "../rpc";
import { desktopPlanningFileSystem } from "./filesystem";
import { DesktopService } from "./service";

const developmentServerUrl = "http://localhost:5173";

async function resolveMainViewUrl(): Promise<string> {
  if ((await Updater.localInfo.channel()) === "dev") {
    try {
      await fetch(developmentServerUrl, { method: "HEAD" });
      return developmentServerUrl;
    } catch {
      // The regular dev command uses the bundled Vite output.
    }
  }
  return "views://mainview/index.html";
}

let sendProgress: (event: DesktopProgressEvent) => void = () => undefined;

const service = new DesktopService({
  fileSystem: desktopPlanningFileSystem,
  engine: createImageEngine(),
  dialog: {
    selectInputs() {
      return Utils.openFileDialog({
        allowedFileTypes: "png,jpg,jpeg,webp",
        canChooseFiles: true,
        canChooseDirectory: true,
        allowsMultipleSelection: true,
      });
    },
    selectOutputDirectory() {
      return Utils.openFileDialog({
        canChooseFiles: false,
        canChooseDirectory: true,
        allowsMultipleSelection: false,
      });
    },
  },
  onProgress(event) {
    sendProgress(event);
  },
});

const rpc = BrowserView.defineRPC<DesktopRpcSchema>({
  maxRequestTime: Infinity,
  handlers: {
    requests: service.createRequestHandlers(),
    messages: {},
  },
});

sendProgress = (event) => rpc.send.executionProgress(event);

// oxlint-disable-next-line no-new -- BrowserWindow construction registers the desktop window.
new BrowserWindow({
  title: "Rastry",
  url: await resolveMainViewUrl(),
  frame: {
    width: 1080,
    height: 720,
    x: 160,
    y: 120,
  },
  rpc,
});
