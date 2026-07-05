import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { Toaster } from "sonner";

import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACMS - Academic Clinical Management System",
  description: "Sistem Manajemen Klinik Akademik",
  manifest: "/acms/manifest.json",
  icons: {
    icon: "/acms/icons/icon-192.png",
    apple: "/acms/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ACMS",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeInitializer />
        <PwaRegister />
        <Providers>
            <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors />
            </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
