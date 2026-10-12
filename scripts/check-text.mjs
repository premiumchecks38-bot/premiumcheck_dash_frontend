import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

/**
 * Script to enforce text quality rules:
 * - No em dash (unicode \u2014)
 * - No en dash (unicode \u2013)
 * - No emoji characters anywhere in code, comments, or UI text
 */

// Common emoji regex covering emoji presentations and symbols
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
const EM_DASH = "\u2014";
const EN_DASH = "\u2013";

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".txt",
  ".html",
]);

const IGNORED_PATHS = [
  "node_modules",
  ".next",
  "build",
  "out",
  ".npm-cache",
  "src/lib/api/types.ts", // Generated from backend OpenAPI schema
  "package-lock.json",
];

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const rel = relative(process.cwd(), fullPath);

    if (IGNORED_PATHS.some((ignored) => rel === ignored || rel.startsWith(`${ignored}/`))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await getFiles(fullPath)));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function checkFile(filePath) {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    if (line.includes(EM_DASH)) {
      violations.push({
        file: filePath,
        line: lineNumber,
        reason: "Em dash detected (use hyphens, colons, or commas instead)",
        snippet: line.trim(),
      });
    }

    if (line.includes(EN_DASH)) {
      violations.push({
        file: filePath,
        line: lineNumber,
        reason: "En dash detected (use hyphens, colons, or commas instead)",
        snippet: line.trim(),
      });
    }

    if (EMOJI_REGEX.test(line)) {
      violations.push({
        file: filePath,
        line: lineNumber,
        reason: "Emoji detected (strict rule: no emojis permitted)",
        snippet: line.trim(),
      });
    }
  }

  return violations;
}

async function main() {
  const dirsToCheck = ["src", "public", "scripts", "tests"].filter(async (d) => {
    try {
      const s = await stat(d);
      return s.isDirectory();
    } catch {
      return false;
    }
  });

  const allFiles = [];
  for (const d of dirsToCheck) {
    allFiles.push(...(await getFiles(d)));
  }

  const allViolations = [];
  for (const file of allFiles) {
    const violations = await checkFile(file);
    allViolations.push(...violations);
  }

  if (allViolations.length > 0) {
    console.error(`Found ${allViolations.length} text rule violation(s):`);
    for (const v of allViolations) {
      console.error(`- ${v.file}:${v.line}: ${v.reason}\n  "${v.snippet}"`);
    }
    process.exit(1);
  }

  console.log(`Text check passed: ${allFiles.length} files scanned with zero violations.`);
}

main().catch((err) => {
  console.error("Check text script failed:", err);
  process.exit(1);
});
