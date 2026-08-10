import { access, readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("dist");
const required = [
  "manifest.json", "dashboard.html", "sidepanel.html", "offscreen.html",
  "service-worker.js", "observer.js", "harness/index.html",
  "icons/icon-16.png", "icons/icon-32.png", "icons/icon-48.png", "icons/icon-128.png"
];
for (const file of required) await access(resolve(root, file));

const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Release manifest is not MV3.");
if (manifest.version !== "0.1.1") throw new Error("Release manifest version does not match 0.1.1.");
if (!Array.isArray(manifest.optional_host_permissions) || manifest.optional_host_permissions.length !== 2) throw new Error("Origin access is not optional and bounded as expected.");
if (manifest.content_scripts) throw new Error("Public build must not inject globally declared content scripts.");

async function walk(directory) {
  const values = [];
  for (const name of await readdir(directory)) {
    const path = resolve(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) values.push(...await walk(path)); else values.push(path);
  }
  return values;
}
const files = await walk(root);
for (const file of files.filter((value) => /\.(?:html|js|css|json)$/.test(value))) {
  const source = await readFile(file, "utf8");
  if (/(?:fetch|importScripts)\s*\(\s*["'`]https?:\/\//i.test(source)) throw new Error(`Remote code or data request found in release asset: ${file}`);
  if (/\beval\s*\(|new\s+Function\s*\(/.test(source)) throw new Error(`Dynamic code execution found in release asset: ${file}`);
}
console.log(`Verified ${files.length} release files; MV3 package is self-contained.`);
