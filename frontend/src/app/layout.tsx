import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale dari cookie NEXT_LOCALE (lihat src/i18n/request.ts); pesan diteruskan
  // ke NextIntlClientProvider agar useTranslations tersedia di seluruh app.
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <NextIntlClientProvider>
          <ThemeInitializer />
          <PwaRegister />
          <Providers>
              <TooltipProvider>
              {children}
              <Toaster position="top-right" richColors />
              </TooltipProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
