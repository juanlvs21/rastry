import { BrowserWindow, Updater } from "electrobun/main";

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
});
