import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormPage } from "@/components/forms/form-page";
import { Button } from "@/components/ui/button";
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
    <FormPage
      eyebrow="Acesso"
      title="Nova senha"
      subtitle="Defina uma senha com pelo menos 8 caracteres."
      maxWidth="max-w-md"
    >
      {ready ? (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Nova senha (mín. 8)</Label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
          </div>
          <Button variant="hero" size="lg" className="w-full rounded-full" onClick={submit} disabled={loading}>
            {loading ? "A guardar..." : "Atualizar senha"}
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Link inválido ou expirado.</p>
      )}
    </FormPage>
  );
}
