"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { AppSetting } from "@/lib/api-helpers";

export function ThemeInitializer() {
  useEffect(() => {
    const applyGlobalSettings = async () => {
      try {
        const { data } = await api.get("/api/public-settings");
        if (Array.isArray(data)) {
          const primaryColor = data.find((s: AppSetting) => s.key === "primary_color")?.value;
          if (primaryColor) {
            document.documentElement.style.setProperty("--primary", primaryColor);
          }
          const appName = data.find((s: AppSetting) => s.key === "app_name")?.value;
          if (appName) {
            document.title = `${appName} - Academic Clinical Management System`;
          }
          const appFavicon = data.find((s: AppSetting) => s.key === "app_favicon")?.value;
          if (appFavicon) {
            const faviconUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${appFavicon}`;
            const links = document.querySelectorAll("link[rel*='icon']");
            if (links.length === 0) {
              const link = document.createElement('link');
              link.rel = 'icon';
              link.href = faviconUrl;
              document.head.appendChild(link);
            } else {
              links.forEach(link => {
                (link as HTMLLinkElement).href = faviconUrl;
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch global settings", err);
      }
    };

    applyGlobalSettings();
  }, []);

  return null;
}
