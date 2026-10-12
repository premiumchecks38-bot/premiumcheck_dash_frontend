import localFont from "next/font/local";

// Bundle fonts locally so production builds never depend on the Google Fonts loader.
/** Headings. Exposed as the CSS variable --font-manrope, consumed by tokens.css. */
export const manrope = localFont({
  src: "../assets/fonts/manrope-latin.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-manrope",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

/** Body copy. Exposed as the CSS variable --font-inter, consumed by tokens.css. */
export const inter = localFont({
  preload: false,
  src: "../assets/fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

/** Digit / numbers font. Exposed as the CSS variable --font-geist-mono. */
export const geistMono = localFont({
  preload: false,
  src: "../assets/fonts/geist-mono-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
});

/** Class names to place on <html> so font variables are available everywhere. */
export const fontVariables = `${manrope.variable} ${inter.variable} ${geistMono.variable}`;

