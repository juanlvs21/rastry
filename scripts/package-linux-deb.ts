import { chmod, cp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const [appArgument, outputArgument, versionArgument] = Bun.argv.slice(2);

if (appArgument === undefined || outputArgument === undefined || versionArgument === undefined) {
  throw new Error(
    "Usage: bun run scripts/package-linux-deb.ts <app-directory> <output.deb> <version>",
  );
}

const appDirectory = resolve(appArgument);
const outputPath = resolve(outputArgument);
const version = versionArgument.replace(/^v/, "");
const packageRoot = outputPath + ".root";
const appInstallPath = join(packageRoot, "opt/rastry");
const executablePath = join(appInstallPath, "bin/launcher");

await rm(packageRoot, { recursive: true, force: true });
await mkdir(dirname(outputPath), { recursive: true });
await mkdir(join(packageRoot, "DEBIAN"), { recursive: true });
await mkdir(join(packageRoot, "usr/bin"), { recursive: true });
await mkdir(join(packageRoot, "usr/share/applications"), { recursive: true });
await cp(appDirectory, appInstallPath, { recursive: true });
await chmod(executablePath, 0o755);
await symlink("/opt/rastry/bin/launcher", join(packageRoot, "usr/bin/rastry-desktop"));

await writeFile(
  join(packageRoot, "DEBIAN/control"),
  [
    "Package: rastry-desktop",
    "Version: " + version,
    "Section: graphics",
    "Priority: optional",
    "Architecture: amd64",
    "Maintainer: Rastry contributors <rastry@juanl.dev>",
    "Depends: libc6 (>= 2.31)",
    "Description: Local-first image optimization and transformation desktop app",
    " Rastry processes images locally with a safe preview-first workflow.",
    "",
  ].join("\n"),
  "utf8",
);

await writeFile(
  join(packageRoot, "usr/share/applications/rastry.desktop"),
  [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Rastry",
    "Comment=Local-first image optimization and transformation",
    "Exec=/usr/bin/rastry-desktop",
    "Terminal=false",
    "Categories=Graphics;Utility;",
    "",
  ].join("\n"),
  "utf8",
);

const result = Bun.spawnSync(
  ["dpkg-deb", "--build", "--root-owner-group", packageRoot, outputPath],
  {
    stdout: "inherit",
    stderr: "inherit",
  },
);

if (result.exitCode !== 0) {
  throw new Error("dpkg-deb failed with exit code " + result.exitCode + ".");
}

await rm(packageRoot, { recursive: true, force: true });
console.log("Created " + basename(outputPath) + " from " + appDirectory);
