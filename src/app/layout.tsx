import type { Metadata, Viewport } from "next";

import "@/styles/globals.css";
import { brandColours } from "@/config/brand-colours";
import { fontVariables } from "@/config/fonts";
import { Providers } from "@/components/dashboard/providers";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | Premium Property Checks",
    template: "%s | Premium Property Checks dashboard",
  },
  description: "Premium Property Checks staff dashboard.",
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/favicon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: brandColours.primary,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={fontVariables} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background font-body text-text antialiased"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
