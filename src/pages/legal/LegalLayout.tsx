import { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const LegalLayout = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <section className="bg-gradient-hero py-14 text-primary-foreground">
      <div className="container text-center">
        <h1 className="font-display text-3xl font-extrabold md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-primary-foreground/80">{subtitle}</p>}
      </div>
    </section>
    <section className="container py-14">
      <article className="prose prose-slate mx-auto max-w-3xl prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-accent prose-strong:text-foreground">
        {children}
      </article>
    </section>
    <SiteFooter />
  </div>
);
