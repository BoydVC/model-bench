import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, IBM_Plex_Mono, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Model Bench",
  description: "A personal model benchmark built from a technology director's tasks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} ${plex.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <Suspense fallback={<div className="h-16 border-b border-border bg-card" />}>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
