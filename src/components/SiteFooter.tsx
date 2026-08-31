import { Link } from "react-router-dom";
import { Instagram, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { MagneticPill } from "@/components/footer/magnetic-pill";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.1 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.9a4.85 4.85 0 0 1-1.14-.21z" />
  </svg>
);

const marquee = ["AchaCarro.pt", "O carro certo", "As melhores propostas", "Stands verificados"];

const legal = [
  { to: "/politica-privacidade", label: "Privacidade" },
  { to: "/termos-condicoes", label: "Termos" },
  { to: "/politica-cookies", label: "Cookies" },
  { to: "/rgpd", label: "RGPD" },
];

export const SiteFooter = () => (
  <footer className="relative isolate overflow-hidden bg-primary text-primary-foreground">
    <div className="footer-grid pointer-events-none absolute inset-0 opacity-40" />
    <div className="pointer-events-none absolute -left-16 top-0 size-40 rounded-full bg-accent/20 blur-[70px]" />
    <div className="pointer-events-none absolute -right-10 bottom-0 size-36 rounded-full bg-accent/15 blur-[70px]" />

    <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.04] py-1.5">
      <div className="animate-footer-marquee flex w-max gap-8 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/50">
        {[...marquee, ...marquee, ...marquee, ...marquee].map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-8">
            {item}
            <span className="text-accent">●</span>
          </span>
        ))}
      </div>
    </div>

    <div className="container relative py-8 md:py-10">
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="font-display text-lg font-bold tracking-tight">
            Acha<span className="text-accent">carro</span>
            <span className="text-primary-foreground/50">.pt</span>
          </p>
          <p className="mt-1 text-sm text-primary-foreground/65">O carro certo, as melhores propostas.</p>
          <div className="mt-4 flex items-center gap-2">
            <MagneticPill href="https://www.instagram.com/achacarro.pt/" label="Instagram">
              <Instagram className="h-4 w-4" />
            </MagneticPill>
            <MagneticPill href="https://www.tiktok.com/@achacarro.pt" label="TikTok">
              <TikTokIcon className="h-4 w-4" />
            </MagneticPill>
            <MagneticPill href="https://www.youtube.com/@Achacarropt" label="YouTube">
              <Youtube className="h-4 w-4" />
            </MagneticPill>
          </div>
        </div>

        <div className="md:col-span-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Contacto</h4>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>Rua José Laranjeira, 482 · 3140-166 Meãs do Campo</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-accent" />
              <a href="tel:+351968604407" className="transition hover:text-accent">+351 968 604 407</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-accent" />
              <a href="mailto:geral@achacarro.pt" className="transition hover:text-accent">geral@achacarro.pt</a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Navegar</h4>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-primary-foreground/80">
            <li><Link to="/quero-carro" className="transition hover:text-accent">Quero um carro</Link></li>
            <li><Link to="/lojista" className="transition hover:text-accent">Sou stand</Link></li>
            <li><Link to="/#como-funciona" className="transition hover:text-accent">Como funciona</Link></li>
            {legal.map((l) => (
              <li key={l.to}><Link to={l.to} className="transition hover:text-accent">{l.label}</Link></li>
            ))}
            <li>
              <a href="https://www.livroreclamacoes.pt/inicio" target="_blank" rel="noopener noreferrer" className="transition hover:text-accent">
                Livro de Reclamações
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] text-primary-foreground/45 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} AchaCarro LDA · NIF 316232122</p>
        <p className="max-w-xl sm:text-right">
          Ao enviar dados neste site, concorda com o tratamento para propostas e contacto comercial, nos termos do RGPD.
        </p>
      </div>
    </div>
  </footer>
);
