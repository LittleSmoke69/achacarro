import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Car, Search, Store, ShieldCheck, Zap, Handshake } from "lucide-react";
import hero from "@/assets/hero-car.jpg";

const Index = () => (
  <div className="flex min-h-screen flex-col">
    <SiteHeader />

    {/* HERO */}
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      <div className="container relative z-10 grid gap-12 py-20 md:grid-cols-2 md:py-28 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Zap className="h-3.5 w-3.5" /> Stands verificados
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Quer comprar um carro <span className="text-accent">sem perder tempo?</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-primary-foreground/80">
            Diga o que você procura e receba propostas de stands verificados.
            Compare, escolha e feche o melhor negócio.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="hero" size="xl">
              <Link to="/quero-carro">Quero encontrar um carro <ArrowRight /></Link>
            </Button>
            <Button asChild variant="heroOutline" size="xl">
              <Link to="/lojista">Sou stand de automóveis</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-primary-foreground/70">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Stands verificados</div>
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> Resposta em 24h</div>
            <div className="flex items-center gap-2"><Handshake className="h-4 w-4 text-accent" /> Sem compromisso</div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-accent/20 blur-3xl" />
          <img src={hero} alt="Encontre o carro certo" className="relative rounded-3xl shadow-soft" />
        </div>
      </div>
    </section>

    {/* HOW */}
    <section className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Simples como deve ser</h2>
        <p className="mt-3 text-muted-foreground">Três passos para encontrar o carro certo.</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          { icon: Car, title: "Diga o que procura", text: "Marca, modelo, preço, ano e mais." },
          { icon: Search, title: "Receba propostas", text: "Vários stands competem por si." },
          { icon: Handshake, title: "Escolha a melhor", text: "Compare e feche negócio." },
        ].map((s, i) => (
          <div key={i} className="group relative rounded-2xl border bg-card p-8 shadow-soft transition hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
              <s.icon className="h-6 w-6" />
            </div>
            <div className="mt-2 text-sm font-semibold text-accent">PASSO {i + 1}</div>
            <h3 className="mt-1 font-display text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>
    </section>

    {/* CTA dual */}
    <section className="bg-secondary py-20">
      <div className="container grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-gradient-hero p-10 text-primary-foreground shadow-soft">
          <Car className="h-10 w-10 text-accent" />
          <h3 className="mt-4 font-display text-2xl font-bold">Sou comprador</h3>
          <p className="mt-2 text-primary-foreground/80">Diga o carro dos seus sonhos e deixe que os melhores stands o encontrem por si.</p>
          <Button asChild variant="hero" size="lg" className="mt-6">
            <Link to="/quero-carro">Quero encontrar um carro <ArrowRight /></Link>
          </Button>
        </div>
        <div className="rounded-3xl border-2 border-accent bg-card p-10 shadow-soft">
          <Store className="h-10 w-10 text-accent" />
          <h3 className="mt-4 font-display text-2xl font-bold">Sou stand de automóveis</h3>
          <p className="mt-2 text-muted-foreground">Registre o seu stand e comece a receber oportunidades de clientes interessados em comprar carro.</p>
          <Button asChild variant="accent" size="lg" className="mt-6">
            <Link to="/lojista">Registar o meu stand <ArrowRight /></Link>
          </Button>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
);

export default Index;
