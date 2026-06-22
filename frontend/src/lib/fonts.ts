import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Font display untuk landing page (dimuat resmi via next/font, bukan sekadar
 * dirujuk di CSS). Dipakai scoped: terapkan `jakarta.variable` pada wrapper
 * landing, lalu `font-family: var(--font-jakarta)` di CSS-nya.
 */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});
