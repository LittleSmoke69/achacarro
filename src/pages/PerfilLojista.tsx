import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DISTRITOS } from "@/lib/distritos";
import { isValidEmail, isValidPtPhone, normalizePtPhone, formatPtPhoneDisplay } from "@/lib/contact";

const TIPOS = ["SUV", "Citadino", "Comercial", "Familiar", "Desportivo"];
const FAIXAS = ["Até 10k€", "10k–20k€", "20k–40k€", "40k€+"];

export default function PerfilLojista() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data } = await supabase.from("lojistas").select("*").eq("id", session.user.id).maybeSingle();
      if (!data) { navigate("/lojista"); return; }
      setD({ ...data, tipos_carro_arr: (data.tipos_carro || "").split(",").map((s: string) => s.trim()).filter(Boolean) });
      setLoading(false);
    })();
  }, [navigate]);

  const set = (k: string, v: any) => setD((p: any) => ({ ...p, [k]: v }));

  const toggleTipo = (t: string) => {
    const arr: string[] = d.tipos_carro_arr || [];
    set("tipos_carro_arr", arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t]);
  };

  const save = async () => {
    const missing: string[] = [];
    if (!d.empresa?.trim()) missing.push("Empresa");
    if (!d.nome_responsavel?.trim()) missing.push("Responsável");
    if (!isValidEmail(d.email)) missing.push("Email");
    const normalizedWa = normalizePtPhone(d.whatsapp);
    if (!normalizedWa) missing.push("WhatsApp (9 dígitos PT)");
    if (!d.localizacao?.trim()) missing.push("Distrito");
    if (!d.marcas?.trim()) missing.push("Marcas");
    if (!d.faixa_preco?.trim()) missing.push("Faixa de preço");
    const tipos = (d.tipos_carro_arr || []).join(", ");
    if (!tipos) missing.push("Tipos de carro");
    if (missing.length) { toast.error("Campos em falta: " + missing.join(", ")); return; }
    setSaving(true);
    const { error } = await supabase.from("lojistas").update({
      empresa: d.empresa, nome_responsavel: d.nome_responsavel,
      whatsapp: normalizedWa, telefone: d.telefone, website: d.website || null,
      localizacao: d.localizacao, regiao: d.localizacao,
      marcas: d.marcas, faixa_preco: d.faixa_preco,
      tipos_carro: tipos, tipo_veiculos: tipos,
      faz_financiamento: !!d.faz_financiamento, aceita_retoma: !!d.aceita_retoma,
      tem_garantia: !!d.tem_garantia, aceita_particular: !!d.aceita_particular,
      aceita_revenda: !!d.aceita_revenda,
    }).eq("id", d.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    set("whatsapp", normalizedWa);
    toast.success("Perfil atualizado");

    // Decidir destino: se já tem acesso ativo → painel; caso contrário → painel com checkout aberto
    const { data: lj } = await supabase.from("lojistas")
      .select("subscription_active,trial_ends_at,status").eq("id", d.id).maybeSingle();
    const now = Date.now();
    const trialOk = lj?.trial_ends_at && new Date(lj.trial_ends_at).getTime() > now;
    const hasAccess = lj?.status !== "rejeitado" && !!lj?.subscription_active && trialOk;
    navigate(hasAccess ? "/painel" : "/painel?checkout=1");
  };

  const waInvalid = !!d?.whatsapp && !isValidPtPhone(d.whatsapp);

  if (loading || !d) return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <SiteHeader />
      <section className="container max-w-3xl py-10">
        <h1 className="mb-6 font-display text-3xl font-extrabold">Editar perfil</h1>
        <div className="space-y-5 rounded-3xl border bg-card p-6 shadow-soft md:p-10">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Empresa"><Input value={d.empresa || ""} onChange={e => set("empresa", e.target.value)} /></Field>
            <Field label="Responsável"><Input value={d.nome_responsavel || ""} onChange={e => set("nome_responsavel", e.target.value)} /></Field>
            <Field label="Email"><Input value={d.email || ""} disabled /></Field>
            <Field label="WhatsApp">
              <Input
                value={d.whatsapp || ""}
                onChange={e => set("whatsapp", e.target.value)}
                onBlur={e => { const n = normalizePtPhone(e.target.value); if (n) set("whatsapp", formatPtPhoneDisplay(n)); }}
                placeholder="+351 912 345 678"
                aria-invalid={waInvalid}
                className={waInvalid ? "border-destructive" : ""}
              />
              {waInvalid && <p className="mt-1 text-xs text-destructive">Número PT inválido (9 dígitos).</p>}
            </Field>
            <Field label="Telefone"><Input value={d.telefone || ""} onChange={e => set("telefone", e.target.value)} /></Field>
            <Field label="Website"><Input value={d.website || ""} onChange={e => set("website", e.target.value)} /></Field>
            <Field label="Distrito">
              <Select value={d.localizacao || ""} onValueChange={v => set("localizacao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISTRITOS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Faixa preço">
              <Select value={d.faixa_preco || ""} onValueChange={v => set("faixa_preco", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FAIXAS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Marcas"><Input value={d.marcas || ""} onChange={e => set("marcas", e.target.value)} /></Field>
          <div>
            <Label className="text-sm font-semibold">Tipos de carro</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              {TIPOS.map(t => (
                <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${(d.tipos_carro_arr || []).includes(t) ? "border-accent bg-accent/10" : ""}`}>
                  <Checkbox checked={(d.tipos_carro_arr || []).includes(t)} onCheckedChange={() => toggleTipo(t)} />{t}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["faz_financiamento", "Aceita financiamento"],
              ["aceita_retoma", "Aceita retoma"],
              ["tem_garantia", "Trabalha com garantia"],
              ["aceita_particular", "Recebe particulares"],
              ["aceita_revenda", "Recebe revenda"],
            ].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <Checkbox checked={!!d[k as string]} onCheckedChange={v => set(k as string, !!v)} />{l}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate("/painel")}>Voltar</Button>
            <Button variant="hero" onClick={save} disabled={saving}>{saving ? "A guardar..." : "Guardar"}</Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

const Field = ({ label, children }: any) => (
  <div className="space-y-1.5"><Label className="text-sm font-semibold">{label}</Label>{children}</div>
);
