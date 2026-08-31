import { IconRing } from "@/components/ui/icon-ring";
import { Link } from "react-router-dom";
import { ArrowRight, Car, Search, Handshake, Building2, Inbox, Send, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGsapReveal } from "@/hooks/use-gsap-reveal";

const stepsComprador = [
  { icon: Car, title: "Diz o carro que queres", text: "Marca, modelo, orçamento, ano e o que não abre mão." },
  { icon: Search, title: "Recebe propostas", text: "Stands verificados respondem ao mesmo pedido." },
  { icon: Handshake, title: "Compara e fecha", text: "Escolhe a oferta. Sem pressão, sem voltas." },
];

const stepsStand = [
  { icon: Building2, title: "Regista o stand", text: "Alguns minutos. Depois ficas visível para quem já procura." },
  { icon: Inbox, title: "Recebe pedidos reais", text: "Clientes com carro e orçamento definidos." },
  { icon: Send, title: "Envia a proposta", text: "Disputas o negócio com a melhor oferta, não com spam." },
];

export const ComoFuncionaSection = () => {
  const scope = useGsapReveal();

  return (
  <section id="como-funciona" className="scroll-mt-24 bg-secondary py-20 md:py-28">
    <div ref={scope} className="mx-auto max-w-3xl px-6 lg:max-w-5xl">
      <div className="mb-10 max-w-xl" data-reveal>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Como funciona</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Um pedido. Várias propostas. A tua escolha.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Compradores deixam de caçar stands. Stands deixam de caçar leads frios.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <HowCard
          eyebrow="Comprador"
          title="Para quem quer um carro"
          steps={stepsComprador}
          to="/quero-carro"
          cta="Pedir propostas"
          dark
        />
        <HowCard
          eyebrow="Stand"
          title="Para quem vende carros"
          steps={stepsStand}
          to="/lojista"
          cta="Registar stand"
        />
      </div>
    </div>
  </section>
  );
};

const HowCard = ({
  eyebrow,
  title,
  steps,
  to,
  cta,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  steps: { icon: LucideIcon; title: string; text: string }[];
  to: string;
  cta: string;
  dark?: boolean;
}) => (
  <div
    data-reveal
    className={cn(
      "group relative overflow-hidden rounded-2xl p-8 shadow-soft transition duration-300 hover:-translate-y-1 md:min-h-[420px] md:p-10",
      dark
        ? "bg-primary text-primary-foreground hover:shadow-[0_20px_50px_-16px_hsl(22_100%_50%/0.45)]"
        : "border border-border bg-card hover:border-accent hover:shadow-[0_20px_50px_-16px_hsl(22_100%_50%/0.28)]",
    )}
  >
    <span
      className={cn(
        "pointer-events-none absolute -right-8 -top-8 size-40 rounded-full blur-3xl transition duration-300",
        dark ? "bg-accent/20 group-hover:bg-accent/35" : "bg-accent/10 group-hover:bg-accent/20",
      )}
    />
    <span className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-accent transition-all duration-500 group-hover:w-full" />

    <div className="relative flex h-full flex-col">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h3 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h3>

      <ul className="mt-8 flex-1 space-y-6">
        {steps.map((s) => (
          <li key={s.title} className="flex gap-4">
            <IconRing
              size="sm"
              className={
                dark
                  ? "border-white/20 before:border-white/10 [&_span]:text-accent"
                  : undefined
              }
            >
              <s.icon className="size-4" strokeWidth={1.5} />
            </IconRing>
            <div>
              <p className="font-display text-base font-medium">{s.title}</p>
              <p className={cn("mt-1 text-sm", dark ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {s.text}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        to={to}
        className={cn(
          "mt-10 inline-flex w-fit items-center gap-2 rounded-full py-1 pl-5 pr-1 text-sm font-semibold transition-all group-hover:gap-3",
          dark
            ? "bg-accent text-accent-foreground shadow-accent"
            : "bg-primary text-primary-foreground group-hover:bg-accent group-hover:text-accent-foreground",
        )}
      >
        {cta}
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition-transform group-hover:scale-110",
            dark ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground",
          )}
        >
          <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  </div>
);
