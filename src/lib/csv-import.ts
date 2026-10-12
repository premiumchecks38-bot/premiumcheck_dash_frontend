/**
 * Reading a CSV file in the browser to preview an import before it is sent. Handles quoted
 * cells, doubled quotes, commas and new lines inside quotes, CRLF line ends and a byte order
 * mark. The backend checks the file again when it is imported.
 */

const BOM = String.fromCharCode(0xfeff);

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.startsWith(BOM) ? text.slice(1) : text;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface RedirectRow {
  line: number;
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  error: string | null;
}

const PATH = /^\/[^\s]*$/;

/**
 * Redirect rows from a CSV with columns from_path, to_path and an optional status_code (a
 * header row is detected and skipped). Each row carries its own error, if any, for the preview.
 */
export function redirectRows(text: string): RedirectRow[] {
  const rows = parseCsv(text);
  const first = rows[0]?.map((c) => c.trim().toLowerCase()) ?? [];
  const hasHeader = first.includes("from_path") || first.includes("from");
  const fromIndex = hasHeader ? Math.max(first.indexOf("from_path"), first.indexOf("from")) : 0;
  const toIndex = hasHeader ? Math.max(first.indexOf("to_path"), first.indexOf("to")) : 1;
  const codeIndex = hasHeader ? first.indexOf("status_code") : 2;
  const seen = new Map<string, number>();
  return rows.slice(hasHeader ? 1 : 0).map((cells, index) => {
    const line = index + (hasHeader ? 2 : 1);
    const from_path = (cells[fromIndex] ?? "").trim();
    const to_path = (cells[toIndex] ?? "").trim();
    const codeText = codeIndex >= 0 ? (cells[codeIndex] ?? "").trim() : "";
    let error: string | null = null;
    if (!PATH.test(from_path)) error = "The old path must start with / and have no spaces";
    else if (!to_path) error = "The new path or URL is missing";
    else if (!to_path.startsWith("/") && !/^https?:\/\//.test(to_path))
      error = "The new address must start with / or https://";
    else if (from_path === to_path) error = "A path cannot redirect to itself";
    else if (codeText && codeText !== "301" && codeText !== "302")
      error = "The status code must be 301 or 302";
    else if (seen.has(from_path))
      error = `The same old path is on line ${String(seen.get(from_path))}`;
    if (!seen.has(from_path)) seen.set(from_path, line);
    return {
      line,
      from_path,
      to_path,
      status_code: codeText === "302" ? 302 : 301,
      error,
    };
  });
}
