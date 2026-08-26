import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"waiting" | "ok" | "timeout">("waiting");

  useEffect(() => {
    if (!sessionId) { setStatus("timeout"); return; }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("ok"); return; } // can't verify without auth, just show success
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", session.user.id)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data && ["active", "trialing", "past_due"].includes(data.status)) {
        setStatus("ok"); return;
      }
      if (attempts > 15) { setStatus("timeout"); return; }
      setTimeout(poll, 1000);
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="container flex flex-1 items-center justify-center py-16">
        <div className="mx-auto max-w-xl rounded-3xl border bg-card p-10 text-center shadow-soft">
          {status === "waiting" ? (
            <>
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-accent" />
              <h1 className="mt-4 font-display text-2xl font-bold">A confirmar pagamento...</h1>
              <p className="mt-2 text-muted-foreground">Aguarde alguns segundos.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-accent" />
              <h1 className="mt-4 font-display text-3xl font-extrabold">
                {status === "ok" ? "Assinatura ativada!" : "Pagamento recebido"}
              </h1>
              <p className="mt-3 text-muted-foreground">
                {status === "ok"
                  ? "Já tem acesso completo aos leads."
                  : "Se não vir o estado atualizado em 1 minuto, contacte suporte."}
              </p>
              <Button variant="hero" size="xl" className="mt-8 w-full" asChild>
                <Link to="/painel">Ir para o painel</Link>
              </Button>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
