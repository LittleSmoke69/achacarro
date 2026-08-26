import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SiteHeader = () => {
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Logo className="h-10" />
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/" className="text-foreground/80 hover:text-accent transition">Início</Link>
          <Link to="/como-funciona" className="text-foreground/80 hover:text-accent transition">Como funciona</Link>
          <Link to="/quero-carro" className="text-foreground/80 hover:text-accent transition">Quero um carro</Link>
          <Link to="/lojista" className="text-foreground/80 hover:text-accent transition">Sou stand de automóveis</Link>
        </nav>
        <div className="flex items-center gap-2">
          {authed ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/painel")}>Painel</Button>
              <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>Sair</Button>
            </>
          ) : (
            <Button variant="accent" onClick={() => navigate("/login")}>Entrar</Button>
          )}
        </div>
      </div>
    </header>
  );
};
