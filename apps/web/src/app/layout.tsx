import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/modules/theme/ThemeContext";
import { IconThemeProvider } from "@/modules/icons/IconThemeContext";

// Fonts are declared as a plain CSS stack in globals.css (Outfit / Inter,
// falling back to system UI fonts) instead of next/font/google. That keeps
// production builds working in network-restricted environments (CI,
// offline dev, self-hosted) where fonts.googleapis.com isn't reachable —
// next/font/google fails the whole build if it can't fetch at build time.

export const metadata: Metadata = {
  title: "Iris OS",
  description: "Iris — a high-performance, web-based desktop environment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <IconThemeProvider>
            {children}
          </IconThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
