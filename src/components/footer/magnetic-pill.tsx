import { useRef, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export const MagneticPill = ({
  href,
  label,
  children,
  external = true,
}: {
  href: string;
  label: string;
  children: ReactNode;
  external?: boolean;
}) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 12, mass: 0.2 });
  const springY = useSpring(y, { stiffness: 180, damping: 12, mass: 0.2 });

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.35);
    y.set((e.clientY - r.top - r.height / 2) * 0.35);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      aria-label={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: springX, y: springY }}
      className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-primary-foreground shadow-soft backdrop-blur-md transition hover:border-accent/60 hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </motion.a>
  );
};
