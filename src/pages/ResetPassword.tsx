import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase hash includes type=recovery on password recovery links.
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    }
  }, []);

  const submit = async () => {
    if (password.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada");
    navigate("/painel");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="container flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-md space-y-5 rounded-3xl border bg-card p-8 shadow-soft">
          <h1 className="font-display text-2xl font-bold text-center">Nova senha</h1>
          {ready ? (
            <>
              <div className="space-y-1.5">
                <Label>Nova senha (mín. 8)</Label>
                <PasswordInput value={password} onChange={e => setPassword(e.target.value)} minLength={8} />
              </div>
              <Button variant="hero" size="lg" className="w-full" onClick={submit} disabled={loading}>
                {loading ? "A guardar..." : "Atualizar senha"}
              </Button>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Link inválido ou expirado.</p>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
