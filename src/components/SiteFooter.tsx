import { Link } from "react-router-dom";
import { Instagram, Youtube, Mail, Phone, MapPin } from "lucide-react";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.1 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.9a4.85 4.85 0 0 1-1.14-.21z" />
  </svg>
);

export const SiteFooter = () => (
  <footer className="border-t border-border/60 bg-primary text-primary-foreground">
    <div className="container py-12">
      <div className="grid gap-10 md:grid-cols-4">
        {/* Brand + RGPD */}
        <div className="md:col-span-2">
          <p className="font-display text-xl font-bold">
            AchaCarro<span className="text-accent">.pt</span>
          </p>
          <p className="mt-2 text-sm text-primary-foreground/70">
            O carro certo, as melhores propostas.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-primary-foreground/60">
            Ao utilizar este website e enviar os seus dados, concorda com o tratamento das
            informações fornecidas para efeitos de contacto comercial, apresentação de propostas
            e comunicações relacionadas com os serviços da AchaCarro.pt, nos termos da legislação
            RGPD em vigor.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://www.instagram.com/achacarro.pt/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 transition hover:bg-accent hover:text-accent-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://www.tiktok.com/@achacarro.pt"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 transition hover:bg-accent hover:text-accent-foreground"
            >
              <TikTokIcon className="h-4 w-4" />
            </a>
            <a
              href="https://www.youtube.com/@Achacarropt"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 transition hover:bg-accent hover:text-accent-foreground"
            >
              <Youtube className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-accent">
            Contacto
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>
                Rua José Laranjeira, 482, Coutada<br />
                3140-166 Meãs do Campo – Portugal
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-accent" />
              <a href="tel:+351968604407" className="hover:text-accent">+351 968 604 407</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-accent" />
              <a href="mailto:geral@achacarro.pt" className="hover:text-accent">geral@achacarro.pt</a>
            </li>
            <li className="pt-1 text-xs text-primary-foreground/60">
              AchaCarro LDA<br />
              NIF: 316232122
            </li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-accent">
            Links importantes
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/politica-privacidade" className="hover:text-accent">Política de Privacidade</Link></li>
            <li><Link to="/termos-condicoes" className="hover:text-accent">Termos e Condições</Link></li>
            <li><Link to="/politica-cookies" className="hover:text-accent">Política de Cookies</Link></li>
            <li><Link to="/rgpd" className="hover:text-accent">Gestão de Consentimento RGPD/LGPD</Link></li>
            <li>
              <a
                href="https://www.livroreclamacoes.pt/inicio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent"
              >
                Livro de Reclamações Online
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} AchaCarro.pt — Todos os direitos reservados.
      </div>
    </div>
  </footer>
);
