import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight, X, Upload } from "lucide-react";
import { DISTRITOS } from "@/lib/distritos";
import { MarcaSelect } from "@/components/MarcaSelect";

type FotoCat =
  | "frente" | "traseira" | "interior" | "painel"
  | "lateral" | "jantes" | "motor" | "porta_malas" | "teto";

type FotoItem = { file: File; cat: FotoCat };

const REQUIRED_CATS: { key: FotoCat; label: string }[] = [
  { key: "frente", label: "Frente do carro" },
  { key: "traseira", label: "Traseira do carro" },
  { key: "interior", label: "Interior" },
  { key: "painel", label: "Painel com quilometragem visível" },
];
const OPTIONAL_CATS: { key: FotoCat; label: string }[] = [
  { key: "lateral", label: "Lateral do carro" },
  { key: "jantes", label: "Jantes/pneus" },
  { key: "motor", label: "Motor" },
  { key: "porta_malas", label: "Porta-malas" },
  { key: "teto", label: "Teto" },
];

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png"];

type FormState = {
  tipo_compra: string;
  forma_pagamento: string;
  financiamento_entrada: string;
  financiamento_prestacao: string;
  situacao_residencia: string;
  situacao_profissional: string;
  situacao_profissional_outros: string;
  tem_retoma: "sim" | "nao" | "";
  retoma_marca: string;
  retoma_modelo: string;
  retoma_ano: string;
  retoma_km: string;
  retoma_combustivel: string;
  retoma_caixa: string;
  retoma_estado: string;
  retoma_valor_esperado: string;
  retoma_observacoes: string;
  retoma_tem_danos: "sim" | "nao" | "";
  tem_carro_especifico: "sim" | "nao" | "";
  nome: string; email: string; whatsapp: string; localizacao: string;
  marca: string; modelo: string; ano_min: string; ano_max: string;
  km_max: string; combustivel: string; versao: string; cor: string;
  extras: string; preco_max: string; observacoes: string;
  tipo_carro: string; marcas_preferidas: string;
};

const initial: FormState = {
  tipo_compra: "", forma_pagamento: "",
  financiamento_entrada: "", financiamento_prestacao: "",
  situacao_residencia: "", situacao_profissional: "", situacao_profissional_outros: "",
  tem_retoma: "",
  retoma_marca: "", retoma_modelo: "", retoma_ano: "", retoma_km: "",
  retoma_combustivel: "", retoma_caixa: "", retoma_estado: "",
  retoma_valor_esperado: "", retoma_observacoes: "",
  retoma_tem_danos: "",
  tem_carro_especifico: "",
  nome: "", email: "", whatsapp: "", localizacao: "",
  marca: "", modelo: "", ano_min: "", ano_max: "", km_max: "", combustivel: "",
  versao: "", cor: "", extras: "", preco_max: "", observacoes: "",
  tipo_carro: "", marcas_preferidas: "",
};

const REQUIRES_FINANCING = (fp: string) =>
  fp === "Financiamento bancário" || fp === "Parcelamento da loja";

const ANOS = Array.from({ length: new Date().getFullYear() + 1 - 1990 + 1 }, (_, i) =>
  String(new Date().getFullYear() + 1 - i)
);

const QueroCarro = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(initial);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retomaFotos, setRetomaFotos] = useState<FotoItem[]>([]);
  const [fotosDanos, setFotosDanos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aceiteRgpd, setAceiteRgpd] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setData(d => ({ ...d, [k]: v }));

  const isRevenda = data.tipo_compra === "Revenda";

  // Quando o cliente seleciona "Revenda": força pronto pagamento, sem retoma e sem financiamento.
  useEffect(() => {
    if (!isRevenda) return;
    setData(d => ({
      ...d,
      forma_pagamento: "Pronto pagamento",
      tem_retoma: "nao",
      financiamento_entrada: "",
      financiamento_prestacao: "",
      situacao_residencia: "",
      situacao_profissional: "",
      situacao_profissional_outros: "",
      retoma_marca: "", retoma_modelo: "", retoma_ano: "", retoma_km: "",
      retoma_combustivel: "", retoma_caixa: "", retoma_estado: "",
      retoma_valor_esperado: "", retoma_observacoes: "", retoma_tem_danos: "",
    }));
  }, [isRevenda]);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(1, s - 1));

  const canNext1 = !!data.tipo_compra;

  const financingOk = !REQUIRES_FINANCING(data.forma_pagamento) ||
    (!!data.financiamento_entrada && !!data.financiamento_prestacao &&
      !!data.situacao_residencia && !!data.situacao_profissional &&
      (data.situacao_profissional !== "Outra Situação" || !!data.situacao_profissional_outros.trim()));

  const totalFotos = retomaFotos.length;
  const danosOk = data.retoma_tem_danos === "nao" ||
    (data.retoma_tem_danos === "sim" && fotosDanos.length > 0);

  const retomaOk = data.tem_retoma === "nao" ||
    (data.tem_retoma === "sim" &&
      data.retoma_marca && data.retoma_modelo && data.retoma_ano &&
      totalFotos >= 4 && !!data.retoma_tem_danos && danosOk);

  const canNext2 = !!data.forma_pagamento && !!data.tem_retoma && financingOk && retomaOk;
  const canNext3 = !!data.tem_carro_especifico;

  const validateFiles = (files: File[]): File[] => {
    const ok: File[] = [];
    for (const f of files) {
      if (!ALLOWED.includes(f.type)) { toast.error(`${f.name}: apenas JPG ou PNG.`); continue; }
      if (f.size > MAX_SIZE) { toast.error(`${f.name}: máximo 10MB.`); continue; }
      ok.push(f);
    }
    return ok;
  };

  const handleCatFotos = (cat: FotoCat, files: FileList | null) => {
    if (!files) return;
    const valid = validateFiles(Array.from(files));
    setRetomaFotos(prev => [...prev, ...valid.map(file => ({ file, cat }))]);
  };

  const handleDanosFotos = (files: FileList | null) => {
    if (!files) return;
    setFotosDanos(prev => [...prev, ...validateFiles(Array.from(files))]);
  };

  const removeFoto = (i: number) => setRetomaFotos(p => p.filter((_, j) => j !== i));
  const removeDano = (i: number) => setFotosDanos(p => p.filter((_, j) => j !== i));

  const submit = async () => {
    const nome = (data.nome || "").trim();
    const email = (data.email || "").trim();
    const whatsapp = (data.whatsapp || "").trim();
    const localizacao = (data.localizacao || "").trim();
    if (!nome || !email || !whatsapp || !localizacao) {
      toast.error("Preencha os dados de contacto."); return;
    }
    if (whatsapp.replace(/\D/g, "").length < 6) {
      toast.error("Insira um número de telemóvel/WhatsApp válido (mínimo 6 dígitos)."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Insira um email válido."); return;
    }
    if (!aceiteRgpd) {
      toast.error("Tem de aceitar os Termos e a Política de Privacidade para continuar."); return;
    }
    const orcamento = Number(data.preco_max);
    if (!data.preco_max || isNaN(orcamento) || orcamento <= 0) {
      toast.error("Indique o seu orçamento máximo."); return;
    }
    setLoading(true);

    let fotosUrls: string[] = [];
    let fotosDanosUrls: string[] = [];

    const uploadOne = async (file: File, prefix = "") => {
      const path = `${prefix}${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("retoma-fotos").upload(path, file);
      if (upErr) return null;
      const { data: pub } = supabase.storage.from("retoma-fotos").getPublicUrl(path);
      return pub.publicUrl;
    };

    if (data.tem_retoma === "sim" && retomaFotos.length > 0) {
      setUploading(true);
      for (const item of retomaFotos) {
        const url = await uploadOne(item.file, `${item.cat}/`);
        if (url) fotosUrls.push(`${item.cat}|${url}`);
      }
      for (const f of fotosDanos) {
        const url = await uploadOne(f, "danos/");
        if (url) fotosDanosUrls.push(url);
      }
      setUploading(false);
    }

    const marca_modelo = data.tem_carro_especifico === "sim"
      ? `${data.marca} ${data.modelo}`.trim()
      : (data.marcas_preferidas || "Aberto a sugestões");

    const leadId = crypto.randomUUID();
    const clientToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const payload: any = {
      id: leadId,
      client_token: clientToken,
      nome, email, whatsapp, localizacao,
      tipo_compra: data.tipo_compra,
      forma_pagamento: data.forma_pagamento,
      tem_retoma: data.tem_retoma === "sim",
      tem_carro_especifico: data.tem_carro_especifico === "sim",
      marca_modelo,
      preco_max: data.preco_max ? Number(data.preco_max) : null,
      ano_min: data.ano_min ? Number(data.ano_min) : null,
      ano_max: data.ano_max ? Number(data.ano_max) : null,
      km_max: data.km_max ? Number(data.km_max) : null,
      combustivel: data.combustivel || null,
      tipo_carro: data.tipo_carro || null,
      versao: data.versao || null,
      cor: data.cor || null,
      extras: data.extras || null,
      observacoes: data.observacoes || null,
      marcas_preferidas: data.marcas_preferidas || null,
      caixa: null,
      urgencia: null,
      precisa_financiamento: REQUIRES_FINANCING(data.forma_pagamento),
    };

    if (REQUIRES_FINANCING(data.forma_pagamento)) {
      payload.financiamento_entrada = data.financiamento_entrada ? Number(data.financiamento_entrada) : null;
      payload.financiamento_prestacao = data.financiamento_prestacao ? Number(data.financiamento_prestacao) : null;
      payload.situacao_residencia = data.situacao_residencia || null;
      payload.situacao_profissional = data.situacao_profissional || null;
      payload.situacao_profissional_outros = data.situacao_profissional === "Outra Situação" ? data.situacao_profissional_outros : null;
    }

    if (data.tem_retoma === "sim") {
      payload.retoma_marca = data.retoma_marca;
      payload.retoma_modelo = data.retoma_modelo;
      payload.retoma_ano = data.retoma_ano ? Number(data.retoma_ano) : null;
      payload.retoma_km = data.retoma_km ? Number(data.retoma_km) : null;
      payload.retoma_combustivel = data.retoma_combustivel || null;
      payload.retoma_caixa = data.retoma_caixa || null;
      payload.retoma_estado = data.retoma_estado || null;
      payload.retoma_valor_esperado = data.retoma_valor_esperado ? Number(data.retoma_valor_esperado) : null;
      payload.retoma_observacoes = data.retoma_observacoes || null;
      payload.retoma_fotos = fotosUrls.length ? fotosUrls : null;
      payload.retoma_tem_danos = data.retoma_tem_danos === "sim";
      payload.retoma_fotos_danos = fotosDanosUrls.length ? fotosDanosUrls : null;
    }

    const { error } = await supabase.from("leads").insert([payload]);
    setLoading(false);
    if (error) {
      console.error("Erro insert lead:", error);
      toast.error(`Erro ao enviar pedido: ${error.message}`);
      return;
    }

    // Token-gated email triggers (no auth session for clients)
    supabase.functions.invoke("notify-system-email", { body: { event: "pedido-recebido", lead_id: leadId, client_token: clientToken } }).catch((e) => console.error("pedido-recebido email", e));
    supabase.functions.invoke("notify-system-email", { body: { event: "new-lead", lead_id: leadId, client_token: clientToken } }).catch((e) => console.error("new-lead email", e));


    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="bg-gradient-hero py-12 text-primary-foreground">
        <div className="container">
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">Encontre o seu carro</h1>
          <p className="mt-2 text-primary-foreground/80">É grátis. Stands verificados respondem com propostas.</p>
        </div>
      </section>
      <section className="container py-12">
        {sent ? (
          <div className="mx-auto max-w-xl rounded-3xl border bg-card p-10 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-14 w-14 text-accent" />
            <h2 className="mt-4 font-display text-2xl font-bold">Estamos a procurar as melhores propostas para si</h2>
            <p className="mt-2 text-muted-foreground">Em breve receberá contactos de stands no seu WhatsApp e email.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-3xl border bg-card p-8 shadow-soft md:p-10">
            <Stepper step={step} total={4} />

            {step === 1 && (
              <Step title="Tipo de compra" subtitle="Como pretende usar o carro?">
                <Choice value={data.tipo_compra} onChange={(v) => set("tipo_compra", v)}
                  options={[
                    { v: "Revenda", label: "Para revenda", desc: "Sem garantia" },
                    { v: "Uso próprio", label: "Para uso próprio", desc: "Com garantia de 18 meses" },
                  ]} />
              </Step>
            )}

            {step === 2 && (
              <Step title="Forma de pagamento" subtitle={isRevenda ? "Compra para revenda: apenas pronto pagamento." : "Como pretende pagar?"}>
                <Choice value={data.forma_pagamento} onChange={(v) => set("forma_pagamento", v)}
                  options={isRevenda ? [
                    { v: "Pronto pagamento", label: "Pronto pagamento" },
                  ] : [
                    { v: "Pronto pagamento", label: "Pronto pagamento" },
                    { v: "Financiamento bancário", label: "Financiamento bancário" },
                    { v: "Parcelamento da loja", label: "Parcelamento próprio stand" },
                  ]} />

                {!isRevenda && REQUIRES_FINANCING(data.forma_pagamento) && (
                  <div className="mt-6 space-y-5 rounded-2xl border bg-muted/30 p-5">
                    <h3 className="font-display text-lg font-bold">Dados de financiamento</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Entrada (€) *">
                        <Input type="number" value={data.financiamento_entrada} onChange={e => set("financiamento_entrada", e.target.value)} />
                      </Field>
                      <Field label="Prestação mensal desejada (€) *">
                        <Input type="number" value={data.financiamento_prestacao} onChange={e => set("financiamento_prestacao", e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Situação de residência em Portugal *">
                      <SelectBox value={data.situacao_residencia} onChange={(v) => set("situacao_residencia", v)}
                        options={["Português", "Estrangeiro com residência (título de residência)", "Estrangeiro sem residência"]} />
                    </Field>
                    <Field label="Situação profissional *">
                      <SelectBox value={data.situacao_profissional} onChange={(v) => set("situacao_profissional", v)}
                        options={["Efetivo / Contrato Sem Termo", "Contrato a Termo Certo", "Contrato a Termo Incerto", "Contrato termo indeterminado", "Trabalhador Independente / Recibos Verdes", "Empresário / Sócio-Gerente", "Funcionário Público", "Part-time", "Estudante", "Reformado", "Desempregado", "Outra Situação"]} />
                    </Field>
                    {data.situacao_profissional === "Outra Situação" && (
                      <Field label="Especifique *">
                        <Input value={data.situacao_profissional_outros} onChange={e => set("situacao_profissional_outros", e.target.value)} />
                      </Field>
                    )}
                  </div>
                )}

                {!isRevenda && (
                  <div className="mt-8 space-y-3">
                    <Label className="text-base font-semibold">Tem carro de retoma?</Label>
                    <Choice value={data.tem_retoma} onChange={(v) => set("tem_retoma", v as any)}
                      options={[{ v: "sim", label: "Sim" }, { v: "nao", label: "Não" }]} compact />
                  </div>
                )}
                {!isRevenda && data.tem_retoma === "sim" && (
                  <>
                    <div className="mt-6 grid gap-4 rounded-2xl border bg-muted/30 p-5 md:grid-cols-2">
                      <Field label="Marca *"><MarcaSelect value={data.retoma_marca} onChange={(v) => set("retoma_marca", v)} /></Field>
                      <Field label="Modelo *"><Input value={data.retoma_modelo} onChange={e => set("retoma_modelo", e.target.value)} /></Field>
                      <Field label="Ano *"><Input type="number" value={data.retoma_ano} onChange={e => set("retoma_ano", e.target.value)} /></Field>
                      <Field label="Quilometragem"><Input type="number" value={data.retoma_km} onChange={e => set("retoma_km", e.target.value)} /></Field>
                      <Field label="Combustível">
                        <SelectBox value={data.retoma_combustivel} onChange={(v) => set("retoma_combustivel", v)} options={["Gasolina","Diesel","Híbrido","Híbrido Plug-in","Elétrico","GPL","GNC","Outro"]} />
                      </Field>
                      <Field label="Caixa">
                        <SelectBox value={data.retoma_caixa} onChange={(v) => set("retoma_caixa", v)} options={["Manual","Automática"]} />
                      </Field>
                      <Field label="Estado">
                        <SelectBox value={data.retoma_estado} onChange={(v) => set("retoma_estado", v)} options={["Excelente","Bom","Razoável","Necessita reparação"]} />
                      </Field>
                      <Field label="Valor esperado (€)">
                        <Input type="number" value={data.retoma_valor_esperado} onChange={e => set("retoma_valor_esperado", e.target.value)} />
                      </Field>
                      <Field label="Observações" className="md:col-span-2">
                        <Input value={data.retoma_observacoes} onChange={e => set("retoma_observacoes", e.target.value)} />
                      </Field>
                    </div>

                    <div className="mt-6 rounded-2xl border bg-muted/30 p-5">
                      <h3 className="font-display text-lg font-bold">Envie fotos do seu carro para melhorar as propostas</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Mínimo de 4 fotos. Ideal entre 6 e 10 para receber propostas mais precisas. JPG ou PNG, até 10MB cada.
                      </p>

                      <div className="mt-4">
                        <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Fotos obrigatórias</h4>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {REQUIRED_CATS.map(c => (
                            <CatUpload key={c.key} label={c.label} required
                              count={retomaFotos.filter(f => f.cat === c.key).length}
                              onChange={(files) => handleCatFotos(c.key, files)} />
                          ))}
                        </div>
                      </div>

                      <div className="mt-5">
                        <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Fotos opcionais</h4>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {OPTIONAL_CATS.map(c => (
                            <CatUpload key={c.key} label={c.label}
                              count={retomaFotos.filter(f => f.cat === c.key).length}
                              onChange={(files) => handleCatFotos(c.key, files)} />
                          ))}
                        </div>
                      </div>

                      {retomaFotos.length > 0 && (
                        <div className="mt-5">
                          <div className="text-sm font-semibold">
                            {retomaFotos.length} foto(s) adicionada(s)
                            {retomaFotos.length < 4 && <span className="ml-2 text-destructive">(mínimo 4)</span>}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
                            {retomaFotos.map((f, i) => (
                              <PreviewTile key={i} file={f.file} caption={f.cat} onRemove={() => removeFoto(i)} />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 space-y-3 border-t pt-5">
                        <Label className="text-base font-semibold">O seu carro tem danos?</Label>
                        <Choice value={data.retoma_tem_danos} onChange={(v) => set("retoma_tem_danos", v as any)}
                          options={[{ v: "sim", label: "Sim" }, { v: "nao", label: "Não" }]} compact />
                      </div>

                      {data.retoma_tem_danos === "sim" && (
                        <div className="mt-4">
                          <Label className="text-sm font-semibold">Envie fotos dos danos (riscos, amassados, etc.) *</Label>
                          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background p-4 text-sm text-muted-foreground hover:border-accent">
                            <Upload className="h-4 w-4" /> Carregar fotos dos danos
                            <input type="file" accept="image/jpeg,image/png" multiple className="hidden"
                              onChange={(e) => handleDanosFotos(e.target.files)} />
                          </label>
                          {fotosDanos.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
                              {fotosDanos.map((f, i) => (
                                <PreviewTile key={i} file={f} caption="dano" onRemove={() => removeDano(i)} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Step>
            )}

            {step === 3 && (
              <Step title="Já tem um carro específico?" subtitle="Diga-nos se já sabe o que procura.">
                <Choice value={data.tem_carro_especifico} onChange={(v) => set("tem_carro_especifico", v as any)}
                  options={[
                    { v: "sim", label: "SIM", desc: "Quero um modelo específico" },
                    { v: "nao", label: "NÃO", desc: "Estou aberto a sugestões" },
                  ]} />
              </Step>
            )}

            {step === 4 && (
              <Step title="Detalhes finais" subtitle="Para os stands enviarem propostas certeiras.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome *"><Input value={data.nome} onChange={e => set("nome", e.target.value)} /></Field>
                  <Field label="Email *"><Input type="email" value={data.email} onChange={e => set("email", e.target.value)} /></Field>
                  <Field label="Telemóvel / WhatsApp *"><Input value={data.whatsapp} onChange={e => set("whatsapp", e.target.value)} /></Field>
                  <Field label="Distrito *">
                    <SelectBox value={data.localizacao} onChange={(v) => set("localizacao", v)} options={[...DISTRITOS]} />
                  </Field>
                </div>

                {data.tem_carro_especifico === "sim" ? (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="font-display text-lg font-bold">Carro pretendido</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Marca"><MarcaSelect value={data.marca} onChange={(v) => set("marca", v)} /></Field>
                      <Field label="Modelo"><Input value={data.modelo} onChange={e => set("modelo", e.target.value)} /></Field>
                      <Field label="Ano mínimo">
                        <SelectBox value={data.ano_min} onChange={(v) => set("ano_min", v)} options={ANOS} />
                      </Field>
                      <Field label="Ano máximo">
                        <SelectBox value={data.ano_max} onChange={(v) => set("ano_max", v)} options={ANOS} />
                      </Field>
                      <Field label="Quilometragem máxima"><Input type="number" value={data.km_max} onChange={e => set("km_max", e.target.value)} /></Field>
                      <Field label="Combustível">
                        <SelectBox value={data.combustivel} onChange={(v) => set("combustivel", v)} options={["Gasolina","Diesel","Híbrido","Híbrido Plug-in","Elétrico","GPL","GNC","Outro"]} />
                      </Field>
                      <Field label="Versão (opcional)"><Input value={data.versao} onChange={e => set("versao", e.target.value)} /></Field>
                      <Field label="Cor (opcional)"><Input value={data.cor} onChange={e => set("cor", e.target.value)} /></Field>
                      <Field label="Extras desejados"><Input placeholder="GPS, automático, etc." value={data.extras} onChange={e => set("extras", e.target.value)} /></Field>
<Field label="Orçamento máximo (€) *"><Input type="number" value={data.preco_max} onChange={e => set("preco_max", e.target.value)} /></Field>
                    </div>
                    <Field label="Observações adicionais" className="mt-4">
                      <Textarea value={data.observacoes} onChange={e => set("observacoes", e.target.value)} rows={3} />
                    </Field>
                  </div>
                ) : (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="font-display text-lg font-bold">As suas preferências</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Orçamento máximo (€) *"><Input type="number" value={data.preco_max} onChange={e => set("preco_max", e.target.value)} /></Field>
                      <Field label="Ano mínimo">
                        <SelectBox value={data.ano_min} onChange={(v) => set("ano_min", v)} options={ANOS} />
                      </Field>
                      <Field label="Quilometragem máxima"><Input type="number" value={data.km_max} onChange={e => set("km_max", e.target.value)} /></Field>
                      <Field label="Combustível">
                        <SelectBox value={data.combustivel} onChange={(v) => set("combustivel", v)} options={["Indiferente","Gasolina","Diesel","Híbrido","Híbrido Plug-in","Elétrico","GPL","GNC","Outro"]} />
                      </Field>
                      <Field label="Tipo de carro">
                        <SelectBox value={data.tipo_carro} onChange={(v) => set("tipo_carro", v)} options={["Citadino","Sedan","SUV","Familiar","Carrinha","Coupé","Comercial"]} />
                      </Field>
                      <Field label="Preferência de marcas (opcional)"><Input value={data.marcas_preferidas} onChange={e => set("marcas_preferidas", e.target.value)} /></Field>
                    </div>
                    <Field label="Observações adicionais" className="mt-4">
                      <Textarea value={data.observacoes} onChange={e => set("observacoes", e.target.value)} rows={3} />
                    </Field>
                  </div>
                )}
              </Step>
            )}

            {step === 4 && (
              <div className="mt-8 rounded-xl border bg-muted/30 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={aceiteRgpd}
                    onCheckedChange={(v) => setAceiteRgpd(v === true)}
                    className="mt-1"
                  />
                  <span className="text-sm leading-relaxed text-foreground">
                    Declaro que li e aceito os{" "}
                    <a href="/termos-condicoes" target="_blank" rel="noopener noreferrer" className="underline font-medium">Termos e Condições</a>
                    {" "}e a{" "}
                    <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer" className="underline font-medium">Política de Privacidade</a>
                    {" "}da AchaCarro.pt, autorizando o tratamento dos meus dados para contacto comercial por stands e parceiros automóveis, incluindo contacto por telemóvel, WhatsApp, email ou telefone, nos termos do RGPD.
                  </span>
                </label>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <Button variant="outline" onClick={back}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
              ) : <div />}
              {step < 4 && (
                <Button variant="hero" size="lg" onClick={next}
                  disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2) || (step === 3 && !canNext3)}>
                  Continuar <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              {step === 4 && (
                <Button variant="hero" size="lg" onClick={submit} disabled={loading || uploading || !aceiteRgpd}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploading ? "A carregar fotos..." : "A enviar..."}</> : "Enviar pedido grátis"}
                </Button>
              )}
            </div>

            {step === 4 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                🔒 Os seus dados estão protegidos e serão utilizados apenas para envio de propostas de stands parceiros.
              </p>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
};

const Stepper = ({ step, total }: { step: number; total: number }) => (
  <div className="mb-8 flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-accent" : "bg-muted"}`} />
    ))}
    <span className="ml-3 text-sm font-medium text-muted-foreground">{step}/{total}</span>
  </div>
);

const Step = ({ title, subtitle, children }: any) => (
  <div>
    <h2 className="font-display text-2xl font-bold">{title}</h2>
    {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    <div className="mt-6">{children}</div>
  </div>
);

const Choice = ({ value, onChange, options, compact }: {
  value: string; onChange: (v: string) => void;
  options: { v: string; label: string; desc?: string }[]; compact?: boolean;
}) => (
  <div className={`grid gap-3 ${compact ? "grid-cols-2" : "md:grid-cols-2"}`}>
    {options.map(o => {
      const active = value === o.v;
      return (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`rounded-2xl border-2 p-5 text-left transition-all ${active ? "border-accent bg-accent/5 shadow-soft" : "border-border hover:border-accent/50"}`}>
          <div className="font-display text-lg font-bold">{o.label}</div>
          {o.desc && <div className="mt-1 text-sm text-muted-foreground">{o.desc}</div>}
        </button>
      );
    })}
  </div>
);

const Field = ({ label, children, className = "" }: any) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label className="text-sm font-semibold">{label}</Label>
    {children}
  </div>
);

const SelectBox = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
    <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
  </Select>
);

const CatUpload = ({ label, count, required, onChange }: {
  label: string; count: number; required?: boolean;
  onChange: (files: FileList | null) => void;
}) => (
  <label className={`flex cursor-pointer flex-col items-start gap-1 rounded-md border-2 border-dashed p-3 text-sm transition-colors hover:border-accent ${count > 0 ? "border-accent bg-accent/5" : "border-border bg-background"}`}>
    <span className="flex w-full items-center justify-between font-semibold">
      <span>{label} {required && <span className="text-destructive">*</span>}</span>
      {count > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{count}</span>}
    </span>
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Upload className="h-3 w-3" /> Carregar foto(s)
    </span>
    <input type="file" accept="image/jpeg,image/png" multiple className="hidden"
      onChange={(e) => onChange(e.target.files)} />
  </label>
);

const PreviewTile = ({ file, caption, onRemove }: { file: File; caption: string; onRemove: () => void }) => {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  return (
    <div className="relative aspect-square overflow-hidden rounded-md border">
      <img src={url} alt={caption} className="h-full w-full object-cover" />
      <span className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5 text-[10px] font-medium capitalize">{caption.replace("_", " ")}</span>
      <button type="button" onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export default QueroCarro;
