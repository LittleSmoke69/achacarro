import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";

export const useGsapReveal = (selector = "[data-reveal]") => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;
      const items = scope.current.querySelectorAll(selector);
      if (!items.length) return;

      gsap.utils.toArray<HTMLElement>(items).forEach((el, i) => {
        gsap.from(el, {
          y: 48,
          opacity: 0,
          duration: 0.85,
          delay: (i % 3) * 0.06,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true,
          },
        });
      });
    },
    { scope },
  );

  return scope;
};
