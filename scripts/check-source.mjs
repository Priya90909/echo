import { readdir, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let checked = 0;
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", "work", ".git"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await check(path);
      continue;
    }
    if (/\.tsx?$/.test(entry.name))
      throw Error("Unexpected TypeScript source: " + path);
    if (!/\.(?:js|jsx|mjs)$/.test(entry.name)) continue;
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(
      /(?:from\s*|import\s*\()\s*["'](\.[^"']+)["']/g,
    ))
      await access(resolve(dirname(path), match[1]));
    if (!path.endsWith(".jsx"))
      execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
    checked++;
  }
}
for (const folder of ["apps", "packages", "workers", "scripts", "tests", "e2e"])
  await check(join(root, folder));
console.log(
  `Validated ${checked} JavaScript modules and their relative imports.`,
);
