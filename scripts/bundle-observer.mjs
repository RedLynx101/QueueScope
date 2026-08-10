import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

await copyFile(resolve("src/content/observer-standalone.js"), resolve("dist/observer.js"));
console.log("Copied audited standalone page observer.");
