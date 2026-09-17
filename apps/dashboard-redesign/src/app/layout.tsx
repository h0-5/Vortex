import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vortex Console — Discord bot operations",
  description:
    "Vortex is an open-source Discord bot platform. Secure OAuth, multi-server management, and a plugin-ready foundation.",
  keywords: ["Vortex", "Discord", "bot", "console", "plugins", "open-source"],
  icons: {
    icon: "/vortex-mark.png",
  },
  openGraph: {
    title: "Vortex Console — Discord bot operations",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${grotesk.variable} ${plexMono.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
