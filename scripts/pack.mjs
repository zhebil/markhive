// Package the built extension into a zip ready for Chrome Web Store upload.
// Run after `npm run build`. Output: markhive-<version>.zip in the repo root.

import { readFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const distDir = join(root, "dist");

if (!existsSync(distDir)) {
  console.error("[pack] dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

const manifest = JSON.parse(await readFile(join(distDir, "manifest.json"), "utf8"));
const version = manifest.version;
const outName = `markhive-${version}.zip`;
const outPath = join(root, outName);

if (existsSync(outPath)) await rm(outPath);

const releaseDir = join(root, ".release");
await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });

// zip the contents of dist/ (not dist/ itself), excluding *.map and .DS_Store
execFileSync(
  "zip",
  ["-r", outPath, ".", "-x", "*.map", "-x", ".DS_Store", "-x", "*/.DS_Store"],
  { cwd: distDir, stdio: "inherit" },
);

await rm(releaseDir, { recursive: true, force: true });
console.log(`[pack] wrote ${outName}`);
