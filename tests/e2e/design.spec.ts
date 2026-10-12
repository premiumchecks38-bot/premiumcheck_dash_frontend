import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

test("design:check passes: tokens and primitives match the website", () => {
  const output = execFileSync(process.execPath, ["scripts/sync-design.mjs", "--check"], {
    cwd: resolve(import.meta.dirname, "../.."),
    encoding: "utf8",
  });
  expect(output).toContain("Design check passed");
});
