import { cleanText } from "@/lib/text/clean";

/**
 * Text pasted from Word, Google Docs or web pages arrives as HTML full of inline styles,
 * classes, fonts and Office markup. The editor only keeps the structure its schema knows
 * (headings, lists, links, tables...), but the markup is cleaned first so stray formatting and
 * Word's hidden elements never reach the content. Dashes and emojis are cleaned too.
 */
export function cleanPastedHtml(html: string): string {
  return cleanText(
    html
      // Google Docs wraps the whole paste in <b id="docs-internal-guid-...">: not real bold.
      .replace(/<b[^>]*docs-internal-guid[^>]*>([\s\S]*)<\/b>/i, "$1")
      // Google Docs marks bold and italic with inline styles on spans: keep them as tags.
      .replace(
        /<span[^>]*font-weight:\s*(?:700|bold)[^>]*>([\s\S]*?)<\/span>/gi,
        "<strong>$1</strong>",
      )
      .replace(/<span[^>]*font-style:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, "<em>$1</em>")
      // Office conditional comments and ordinary comments.
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      // Style blocks, scripts and Office namespaced tags (<o:p>, <w:...>).
      .replace(/<(style|script|xml|meta|link|title)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(meta|link)[^>]*>/gi, "")
      .replace(/<\/?[a-z]+:[^>]*>/gi, "")
      // Inline formatting attributes.
      .replace(
        /\s(style|class|id|lang|face|color|size|align|dir|width|height|bgcolor)="[^"]*"/gi,
        "",
      )
      .replace(
        /\s(style|class|id|lang|face|color|size|align|dir|width|height|bgcolor)='[^']*'/gi,
        "",
      )
      // Google Docs wraps everything in a bold span with an id; Word uses font and span tags.
      .replace(/<\/?(font|span)[^>]*>/gi, "")
      // Non breaking spaces from Word become normal spaces.
      .replace(/&nbsp;/g, " "),
  );
}

export function cleanPastedText(text: string): string {
  return cleanText(text);
}
