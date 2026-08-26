import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Upload, ShieldCheck } from "lucide-react";
import { DISTRITOS } from "@/lib/distritos";

type FormState = {
  // Passo 1 - Empresa
  empresa: string;
  nome_responsavel: string;
  email: string;
  password: string;
  telefone: string;
  whatsapp: string;
  nif: string;
  distrito: string;
  website: string;
  // Passo 2 - Documentos (File)
  doc_atividade: File | null;
  doc_responsavel: File | null;
  doc_morada: File | null;
  doc_fachada: File | null;
  // Passo 3 - Perfil
  marcas: string;
  faixa_preco: string;
  tipos_carro: string[];
  // Passo 4 - Condições
  faz_financiamento: boolean;
  financiamento_proprio: boolean;
  aceita_retoma: boolean;
  tem_garantia: boolean;
  // Passo 5 - Leads
  aceita_particular: boolean;
  aceita_revenda: boolean;
};

const initial: FormState = {
  empresa: "", nome_responsavel: "", email: "", password: "", telefone: "", whatsapp: "",
  nif: "", distrito: "", website: "",
  doc_atividade: null, doc_responsavel: null, doc_morada: null, doc_fachada: null,
  marcas: "", faixa_preco: "", tipos_carro: [],
  faz_financiamento: false, financiamento_proprio: false, aceita_retoma: false, tem_garantia: false,
  aceita_particular: true, aceita_revenda: false,
};

const TIPOS = ["SUV", "Citadino", "Comercial", "Familiar", "Desportivo"];
const FAIXAS = ["Até 10k€", "10k–20k€", "20k–40k€", "40k€+"];

const Lojista = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setData(p => ({ ...p, [k]: v }));

  const toggleTipo = (t: string) => {
    set("tipos_carro", data.tipos_carro.includes(t)
      ? data.tipos_carro.filter(x => x !== t)
      : [...data.tipos_carro, t]);
  };

  const validate = (): string | null => {
    if (step === 1) {
      if (!data.empresa || !data.nome_responsavel || !data.email || !data.password
          || !data.whatsapp || !data.nif || !data.distrito)
        return "Preencha todos os campos obrigatórios.";
      if (data.password.length < 8) return "Senha mínima de 8 caracteres.";
      if (!/^\S+@\S+\.\S+$/.test(data.email)) return "Email inválido.";
    }
    if (step === 2) {
      if (!data.doc_atividade || !data.doc_responsavel || !data.doc_morada || !data.doc_fachada)
        return "Envie todos os documentos obrigatórios, incluindo a foto da fachada do stand.";
      const max = 10 * 1024 * 1024;
      for (const f of [data.doc_atividade, data.doc_responsavel, data.doc_morada, data.doc_fachada]) {
        if (f && f.size > max) return "Cada ficheiro deve ter no máximo 10MB.";
      }
      if (data.doc_fachada && !data.doc_fachada.type.startsWith("image/"))
        return "A foto da fachada deve ser uma imagem (JPG ou PNG).";
    }
    if (step === 4) {
      if (!data.aceita_particular && !data.aceita_revenda)
        return "Selecione pelo menos um tipo de cliente.";
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  };

  const submit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setLoading(true);

    // 0. limpar qualquer sessão anterior (ex.: admin a testar)
    await supabase.auth.signOut();

    // 1. signup
    const { data: signUp, error: signErr } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: { emailRedirectTo: `${window.location.origin}/painel` },
    });
    if (signErr || !signUp.user) {
      setLoading(false);
      toast.error(signErr?.message || "Erro ao criar conta.");
      return;
    }
    const userId = signUp.user.id;

    // 1b. garantir sessão como o novo user (necessário para uploads respeitarem RLS)
    if (!signUp.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email, password: data.password,
      });
      if (signInErr) {
        setLoading(false);
        toast.error("Conta criada. Confirme o seu email e depois faça login para enviar os documentos no perfil.");
        return;
      }
    }


    // 2. upload docs
    const upload = async (file: File, kind: string) => {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("lojista-docs").upload(path, file);
      if (error) throw error;
      return path;
    };
    let doc_atividade_url = "", doc_responsavel_url = "", doc_morada_url = "", doc_fachada_url = "";
    try {
      doc_atividade_url = await upload(data.doc_atividade!, "atividade");
      doc_responsavel_url = await upload(data.doc_responsavel!, "responsavel");
      doc_morada_url = await upload(data.doc_morada!, "morada");
      doc_fachada_url = await upload(data.doc_fachada!, "fachada");
    } catch (e: any) {
      setLoading(false);
      toast.error("Erro a enviar documentos: " + (e.message || ""));
      return;
    }

    // 3. insert profile
    const { error: profErr } = await supabase.from("lojistas").insert({
      id: userId,
      empresa: data.empresa, nome_responsavel: data.nome_responsavel,
      email: data.email, whatsapp: data.whatsapp, telefone: data.telefone,
      nif: data.nif, website: data.website || null,
      localizacao: data.distrito,
      regiao: data.distrito,
      marcas: data.marcas || "Não especificado", faixa_preco: data.faixa_preco || "Não especificado",
      tipos_carro: data.tipos_carro.join(", ") || "Não especificado", tipo_veiculos: data.tipos_carro.join(", ") || "Não especificado",
      faz_financiamento: data.faz_financiamento,
      aceita_retoma: data.aceita_retoma,
      tem_garantia: data.tem_garantia,
      aceita_particular: data.aceita_particular,
      aceita_revenda: data.aceita_revenda,
      doc_atividade_url, doc_responsavel_url, doc_morada_url, doc_fachada_url,
    });
    // user_roles row is auto-created by DB trigger handle_new_lojista

    setLoading(false);
    if (profErr) { toast.error("Erro a guardar perfil: " + profErr.message); return; }
    supabase.functions.invoke("notify-system-email", { body: { event: "lojista-welcome", lojista_id: userId } }).catch((e) => console.error("welcome email", e));
    setDone(true);
  };

  const progress = (step / 4) * 100;

  if (done) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <section className="container flex flex-1 items-center justify-center py-16">
          <div className="mx-auto max-w-2xl rounded-3xl border bg-card p-10 text-center shadow-soft">
            <ShieldCheck className="mx-auto h-16 w-16 text-accent" />
            <h1 className="mt-4 font-display text-3xl font-extrabold">Registo recebido!</h1>
            <p className="mt-3 text-muted-foreground">
              A sua conta ficou em análise. Após validação dos documentos pela nossa equipa,
              terá acesso ao painel para começar a receber oportunidades de clientes
              interessados em comprar carro.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Para começar a receber leads, ative agora a sua subscrição ou utilize um cupom no painel.
            </p>
            <Button variant="hero" size="xl" className="mt-8 w-full"
                    onClick={() => navigate("/painel?checkout=1")}>
              Ativar acesso
            </Button>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="bg-gradient-hero py-10 text-primary-foreground">
        <div className="container">
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">Registo de Stand</h1>
          <p className="mt-2 text-primary-foreground/80">
            Registre o seu stand e comece a receber oportunidades de clientes interessados em comprar carro.
          </p>
        </div>
      </section>
      <section className="container py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 rounded-2xl border-2 border-accent/40 bg-accent/10 p-5">
            <p className="font-semibold text-foreground">
              ⚠️ O registo de stands é exclusivo para profissionais do setor automóvel com stand físico aberto e atividade profissional ativa.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Todos os registos passam por análise e verificação da equipa AchaCarro.pt.
            </p>
          </div>
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm font-medium text-muted-foreground">
              <span>Passo {step} de 4</span><span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-soft md:p-10">
            {step === 1 && (
              <div className="space-y-5">
                <H title="Dados da empresa" sub="Informações de contacto e identificação fiscal." />
                <div className="grid gap-4 md:grid-cols-2">
                  <F label="Nome da empresa *"><Input value={data.empresa} onChange={e=>set("empresa",e.target.value)} maxLength={120} /></F>
                  <F label="Nome do responsável *"><Input value={data.nome_responsavel} onChange={e=>set("nome_responsavel",e.target.value)} maxLength={120} /></F>
                  <F label="Email *"><Input type="email" value={data.email} onChange={e=>set("email",e.target.value)} maxLength={255} /></F>
                  <F label="Senha (mín. 8) *"><PasswordInput value={data.password} onChange={e=>set("password",e.target.value)} minLength={8} maxLength={72} /></F>
                  <F label="Telefone"><Input value={data.telefone} onChange={e=>set("telefone",e.target.value)} maxLength={30} /></F>
                  <F label="WhatsApp *"><Input value={data.whatsapp} onChange={e=>set("whatsapp",e.target.value)} maxLength={30} /></F>
                  <F label="NIF *"><Input value={data.nif} onChange={e=>set("nif",e.target.value)} maxLength={30} /></F>
                  <F label="Distrito *" full>
                    <Select value={data.distrito} onValueChange={v=>set("distrito",v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione o distrito" /></SelectTrigger>
                      <SelectContent>{DISTRITOS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </F>
                  <F label="Website (opcional)" full><Input value={data.website} onChange={e=>set("website",e.target.value)} placeholder="https://..." maxLength={255} /></F>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <H title="Documentação" sub="Para evitar fraudes e garantir confiança aos clientes. PDF, JPG ou PNG (máx. 10MB cada)." />
                <FileField label="Comprovativo de atividade (certidão / início de atividade) *"
                  file={data.doc_atividade} onChange={f=>set("doc_atividade",f)} />
                <FileField label="Documento do responsável (CC ou passaporte) *"
                  file={data.doc_responsavel} onChange={f=>set("doc_responsavel",f)} />
                <FileField label="Comprovativo de morada (fatura / oficial) *"
                  file={data.doc_morada} onChange={f=>set("doc_morada",f)} />
                <FileField label="Foto da Fachada do Stand *"
                  file={data.doc_fachada} onChange={f=>set("doc_fachada",f)}
                  accept=".jpg,.jpeg,.png,.webp"
                  placeholder="Clique para enviar imagem (JPG, PNG · máx. 10MB)"
                  hint="Envie uma foto real e atual da fachada do seu stand para validação da conta." />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <H title="Condições de venda" sub="Como trabalha com os seus clientes." />
                <YN label="Aceita financiamento bancário?" value={data.faz_financiamento} onChange={v=>set("faz_financiamento",v)} />
                <YN label="Tem parcelamento próprio stand?" value={data.financiamento_proprio} onChange={v=>set("financiamento_proprio",v)} />
                <YN label="Aceita retoma?" value={data.aceita_retoma} onChange={v=>set("aceita_retoma",v)} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <H title="Configuração de leads" sub="Que tipo de clientes deseja receber?" />
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${data.aceita_particular ? "border-accent bg-accent/10" : ""}`}>
                  <Checkbox checked={data.aceita_particular} onCheckedChange={v=>set("aceita_particular",!!v)} />
                  <div><div className="font-semibold">Particular</div><div className="text-sm text-muted-foreground">Cliente final para uso próprio</div></div>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${data.aceita_revenda ? "border-accent bg-accent/10" : ""}`}>
                  <Checkbox checked={data.aceita_revenda} onCheckedChange={v=>set("aceita_revenda",!!v)} />
                  <div><div className="font-semibold">Revenda</div><div className="text-sm text-muted-foreground">Outros stands / revendedores</div></div>
                </label>
              </div>
            )}

            <div className="mt-8 flex justify-between gap-3">
              <Button variant="outline" onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1 || loading}>
                Voltar
              </Button>
              {step < 4 ? (
                <Button variant="hero" size="lg" onClick={next}>Continuar</Button>
              ) : (
                <Button variant="hero" size="lg" onClick={submit} disabled={loading}>
                  {loading ? "A processar..." : "Concluir registo"}
                </Button>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="font-semibold text-accent hover:underline">Entrar</Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
};

const H = ({ title, sub }: { title: string; sub: string }) => (
  <div><h2 className="font-display text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{sub}</p></div>
);
const F = ({ label, children, full }: any) => (
  <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
    <Label className="text-sm font-semibold">{label}</Label>{children}
  </div>
);
const YN = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v:boolean)=>void }) => (
  <div className="flex items-center justify-between rounded-lg border p-4">
    <span className="font-medium">{label}</span>
    <div className="flex gap-2">
      <Button type="button" size="sm" variant={value ? "hero" : "outline"} onClick={()=>onChange(true)}>Sim</Button>
      <Button type="button" size="sm" variant={!value ? "hero" : "outline"} onClick={()=>onChange(false)}>Não</Button>
    </div>
  </div>
);
const FileField = ({ label, file, onChange, accept = ".pdf,.jpg,.jpeg,.png", placeholder = "Clique para enviar (PDF, JPG, PNG · máx. 10MB)", hint }: { label: string; file: File | null; onChange: (f: File | null) => void; accept?: string; placeholder?: string; hint?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold">{label}</Label>
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border bg-secondary/50 p-4 hover:border-accent">
      <Upload className="h-5 w-5 text-accent" />
      <div className="flex-1">
        {file ? (
          <div><div className="text-sm font-medium">{file.name}</div><div className="text-xs text-muted-foreground">{(file.size/1024/1024).toFixed(2)} MB</div></div>
        ) : (
          <div className="text-sm text-muted-foreground">{placeholder}</div>
        )}
      </div>
      <input type="file" className="hidden" accept={accept}
             onChange={e => onChange(e.target.files?.[0] || null)} />
    </label>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default Lojista;
