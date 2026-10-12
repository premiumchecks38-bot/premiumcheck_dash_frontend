/** Regenerate src/lib/api/types.ts from the running backend's OpenAPI schema (API_URL). */
import { execSync } from "node:child_process";

const apiUrl = process.env.API_URL || "http://localhost:8000/api/v1";
const openApiUrl = `${apiUrl.replace(/\/+$/, "")}/openapi.json`;
const targetFile = "src/lib/api/types.ts";

console.log(`Generating API types from ${openApiUrl} to ${targetFile}...`);

try {
  execSync(`npx openapi-typescript "${openApiUrl}" -o "${targetFile}"`, {
    stdio: "inherit",
  });
  console.log("Successfully generated API types.");
} catch (error) {
  console.error("Failed to generate API types:", error);
  process.exit(1);
}
