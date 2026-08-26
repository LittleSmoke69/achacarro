import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, FileText, CheckCircle2, XCircle, History, Ticket, Plus, Calendar, Users, Trash2, ChevronDown, ChevronRight, Mail, Phone, MapPin, LayoutDashboard, ThumbsUp, ThumbsDown, Car, Send, Clock, Ban, Store, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { exportLeadsToExcel } from "@/lib/exportLeads";


type Lojista = {
  id: string; empresa: string; email: string; nif: string; whatsapp: string;
  cidade: string; status: string; subscription_active: boolean; trial_ends_at: string;
  doc_atividade_url: string | null; doc_responsavel_url: string | null; doc_morada_url: string | null;
  doc_fachada_url: string | null;
  created_at: string;
  morada: string | null; telefone: string | null; nome_responsavel: string | null;
  marcas: string | null; faixa_preco: string | null; tipo_veiculos: string | null;
  localizacao: string | null; regiao: string | null; tipos_carro: string | null; website: string | null;
  aceita_retoma: boolean; faz_financiamento: boolean; tem_garantia: boolean;
  aceita_revenda: boolean; aceita_particular: boolean;
  deleted_at: string | null; deleted_by: string | null;
};

type AuditEntry = {
  id: string;
  admin_id: string;
  action: string;
  target_lojista_id: string | null;
  details: any;
  created_at: string;
};

type Coupon = {
  id: string; code: string; duration_days: number; max_uses: number; used_count: number;
  expires_at: string | null; notes: string | null; created_at: string;
};

type Lead = {
  id: string; nome: string; email: string; whatsapp: string; localizacao: string;
  marca_modelo: string | null; preco_max: number | null; ano_min: number | null; ano_max: number | null;
  km_max: number | null; versao: string | null; cor: string | null; extras: string | null;
  marcas_preferidas: string | null;
  tipo_carro: string | null; combustivel: string | null; caixa: string | null;
  tem_retoma: boolean; precisa_financiamento: boolean; urgencia: string | null;
  tipo_compra: string | null; forma_pagamento: string | null; tem_carro_especifico: boolean | null;
  observacoes: string | null; propostas_count: number; expires_at: string;
  created_at: string;
  retoma_marca: string | null; retoma_modelo: string | null; retoma_ano: number | null;
  retoma_km: number | null; retoma_estado: string | null; retoma_combustivel: string | null;
  retoma_caixa: string | null; retoma_valor_esperado: number | null;
  retoma_observacoes: string | null; retoma_fotos: string[] | null;
  retoma_tem_danos: boolean | null; retoma_fotos_danos: string[] | null;
  financiamento_entrada: number | null; financiamento_prestacao: number | null;
  situacao_residencia: string | null; situacao_profissional: string | null;
  situacao_profissional_outros: string | null;
  deleted_at: string | null; deleted_by: string | null;
};

type LeadFilter =
  | "todos"
  | "ativo"
  | "expirado"
  | "completo"
  | "pendente"
  | "com_proposta"
  | "sem_proposta"
  | "ignorado"
  | "aceite"
  | "recusada"
  | "negociacao"
  | "finalizado";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lojistas, setLojistas] = useState<Lojista[]>([]);
  const [filter, setFilter] = useState<"todos" | "pendente" | "aprovado" | "rejeitado">("todos");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [adminId, setAdminId] = useState<string>("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newDays, setNewDays] = useState<string>("30");
  const [newMaxUses, setNewMaxUses] = useState<string>("1");
  const [newNotes, setNewNotes] = useState("");

  const [notifs, setNotifs] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("todos");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [expandedLojista, setExpandedLojista] = useState<string | null>(null);
  const [expandedProposta, setExpandedProposta] = useState<string | null>(null);
  const [section, setSection] = useState<"dashboard" | "leads" | "stands" | "propostas" | "cupons" | "audit">("dashboard");
  const [propostasByLead, setPropostasByLead] = useState<Record<string, any[]>>({});
  const [selectedExpired, setSelectedExpired] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);


  type Periodo = "today" | "7d" | "30d" | "all";
  const [periodo, setPeriodo] = useState<Periodo>("all");
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [leadsOverview, setLeadsOverview] = useState<any[]>([]);
  const [propostasAll, setPropostasAll] = useState<any[]>([]);
  const [ignoradosByLead, setIgnoradosByLead] = useState<Record<string, any[]>>({});
  const [historyByLead, setHistoryByLead] = useState<Record<string, any>>({});

  const leadStateOf = (l: Lead): "ativo" | "expirado" | "completo" => {
    if (l.propostas_count >= 10) return "completo";
    if (new Date(l.expires_at) <= new Date()) return "expirado";
    return "ativo";
  };

  const [ignoredLeadIds, setIgnoredLeadIds] = useState<Set<string>>(new Set());

  const propsByLeadId = (() => {
    const m: Record<string, any[]> = {};
    for (const p of propostasAll) {
      if (!p.lead_id) continue;
      (m[p.lead_id] = m[p.lead_id] || []).push(p);
    }
    return m;
  })();

  const matchesLeadFilterFor = (l: Lead, f: LeadFilter): boolean => {
    if (f === "todos") return true;
    const state = leadStateOf(l);
    if (f === "ativo" || f === "expirado" || f === "completo") return state === f;
    const ps = propsByLeadId[l.id] || [];
    const hasProp = ps.length > 0;
    switch (f) {
      case "pendente": return !hasProp && state === "ativo";
      case "com_proposta": return hasProp;
      case "sem_proposta": return !hasProp;
      case "ignorado": return ignoredLeadIds.has(l.id);
      case "aceite": return ps.some(p => p.status === "aceita");
      case "recusada": return ps.some(p => p.status === "recusada");
      case "negociacao": return ps.some(p => p.status === "negociando");
      case "finalizado": return state === "expirado" || ps.some(p => p.status === "aceita");
      default: return true;
    }
  };
  const matchesLeadFilter = (l: Lead) => matchesLeadFilterFor(l, leadFilter);

  const load = async (p: Periodo = periodo) => {
    const [{ data: lojistasData }, { data: auditData }, { data: notifData }, { data: couponsData }, { data: leadsData }, { data: statsData }, { data: overviewData }, { data: propostasData }] = await Promise.all([
      supabase.from("lojistas").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_audit_log" as any).select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("admin_notifications" as any).select("*").is("read_at", null).order("created_at", { ascending: false }).limit(20),
      supabase.from("coupons" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.rpc("admin_dashboard_stats" as any, { _period: p }),
      supabase.rpc("admin_leads_overview" as any, { _period: p }),
      supabase.rpc("admin_get_propostas_with_email" as any, { _limit: 200 }),
    ]);
    setLojistas((lojistasData as any) || []);
    setAudit((auditData as any) || []);
    setNotifs((notifData as any) || []);
    setCoupons((couponsData as any) || []);
    setLeads((leadsData as any) || []);
    setStats((statsData as any) || null);
    setLeadsOverview((overviewData as any) || []);
    setPropostasAll(((propostasData as any)?.propostas) || []);
    const { data: ignActs } = await supabase.from("lead_actions").select("lead_id").eq("action", "ignorado");
    setIgnoredLeadIds(new Set(((ignActs as any) || []).map((a: any) => a.lead_id)));
  };

  const reenviarEmailProposta = async (propostaId: string) => {
    toast.loading("Reenviando email...", { id: `re-${propostaId}` });
    const { data, error } = await supabase.functions.invoke("admin-send-proposta-email", {
      body: { proposta_id: propostaId },
    });
    if (error || !(data as any)?.ok) {
      toast.error((data as any)?.error || error?.message || "Falha ao reenviar", { id: `re-${propostaId}` });
      return;
    }
    toast.success(`Email reenviado para ${(data as any).recipient}`, { id: `re-${propostaId}` });
    setTimeout(() => load(), 1500);
  };

  const toggleLead = async (leadId: string) => {
    if (expandedLead === leadId) { setExpandedLead(null); return; }
    setExpandedLead(leadId);
    if (!propostasByLead[leadId]) {
      const { data } = await supabase.from("propostas").select("*, lojistas:lojista_id(empresa,email,whatsapp)").eq("lead_id", leadId).order("created_at", { ascending: false });
      setPropostasByLead(prev => ({ ...prev, [leadId]: (data as any) || [] }));
    }
    if (!ignoradosByLead[leadId]) {
      const { data: acts } = await supabase.from("lead_actions").select("lojista_id, created_at").eq("lead_id", leadId).eq("action", "ignorado");
      const ids = ((acts as any) || []).map((a: any) => a.lojista_id);
      let lojistasInfo: any[] = [];
      if (ids.length) {
        const { data: lojs } = await supabase.from("lojistas").select("id,empresa,email,whatsapp").in("id", ids);
        lojistasInfo = (lojs as any) || [];
      }
      const merged = ((acts as any) || []).map((a: any) => ({
        ...a, lojista: lojistasInfo.find((l: any) => l.id === a.lojista_id),
      }));
      setIgnoradosByLead(prev => ({ ...prev, [leadId]: merged }));
    }
    if (!historyByLead[leadId]) {
      const { data: hist } = await supabase.rpc("admin_lead_full_history" as any, { _lead_id: leadId });
      setHistoryByLead(prev => ({ ...prev, [leadId]: hist || null }));
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead? Todas as propostas e negociações ligadas a este lead também serão removidas ou arquivadas.")) return;
    const { error } = await supabase.rpc("admin_soft_delete_lead" as any, { _lead_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Lead excluído");
    setPropostasByLead(prev => { const c = { ...prev }; delete c[id]; return c; });
    setHistoryByLead(prev => { const c = { ...prev }; delete c[id]; return c; });
    load();
  };

  const deleteLojista = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este stand? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.rpc("admin_soft_delete_lojista" as any, { _lojista_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Stand excluído");
    load();
  };

  const deleteProposta = async (id: string, leadId?: string) => {
    if (!confirm("Tem certeza que deseja excluir esta proposta?")) return;
    const { error } = await supabase.rpc("admin_soft_delete_proposta" as any, { _proposta_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Proposta excluída");
    if (leadId) {
      setPropostasByLead(prev => { const c = { ...prev }; delete c[leadId]; return c; });
      setHistoryByLead(prev => { const c = { ...prev }; delete c[leadId]; return c; });
    }
    load();
  };

  const extendLead = async (id: string) => {
    const hoursStr = prompt("Estender expiração em quantas horas?", "24");
    if (!hoursStr) return;
    const hours = parseInt(hoursStr);
    if (!hours || hours <= 0) { toast.error("Horas inválidas"); return; }
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const base = new Date(lead.expires_at) > new Date() ? new Date(lead.expires_at) : new Date();
    const newExp = new Date(base.getTime() + hours * 3600000).toISOString();
    const { error } = await supabase.from("leads").update({ expires_at: newExp }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAction("extend_lead", null, { lead_id: id, hours, new_expires: newExp });
    toast.success(`Lead estendido por ${hours}h`);
    load();
  };

  const bulkExtendExpired = async (ids: string[], mode: "selecionados" | "todos") => {
    if (ids.length === 0) { toast.error("Nenhum lead expirado selecionado"); return; }
    if (!confirm("Tem certeza que deseja estender estes leads por mais 24 horas?")) return;
    const newExp = new Date(Date.now() + 24 * 3600000).toISOString();
    const { error } = await supabase.from("leads").update({ expires_at: newExp }).in("id", ids);
    if (error) { toast.error(error.message); return; }
    await logAction("bulk_extend_expired_leads", null, {
      mode, count: ids.length, hours: 24, new_expires: newExp, lead_ids: ids,
    });
    toast.success("Leads estendidos com sucesso por mais 24 horas.");
    setSelectedExpired(new Set());
    load();
  };


  const createCoupon = async () => {
    const code = newCode.trim().toUpperCase();
    const days = parseInt(newDays);
    const maxUses = parseInt(newMaxUses);
    if (!code || !days || days <= 0) { toast.error("Código e dias obrigatórios"); return; }
    const { error } = await supabase.from("coupons" as any).insert({
      code, duration_days: days, max_uses: maxUses || 1, notes: newNotes.trim() || null, created_by: adminId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Cupom criado");
    setNewCode(""); setNewDays("30"); setNewMaxUses("1"); setNewNotes("");
    load();
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Apagar cupom?")) return;
    const { error } = await supabase.from("coupons" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cupom apagado");
    load();
  };

  const grantAccess = async (lojistaId: string) => {
    const daysStr = prompt("Liberar acesso por quantos dias?", "30");
    if (!daysStr) return;
    const days = parseInt(daysStr);
    if (!days || days <= 0) { toast.error("Dias inválidos"); return; }
    const { error } = await supabase.rpc("grant_lojista_access" as any, { _lojista_id: lojistaId, _days: days });
    if (error) { toast.error(error.message); return; }
    toast.success(`Acesso liberado por ${days} dias`);
    load();
  };

  const markRead = async (id: string) => {
    await supabase.from("admin_notifications" as any).update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const logAction = async (action: string, target_lojista_id: string | null, details: any = {}) => {
    await supabase.from("admin_audit_log" as any).insert({
      admin_id: adminId,
      action,
      target_lojista_id,
      details,
    });
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (!(roles || []).some((r: any) => r.role === "admin")) {
        toast.error("Acesso restrito");
        navigate("/");
        return;
      }
      setAdminId(session.user.id);
      await load();
      setLoading(false);
    })();
  }, [navigate]);

  const openDoc = async (lojistaId: string, label: string, path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("lojista-docs").createSignedUrl(path, 300);
    if (error || !data) { toast.error("Erro ao abrir documento"); return; }
    await logAction("doc_signed_url", lojistaId, { document: label, path });
    window.open(data.signedUrl, "_blank");
    load();
  };

  const setStatus = async (id: string, status: "aprovado" | "rejeitado") => {
    const prev = lojistas.find(l => l.id === id)?.status;
    const { error } = await supabase.from("lojistas").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAction(status === "aprovado" ? "approve_lojista" : "reject_lojista", id, { from: prev, to: status });
    toast.success(`Status: ${status}`);
    load();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;

  const filtered = filter === "todos" ? lojistas : lojistas.filter(l => l.status === filter);
  const lojistaName = (id: string | null) => lojistas.find(l => l.id === id)?.empresa || id?.slice(0, 8) || "—";
  const actionLabel = (a: string) => ({
    approve_lojista: "Aprovou",
    reject_lojista: "Rejeitou",
    doc_signed_url: "Abriu documento",
  } as any)[a] || a;

  const setProposalStatus = async (id: string, status: "aceita" | "recusada" | "enviada") => {
    const { error } = await supabase.from("propostas").update({ status } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAction("set_proposta_status", null, { proposta_id: id, status });
    toast.success(`Proposta marcada como ${status}`);
    load();
  };

  const changePeriodo = (p: Periodo) => { setPeriodo(p); load(p); };

  const timeRemaining = (expISO: string) => {
    const ms = new Date(expISO).getTime() - Date.now();
    if (ms <= 0) return "Expirado";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const StatCard = ({ icon: Icon, label, value, tone = "default" }: any) => (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div>
      <p className={`mt-1 font-display text-2xl font-extrabold ${tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : ""}`}>{value ?? "—"}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <SiteHeader />
      <section className="bg-gradient-hero py-10 text-primary-foreground">
        <div className="container">
          <h1 className="font-display text-3xl font-extrabold">Painel Admin</h1>
          <p className="mt-1 text-primary-foreground/70">Dashboard, leads, propostas e validação de stands</p>
        </div>
      </section>
      <section className="container flex-1 py-10">
        <Tabs value={section} onValueChange={(v) => setSection(v as any)} className="space-y-6">
          <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1 bg-card border p-1">
            <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5"><Car className="h-4 w-4" />Leads</TabsTrigger>
            <TabsTrigger value="stands" className="gap-1.5"><Store className="h-4 w-4" />Stands</TabsTrigger>
            <TabsTrigger value="propostas" className="gap-1.5"><Send className="h-4 w-4" />Propostas</TabsTrigger>
            <TabsTrigger value="cupons" className="gap-1.5"><Ticket className="h-4 w-4" />Cupons</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5"><History className="h-4 w-4" />Log Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
        {/* DASHBOARD */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold">Dashboard</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {([["today","Hoje"],["7d","Últimos 7 dias"],["30d","Últimos 30 dias"],["all","Todos"]] as const).map(([v,label]) => (
                <Button key={v} size="sm" variant={periodo === v ? "hero" : "outline"} onClick={() => changePeriodo(v)}>{label}</Button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard icon={Users} label="Clientes" value={stats?.clientes} />
            <StatCard icon={Users} label="Stands" value={stats?.lojistas} />
            <StatCard icon={ShieldCheck} label="Stands aprovados" value={stats?.lojistas_aprovados} tone="good" />
            <StatCard icon={Car} label="Leads criados" value={stats?.leads_total} />
            <StatCard icon={CheckCircle2} label="Leads ativos" value={stats?.leads_ativos} tone="good" />
            <StatCard icon={Clock} label="Leads expirados" value={stats?.leads_expirados} />
            <StatCard icon={Ban} label="Leads ignorados" value={stats?.leads_ignorados} />
            <StatCard icon={Send} label="Propostas enviadas" value={stats?.propostas_total} />
            <StatCard icon={ThumbsUp} label="Propostas aceitas" value={stats?.propostas_aceitas} tone="good" />
            <StatCard icon={ThumbsDown} label="Propostas recusadas" value={stats?.propostas_recusadas} tone="bad" />
          </div>
        </div>

        {notifs.length > 0 && (
          <div className="rounded-2xl border-2 border-accent bg-accent/10 p-4">
            <p className="mb-2 font-semibold">Novos stands para rever ({notifs.length})</p>
            <div className="space-y-1">
              {notifs.map(n => (
                <div key={n.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{n.payload?.empresa} · {n.payload?.email} · {new Date(n.created_at).toLocaleString("pt-PT")}</span>
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Marcar como lido</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold">Atividade recente</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSection("audit")}>Ver tudo</Button>
          </div>
          <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
            {audit.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground text-sm">Sem registos.</p>
            ) : (
              <ul className="divide-y">
                {audit.slice(0, 5).map(e => (
                  <li key={e.id} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-sm">
                    <span>{actionLabel(e.action)} · <span className="text-muted-foreground">{lojistaName(e.target_lojista_id)}</span></span>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-PT")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="propostas" className="space-y-6">

        {/* TABELA PROPOSTAS */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-5 w-5" />
            <h2 className="font-display text-xl font-bold">Propostas</h2>
            <span className="text-sm text-muted-foreground">({propostasAll.length})</span>
          </div>
          <div className="rounded-2xl border bg-card shadow-soft overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left">
                  <th className="px-3 py-2">Lead</th>
                  <th className="px-3 py-2">Stand</th>
                  <th className="px-3 py-2">Veículo</th>
                  <th className="px-3 py-2">Preço</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Enviada</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Email enviado em</th>
                  <th className="px-3 py-2">Erro</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {propostasAll.map((p: any) => {
                  const em = p.email;
                  const emStatus = em?.status as string | undefined;
                  const needsResend = !em || ["failed", "dlq", "bounced", "suppressed"].includes(emStatus || "");
                  const emBadge = !em ? <Badge variant="outline">sem registo</Badge>
                    : emStatus === "sent" ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">enviado</Badge>
                    : emStatus === "pending" ? <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">pendente</Badge>
                    : <Badge className="bg-red-500/15 text-red-700 border-red-500/30">{emStatus}</Badge>;
                  const isPOpen = expandedProposta === p.id;
                  return (
                  <Fragment key={p.id}>
                  <tr className="border-t hover:bg-secondary/30 cursor-pointer" onClick={() => setExpandedProposta(isPOpen ? null : p.id)}>
                    <td className="px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1">
                        {isPOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {p.lead?.nome || p.lead_id?.slice(0,8)}
                      </span>
                      <div className="text-muted-foreground">{p.lead?.localizacao}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{p.lojista?.empresa || "—"}<div className="text-muted-foreground">{p.lojista?.email}</div></td>
                    <td className="px-3 py-2">{p.marca_modelo || "—"} {p.ano ? `· ${p.ano}` : ""}</td>
                    <td className="px-3 py-2">{p.preco != null ? `${p.preco}€` : "—"}</td>
                    <td className="px-3 py-2"><Badge className={
                      p.status === "aceita" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" :
                      p.status === "recusada" ? "bg-red-500/15 text-red-700 border-red-500/30" :
                      "bg-orange-500/15 text-orange-700 border-orange-500/30"
                    }>{p.status || "enviada"}</Badge></td>
                    <td className="px-3 py-2 text-xs">{new Date(p.created_at).toLocaleString("pt-PT")}</td>
                    <td className="px-3 py-2 text-xs">{emBadge}</td>
                    <td className="px-3 py-2 text-xs">{em?.created_at ? new Date(em.created_at).toLocaleString("pt-PT") : "—"}</td>
                    <td className="px-3 py-2 text-xs text-red-700 max-w-[200px] truncate" title={em?.error_message || ""}>{em?.error_message || "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant={needsResend ? "default" : "ghost"} onClick={() => reenviarEmailProposta(p.id)} title="Reenviar email">
                        <Send className="h-3 w-3 mr-1" />Reenviar
                      </Button>
                      {p.status !== "aceita" && <Button size="sm" variant="ghost" onClick={() => setProposalStatus(p.id, "aceita")}><ThumbsUp className="h-3 w-3" /></Button>}
                      {p.status !== "recusada" && <Button size="sm" variant="ghost" onClick={() => setProposalStatus(p.id, "recusada")}><ThumbsDown className="h-3 w-3" /></Button>}
                      <Button size="sm" variant="ghost" onClick={() => deleteProposta(p.id, p.lead_id)} title="Excluir proposta"><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                  {isPOpen && (
                    <tr key={p.id + "-d"} className="bg-secondary/20">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="grid gap-2 text-xs sm:grid-cols-2">
                          {p.km != null && <span><b>Km:</b> {p.km}</span>}
                          {p.combustivel && <span><b>Combustível:</b> {p.combustivel}</span>}
                          {p.caixa && <span><b>Caixa:</b> {p.caixa}</span>}
                          {p.distrito && <span><b>Distrito:</b> {p.distrito}</span>}
                          <span><b>Aceita retoma:</b> {p.aceita_retoma ? "Sim" : "Não"}</span>
                          {p.aceita_retoma && p.valor_retoma != null && <span><b>Valor retoma:</b> {p.valor_retoma}€</span>}
                          <span><b>Financiamento:</b> {p.oferece_financiamento ? "Sim" : "Não"}</span>
                          <span><b>Garantia:</b> {p.tem_garantia ? `Sim${p.garantia_meses ? ` (${p.garantia_meses}m)` : ""}` : "Não"}</span>
                        </div>
                        {p.descricao && <p className="mt-2 text-xs whitespace-pre-wrap"><b>Descrição:</b> {p.descricao}</p>}
                        {p.extras && <p className="mt-1 text-xs"><b>Extras:</b> {p.extras}</p>}
                        {p.condicoes_financiamento && <p className="mt-1 text-xs"><b>Condições financ.:</b> {p.condicoes_financiamento}</p>}
                        {p.motivo_recusa && <p className="mt-1 text-xs text-red-700"><b>Motivo recusa:</b> {p.motivo_recusa}</p>}
                        {p.link_anuncio && /^https?:\/\//i.test(p.link_anuncio) && (
                          <p className="mt-1 text-xs"><a href={p.link_anuncio} target="_blank" rel="noopener noreferrer" className="text-primary underline">Ver anúncio</a></p>
                        )}
                        {p.mensagem && <p className="mt-2 text-xs whitespace-pre-wrap">{p.mensagem}</p>}
                        {p.fotos && p.fotos.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {p.fotos.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded border bg-card">
                                <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover hover:opacity-80 transition" />
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )})}
                {propostasAll.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Sem propostas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="stands" className="space-y-4">
        <div className="mb-2 flex items-center gap-2">
          <Store className="h-5 w-5" />
          <h2 className="font-display text-xl font-bold">Stands</h2>
          <span className="text-sm text-muted-foreground">({lojistas.length})</span>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {(["todos", "pendente", "aprovado", "rejeitado"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "hero" : "outline"} onClick={() => setFilter(f)}>
              {f} ({f === "todos" ? lojistas.length : lojistas.filter(l => l.status === f).length})
            </Button>
          ))}
        </div>

        <div className="grid gap-3">
          {filtered.map(l => {
            const isOpen = expandedLojista === l.id;
            return (
            <div key={l.id} className="rounded-2xl border bg-card shadow-soft overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedLojista(isOpen ? null : l.id)}
                className="w-full text-left p-4 hover:bg-secondary/30 transition flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className="font-display text-base font-bold truncate">{l.empresa}</span>
                  <Badge className={
                    l.status === "aprovado" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" :
                    l.status === "rejeitado" ? "bg-red-500/15 text-red-700 border-red-500/30" :
                    "bg-orange-500/15 text-orange-700 border-orange-500/30"
                  }>{l.status}</Badge>
                  {l.subscription_active && <Badge className="bg-accent text-accent-foreground"><ShieldCheck className="h-3 w-3 mr-1" />Ativa</Badge>}
                  {l.deleted_at && <Badge className="bg-red-600 text-white">Excluído</Badge>}
                </div>
                <span className="text-xs text-muted-foreground truncate">{l.email} · {l.cidade || "—"}</span>
              </button>
              {isOpen && (
              <div className="border-t p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mt-1 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <span>NIF: {l.nif}</span>
                    <span>Email: {l.email}</span>
                    <span>WhatsApp: {l.whatsapp}</span>
                    {l.telefone && <span>Telefone: {l.telefone}</span>}
                    {l.nome_responsavel && <span>Responsável: {l.nome_responsavel}</span>}
                    <span>Cidade: {l.cidade}</span>
                    {l.regiao && <span>Região: {l.regiao}</span>}
                    {l.localizacao && <span>Localização: {l.localizacao}</span>}
                    {l.morada && <span className="sm:col-span-2">Morada: {l.morada}</span>}
                    {l.website && <span className="sm:col-span-2">Website: <a href={l.website} target="_blank" rel="noreferrer" className="text-primary underline">{l.website}</a></span>}
                    {l.marcas && <span className="sm:col-span-2">Marcas: {l.marcas}</span>}
                    {l.tipo_veiculos && <span>Tipo veículos: {l.tipo_veiculos}</span>}
                    {l.tipos_carro && <span>Tipos carro: {l.tipos_carro}</span>}
                    {l.faixa_preco && <span>Faixa preço: {l.faixa_preco}</span>}
                    <span>Aceita retoma: {l.aceita_retoma ? "Sim" : "Não"}</span>
                    <span>Faz financiamento: {l.faz_financiamento ? "Sim" : "Não"}</span>
                    <span>Garantia: {l.tem_garantia ? "Sim" : "Não"}</span>
                    <span>Aceita revenda: {l.aceita_revenda ? "Sim" : "Não"}</span>
                    <span>Aceita particular: {l.aceita_particular ? "Sim" : "Não"}</span>
                    <span>
                      Acesso: {l.subscription_active && new Date(l.trial_ends_at).getTime() > Date.now()
                        ? `ativo até ${new Date(l.trial_ends_at).toLocaleDateString("pt-PT")}`
                        : "inativo (aguarda pagamento/cupom)"}
                      {(l as any).activated_via && ` · via ${(l as any).activated_via}`}
                    </span>
                    <span>Registo: {new Date(l.created_at).toLocaleDateString("pt-PT")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.status !== "aprovado" && (
                    <Button size="sm" variant="hero" onClick={() => setStatus(l.id, "aprovado")}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
                    </Button>
                  )}
                  {l.status !== "rejeitado" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "rejeitado")}>
                      <XCircle className="h-4 w-4 mr-1" />Rejeitar
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => grantAccess(l.id)}>
                    <Calendar className="h-4 w-4 mr-1" />Liberar dias
                  </Button>
                  {!l.deleted_at && (
                    <Button size="sm" variant="destructive" onClick={() => deleteLojista(l.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />Excluir stand
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Documentos enviados</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Fachada do Stand", l.doc_fachada_url],
                    ["Atividade", l.doc_atividade_url],
                    ["Responsável", l.doc_responsavel_url],
                    ["Morada", l.doc_morada_url],
                  ].map(([label, path]) => (
                    <Button key={label as string} size="sm" variant="secondary" onClick={() => openDoc(l.id, label as string, path as string)} disabled={!path}>
                      <FileText className="h-3.5 w-3.5 mr-1" />{label as string}{!path && " (não enviado)"}
                    </Button>
                  ))}
                </div>
              </div>
              </div>
              )}
            </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Sem stands neste filtro.</p>
          )}
        </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
        <div className="mt-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="font-display text-xl font-bold">Leads de compradores</h2>
            <span className="text-sm text-muted-foreground">({leads.length} total)</span>
            <Button size="sm" variant="secondary" className="ml-auto" disabled={exporting}
              onClick={async () => {
                setExporting(true);
                toast.loading("A gerar ficheiro Excel...", { id: "xls" });
                try {
                  const r = await exportLeadsToExcel();
                  toast.success(`Excel gerado: ${r.leads} leads e ${r.propostas} propostas.`, { id: "xls" });
                } catch (e: any) {
                  toast.error(e?.message || "Falha ao gerar Excel", { id: "xls" });
                } finally {
                  setExporting(false);
                }
              }}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />{exporting ? "A gerar..." : "Exportar Excel"}
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {([
              ["todos","Todos"],["ativo","Ativos"],["expirado","Expirados"],["completo","Completos"],
              ["pendente","Pendentes"],["com_proposta","Com proposta"],["sem_proposta","Sem proposta"],
              ["ignorado","Ignorados"],["aceite","Aceites"],["recusada","Recusadas"],
              ["negociacao","Em negociação"],["finalizado","Finalizados"],
            ] as [LeadFilter,string][]).map(([f,label]) => {
              const count = f === "todos" ? leads.length : leads.filter(l => matchesLeadFilterFor(l, f)).length;
              return (
                <Button key={f} size="sm" variant={leadFilter === f ? "hero" : "outline"} onClick={() => setLeadFilter(f)}>
                  {label} ({count})
                </Button>
              );
            })}
          </div>
          {(() => {
            const expiredLeads = leads.filter(l => leadStateOf(l) === "expirado" && !l.deleted_at);
            const expiredIds = expiredLeads.map(l => l.id);
            const selectedIds = expiredIds.filter(id => selectedExpired.has(id));
            const allSelected = expiredIds.length > 0 && selectedIds.length === expiredIds.length;
            return (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-secondary/30 p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      setSelectedExpired(e.target.checked ? new Set(expiredIds) : new Set());
                    }}
                  />
                  Selecionar todos os leads expirados ({expiredLeads.length})
                </label>
                <span className="text-xs text-muted-foreground">{selectedIds.length} selecionado(s)</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" disabled={selectedIds.length === 0}
                    onClick={() => bulkExtendExpired(selectedIds, "selecionados")}>
                    <Calendar className="h-4 w-4 mr-1" />Estender selecionados por +24h
                  </Button>
                  <Button size="sm" variant="hero" disabled={expiredIds.length === 0}
                    onClick={() => bulkExtendExpired(expiredIds, "todos")}>
                    <Calendar className="h-4 w-4 mr-1" />Estender todos os expirados por +24h
                  </Button>
                </div>
              </div>
            );
          })()}
          <div className="grid gap-3">

            {leads.filter(matchesLeadFilter).map(l => {
              const state = leadStateOf(l);
              const isOpen = expandedLead === l.id;
              const props = propostasByLead[l.id] || [];
              return (
                <div key={l.id} className="rounded-2xl border bg-card shadow-soft overflow-hidden">
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {state === "expirado" && !l.deleted_at && (
                            <input
                              type="checkbox"
                              checked={selectedExpired.has(l.id)}
                              onChange={(e) => {
                                setSelectedExpired(prev => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(l.id); else next.delete(l.id);
                                  return next;
                                });
                              }}
                              title="Selecionar para ação em massa"
                            />
                          )}
                          <button onClick={() => toggleLead(l.id)} className="inline-flex items-center gap-1 font-semibold hover:underline">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {l.nome}
                          </button>
                          <Badge className={
                            state === "ativo" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" :
                            state === "completo" ? "bg-blue-500/15 text-blue-700 border-blue-500/30" :
                            "bg-gray-500/15 text-gray-700 border-gray-500/30"
                          }>{state}</Badge>
                          <Badge variant="outline">{l.propostas_count}/10 propostas</Badge>
                          {l.deleted_at && <Badge className="bg-red-600 text-white">Excluído · {new Date(l.deleted_at).toLocaleString("pt-PT")}</Badge>}
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{l.email}</span>
                          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{l.whatsapp}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.localizacao}</span>
                          <span>Procura: {l.marca_modelo || "—"} {l.preco_max ? `· até ${l.preco_max}€` : ""}</span>
                          <span>Criado: {new Date(l.created_at).toLocaleString("pt-PT")}</span>
                          <span>Expira: {new Date(l.expires_at).toLocaleString("pt-PT")}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => extendLead(l.id)}>
                          <Calendar className="h-4 w-4 mr-1" />Estender
                        </Button>
                        {!l.deleted_at && (
                          <Button size="sm" variant="destructive" onClick={() => deleteLead(l.id)}>
                            <Trash2 className="h-4 w-4 mr-1" />Excluir lead
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t bg-secondary/30 p-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold mb-2">Procura</p>
                        <div className="grid gap-1 text-sm sm:grid-cols-2">
                          {l.tipo_compra && <span><b>Tipo de compra:</b> {l.tipo_compra}</span>}
                          {l.forma_pagamento && <span><b>Pagamento:</b> {l.forma_pagamento}</span>}
                          {l.tipo_carro && <span><b>Tipo:</b> {l.tipo_carro}</span>}
                          {l.combustivel && <span><b>Combustível:</b> {l.combustivel}</span>}
                          {l.caixa && <span><b>Caixa:</b> {l.caixa}</span>}
                          {l.cor && <span><b>Cor:</b> {l.cor}</span>}
                          {l.versao && <span><b>Versão:</b> {l.versao}</span>}
                          {l.ano_min && <span><b>Ano min:</b> {l.ano_min}</span>}
                          {l.ano_max && <span><b>Ano max:</b> {l.ano_max}</span>}
                          {l.km_max != null && <span><b>Km max:</b> {l.km_max}</span>}
                          {l.preco_max != null && <span><b>Preço max:</b> {l.preco_max}€</span>}
                          {l.marcas_preferidas && <span className="sm:col-span-2"><b>Marcas:</b> {l.marcas_preferidas}</span>}
                          {l.extras && <span className="sm:col-span-2"><b>Extras:</b> {l.extras}</span>}
                          {l.urgencia && <span><b>Urgência:</b> {l.urgencia}</span>}
                        </div>
                        {l.observacoes && <p className="mt-2 text-sm"><b>Observações:</b> {l.observacoes}</p>}
                      </div>

                      {l.tem_retoma && (
                        <div>
                          <p className="text-sm font-semibold mb-2">Retoma</p>
                          <div className="grid gap-1 text-sm sm:grid-cols-2">
                            {l.retoma_marca && <span><b>Marca:</b> {l.retoma_marca}</span>}
                            {l.retoma_modelo && <span><b>Modelo:</b> {l.retoma_modelo}</span>}
                            {l.retoma_ano && <span><b>Ano:</b> {l.retoma_ano}</span>}
                            {l.retoma_km != null && <span><b>Km:</b> {l.retoma_km}</span>}
                            {l.retoma_combustivel && <span><b>Combustível:</b> {l.retoma_combustivel}</span>}
                            {l.retoma_caixa && <span><b>Caixa:</b> {l.retoma_caixa}</span>}
                            {l.retoma_estado && <span><b>Estado:</b> {l.retoma_estado}</span>}
                            {l.retoma_valor_esperado != null && <span><b>Valor esperado:</b> {l.retoma_valor_esperado}€</span>}
                            {l.retoma_tem_danos != null && <span><b>Tem danos:</b> {l.retoma_tem_danos ? "Sim" : "Não"}</span>}
                          </div>
                          {l.retoma_observacoes && <p className="mt-2 text-sm"><b>Obs retoma:</b> {l.retoma_observacoes}</p>}
                          {l.retoma_fotos && l.retoma_fotos.length > 0 && (
                            <>
                              <p className="mt-3 text-xs font-semibold text-muted-foreground">Fotos da retoma</p>
                              <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {l.retoma_fotos.map((raw, i) => {
                                  const hasCat = raw.includes("|") && !raw.startsWith("http");
                                  const [cat, url] = hasCat ? raw.split("|") : ["", raw];
                                  const fotoUrl = url || raw;
                                  const label = cat ? cat.replace(/_/g, " ") : `Retoma ${i + 1}`;
                                  return (
                                    <a key={i} href={fotoUrl} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg border bg-card">
                                      <img src={fotoUrl} alt={label} className="h-full w-full object-cover hover:opacity-80 transition" />
                                    </a>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          {l.retoma_fotos_danos && l.retoma_fotos_danos.length > 0 && (
                            <>
                              <p className="mt-3 text-xs font-semibold text-red-700">Fotos dos danos</p>
                              <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {l.retoma_fotos_danos.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg border-2 border-red-300 bg-card">
                                    <img src={url} alt={`Dano ${i + 1}`} className="h-full w-full object-cover hover:opacity-80 transition" />
                                  </a>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {l.precisa_financiamento && (
                        <div>
                          <p className="text-sm font-semibold mb-2">Financiamento</p>
                          <div className="grid gap-1 text-sm sm:grid-cols-2">
                            {l.financiamento_entrada != null && <span><b>Entrada:</b> {l.financiamento_entrada}€</span>}
                            {l.financiamento_prestacao != null && <span><b>Prestação:</b> {l.financiamento_prestacao}€</span>}
                            {l.situacao_residencia && <span><b>Residência:</b> {l.situacao_residencia}</span>}
                            {l.situacao_profissional && <span><b>Profissional:</b> {l.situacao_profissional}{l.situacao_profissional_outros ? ` (${l.situacao_profissional_outros})` : ""}</span>}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold mb-2">Propostas recebidas ({props.length})</p>
                        {props.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sem propostas ainda.</p>
                        ) : (
                          <div className="space-y-2">
                            {props.map(p => (
                              <div key={p.id} className="rounded-lg bg-card p-3 text-sm border">
                                <div className="flex justify-between flex-wrap gap-2">
                                  <div>
                                    <span className="font-semibold">{p.lojistas?.empresa || "—"}</span>
                                    {p.lojistas?.email && <span className="text-xs text-muted-foreground ml-2">{p.lojistas.email}</span>}
                                    {p.lojistas?.whatsapp && <span className="text-xs text-muted-foreground ml-2">{p.lojistas.whatsapp}</span>}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-PT")}</span>
                                </div>
                                <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                                  {p.marca_modelo && <span><b>Carro:</b> {p.marca_modelo}</span>}
                                  {p.preco != null && <span><b>Preço:</b> {p.preco}€</span>}
                                  {p.ano && <span><b>Ano:</b> {p.ano}</span>}
                                  {p.km != null && <span><b>Km:</b> {p.km}</span>}
                                  {p.combustivel && <span><b>Combustível:</b> {p.combustivel}</span>}
                                  {p.caixa && <span><b>Caixa:</b> {p.caixa}</span>}
                                  {p.distrito && <span><b>Distrito:</b> {p.distrito}</span>}
                                  <span><b>Aceita retoma:</b> {p.aceita_retoma ? "Sim" : "Não"}</span>
                                  {p.aceita_retoma && p.valor_retoma != null && <span><b>Valor retoma:</b> {p.valor_retoma}€</span>}
                                  <span><b>Financiamento:</b> {p.oferece_financiamento ? "Sim" : "Não"}</span>
                                  <span><b>Garantia:</b> {p.tem_garantia ? `Sim${p.garantia_meses ? ` (${p.garantia_meses} meses)` : ""}` : "Não"}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                  <Badge className={
                                    p.deleted_at ? "bg-red-600 text-white" :
                                    p.status === "aceita" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" :
                                    p.status === "recusada" ? "bg-red-500/15 text-red-700 border-red-500/30" :
                                    "bg-orange-500/15 text-orange-700 border-orange-500/30"
                                  }>{p.deleted_at ? `Excluída · ${new Date(p.deleted_at).toLocaleString("pt-PT")}` : (p.status || "enviada")}</Badge>
                                  {!p.deleted_at && p.status !== "aceita" && <Button size="sm" variant="ghost" onClick={() => setProposalStatus(p.id, "aceita")}><ThumbsUp className="h-3 w-3 mr-1" />Aceitar</Button>}
                                  {!p.deleted_at && p.status !== "recusada" && <Button size="sm" variant="ghost" onClick={() => setProposalStatus(p.id, "recusada")}><ThumbsDown className="h-3 w-3 mr-1" />Recusar</Button>}
                                  {!p.deleted_at && <Button size="sm" variant="destructive" onClick={() => deleteProposta(p.id, l.id)}><Trash2 className="h-3 w-3 mr-1" />Excluir proposta</Button>}
                                </div>
                                {p.descricao && <p className="mt-2 text-xs whitespace-pre-wrap"><b>Descrição:</b> {p.descricao}</p>}
                                {p.extras && <p className="mt-1 text-xs"><b>Extras:</b> {p.extras}</p>}
                                {p.condicoes_financiamento && <p className="mt-1 text-xs"><b>Condições financ.:</b> {p.condicoes_financiamento}</p>}
                                {p.motivo_recusa && <p className="mt-1 text-xs text-red-700"><b>Motivo recusa:</b> {p.motivo_recusa}</p>}
                                {p.link_anuncio && /^https?:\/\//i.test(p.link_anuncio) && (
                                  <p className="mt-1 text-xs">
                                    <a href={p.link_anuncio} target="_blank" rel="noopener noreferrer" className="text-primary underline">Ver anúncio</a>
                                  </p>
                                )}
                                {p.mensagem && <p className="mt-2 text-sm whitespace-pre-wrap">{p.mensagem}</p>}
                                {p.fotos && p.fotos.length > 0 && (
                                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                    {p.fotos.map((url: string, i: number) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg border bg-card">
                                        <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover hover:opacity-80 transition" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold mb-2">Stands que ignoraram ({(ignoradosByLead[l.id] || []).length})</p>
                        {(ignoradosByLead[l.id] || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum stand ignorou este lead.</p>
                        ) : (
                          <div className="space-y-1">
                            {(ignoradosByLead[l.id] || []).map((a: any, i: number) => (
                              <div key={i} className="flex flex-wrap justify-between gap-2 text-xs rounded bg-card border px-3 py-2">
                                <span className="space-x-1">
                                  <span className="font-medium">{a.lojista?.empresa || a.lojista_id?.slice(0,8)}</span>
                                  {a.lojista?.email && <span className="text-muted-foreground">· {a.lojista.email}</span>}
                                  {a.lojista?.whatsapp && <span className="text-muted-foreground">· {a.lojista.whatsapp}</span>}
                                  <span className="text-muted-foreground">· Ignorado</span>
                                </span>
                                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-PT")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Histórico completo do lead */}
                      {(() => {
                        const h = historyByLead[l.id];
                        if (!h) return <p className="text-xs text-muted-foreground">A carregar histórico...</p>;
                        const stands = (h.stands || []) as any[];
                        const timeline = (h.timeline || []) as any[];
                        const props = (h.propostas || []) as any[];
                        const labelOf: Record<string, string> = {
                          lead_criado: "Lead criado",
                          lead_enviado: "Lead enviado para stand",
                          lead_ignorado: "Stand ignorou",
                          proposta_enviada: "Stand enviou proposta",
                          proposta_visualizada: "Cliente visualizou proposta",
                          proposta_aceita: "Cliente aceitou proposta",
                          proposta_recusada: "Cliente recusou proposta",
                          negociacao_cliente: "Cliente enviou contra-proposta",
                          negociacao_lojista: "Stand respondeu na negociação",
                          lead_fechado: "Lead encerrado pelo cliente",
                          email_proposta_respondida_stand: "📧 Email enviado ao stand (proposta respondida)",
                          email_negociacao_stand: "📧 Email enviado ao stand (negociação)",
                        };
                        return (
                          <div className="space-y-4 rounded-xl border-2 border-primary/20 bg-card p-4">
                            <p className="text-base font-bold text-primary">📋 Histórico completo do lead</p>

                            <div>
                              <p className="text-sm font-semibold mb-2">Stands que receberam o lead ({stands.length})</p>
                              {stands.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Sem registos.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border">
                                    <thead className="bg-secondary/50">
                                      <tr>
                                        <th className="px-2 py-1 text-left">Stand</th>
                                        <th className="px-2 py-1 text-left">Recebido</th>
                                        <th className="px-2 py-1 text-left">Visualizou</th>
                                        <th className="px-2 py-1 text-left">Ignorou</th>
                                        <th className="px-2 py-1 text-left">Proposta</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {stands.map((s, i) => (
                                        <tr key={i} className="border-t">
                                          <td className="px-2 py-1">
                                            <div className="font-medium">{s.empresa || s.lojista_id?.slice(0,8)}</div>
                                            <div className="text-muted-foreground">{s.email}</div>
                                          </td>
                                          <td className="px-2 py-1">{s.received_at ? new Date(s.received_at).toLocaleString("pt-PT") : "—"}</td>
                                          <td className="px-2 py-1">{s.visto_at ? new Date(s.visto_at).toLocaleString("pt-PT") : "—"}</td>
                                          <td className="px-2 py-1">{s.ignored_at ? <span className="text-red-700">{new Date(s.ignored_at).toLocaleString("pt-PT")}</span> : "—"}</td>
                                          <td className="px-2 py-1">{s.proposta_at ? <span className="text-emerald-700">{new Date(s.proposta_at).toLocaleString("pt-PT")}</span> : "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Negociações por proposta */}
                            <div>
                              <p className="text-sm font-semibold mb-2">Negociações</p>
                              {props.filter(p => (p.negociacoes || []).length > 0).length === 0 ? (
                                <p className="text-xs text-muted-foreground">Sem negociações.</p>
                              ) : (
                                <div className="space-y-3">
                                  {props.filter(p => (p.negociacoes || []).length > 0).map(p => (
                                    <div key={p.id} className="rounded-lg border bg-secondary/30 p-3">
                                      <div className="flex justify-between flex-wrap gap-2 text-sm">
                                        <span className="font-semibold">{p.lojista?.empresa || "Stand"} · {p.marca_modelo || ""}</span>
                                        <Badge variant="outline">{p.status}</Badge>
                                      </div>
                                      <div className="mt-2 space-y-2">
                                        {(p.negociacoes || []).map((n: any, i: number) => (
                                          <div key={i} className={`rounded-md p-2 text-xs ${n.origem === "cliente" ? "bg-blue-500/10 border border-blue-500/30" : "bg-emerald-500/10 border border-emerald-500/30"}`}>
                                            <div className="flex justify-between gap-2">
                                              <span className="font-semibold">{n.origem === "cliente" ? "🧑 Cliente" : "🏪 Stand"}</span>
                                              <span className="text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-PT")}</span>
                                            </div>
                                            {n.preco_proposto != null && <div className="mt-1"><b>Preço proposto:</b> {n.preco_proposto}€</div>}
                                            {n.mensagem && <div className="mt-1 whitespace-pre-wrap">{n.mensagem}</div>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Timeline */}
                            <div>
                              <p className="text-sm font-semibold mb-2">Sequência cronológica ({timeline.length})</p>
                              {timeline.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Sem eventos.</p>
                              ) : (
                                <ol className="relative border-l-2 border-primary/30 ml-2 space-y-3">
                                  {timeline.map((e: any, i: number) => (
                                    <li key={i} className="ml-4">
                                      <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary" />
                                      <div className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString("pt-PT")}</div>
                                      <div className="text-sm font-medium">{labelOf[e.type] || e.type}</div>
                                      {e.payload && (
                                        <div className="text-xs text-muted-foreground">
                                          {e.payload.empresa && <span>Stand: <b>{e.payload.empresa}</b> </span>}
                                          {e.payload.preco != null && <span>· {e.payload.preco}€ </span>}
                                          {e.payload.preco_proposto != null && <span>· proposto {e.payload.preco_proposto}€ </span>}
                                          {e.payload.mensagem && <span>· "{e.payload.mensagem}"</span>}
                                          {e.payload.motivo && <span>· motivo: {e.payload.motivo}</span>}
                                          {e.payload.recipient && <span>· para: {e.payload.recipient}</span>}
                                          {e.payload.status && <span className={e.payload.status === "failed" || e.payload.status === "dlq" ? "text-red-700 font-semibold" : ""}> · {e.payload.status}</span>}
                                          {e.payload.error && <div className="text-red-700">⚠️ {e.payload.error}</div>}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
            {leads.filter(matchesLeadFilter).length === 0 && (
              <p className="text-center text-muted-foreground py-12">Sem leads neste filtro.</p>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="cupons" className="space-y-4">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            <h2 className="font-display text-xl font-bold">Cupons de acesso</h2>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-soft mb-4">
            <div className="grid gap-2 sm:grid-cols-5">
              <Input placeholder="CÓDIGO" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="uppercase" />
              <Input type="number" placeholder="Dias" value={newDays} onChange={(e) => setNewDays(e.target.value)} />
              <Input type="number" placeholder="Máx usos" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)} />
              <Input placeholder="Notas (opcional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="sm:col-span-1" />
              <Button variant="hero" onClick={createCoupon}><Plus className="h-4 w-4 mr-1" />Criar</Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-card shadow-soft overflow-hidden mb-12">
            {coupons.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">Sem cupons criados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr className="text-left">
                    <th className="px-4 py-2">Código</th>
                    <th className="px-4 py-2">Dias</th>
                    <th className="px-4 py-2">Usos</th>
                    <th className="px-4 py-2">Notas</th>
                    <th className="px-4 py-2">Criado</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-2 font-mono font-bold">{c.code}</td>
                      <td className="px-4 py-2">{c.duration_days}</td>
                      <td className="px-4 py-2">{c.used_count}/{c.max_uses}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{c.notes || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString("pt-PT")}</td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => deleteCoupon(c.id)}>Apagar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
        <div>
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            <h2 className="font-display text-xl font-bold">Log de auditoria</h2>
            <span className="text-sm text-muted-foreground">(últimas 50 ações)</span>
          </div>
          <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
            {audit.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">Sem registos ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr className="text-left">
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Ação</th>
                    <th className="px-4 py-2">Stand</th>
                    <th className="px-4 py-2">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map(e => (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString("pt-PT")}</td>
                      <td className="px-4 py-2">{actionLabel(e.action)}</td>
                      <td className="px-4 py-2">{lojistaName(e.target_lojista_id)}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {e.details ? Object.entries(e.details).map(([k, v]) => `${k}: ${v}`).join(" · ") : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </div>
          </TabsContent>
        </Tabs>
      </section>
      <SiteFooter />
    </div>
  );
};

export default Admin;
