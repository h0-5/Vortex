import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const firaCode = Fira_Code({
  variable: "--font-fira",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vortex — Discord Bot Dashboard",
  description:
    "Vortex is an open-source Discord bot platform. Secure OAuth, multi-server management, and a plugin-ready foundation.",
  keywords: ["Vortex", "Discord", "bot", "dashboard", "plugins", "open-source"],
  icons: {
    icon: "/vortex-mark.png",
  },
  openGraph: {
    title: "Vortex — Discord Bot Dashboard",
    description: "Open-source Discord bot platform with a premium OLED dashboard.",
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
      <body className={`${jakarta.variable} ${firaCode.variable} font-sans antialiased bg-black text-foreground`}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
