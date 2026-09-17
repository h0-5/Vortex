import type { Metadata } from "next";
import { Unbounded, Outfit, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DevToolsGate } from "@/components/vortex/devtools-gate";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vortex Nexus — Discord operations, reimagined",
  description:
    "Vortex is an open-source Discord bot platform. Secure OAuth, multi-server management, and a plugin-ready foundation.",
  keywords: ["Vortex", "Discord", "bot", "nexus", "plugins", "open-source"],
  icons: {
    icon: "/vortex-logo-fav.png",
  },
  openGraph: {
    title: "Vortex Nexus — Discord operations, reimagined",
    description: "Open-source Discord bot platform with schema-driven plugin configuration.",
    siteName: "Vortex",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${unbounded.variable} ${outfit.variable} ${plexArabic.variable} ${jbMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <DevToolsGate />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
