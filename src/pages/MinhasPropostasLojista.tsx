import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, Check, X, MessageSquare, Phone, Mail, Search, Loader2, ArrowLeft } from "lucide-react";

type Negociacao = { origem: "cliente" | "lojista"; preco_proposto?: number; mensagem?: string; created_at: string };
type Proposta = {
  id: string; status: string; preco: number; marca_modelo: string;
  ano?: number; km?: number; combustivel?: string; caixa?: string;
  descricao?: string; mensagem?: string; fotos?: string[];
  tem_garantia?: boolean; garantia_meses?: number;
  aceita_retoma?: boolean; valor_retoma?: number;
  oferece_financiamento?: boolean; condicoes_financiamento?: string;
  distrito?: string; extras?: string; link_anuncio?: string;
  created_at: string; visualizada_at?: string;
  aceita_at?: string; recusada_at?: string; motivo_recusa?: string;
  lead: {
    id: string; nome_parcial: string; nome_full?: string;
    email?: string; whatsapp?: string;
    marca_modelo?: string; localizacao?: string; preco_max?: number;
    expires_at: string; fechado: boolean;
  };
  negociacoes: Negociacao[];
};

const fmt = (n?: number) => typeof n === "number" ? n.toLocaleString("pt-PT") + " €" : "—";
const dt = (s?: string) => s ? new Date(s).toLocaleString("pt-PT") : "—";

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    enviada: { label: "Enviada", cls: "bg-blue-500" },
    visualizada: { label: "Visualizada", cls: "bg-indigo-500" },
    negociando: { label: "Em negociação", cls: "bg-amber-500" },
    aceita: { label: "Aprovada", cls: "bg-green-600" },
    recusada: { label: "Reprovada", cls: "bg-red-600" },
    expirada: { label: "Expirada", cls: "bg-gray-500" },
  };
  const m = map[s] || { label: s, cls: "bg-secondary" };
  return <Badge className={m.cls + " text-white"}>{m.label}</Badge>;
};

const MinhasPropostasLojista = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [detail, setDetail] = useState<Proposta | null>(null);
  const [busy, setBusy] = useState(false);

  // counter-offer dialog
  const [contraOpen, setContraOpen] = useState(false);
  const [contraPreco, setContraPreco] = useState("");
  const [contraMsg, setContraMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data, error } = await supabase.rpc("lojista_get_propostas");
    if (error) { toast.error(error.message); setLoading(false); return; }
    setPropostas(((data as any)?.propostas || []) as Proposta[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return propostas.filter(p => {
      if (filterStatus !== "todos" && p.status !== filterStatus) return false;
      if (q) {
        const hay = `${p.marca_modelo} ${p.lead.nome_parcial} ${p.lead.localizacao ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [propostas, search, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { enviada: 0, visualizada: 0, negociando: 0, aceita: 0, recusada: 0, expirada: 0 };
    propostas.forEach(p => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [propostas]);

  const responder = async (decisao: "aceitar" | "rejeitar" | "contraoferta", preco?: number, mensagem?: string) => {
    if (!detail) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("lojista_responder_contraproposta", {
      _proposta_id: detail.id, _decisao: decisao,
      _preco: preco ?? null, _mensagem: mensagem ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(decisao === "aceitar" ? "Contraproposta aceite" : decisao === "rejeitar" ? "Contraproposta rejeitada" : "Nova proposta enviada");
    setContraOpen(false); setContraPreco(""); setContraMsg("");
    setDetail(null);
    await load();
    return data;
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <SiteHeader />
      <section className="container flex-1 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/painel")}><ArrowLeft className="h-4 w-4" /> Painel</Button>
            <h1 className="font-display text-2xl font-bold">Minhas Propostas</h1>
          </div>
          <Badge variant="outline">{propostas.length} no total</Badge>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-6">
          {[
            ["enviada","Enviadas"],["visualizada","Vistas"],["negociando","Em negociação"],
            ["aceita","Aprovadas"],["recusada","Reprovadas"],["expirada","Expiradas"],
          ].map(([k,l]) => (
            <Card key={k} className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="text-xl font-bold">{counts[k] || 0}</p>
            </Card>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Procurar por carro, cliente, distrito..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="visualizada">Visualizada</SelectItem>
              <SelectItem value="negociando">Em negociação</SelectItem>
              <SelectItem value="aceita">Aprovada</SelectItem>
              <SelectItem value="recusada">Reprovada</SelectItem>
              <SelectItem value="expirada">Expirada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">Sem propostas para mostrar.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Veículo</th>
                  <th className="px-3 py-2">Preço</th>
                  <th className="px-3 py-2">Enviada</th>
                  <th className="px-3 py-2">Última atualização</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const last = p.aceita_at || p.recusada_at || (p.negociacoes?.length ? p.negociacoes[p.negociacoes.length-1].created_at : p.visualizada_at) || p.created_at;
                  return (
                    <tr key={p.id} className="border-t hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        <p className="font-medium">{p.lead.nome_parcial}</p>
                        <p className="text-xs text-muted-foreground">{p.lead.localizacao}</p>
                      </td>
                      <td className="px-3 py-2">{p.marca_modelo}</td>
                      <td className="px-3 py-2 font-semibold">{fmt(p.preco)}</td>
                      <td className="px-3 py-2 text-xs">{dt(p.created_at)}</td>
                      <td className="px-3 py-2 text-xs">{dt(last)}</td>
                      <td className="px-3 py-2">{statusBadge(p.status)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => setDetail(p)}>
                          <Eye className="h-4 w-4" /> Ver detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={v => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle>Proposta · {detail.marca_modelo}</DialogTitle>
                  {statusBadge(detail.status)}
                </div>
              </DialogHeader>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Lead</p>
                  <p className="text-sm">{detail.lead.nome_full || detail.lead.nome_parcial} · {detail.lead.localizacao}</p>
                  <p className="text-xs text-muted-foreground">Procura: {detail.lead.marca_modelo || "—"} · até {fmt(detail.lead.preco_max)}</p>
                  {detail.status === "aceita" && (
                    <div className="mt-2 rounded-lg border bg-green-500/5 p-3 text-sm">
                      <p className="mb-1 font-medium text-green-700">Cliente desbloqueado</p>
                      {detail.lead.whatsapp && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {detail.lead.whatsapp}</p>}
                      {detail.lead.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {detail.lead.email}</p>}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Veículo enviado</p>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <Info l="Preço" v={fmt(detail.preco)} />
                    <Info l="Ano" v={detail.ano} />
                    <Info l="KM" v={detail.km?.toLocaleString("pt-PT")} />
                    <Info l="Combustível" v={detail.combustivel} />
                    <Info l="Caixa" v={detail.caixa} />
                    <Info l="Garantia" v={detail.tem_garantia ? `${detail.garantia_meses}m` : "—"} />
                    <Info l="Retoma" v={detail.aceita_retoma ? fmt(detail.valor_retoma) : "Não"} />
                    <Info l="Financ." v={detail.oferece_financiamento ? "Sim" : "Não"} />
                  </div>
                  {detail.descricao && <p className="mt-2 text-sm">{detail.descricao}</p>}
                  {detail.mensagem && <p className="mt-2 rounded bg-secondary/50 p-2 text-sm">"{detail.mensagem}"</p>}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Histórico</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    <li>📤 <strong>{dt(detail.created_at)}</strong> — Proposta enviada por {fmt(detail.preco)}</li>
                    {detail.visualizada_at && <li>👁️ <strong>{dt(detail.visualizada_at)}</strong> — Cliente visualizou</li>}
                    {detail.negociacoes?.map((n, i) => (
                      <li key={i}>
                        💬 <strong>{dt(n.created_at)}</strong> — {n.origem === "cliente" ? "Cliente" : "Tu"} contraproposta: <span className="font-semibold text-primary">{fmt(n.preco_proposto)}</span>
                        {n.mensagem && <span className="text-muted-foreground"> — "{n.mensagem}"</span>}
                      </li>
                    ))}
                    {detail.aceita_at && <li>✅ <strong>{dt(detail.aceita_at)}</strong> — Cliente aprovou</li>}
                    {detail.recusada_at && <li>❌ <strong>{dt(detail.recusada_at)}</strong> — Cliente recusou</li>}
                  </ul>
                </div>

                {/* Actions */}
                {detail.status === "negociando" && (() => {
                  const ultima = [...(detail.negociacoes || [])].reverse().find(n => n.origem === "cliente");
                  const wa = detail.lead.whatsapp?.replace(/\D/g, "");
                  const msgWa = encodeURIComponent(
                    `Olá ${detail.lead.nome_full || detail.lead.nome_parcial}, recebi a sua contraproposta de ${fmt(ultima?.preco_proposto)} para o ${detail.marca_modelo}. Vamos conversar?`
                  );
                  return (
                    <div className="space-y-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-amber-800">💬 Contraproposta do cliente</p>
                        <p className="mt-1 text-2xl font-bold text-amber-900">{fmt(ultima?.preco_proposto)}</p>
                        <p className="text-xs text-muted-foreground">vs. tua proposta de {fmt(detail.preco)}</p>
                        {ultima?.mensagem && (
                          <p className="mt-2 rounded bg-white/70 p-2 text-sm italic">"{ultima.mensagem}"</p>
                        )}
                      </div>

                      <div className="rounded-lg border bg-white p-3">
                        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Contacta o cliente para negociar</p>
                        <p className="mb-3 text-sm font-medium">{detail.lead.nome_full}</p>
                        <div className="flex flex-wrap gap-2">
                          {wa && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                              <a href={`https://wa.me/${wa}?text=${msgWa}`} target="_blank" rel="noreferrer">
                                <Phone className="h-4 w-4" /> WhatsApp
                              </a>
                            </Button>
                          )}
                          {detail.lead.email && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`mailto:${detail.lead.email}`}>
                                <Mail className="h-4 w-4" /> Email
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-amber-200 pt-3">
                        <p className="w-full text-xs text-muted-foreground">Após falar com o cliente, atualiza o estado:</p>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => responder("aceitar")} disabled={busy}>
                          <Check className="h-4 w-4" /> Aceitar contraproposta
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setContraOpen(true)} disabled={busy}>
                          <MessageSquare className="h-4 w-4" /> Enviar nova proposta
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => responder("rejeitar")} disabled={busy}>
                          <X className="h-4 w-4" /> Rejeitar
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {detail.status === "aceita" && (() => {
                  const wa = detail.lead.whatsapp?.replace(/\D/g, "");
                  const msgWa = encodeURIComponent(
                    `Olá ${detail.lead.nome_full || detail.lead.nome_parcial}, obrigado por aceitar a proposta do ${detail.marca_modelo}! Vamos combinar os próximos passos para finalizar o negócio.`
                  );
                  return (
                    <div className="space-y-3 rounded-lg border-2 border-green-300 bg-green-50 p-4">
                      <div>
                        <p className="text-2xl">🎉 Parabéns!</p>
                        <p className="mt-1 font-semibold text-green-900">O cliente aceitou a tua proposta de {fmt(detail.preco)}</p>
                        <p className="mt-1 text-sm text-green-800">Entra em contacto agora para combinar os próximos passos e finalizar a negociação.</p>
                      </div>
                      <div className="rounded-lg border bg-white p-3">
                        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Contactos do cliente</p>
                        <p className="mb-3 text-sm font-medium">{detail.lead.nome_full}</p>
                        <div className="flex flex-wrap gap-2">
                          {wa && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                              <a href={`https://wa.me/${wa}?text=${msgWa}`} target="_blank" rel="noreferrer">
                                <Phone className="h-4 w-4" /> WhatsApp
                              </a>
                            </Button>
                          )}
                          {detail.lead.email && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`mailto:${detail.lead.email}`}>
                                <Mail className="h-4 w-4" /> Email
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {detail.status === "recusada" && (
                  <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-2xl">❌</p>
                    <p className="mt-1 font-semibold text-red-900">Proposta recusada pelo cliente</p>
                    <p className="mt-2 text-sm text-red-800">Não foi desta vez. Boa sorte na próxima proposta! 🍀</p>
                    <p className="mt-1 text-xs text-muted-foreground">Continua a enviar propostas competitivas para fechar mais negócios.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Counter-offer dialog */}
      <Dialog open={contraOpen} onOpenChange={setContraOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar nova proposta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Novo preço (€)</label>
              <Input type="number" value={contraPreco} onChange={e => setContraPreco(e.target.value)} placeholder="ex: 16500" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Mensagem (opcional)</label>
              <Textarea value={contraMsg} onChange={e => setContraMsg(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContraOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const p = parseFloat(contraPreco.replace(",", "."));
              if (!p || p <= 0) { toast.error("Indica um preço válido"); return; }
              responder("contraoferta", p, contraMsg || undefined);
            }} disabled={busy}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
};

const Info = ({ l, v }: { l: string; v: any }) => (
  <div><p className="text-xs uppercase text-muted-foreground">{l}</p><p className="font-medium">{v || "—"}</p></div>
);

export default MinhasPropostasLojista;
