/**
 * Brand colours for places that cannot read CSS variables: the web manifest, the theme-color
 * meta tag and generated Open Graph images. Values mirror src/styles/tokens.css; a unit test
 * (tests/unit/brand-colours.test.ts) fails if they drift apart.
 */
export const brandColours = {
  primary: "#0f172a",
  primaryForeground: "#ffffff",
  accent: "#0FA3F3",
  accentSubtle: "#f0f9ff",
  background: "#ffffff",
  surface: "#f8fafc",
} as const;

/** The CSS custom property each value mirrors. */
export const brandColourTokens: Record<keyof typeof brandColours, string> = {
  primary: "--pc-color-primary",
  primaryForeground: "--pc-color-primary-foreground",
  accent: "--pc-color-accent",
  accentSubtle: "--pc-color-accent-subtle",
  background: "--pc-color-background",
  surface: "--pc-color-surface",
};
