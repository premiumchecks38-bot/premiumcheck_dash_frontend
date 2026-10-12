import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge taught about our custom token names, so that for example
 * "text-h1" (a size) and "text-text-muted" (a colour) are not treated as conflicts.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "h4", "lead", "body", "small", "caption"],
      spacing: ["touch", "gutter", "header", "section-y-sm", "section-y", "section-y-lg"],
      container: ["narrow", "content", "wide"],
      radius: ["sm", "md", "lg", "xl", "full"],
      shadow: ["sm", "md", "lg"],
      ease: ["standard", "emphasized", "exit"],
    },
    classGroups: {
      "border-w": [{ border: ["thin", "thick"] }],
      "border-w-x": [{ "border-x": ["thin", "thick"] }],
      "border-w-y": [{ "border-y": ["thin", "thick"] }],
      "border-w-t": [{ "border-t": ["thin", "thick"] }],
      "border-w-r": [{ "border-r": ["thin", "thick"] }],
      "border-w-b": [{ "border-b": ["thin", "thick"] }],
      "border-w-l": [{ "border-l": ["thin", "thick"] }],
      "outline-w": [{ outline: ["focus"] }],
      duration: [{ duration: ["fast", "normal", "slow"] }],
      z: [{ z: ["header", "dropdown", "overlay", "modal", "toast"] }],
    },
  },
});

/** Merge conditional class names, resolving Tailwind conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
