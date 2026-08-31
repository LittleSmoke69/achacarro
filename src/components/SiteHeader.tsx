import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Início", to: "/" },
  { label: "Como funciona", to: "/#como-funciona" },
  { label: "Quero um carro", to: "/quero-carro" },
  { label: "Sou stand", to: "/lojista" },
];

export const SiteHeader = ({ overlay = false }: { overlay?: boolean }) => {
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate("/");
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 md:pt-4">
        <div className="pointer-events-auto flex w-full max-w-[1100px] items-center justify-between gap-3 rounded-full border border-white/15 bg-primary/55 px-3 py-1.5 shadow-soft backdrop-blur-xl sm:px-4 md:px-5">
          <Link
            to="/"
            className="shrink-0 font-display text-base font-extrabold tracking-tight text-primary-foreground md:text-lg"
          >
            Acha<span className="text-accent">carro</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap text-primary-foreground/80 transition hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {authed ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-primary-foreground hover:bg-white/10 hover:text-accent sm:inline-flex"
                  onClick={signOut}
                >
                  Sair
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-accent px-5 font-semibold text-accent-foreground shadow-accent hover:bg-accent/90"
                  onClick={() => navigate("/painel")}
                >
                  Painel
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="rounded-full bg-accent px-5 font-semibold text-accent-foreground shadow-accent hover:bg-accent/90"
                onClick={() => navigate("/login")}
              >
                Entrar
              </Button>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground md:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-primary text-primary-foreground [&>button]:text-primary-foreground">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Link to="/" onClick={() => setOpen(false)} className="font-display text-xl font-extrabold">
                  Acha<span className="text-accent">carro</span>
                </Link>
                <nav className="mt-8 flex flex-col gap-4 text-base font-medium">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="text-primary-foreground/80 transition hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {authed && (
                    <Link to="/painel" onClick={() => setOpen(false)} className="text-primary-foreground/80 hover:text-accent">
                      Painel
                    </Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <div className={cn("shrink-0", overlay ? "h-0" : "h-[4.75rem]")} aria-hidden />
    </>
  );
};
