/**
 * Keeps the dashboard's design identical to the public website (the source of truth).
 *
 *   node scripts/sync-design.mjs          copy the shared files from ../p_frontend (or
 *                                          ../premiumcheck_frontend, or WEBSITE_DIR)
 *   node scripts/sync-design.mjs --check  fail when any shared file differs or is missing
 *
 * Shared: design tokens, the Tailwind theme mapping and base styles, the UI primitives, the
 * class name and formatting helpers they use, and the fonts. Dashboard only components live in
 * src/components/dashboard and dashboard only tokens in src/styles/tokens.dashboard.css.
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const website =
  process.env.WEBSITE_DIR ??
  ["../p_frontend", "../premiumcheck_frontend"]
    .map((dir) => resolve(root, dir))
    .find((dir) => existsSync(join(dir, "src/styles/tokens.css")));

if (!website) {
  console.error("Website project not found: set WEBSITE_DIR to the p_frontend folder.");
  process.exit(1);
}

/** [path in the website, path in the dashboard]; folders are copied recursively. */
const SHARED = [
  ["src/styles/tokens.css", "src/styles/shared/tokens.css"],
  ["src/styles/globals.css", "src/styles/shared/globals.css"],
  ["src/components/ui", "src/components/ui"],
  ["src/lib/utils/cn.ts", "src/lib/utils/cn.ts"],
  ["src/lib/utils/format.ts", "src/lib/utils/format.ts"],
  ["src/assets/fonts", "src/assets/fonts"],
  ["src/config/fonts.ts", "src/config/fonts.ts"],
  ["src/config/brand-colours.ts", "src/config/brand-colours.ts"],
];

async function files(path) {
  if (!existsSync(path)) return [];
  if (!(await stat(path)).isDirectory()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map((e) => files(join(path, e.name))));
  return nested.flat();
}

const check = process.argv.includes("--check");
const problems = [];
let copied = 0;

for (const [from, to] of SHARED) {
  const source = join(website, from);
  const target = join(root, to);
  const sourceFiles = await files(source);
  if (sourceFiles.length === 0) {
    problems.push(`missing in the website: ${from}`);
    continue;
  }
  const expected = new Set(sourceFiles.map((file) => join(target, relative(source, file))));
  for (const file of sourceFiles) {
    const dest = join(target, relative(source, file));
    const same = existsSync(dest) && (await readFile(file)).equals(await readFile(dest));
    if (same) continue;
    if (check) {
      problems.push(`differs: ${relative(root, dest)}`);
    } else {
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(file, dest);
      copied += 1;
    }
  }
  // Files that exist only in the dashboard copy of a shared folder.
  for (const file of await files(target)) {
    if (expected.has(file) || sourceFiles.length === 1) continue;
    if (check) problems.push(`not in the website: ${relative(root, file)}`);
    else await rm(file);
  }
}

if (check) {
  if (problems.length > 0) {
    console.error(`Design differs from the website (${website}):\n  ${problems.join("\n  ")}`);
    console.error("Run npm run design:sync to update the dashboard copy.");
    process.exit(1);
  }
  console.log("Design check passed: the dashboard uses the website's tokens and primitives.");
} else {
  console.log(`Design sync: ${copied} file(s) copied from ${website}.`);
}
