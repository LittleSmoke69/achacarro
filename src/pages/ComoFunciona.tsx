import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Car, Search, Handshake, Building2, Inbox, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Step = ({ n, icon: Icon, title, text }: any) => (
  <div className="flex gap-5">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground font-bold">{n}</div>
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        <h4 className="font-display text-lg font-bold">{title}</h4>
      </div>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </div>
  </div>
);

const ComoFunciona = () => (
  <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <section className="bg-gradient-hero py-16 text-primary-foreground">
      <div className="container text-center">
        <h1 className="font-display text-4xl font-extrabold md:text-5xl">Como funciona</h1>
        <p className="mt-3 text-primary-foreground/80">Tudo o que precisa de saber para começar.</p>
      </div>
    </section>
    <section className="container grid gap-12 py-20 md:grid-cols-2">
      <div className="rounded-3xl border bg-card p-10 shadow-soft">
        <h2 className="font-display text-2xl font-bold">Para compradores</h2>
        <div className="mt-8 space-y-7">
          <Step n={1} icon={Car} title="Informe o carro que deseja" text="Marca, modelo, preço, ano e preferências." />
          <Step n={2} icon={Search} title="Receba propostas" text="Vários stands verificados respondem rapidamente." />
          <Step n={3} icon={Handshake} title="Compare e escolha" text="Escolha a proposta que melhor se adapta a si." />
        </div>
        <Button asChild variant="hero" size="lg" className="mt-8 w-full"><Link to="/quero-carro">Começar agora</Link></Button>
      </div>
      <div className="rounded-3xl border bg-card p-10 shadow-soft">
        <h2 className="font-display text-2xl font-bold">Para stands</h2>
        <div className="mt-8 space-y-7">
          <Step n={1} icon={Building2} title="Registe a sua empresa" text="Em poucos minutos, sem complicações." />
          <Step n={2} icon={Inbox} title="Receba pedidos reais" text="Clientes qualificados a procurar carro." />
          <Step n={3} icon={Send} title="Envie propostas e feche negócios" text="Apresente a melhor proposta e aumente as suas vendas." />
        </div>
        <Button asChild variant="accent" size="lg" className="mt-8 w-full"><Link to="/lojista">Registar stand</Link></Button>
      </div>
    </section>
    <SiteFooter />
  </div>
);

export default ComoFunciona;
