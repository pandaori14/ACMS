import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { Toaster } from "sonner";

import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACMS - Academic Clinical Management System",
  description: "Sistem Manajemen Klinik Akademik",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeInitializer />
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
