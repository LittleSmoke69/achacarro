import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";

export const FormPage = ({
  eyebrow,
  title,
  subtitle,
  children,
  maxWidth = "max-w-3xl",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}) => (
  <div className="flex min-h-screen flex-col bg-secondary">
    <SiteHeader />
    <section className="flex-1 px-4 pb-16 pt-4 md:px-6 md:pt-6">
      <div className={cn("mx-auto", maxWidth)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-muted-foreground">{subtitle}</p>}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft md:p-10 [&_input]:rounded-xl [&_[role=combobox]]:rounded-xl">
          {children}
        </div>
      </div>
    </section>
    <SiteFooter />
  </div>
);

export const QuizStepper = ({
  step,
  labels,
}: {
  step: number;
  labels: string[];
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-2">
            <div className={cn("h-1.5 rounded-full", done || active ? "bg-accent" : "bg-muted")} />
            <span
              className={cn(
                "truncate text-[10px] font-semibold uppercase tracking-[0.14em]",
                active ? "text-accent" : done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {n}. {label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);
