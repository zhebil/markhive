import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import chokidar from "chokidar";

const ASSETS = [
  ["manifest.json", "manifest.json"],
  ["src/popup/popup.html", "popup/popup.html"],
  ["src/popup/popup.css", "popup/popup.css"],
  ["icons", "icons"],
];

async function copyOne(src, dest) {
  const out = join("dist", dest);
  await mkdir(dirname(out), { recursive: true });
  await cp(src, out, { recursive: true });
}

async function copyAll() {
  for (const [src, dest] of ASSETS) await copyOne(src, dest);
  console.log("[copy-assets] done");
}

await copyAll();

if (process.argv.includes("--watch")) {
  chokidar.watch(ASSETS.map(([s]) => s)).on("change", copyAll);
}
