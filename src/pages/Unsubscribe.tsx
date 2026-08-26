import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "ready" | "already" | "invalid" | "done" | "error">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setState("invalid"); return; }
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: ANON },
        });
        const data = await res.json();
        if (!res.ok) { setState("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") setState("already");
        else if (data.valid) setState("ready");
        else setState("invalid");
      } catch { setState("error"); }
    })();
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    if (error) { setState("error"); return; }
    if (data?.success) setState("done");
    else if (data?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-soft">
          {state === "loading" && <p className="text-muted-foreground">A validar…</p>}
          {state === "invalid" && <>
            <h1 className="font-display text-2xl font-bold">Link inválido</h1>
            <p className="mt-2 text-muted-foreground">Este link de cancelamento não é válido ou expirou.</p>
          </>}
          {state === "already" && <>
            <h1 className="font-display text-2xl font-bold">Já cancelaste a subscrição</h1>
            <p className="mt-2 text-muted-foreground">Não vais receber mais emails neste endereço.</p>
          </>}
          {state === "ready" && <>
            <h1 className="font-display text-2xl font-bold">Cancelar subscrição</h1>
            <p className="mt-2 text-muted-foreground">Confirma para deixar de receber emails do Achacarro.</p>
            <Button variant="hero" className="mt-6" disabled={busy} onClick={confirm}>
              {busy ? "A processar…" : "Confirmar cancelamento"}
            </Button>
          </>}
          {state === "done" && <>
            <h1 className="font-display text-2xl font-bold">Subscrição cancelada</h1>
            <p className="mt-2 text-muted-foreground">Lamentamos ver-te partir. Não receberás mais emails.</p>
          </>}
          {state === "error" && <>
            <h1 className="font-display text-2xl font-bold">Ocorreu um erro</h1>
            <p className="mt-2 text-muted-foreground">Tenta novamente mais tarde.</p>
          </>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Unsubscribe;
