import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

// Body / UI text — quiet, legible workhorse.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Editorial display — architectural, warm, human. Used for headings and
// wayfinding-scale type across the residence experience.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Signage / wayfinding labels — floor numbers, coordinates, room codes.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Residence Hub",
  description: "A place. People live here. This is their community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}
    >
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <SessionProvider>
              {/* Lenis smooth-scroll is applied only on the marketing landing
                  page (which needs it for scroll animation) — NOT app-wide, since
                  it hijacks the wheel and breaks native scrolling (e.g. the chat
                  thread) on interior pages. */}
              {children}
              <Toaster position="bottom-right" theme="light" />
            </SessionProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
