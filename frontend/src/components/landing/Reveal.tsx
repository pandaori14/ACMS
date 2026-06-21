"use client";

import { useEffect, useRef, useState } from "react";

type RevealVariant = "up" | "scale" | "left" | "right" | "blur";

const HIDDEN: Record<RevealVariant, string> = {
  up: "opacity-0 translate-y-12",
  scale: "opacity-0 scale-90",
  left: "opacity-0 -translate-x-16",
  right: "opacity-0 translate-x-16",
  blur: "opacity-0 blur-lg translate-y-8",
};

const SHOWN = "opacity-100 translate-x-0 translate-y-0 scale-100 blur-0";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Arah/efek transisi saat masuk viewport. */
  variant?: RevealVariant;
  /** Jeda mulai (ms) untuk efek bertahap (stagger). */
  delay?: number;
}

/**
 * Bungkus konten agar muncul dengan transisi cinematic saat masuk viewport
 * (scroll-reveal). IntersectionObserver (sekali tampil) + menghormati
 * prefers-reduced-motion (langsung tampil tanpa animasi).
 */
export default function Reveal({ children, className = "", variant = "up", delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
        visible ? SHOWN : HIDDEN[variant]
      } ${className}`}
    >
      {children}
    </div>
  );
}
