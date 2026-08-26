import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Loader2, Phone, Mail, Car, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";

type Negociacao = { origem: "cliente" | "lojista"; preco_proposto?: number; mensagem?: string; created_at: string };

type Proposta = {
  id: string; status: string; preco: number; marca_modelo: string;
  ano?: number; km?: number; combustivel?: string; caixa?: string;
  descricao?: string; mensagem?: string; fotos?: string[];
  tem_garantia?: boolean; garantia_meses?: number;
  aceita_retoma?: boolean; valor_retoma?: number;
  oferece_financiamento?: boolean; condicoes_financiamento?: string;
  distrito?: string; extras?: string; link_anuncio?: string;
  created_at: string; visualizada_at?: string; aceita_at?: string; recusada_at?: string;
  lojista: { empresa?: string; whatsapp?: string; email?: string };
  negociacoes?: Negociacao[];
};

type LeadInfo = {
  id: string; nome: string; marca_modelo?: string;
  fechado: boolean; expires_at: string; propostas_count: number;
};

const fmtPreco = (n?: number) => typeof n === "number" ? n.toLocaleString("pt-PT") + " €" : "—";

const statusBadge = (s: string) => {
  if (s === "aceita") return <Badge className="bg-green-600">Aceita</Badge>;
  if (s === "recusada") return <Badge variant="destructive">Recusada</Badge>;
  if (s === "negociando") return <Badge className="bg-amber-500">Em negociação</Badge>;
  if (s === "visualizada") return <Badge variant="secondary">Visualizada</Badge>;
  return <Badge>Enviada</Badge>;
};

const MinhasPropostas = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [recusarOpen, setRecusarOpen] = useState<Proposta | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirmEncerrar, setConfirmEncerrar] = useState<{ propId: string } | null>(null);
  const [negociarOpen, setNegociarOpen] = useState<Proposta | null>(null);
  const [contraPreco, setContraPreco] = useState("");
  const [contraMsg, setContraMsg] = useState("");

  const negociar = async () => {
    if (!token || !negociarOpen) return;
    const preco = parseFloat(contraPreco.replace(",", "."));
    if (!preco || preco <= 0) { toast.error("Indica um preço válido"); return; }
    setBusy(negociarOpen.id);
    const { data, error } = await supabase.rpc("client_negociar_proposta", {
      _token: token, _proposta_id: negociarOpen.id, _preco: preco, _mensagem: contraMsg || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const resp = data as any;
    if (resp?.lojista_email) {
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contraproposta-cliente",
          recipientEmail: resp.lojista_email,
          idempotencyKey: `contra-${negociarOpen.id}-${Date.now()}`,
          templateData: {
            empresa: resp.lojista_empresa,
            cliente: resp.cliente_nome,
            marca_modelo: resp.marca_modelo,
            preco_original: resp.preco_original,
            preco_proposto: resp.preco_proposto,
            mensagem: resp.mensagem,
            whatsapp_cliente: resp.cliente_whatsapp,
            email_cliente: resp.cliente_email,
            sent_at: resp.sent_at,
          },
          metadata: {
            lead_id: resp.lead_id,
            proposta_id: resp.proposta_id,
            target_lojista_id: resp.lojista_id,
          },
        },
      }).catch(() => {});
    }
    toast.success("Contraproposta enviada ao stand");
    setNegociarOpen(null); setContraPreco(""); setContraMsg("");
    await load();
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("client_get_propostas", { _token: token });
    if (error) { setError(error.message); setLoading(false); return; }
    const d = data as any;
    setLead(d.lead);
    setPropostas(d.propostas || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const notifyLojista = async (resp: any, decisao: "aceita" | "recusada", motivo?: string) => {
    if (!resp?.lojista_email) return;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "proposta-respondida",
        recipientEmail: resp.lojista_email,
        idempotencyKey: `decisao-${resp.proposta_id || resp.cliente_email}-${decisao}-${Date.now()}`,
        templateData: {
          empresa: resp.lojista_empresa,
          cliente: resp.cliente_nome,
          marca_modelo: resp.marca_modelo,
          preco: resp.preco,
          decisao,
          motivo,
          whatsapp_cliente: decisao === "aceita" ? resp.cliente_whatsapp : undefined,
          email_cliente: decisao === "aceita" ? resp.cliente_email : undefined,
          decided_at: resp.decided_at,
        },
        metadata: {
          lead_id: resp.lead_id,
          proposta_id: resp.proposta_id,
          target_lojista_id: resp.lojista_id,
        },
      },
    }).catch(() => {});
  };

  const decidir = async (p: Proposta, decisao: "aceita" | "recusada", motivoTxt?: string) => {
    if (!token) return;
    setBusy(p.id);
    const { data, error } = await supabase.rpc("client_decide_proposta", {
      _token: token, _proposta_id: p.id, _decisao: decisao, _motivo: motivoTxt || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    notifyLojista(data, decisao, motivoTxt);
    toast.success(decisao === "aceita" ? "Proposta aceita!" : "Proposta recusada");
    setRecusarOpen(null); setMotivo("");
    if (decisao === "aceita") setConfirmEncerrar({ propId: p.id });
    await load();
  };

  const encerrar = async () => {
    if (!token) return;
    const { error } = await supabase.rpc("client_close_lead", { _token: token });
    if (error) { toast.error(error.message); return; }
    toast.success("Pedido encerrado. Não receberás mais propostas.");
    setConfirmEncerrar(null);
    await load();
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error || !lead) {
    return <div className="mx-auto max-w-xl p-8 text-center"><h1 className="text-xl font-semibold">Link inválido ou expirado</h1><p className="text-muted-foreground mt-2">{error}</p></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Olá {lead.nome}, aqui estão as tuas propostas</h1>
        <p className="text-muted-foreground mt-1">
          Pedido: <strong>{lead.marca_modelo || "—"}</strong> · {propostas.length} proposta(s)
          {lead.fechado && <span className="ml-2 text-orange-600 font-medium">• Pedido encerrado</span>}
        </p>
      </header>

      {propostas.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Ainda não tens propostas. Quando os stands responderem irão aparecer aqui.
        </Card>
      )}

      <div className="space-y-6">
        {propostas.map(p => {
          const decided = p.status === "aceita" || p.status === "recusada";
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex items-center justify-between bg-secondary/40 px-5 py-3">
                <div>
                  <p className="font-semibold">{p.lojista.empresa || "Stand"}</p>
                  <p className="text-xs text-muted-foreground">{p.distrito}</p>
                </div>
                {statusBadge(p.status)}
              </div>

              {p.fotos && p.fotos.length > 0 && (
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                  {p.fotos.slice(0, 8).map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden">
                      <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover hover:opacity-90" />
                    </a>
                  ))}
                </div>
              )}

              <div className="space-y-4 p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Car className="h-5 w-5" /> {p.marca_modelo}
                  </h2>
                  <p className="text-2xl font-bold text-primary">{fmtPreco(p.preco)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Info label="Ano" value={p.ano} />
                  <Info label="KM" value={p.km != null ? String(p.km).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " km" : undefined} />
                  <Info label="Combustível" value={p.combustivel} />
                  <Info label="Caixa" value={p.caixa} />
                </div>

                {p.descricao && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Descrição</p>
                    <p className="text-sm">{p.descricao}</p>
                  </div>
                )}
                {p.mensagem && (
                  <div className="rounded-lg bg-secondary/50 p-3 text-sm">"{p.mensagem}"</div>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  {p.tem_garantia && <Badge variant="outline">Garantia {p.garantia_meses}m</Badge>}
                  {p.aceita_retoma && <Badge variant="outline">Retoma{p.valor_retoma ? ` — ${fmtPreco(p.valor_retoma)}` : ""}</Badge>}
                  {p.oferece_financiamento && <Badge variant="outline">Financiamento</Badge>}
                  {p.extras && <Badge variant="outline">{p.extras}</Badge>}
                </div>

                {p.condicoes_financiamento && (
                  <p className="text-xs text-muted-foreground">Condições: {p.condicoes_financiamento}</p>
                )}

                {decided && (
                  <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
                    <p className="font-medium mb-2">Contacto do stand</p>
                    {p.lojista.whatsapp && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {p.lojista.whatsapp}</p>}
                    {p.lojista.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {p.lojista.email}</p>}
                  </div>
                )}

                {p.negociacoes && p.negociacoes.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-amber-700">Histórico de negociação</p>
                    {p.negociacoes.map((n, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium">{n.origem === "cliente" ? "Tu" : "Stand"}:</span>{" "}
                        <span className="text-primary font-semibold">{fmtPreco(n.preco_proposto)}</span>
                        {n.mensagem && <span className="text-muted-foreground"> — "{n.mensagem}"</span>}
                      </div>
                    ))}
                  </div>
                )}

                {!decided && !lead.fechado && (
                  <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
                    <Button
                      size="lg"
                      onClick={() => decidir(p, "aceita")}
                      disabled={busy === p.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="mr-2 h-5 w-5" /> Aceitar
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => { setNegociarOpen(p); setContraPreco(""); setContraMsg(""); }}
                      disabled={busy === p.id}
                    >
                      <MessageSquare className="mr-2 h-5 w-5" /> Negociar
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setRecusarOpen(p)}
                      disabled={busy === p.id}
                    >
                      <X className="mr-2 h-5 w-5" /> Recusar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recusar dialog */}
      <Dialog open={!!recusarOpen} onOpenChange={(v) => !v && setRecusarOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar proposta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Podes indicar o motivo (opcional). Ajuda o stand a melhorar.</p>
          <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="ex: preço acima do esperado" rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRecusarOpen(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => recusarOpen && decidir(recusarOpen, "recusada", motivo)}>
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encerrar pedido dialog */}
      <Dialog open={!!confirmEncerrar} onOpenChange={(v) => !v && setConfirmEncerrar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar o pedido?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Aceitaste uma proposta. Queres encerrar este pedido para não receber mais propostas dos restantes stands?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmEncerrar(null)}>Manter aberto</Button>
            <Button onClick={encerrar}>Sim, encerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negociar dialog */}
      <Dialog open={!!negociarOpen} onOpenChange={(v) => !v && setNegociarOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar contraproposta</DialogTitle>
          </DialogHeader>
          {negociarOpen && (
            <p className="text-sm text-muted-foreground">
              Preço atual do stand: <strong>{fmtPreco(negociarOpen.preco)}</strong>. Indica o valor que estás disposto a pagar.
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">O teu preço (€)</label>
              <Input type="number" inputMode="decimal" value={contraPreco} onChange={e => setContraPreco(e.target.value)} placeholder="ex: 17000" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Mensagem (opcional)</label>
              <Textarea value={contraMsg} onChange={e => setContraMsg(e.target.value)} placeholder="ex: Posso fechar hoje se baixar para este valor" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNegociarOpen(null)}>Cancelar</Button>
            <Button onClick={negociar} disabled={busy === negociarOpen?.id}>
              <MessageSquare className="mr-2 h-4 w-4" /> Enviar contraproposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: any }) => (
  <div>
    <p className="text-xs uppercase text-muted-foreground">{label}</p>
    <p className="font-medium">{value || "—"}</p>
  </div>
);

export default MinhasPropostas;
