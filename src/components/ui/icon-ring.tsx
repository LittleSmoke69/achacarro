import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const IconRing = ({
  children,
  className,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) => (
  <div
    className={cn(
      "relative flex aspect-square rounded-full border border-border before:absolute before:-inset-2 before:rounded-full before:border before:border-border/80",
      size === "sm" ? "size-10" : "size-12",
      className,
    )}
  >
    <span className="m-auto inline-flex text-primary">{children}</span>
  </div>
);
