import { Card, CardContent } from "@/components/ui/card";
import { IconRing } from "@/components/ui/icon-ring";
import { CompareSpark, ProposalBars, StatUnderline } from "@/components/ui/features-8-art";
import { Shield, Clock, BadgeCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useGsapReveal } from "@/hooks/use-gsap-reveal";

const proposals = [
  { label: "A", name: "Proposta A", value: "18 900 €", align: "end" as const },
  { label: "B", name: "Proposta B", value: "19 450 €", align: "start" as const },
  { label: "C", name: "Proposta C", value: "18 200 €", align: "end" as const },
];

export function Features() {
  const scope = useGsapReveal();

  return (
    <section className="bg-secondary pb-20 pt-8 md:pb-28 md:pt-12">
      <div ref={scope} className="mx-auto max-w-3xl px-6 lg:max-w-5xl">
        <div className="mb-10 max-w-xl" data-reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Porquê a AchaCarro</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Diga o que quer. Os stands tratam do resto.
          </h2>
        </div>

        <div className="relative z-10 grid grid-cols-6 gap-3">
          <Card className="relative col-span-full overflow-hidden lg:col-span-2" data-reveal>
            <CardContent className="relative m-auto size-fit pt-6">
              <div className="relative flex h-24 w-56 items-center">
                <StatUnderline />
                <span className="mx-auto block w-fit font-display text-5xl font-semibold text-primary">24h</span>
              </div>
              <h3 className="mt-6 text-center font-display text-2xl font-semibold">Resposta rápida</h3>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2" data-reveal>
            <CardContent className="pt-6">
              <div className="relative mx-auto flex aspect-square size-32 rounded-full border border-border before:absolute before:-inset-2 before:rounded-full before:border before:border-border/70">
                <BadgeCheck className="m-auto size-12 text-accent" strokeWidth={1.25} />
              </div>
              <div className="relative z-10 mt-6 space-y-2 text-center">
                <h3 className="font-display text-lg font-medium">Stands verificados</h3>
                <p className="text-sm text-muted-foreground">
                  Só empresas validadas enviam propostas. Sem anúncios soltos, sem intermediários opacos.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2" data-reveal>
            <CardContent className="pt-6">
              <div className="px-2 pt-4">
                <CompareSpark />
              </div>
              <div className="relative z-10 mt-8 space-y-2 text-center">
                <h3 className="font-display text-lg font-medium">Compare lado a lado</h3>
                <p className="text-sm text-muted-foreground">
                  Preço, ano e condições no mesmo sítio. Escolhe a proposta, não o stand mais insistente.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden lg:col-span-3" data-reveal>
            <CardContent className="grid pt-6 sm:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-between space-y-10 lg:space-y-6">
                <IconRing>
                  <Shield className="size-5" strokeWidth={1.25} />
                </IconRing>
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-medium">Sem compromisso</h3>
                  <p className="text-sm text-muted-foreground">
                    Pede propostas à vontade. Só avanças quando a oferta fizer sentido.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 h-fit rounded-tl-[var(--radius)] border-l border-t p-6 sm:ml-6 sm:-mb-6 sm:-mr-6">
                <div className="absolute left-3 top-2 flex gap-1">
                  <span className="block size-2 rounded-full border border-border bg-muted" />
                  <span className="block size-2 rounded-full border border-border bg-muted" />
                  <span className="block size-2 rounded-full border border-border bg-muted" />
                </div>
                <div className="pt-4">
                  <ProposalBars />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden lg:col-span-3" data-reveal>
            <CardContent className="grid h-full pt-6 sm:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-between space-y-10 lg:space-y-6">
                <IconRing>
                  <Clock className="size-5" strokeWidth={1.25} />
                </IconRing>
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-medium">Vários stands, um pedido</h3>
                  <p className="text-sm text-muted-foreground">
                    Um único pedido chega a stands diferentes. Eles competem. Tu escolhes.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-border sm:-my-6 sm:-mr-6">
                <div className="relative flex h-full flex-col justify-center space-y-5 py-6">
                  {proposals.map((p) => (
                    <div
                      key={p.name}
                      className={
                        p.align === "end"
                          ? "relative flex w-[calc(50%+0.875rem)] items-center justify-end gap-2"
                          : "relative ml-[calc(50%-1rem)] flex items-center gap-2"
                      }
                    >
                      {p.align === "start" && <Initials mark={p.label} />}
                      <span className="block h-fit rounded-md border border-border bg-background px-2 py-1 text-xs shadow-sm">
                        {p.name} · {p.value}
                      </span>
                      {p.align === "end" && <Initials mark={p.label} />}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 md:gap-5">
          <Link
            to="/quero-carro"
            className="group relative col-span-1 overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-16px_hsl(22_100%_50%/0.45)] md:min-h-[280px] md:p-10"
            data-reveal
          >
            <span className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-accent/20 blur-3xl transition duration-300 group-hover:bg-accent/35" />
            <span className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-accent transition-all duration-500 group-hover:w-full" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Comprador</p>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">
                  Quero encontrar um carro
                </h3>
                <p className="mt-3 max-w-sm text-base text-primary-foreground/75">
                  Diz marca, orçamento e prazos. As propostas chegam até ti.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent py-1 pl-5 pr-1 text-sm font-semibold text-accent-foreground shadow-accent transition-all group-hover:gap-3">
                Começar pedido
                <span className="flex size-10 items-center justify-center rounded-full bg-primary transition-transform group-hover:scale-110">
                  <ArrowRight className="size-4 text-primary-foreground" />
                </span>
              </span>
            </div>
          </Link>

          <Link
            to="/lojista"
            className="group relative col-span-1 overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_20px_50px_-16px_hsl(22_100%_50%/0.28)] md:min-h-[280px] md:p-10"
            data-reveal
          >
            <span className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-accent/10 blur-3xl transition duration-300 group-hover:bg-accent/20" />
            <span className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-accent transition-all duration-500 group-hover:w-full" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Stand</p>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">
                  Quero receber pedidos
                </h3>
                <p className="mt-3 max-w-sm text-base text-muted-foreground">
                  Clientes já a procurar. Envias a proposta e disputas o negócio.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary py-1 pl-5 pr-1 text-sm font-semibold text-primary-foreground transition-all group-hover:gap-3 group-hover:bg-accent group-hover:text-accent-foreground">
                Registar o stand
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowRight className="size-4" />
                </span>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

const Initials = ({ mark }: { mark: string }) => (
  <div className="flex size-8 items-center justify-center rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground ring-4 ring-background">
    {mark}
  </div>
);
