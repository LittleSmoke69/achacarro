import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Calendar, Euro, Car, Clock, Inbox, Crown, Settings, Search, X, Lock, Send, EyeOff, Heart, CheckCircle2, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DISTRITOS } from "@/lib/distritos";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { PropostaDialog } from "@/components/PropostaDialog";
import { CouponRedeemForm } from "@/components/CouponRedeemForm";
import { isValidEmail, isValidPtPhone, normalizePtPhone } from "@/lib/contact";

type Lead = {
  id: string; nome: string; email: string; whatsapp: string;
  marca_modelo: string; preco_max: number; ano_min: number;
  tipo_carro: string; combustivel: string; caixa: string;
  localizacao: string; tem_retoma: boolean; precisa_financiamento: boolean;
  urgencia: string; created_at: string; expires_at: string; propostas_count: number;
  tipo_compra?: string;
  ano_max?: number; km_max?: number; versao?: string; cor?: string; extras?: string;
  marcas_preferidas?: string; observacoes?: string; forma_pagamento?: string;
  retoma_marca?: string; retoma_modelo?: string; retoma_ano?: number; retoma_km?: number;
  retoma_estado?: string; retoma_combustivel?: string; retoma_caixa?: string;
  retoma_valor_esperado?: number; retoma_observacoes?: string; retoma_fotos?: string[];
  financiamento_entrada?: number; financiamento_prestacao?: number;
  situacao_residencia?: string; situacao_profissional?: string; situacao_profissional_outros?: string;
};

type Lojista = {
  empresa: string; email: string; whatsapp: string;
  trial_ends_at: string; subscription_active: boolean; status: string;
  nome_responsavel?: string | null; localizacao?: string | null;
  marcas?: string | null; faixa_preco?: string | null; tipos_carro?: string | null;
};

const validateLojistaProfile = (l: Lojista | null): string[] => {
  if (!l) return [];
  const missing: string[] = [];
  if (!l.empresa?.trim()) missing.push("Nome da empresa");
  if (!l.nome_responsavel?.trim()) missing.push("Nome do responsável");
  if (!isValidEmail(l.email || "")) missing.push("Email válido");
  if (!isValidPtPhone(normalizePtPhone(l.whatsapp || ""))) missing.push("WhatsApp português válido");
  if (!l.localizacao?.trim()) missing.push("Distrito");
  if (!l.marcas?.trim()) missing.push("Marcas");
  if (!l.faixa_preco?.trim()) missing.push("Faixa de preço");
  if (!l.tipos_carro?.trim()) missing.push("Tipos de carro");
  return missing;
};
type SubRow = { status: string; current_period_end: string | null; cancel_at_period_end: boolean };

const computeAccess = (lojista: Lojista | null, sub: SubRow | null): boolean => {
  if (!lojista) return false;
  if (lojista.status === "rejeitado") return false;
  if (!lojista.subscription_active) return false;
  const now = Date.now();
  const trialOk = lojista.trial_ends_at && new Date(lojista.trial_ends_at).getTime() > now;
  const subOk = sub && (
    (["active", "trialing", "past_due"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > now)) ||
    (sub.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end).getTime() > now)
  );
  return Boolean(trialOk || subOk);
};

const Painel = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [lojista, setLojista] = useState<Lojista | null>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [myPropostas, setMyPropostas] = useState<Set<string>>(new Set());
  const [myActions, setMyActions] = useState<Record<string, "ignorado" | "interessado">>({});
  const [userId, setUserId] = useState<string>("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [propostaLead, setPropostaLead] = useState<Lead | null>(null);
  const [now, setNow] = useState(Date.now());

  // Filters
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterCombustivel, setFilterCombustivel] = useState<string>("todos");
  const [filterTipoCarro, setFilterTipoCarro] = useState<string>("todos");
  const [filterLocalizacao, setFilterLocalizacao] = useState<string>("todos");

  // Email-delivery filters (apply to leads where I sent a proposta)
  const [emailLogs, setEmailLogs] = useState<Record<string, { status: string; created_at: string; error_message: string | null }>>({});
  const [filterEmailStatus, setFilterEmailStatus] = useState<string>("todos");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterErrorKeyword, setFilterErrorKeyword] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const refetchLojista = async (uid: string) => {
    const { data: l } = await supabase.from("lojistas")
      .select("empresa,email,whatsapp,trial_ends_at,subscription_active,status,nome_responsavel,localizacao,marcas,faixa_preco,tipos_carro").eq("id", uid).maybeSingle();
    setLojista(l as any);
    const { data: s } = await supabase.from("subscriptions")
      .select("status,current_period_end,cancel_at_period_end")
      .eq("user_id", uid).eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setSub(s as any);
  };

  const refetchLeads = async (uid: string) => {
    const { data: leadsData } = await supabase.rpc("get_leads_for_lojista");
    setLeads((leadsData as any) || []);
    const { data: props } = await supabase.from("propostas").select("lead_id").eq("lojista_id", uid);
    const propostaLeadIds = (props || []).map((p: any) => p.lead_id);
    setMyPropostas(new Set(propostaLeadIds));
    const { data: acts } = await supabase.from("lead_actions").select("lead_id,action").eq("lojista_id", uid);
    const am: Record<string, any> = {};
    (acts || []).forEach((a: any) => { am[a.lead_id] = a.action; });
    setMyActions(am);

    // Email delivery logs (latest per proposta)
    if (propostaLeadIds.length > 0) {
      const messageIds = propostaLeadIds.map((lid: string) => `proposta-${lid}-${uid}`);
      const { data: logs } = await supabase
        .rpc("get_my_proposta_email_logs", { _lead_id: null });
      const logsFiltered = ((logs as any[]) || []).filter((r: any) => messageIds.includes(r.message_id));
      const latest: Record<string, any> = {};
      (logsFiltered || []).forEach((row: any) => {
        const lid = (row.message_id as string).replace("proposta-", "").replace(`-${uid}`, "");
        if (!latest[lid]) latest[lid] = { status: row.status, created_at: row.created_at, error_message: row.error_message };
      });
      setEmailLogs(latest);
    } else {
      setEmailLogs({});
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isLojista = (roles || []).some((r: any) => r.role === "lojista");
      const isAdmin = (roles || []).some((r: any) => r.role === "admin");
      if (!isLojista && !isAdmin) {
        toast.error("Conta sem acesso de stand");
        navigate("/lojista");
        return;
      }

      await refetchLojista(session.user.id);
      await refetchLeads(session.user.id);
      setLoading(false);

      channel = supabase
        .channel(`painel-${session.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${session.user.id}` },
          () => refetchLojista(session.user.id))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lojistas", filter: `id=eq.${session.user.id}` },
          () => refetchLojista(session.user.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "leads" },
          () => refetchLeads(session.user.id))
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [navigate]);

  // tick countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading && lojista && !computeAccess(lojista, sub) && searchParams.get("checkout") === "1") {
      setCheckoutOpen(true);
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    }
  }, [loading, lojista, sub, searchParams, setSearchParams]);

  const subStatus = sub?.status;
  const hasActiveSub = computeAccess(lojista, sub);
  const isApproved = lojista?.status === "aprovado";
  const canInteract = isApproved && hasActiveSub;
  const isPastDue = subStatus === "past_due";

  const tryOpenCheckout = () => setCheckoutOpen(true);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: window.location.origin + "/painel", environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Erro ao abrir portal de pagamento");
    } finally {
      setPortalLoading(false);
    }
  };

  const setAction = async (leadId: string, action: "ignorado" | "interessado") => {
    setMyActions(p => ({ ...p, [leadId]: action }));
    const { error } = await supabase.from("lead_actions").upsert(
      { lead_id: leadId, lojista_id: userId, action },
      { onConflict: "lead_id,lojista_id" }
    );
    if (error) toast.error("Erro ao registar ação");
    else toast.success(action === "ignorado" ? "Lead ignorado" : "Marcado como interessado");
  };

  const stateOf = (l: Lead): "ativo" | "completo" | "expirado" => {
    if (l.propostas_count >= 10) return "completo";
    if (new Date(l.expires_at).getTime() <= now) return "expirado";
    return "ativo";
  };

  const timeLeft = (l: Lead) => {
    const ms = new Date(l.expires_at).getTime() - now;
    if (ms <= 0) return "expirado";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      const st = stateOf(l);
      const ig = myActions[l.id] === "ignorado";
      const sent = myPropostas.has(l.id);

      // Regras base de visibilidade do stand:
      // - Leads ignorados pelo stand não aparecem (exceto no filtro "Ignorei")
      // - Leads expirados sem proposta enviada por este stand não aparecem
      //   (exceto no filtro "Expirados"); se o stand já enviou proposta, mantém-se visível
      if (ig && filterEstado !== "ignorados") return false;
      if (st === "expirado" && !sent && filterEstado !== "expirados") return false;

      if (filterEstado === "ativos" && st !== "ativo") return false;
      if (filterEstado === "interessados" && myActions[l.id] !== "interessado") return false;
      if (filterEstado === "propostos" && !sent) return false;
      if (filterEstado === "completos" && st !== "completo") return false;
      if (filterEstado === "expirados" && st !== "expirado") return false;
      if (filterEstado === "ignorados" && !ig) return false;
      if (filterCombustivel !== "todos" && (l.combustivel || "") !== filterCombustivel) return false;
      if (filterTipoCarro !== "todos" && (l.tipo_carro || "") !== filterTipoCarro) return false;
      if (filterLocalizacao !== "todos" && (l.localizacao || "") !== filterLocalizacao) return false;
      if (q) {
        const hay = `${l.marca_modelo ?? ""} ${l.localizacao ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // Email-delivery filters: only apply to leads where I sent a proposta
      const hasEmailFilter = filterEmailStatus !== "todos" || filterDateFrom || filterDateTo || filterErrorKeyword.trim();
      if (hasEmailFilter) {
        if (!myPropostas.has(l.id)) return false;
        const log = emailLogs[l.id];
        if (filterEmailStatus === "sem_log") {
          if (log) return false;
        } else if (filterEmailStatus !== "todos") {
          if (!log || log.status !== filterEmailStatus) return false;
        }
        if (log && filterDateFrom) {
          if (new Date(log.created_at) < new Date(filterDateFrom)) return false;
        }
        if (log && filterDateTo) {
          const end = new Date(filterDateTo); end.setHours(23, 59, 59, 999);
          if (new Date(log.created_at) > end) return false;
        }
        if (filterErrorKeyword.trim()) {
          const kw = filterErrorKeyword.trim().toLowerCase();
          if (!log?.error_message || !log.error_message.toLowerCase().includes(kw)) return false;
        }
      }
      return true;
    });
  }, [leads, myPropostas, myActions, search, filterEstado, filterCombustivel, filterTipoCarro, filterLocalizacao, now, emailLogs, filterEmailStatus, filterDateFrom, filterDateTo, filterErrorKeyword]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <SiteHeader />
      <section className="bg-gradient-hero py-10 text-primary-foreground">
        <div className="container flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-primary-foreground/70">Bem-vindo,</p>
            <h1 className="font-display text-3xl font-extrabold">{lojista?.empresa}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="heroOutline" size="sm" onClick={() => navigate("/painel/propostas")}>
              <Inbox className="h-3.5 w-3.5" /> Minhas propostas
            </Button>
            <Button variant="heroOutline" size="sm" onClick={() => navigate("/perfil")}>
              <Settings className="h-3.5 w-3.5" /> Editar perfil
            </Button>
            {null}
          </div>
        </div>
      </section>

      <section className="container flex-1 py-10">
        <div className="mb-6 flex items-center gap-2">
          <Inbox className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-bold">
            Leads disponíveis ({filteredLeads.length}{filteredLeads.length !== leads.length ? ` de ${leads.length}` : ""})
          </h2>
        </div>

        {(() => {
          const missing = validateLojistaProfile(lojista);
          if (missing.length === 0) return null;
          return (
            <div className="mb-6 rounded-2xl border-2 border-red-500 bg-red-500/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-red-700">Perfil incompleto ou inválido</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Antes de ativar o acesso ou receber leads, complete corretamente os seguintes campos:
                  </p>
                  <ul className="mt-2 list-inside list-disc text-sm text-red-700">
                    {missing.map(m => <li key={m}>{m}</li>)}
                  </ul>
                </div>
                <Button variant="hero" onClick={() => navigate("/perfil")}>
                  <Settings className="h-4 w-4" /> Corrigir dados do perfil
                </Button>
              </div>
            </div>
          );
        })()}

        {!hasActiveSub && isApproved && validateLojistaProfile(lojista).length === 0 && (
          <div className="mb-6 rounded-2xl border-2 border-accent bg-accent/10 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-lg font-bold">Ative o seu acesso para ver e responder a leads</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isPastDue
                    ? "O último pagamento falhou. Atualize o método de pagamento para continuar."
                    : "Para começar a receber oportunidades, ative a sua subscrição ou utilize um cupom."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="hero" onClick={tryOpenCheckout}>
                  {isPastDue ? "Atualizar pagamento" : "Ativar acesso"}
                </Button>
                {sub && (
                  <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
                    {portalLoading ? "..." : "Gerir subscrição"}
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Tem um cupom?</p>
              <CouponRedeemForm onSuccess={() => refetchLojista(userId)} />
            </div>
          </div>
        )}

        {hasActiveSub && !isApproved && (
          <div className="mb-6 rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-6 text-center">
            <p className="font-semibold text-amber-800">Conta em análise</p>
            <p className="mt-1 text-sm text-muted-foreground">Assim que a tua conta for aprovada, podes enviar propostas.</p>
          </div>
        )}

        {hasActiveSub && isApproved && (() => {
          const normalizedPhone = normalizePtPhone(lojista?.whatsapp || "");
          const emailOk = isValidEmail(lojista?.email || "");
          const phoneOk = isValidPtPhone(normalizedPhone);
          const allOk = emailOk && phoneOk;
          return (
            <div className={`mb-6 rounded-2xl border-2 p-4 ${allOk ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500 bg-red-500/10"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {allOk ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-red-600" />}
                  <p className={`font-semibold ${allOk ? "text-emerald-700" : "text-red-700"}`}>
                    {allOk ? "Contactos válidos — pronto para enviar propostas" : "Contactos inválidos — corrija antes de enviar propostas"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge className={`gap-1.5 border ${emailOk ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : "bg-red-500/15 text-red-700 border-red-500/30"}`}>
                    <Mail className="h-3.5 w-3.5" />
                    {emailOk ? (lojista?.email || "Email") : "Email inválido"}
                  </Badge>
                  <Badge className={`gap-1.5 border ${phoneOk ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : "bg-red-500/15 text-red-700 border-red-500/30"}`}>
                    <Phone className="h-3.5 w-3.5" />
                    {phoneOk ? normalizedPhone : "WhatsApp inválido"}
                  </Badge>
                  {!allOk && (
                    <Button variant="hero" size="sm" onClick={() => navigate("/perfil")}>
                      <Settings className="h-3.5 w-3.5" /> Atualizar perfil
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mb-6 rounded-2xl border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pesquisar por carro ou localização..."
                value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Estado" value={filterEstado} onChange={setFilterEstado}
              options={[
                { v: "todos", l: "Todos" },
                { v: "ativos", l: "Ativos" },
                { v: "interessados", l: "Marquei interesse" },
                { v: "propostos", l: "Já enviei proposta" },
                { v: "ignorados", l: "Ignorei" },
                { v: "completos", l: "Completos (10/10)" },
                { v: "expirados", l: "Expirados" },
              ]} />
            <FilterSelect label="Combustível" value={filterCombustivel} onChange={setFilterCombustivel}
              options={[{ v: "todos", l: "Todos" }, ...["Gasolina","Diesel","Híbrido","Híbrido Plug-in","Elétrico","GPL","GNC","Outro"].map(o => ({ v: o, l: o }))]} />
            <FilterSelect label="Tipo de carro" value={filterTipoCarro} onChange={setFilterTipoCarro}
              options={[{ v: "todos", l: "Todos" }, ...["Citadino","Sedan","SUV","Familiar","Carrinha","Coupé","Comercial"].map(o => ({ v: o, l: o }))]} />
            <FilterSelect label="Distrito" value={filterLocalizacao} onChange={setFilterLocalizacao}
              options={[{ v: "todos", l: "Todos" }, ...DISTRITOS.map(d => ({ v: d, l: d }))]} />
          </div>

          <div className="mt-3 border-t pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(s => !s)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              Filtros de envio (email/WhatsApp das minhas propostas)
              <span className="text-xs">{showAdvanced ? "▲" : "▼"}</span>
            </button>
            {showAdvanced && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FilterSelect label="Status do envio" value={filterEmailStatus} onChange={setFilterEmailStatus}
                  options={[
                    { v: "todos", l: "Todos" },
                    { v: "sent", l: "Entregue" },
                    { v: "pending", l: "Em fila" },
                    { v: "dlq", l: "Falhou (após retries)" },
                    { v: "failed", l: "Falhou" },
                    { v: "bounced", l: "Devolvido" },
                    { v: "suppressed", l: "Suprimido" },
                    { v: "complained", l: "Reclamação" },
                    { v: "sem_log", l: "Sem registo ainda" },
                  ]} />
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">De</label>
                  <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Até</label>
                  <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Palavra-chave no erro</label>
                  <Input placeholder="ex: bounce, invalid..." value={filterErrorKeyword} onChange={e => setFilterErrorKeyword(e.target.value)} />
                </div>
                {(filterEmailStatus !== "todos" || filterDateFrom || filterDateTo || filterErrorKeyword) && (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setFilterEmailStatus("todos"); setFilterDateFrom(""); setFilterDateTo(""); setFilterErrorKeyword("");
                    }}>
                      <X className="h-4 w-4" /> Limpar filtros de envio
                    </Button>
                  </div>
                )}
                <p className="sm:col-span-2 lg:col-span-4 text-xs text-muted-foreground">
                  Nota: o WhatsApp ao cliente é manual (clique-para-conversar). Estes filtros aplicam ao email enviado automaticamente após cada proposta.
                </p>
              </div>
            )}
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="rounded-3xl border bg-card p-12 text-center shadow-soft">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold">{leads.length === 0 ? "Ainda sem leads" : "Nenhum lead corresponde aos filtros"}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map(lead => {
              const st = stateOf(lead);
              const sent = myPropostas.has(lead.id);
              const action = myActions[lead.id];
              const locked = st !== "ativo";
              const showContact = sent && st === "ativo"; // contact unlocked only after sending
              const propostas = lead.propostas_count;

              return (
                <div key={lead.id} className={`rounded-2xl border bg-card p-6 shadow-soft ${locked ? "opacity-90" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold">
                          {showContact ? lead.nome : "Pedido de comprador"}
                        </h3>
                        <StateBadge state={st} />
                        {action === "interessado" && (
                          <Badge className="border bg-pink-500/15 text-pink-700 border-pink-500/30 gap-1">
                            <Heart className="h-3 w-3" /> Interessado
                          </Badge>
                        )}
                        {sent && <EmailStatusBadge log={emailLogs[lead.id]} />}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {showContact ? (
                          <>
                            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{lead.email}</span>
                            <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{lead.whatsapp}</span>
                          </>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Lock className="h-4 w-4" />
                            {st === "completo" ? "Contacto bloqueado — limite atingido"
                              : st === "expirado" ? "Contacto bloqueado — pedido expirado"
                              : "Contacto desbloqueia após enviar proposta"}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{lead.localizacao}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(lead.created_at).toLocaleDateString("pt-PT")}</span>
                        {st === "ativo" && (
                          <span className="flex items-center gap-1.5 text-accent font-medium">
                            <Timer className="h-4 w-4" /> {timeLeft(lead)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <PropostasCounter count={propostas} />
                      {st === "completo" && (
                        <p className="text-xs text-muted-foreground">Este pedido já atingiu o limite de propostas.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-xl bg-secondary/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Info icon={Car} label="Carro" value={lead.marca_modelo} />
                    <Info icon={Euro} label="Preço máx." value={`${(lead.preco_max ?? 0).toLocaleString("pt-PT")}€`} />
                    <Info icon={Calendar} label="Ano mín." value={String(lead.ano_min ?? "—")} />
                    <Info icon={Clock} label="Urgência" value={lead.urgencia ?? "—"} />
                    <Info label="Tipo" value={lead.tipo_carro ?? "—"} />
                    <Info label="Combustível" value={lead.combustivel ?? "—"} />
                    <Info label="Caixa" value={lead.caixa ?? "—"} />
                    <Info label="Retoma / Financ." value={`${lead.tem_retoma ? "Sim" : "Não"} / ${lead.precisa_financiamento ? "Sim" : "Não"}`} />
                    {lead.ano_max != null && <Info label="Ano máx." value={String(lead.ano_max)} />}
                    {lead.km_max != null && <Info label="Km máx." value={lead.km_max.toLocaleString("pt-PT")} />}
                    {lead.versao && <Info label="Versão" value={lead.versao} />}
                    {lead.cor && <Info label="Cor" value={lead.cor} />}
                    {lead.marcas_preferidas && <Info label="Marcas preferidas" value={lead.marcas_preferidas} />}
                    {lead.forma_pagamento && <Info label="Pagamento" value={lead.forma_pagamento} />}
                    {lead.tipo_compra && <Info label="Tipo de compra" value={lead.tipo_compra} />}
                  </div>

                  {lead.extras && (
                    <div className="mt-3 rounded-xl border bg-card p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Extras desejados</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{lead.extras}</p>
                    </div>
                  )}
                  {lead.observacoes && (
                    <div className="mt-3 rounded-xl border bg-card p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Observações do cliente</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{lead.observacoes}</p>
                    </div>
                  )}

                  {lead.precisa_financiamento && (lead.financiamento_entrada != null || lead.financiamento_prestacao != null || lead.situacao_residencia || lead.situacao_profissional) && (
                    <div className="mt-3 rounded-xl border bg-card p-4">
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Financiamento</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {lead.financiamento_entrada != null && <Info label="Entrada" value={`${lead.financiamento_entrada.toLocaleString("pt-PT")}€`} />}
                        {lead.financiamento_prestacao != null && <Info label="Prestação" value={`${lead.financiamento_prestacao.toLocaleString("pt-PT")}€`} />}
                        {lead.situacao_residencia && <Info label="Residência" value={lead.situacao_residencia} />}
                        {lead.situacao_profissional && <Info label="Situação prof." value={lead.situacao_profissional === "Outros" && lead.situacao_profissional_outros ? lead.situacao_profissional_outros : lead.situacao_profissional} />}
                      </div>
                    </div>
                  )}

                  {lead.tem_retoma && (
                    <div className="mt-3 rounded-xl border-2 border-accent/40 bg-accent/5 p-4">
                      <p className="mb-2 text-xs font-bold uppercase text-accent">Veículo de retoma</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {lead.retoma_marca && <Info label="Marca" value={lead.retoma_marca} />}
                        {lead.retoma_modelo && <Info label="Modelo" value={lead.retoma_modelo} />}
                        {lead.retoma_ano != null && <Info label="Ano" value={String(lead.retoma_ano)} />}
                        {lead.retoma_km != null && <Info label="Km" value={lead.retoma_km.toLocaleString("pt-PT")} />}
                        {lead.retoma_combustivel && <Info label="Combustível" value={lead.retoma_combustivel} />}
                        {lead.retoma_caixa && <Info label="Caixa" value={lead.retoma_caixa} />}
                        {lead.retoma_estado && <Info label="Estado" value={lead.retoma_estado} />}
                        {lead.retoma_valor_esperado != null && <Info label="Valor esperado" value={`${lead.retoma_valor_esperado.toLocaleString("pt-PT")}€`} />}
                      </div>
                      {lead.retoma_observacoes && (
                        <p className="mt-3 text-sm whitespace-pre-wrap"><span className="text-xs font-semibold uppercase text-muted-foreground">Obs.: </span>{lead.retoma_observacoes}</p>
                      )}
                      {lead.retoma_fotos && lead.retoma_fotos.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Fotos ({lead.retoma_fotos.length})</p>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                            {lead.retoma_fotos.map((raw, i) => {
                              const hasCat = raw.includes("|") && !raw.startsWith("http");
                              const [cat, url] = hasCat ? raw.split("|") : ["", raw];
                              const fotoUrl = url || raw;
                              const label = cat ? cat.replace(/_/g, " ") : `Foto ${i + 1}`;
                              return (
                                <a key={i} href={fotoUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border bg-muted">
                                  <img src={fotoUrl} alt={label} loading="lazy" className="h-24 w-full object-cover transition hover:scale-105" />
                                  {cat && <p className="px-1 py-0.5 text-[10px] capitalize text-muted-foreground">{label}</p>}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {!sent && st === "ativo" && action !== "ignorado" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setAction(lead.id, "ignorado")} disabled={!canInteract}>
                          <EyeOff className="h-4 w-4" /> Ignorar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setAction(lead.id, "interessado")} disabled={!canInteract}>
                          <Heart className="h-4 w-4" /> Interessado
                        </Button>
                      </>
                    )}
                    {st === "ativo" && !sent && (
                      <Button variant="hero" size="sm" disabled={!canInteract}
                        onClick={() => {
                          const emailOk = isValidEmail(lojista?.email || "");
                          const phoneOk = isValidPtPhone(normalizePtPhone(lojista?.whatsapp || ""));
                          if (!emailOk || !phoneOk) {
                            toast.error("Atualize o seu email e WhatsApp no perfil antes de enviar propostas.");
                            navigate("/perfil");
                            return;
                          }
                          setPropostaLead(lead);
                        }}>
                        <Send className="h-4 w-4" /> Enviar proposta
                      </Button>
                    )}
                    {st !== "ativo" && (
                      <Button variant="outline" size="sm" disabled>
                        <Lock className="h-4 w-4" />
                        {st === "completo" ? "10/10 propostas — bloqueado" : "Pedido expirado"}
                      </Button>
                    )}
                    {st === "ativo" && sent && (
                      <Badge className="border bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                        Proposta enviada
                      </Badge>
                    )}
                  </div>

                  {sent && <EmailEntregaHistory leadId={lead.id} userId={userId} />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PropostaDialog
        open={!!propostaLead}
        onOpenChange={(v) => { if (!v) setPropostaLead(null); }}
        lead={propostaLead}
        lojistaEmpresa={lojista?.empresa}
        lojistaWhatsapp={lojista?.whatsapp}
        lojistaEmail={lojista?.email}
        totalPropostasAfter={(propostaLead?.propostas_count ?? 0) + 1}
        onSent={() => refetchLeads(userId)}
      />

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ativar subscrição</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Conclua o pagamento abaixo para liberar o acesso completo ao painel.
          </p>
          <StripeEmbeddedCheckout
            priceId="plano_lojista_mensal"
            customerEmail={lojista?.email}
            userId={userId}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
          <div className="mt-4 border-t pt-4 text-center">
            <p className="text-xs text-muted-foreground">Tem um cupom? Feche este diálogo e use o campo no painel.</p>
          </div>
        </DialogContent>
      </Dialog>
      <SiteFooter />
    </div>
  );
};

const StateBadge = ({ state }: { state: "ativo" | "completo" | "expirado" }) => {
  if (state === "ativo") return <Badge className="border bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Ativo</Badge>;
  if (state === "completo") return <Badge className="border bg-red-500/15 text-red-700 border-red-500/30">Completo</Badge>;
  return <Badge className="border bg-muted text-muted-foreground border-border">Expirado</Badge>;
};

const PropostasCounter = ({ count }: { count: number }) => {
  const pct = Math.min(100, (count / 10) * 100);
  const color = count >= 10 ? "bg-red-500" : count >= 7 ? "bg-amber-500" : "bg-accent";
  return (
    <div className="w-44">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">Propostas</span>
        <span className={count >= 10 ? "text-red-600" : "text-foreground"}>{count} de 10</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

const Info = ({ icon: Icon, label, value }: any) => (
  <div>
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />}{label}
    </div>
    <div className="mt-0.5 text-sm font-medium">{value}</div>
  </div>
);

type EmailLogRow = {
  id: string;
  status: string;
  created_at: string;
  error_message: string | null;
  message_id: string;
};

const EMAIL_STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  sent: { cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", label: "Email entregue" },
  pending: { cls: "bg-amber-500/15 text-amber-700 border-amber-500/30", label: "Email em fila" },
  suppressed: { cls: "bg-muted text-muted-foreground border-border", label: "Email suprimido" },
  dlq: { cls: "bg-red-500/15 text-red-700 border-red-500/30", label: "Email falhou" },
  failed: { cls: "bg-red-500/15 text-red-700 border-red-500/30", label: "Email falhou" },
  bounced: { cls: "bg-red-500/15 text-red-700 border-red-500/30", label: "Email devolvido" },
  complained: { cls: "bg-red-500/15 text-red-700 border-red-500/30", label: "Reclamação" },
};

const formatLogTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const EmailStatusBadge = ({ log }: { log?: { status: string; created_at: string; error_message: string | null } }) => {
  if (!log) {
    return (
      <Badge className="border bg-muted text-muted-foreground border-border gap-1" title="Aguardando registo de envio">
        <Clock className="h-3 w-3" /> Email a processar…
      </Badge>
    );
  }
  const style = EMAIL_STATUS_STYLE[log.status] ?? { cls: "bg-muted text-muted-foreground border-border", label: log.status };
  const Icon = log.status === "sent" ? CheckCircle2 : log.status === "pending" ? Clock : Mail;
  return (
    <Badge
      className={`border gap-1 ${style.cls}`}
      title={log.error_message ? `Erro: ${log.error_message}` : `${style.label} em ${new Date(log.created_at).toLocaleString("pt-PT")}`}
    >
      <Icon className="h-3 w-3" /> {style.label} · {formatLogTime(log.created_at)}
    </Badge>
  );
};

const EmailEntregaHistory = ({ leadId, userId }: { leadId: string; userId: string }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EmailLogRow[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .rpc("get_my_proposta_email_logs", { _lead_id: leadId });
    setRows(((data as any[]) || []) as any);
    setLoading(false);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && rows.length === 0) load();
  };

  const latest = rows[0];
  const badgeFor = (s: string) => {
    if (s === "sent") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    if (s === "pending") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    if (s === "suppressed") return "bg-muted text-muted-foreground border-border";
    return "bg-red-500/15 text-red-700 border-red-500/30";
  };
  const labelFor = (s: string) => {
    if (s === "sent") return "Entregue";
    if (s === "pending") return "Em fila";
    if (s === "suppressed") return "Suprimido";
    if (s === "dlq") return "Falhou (após retries)";
    if (s === "failed") return "Falhou";
    if (s === "bounced") return "Devolvido";
    if (s === "complained") return "Reclamação";
    return s;
  };

  return (
    <div className="mt-3 rounded-xl border bg-secondary/40">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm font-semibold hover:bg-secondary/70 rounded-xl transition"
      >
        <span className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Histórico de envio ao cliente
          {latest && (
            <Badge className={`border ${badgeFor(latest.status)}`}>{labelFor(latest.status)}</Badge>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Ocultar" : "Ver"}</span>
      </button>
      {open && (
        <div className="border-t px-4 py-3 text-sm">
          {loading ? (
            <p className="text-muted-foreground">A carregar…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">Sem registos ainda. O envio ao cliente pode demorar alguns segundos.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map(r => (
                <li key={r.id} className="rounded-lg border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge className={`border ${badgeFor(r.status)}`}>{labelFor(r.status)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-PT")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> Cliente
                  </div>
                  {r.error_message && (
                    <p className="mt-2 rounded-md bg-red-500/10 p-2 text-xs text-red-700 break-words">
                      <strong>Erro:</strong> {r.error_message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Nota: o WhatsApp ao cliente é da responsabilidade do stand — abra o número quando o contacto for desbloqueado.
            </p>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>Atualizar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Painel;
