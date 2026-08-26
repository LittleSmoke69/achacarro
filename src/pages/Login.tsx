import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate("/painel");
  };

  const onForgot = async () => {
    if (!resetEmail) { toast.error("Insira o email"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Email de recuperação enviado");
    setForgotOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="container flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-md space-y-5 rounded-3xl border bg-card p-8 shadow-soft">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Entrar como stand</h1>
            <p className="mt-1 text-sm text-muted-foreground">Aceda ao seu painel de leads</p>
          </div>

          {!forgotOpen ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label><Input name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><Label>Senha</Label>
                  <button type="button" className="text-xs text-accent hover:underline" onClick={() => setForgotOpen(true)}>Esqueci</button>
                </div>
                <PasswordInput name="password" required />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "A entrar..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email para recuperação</Label>
                <Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setForgotOpen(false)}>Voltar</Button>
                <Button variant="hero" className="flex-1" onClick={onForgot}>Enviar</Button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta? <Link to="/lojista" className="font-semibold text-accent hover:underline">Registar</Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
};

export default Login;
