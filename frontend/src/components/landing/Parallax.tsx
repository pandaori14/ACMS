"use client";

import { useEffect, useRef, useState } from "react";

interface ParallaxProps {
  children: React.ReactNode;
  /** Faktor gerak relatif terhadap scroll (mis. 0.15 = halus, 0.4 = kuat). */
  speed?: number;
  className?: string;
}

/**
 * Menggeser konten secara vertikal mengikuti posisi scroll (efek parallax)
 * untuk objek dekoratif yang "bergerak" saat halaman di-scroll.
 * Throttle via requestAnimationFrame; menghormati prefers-reduced-motion (diam).
 */
export default function Parallax({ children, speed = 0.15, className = "" }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let raf = 0;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Jarak pusat elemen dari pusat viewport → makin jauh, makin bergeser.
      const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
      setY(-fromCenter * speed);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ transform: `translate3d(0, ${y}px, 0)`, willChange: "transform" }}>
      {children}
    </div>
  );
}
