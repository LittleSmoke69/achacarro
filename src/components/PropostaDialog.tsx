import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkLojistaContact, formatPtPhoneDisplay } from "@/lib/contact";
import { AlertTriangle, X, Upload, Info } from "lucide-react";
import { DISTRITOS } from "@/lib/distritos";

type Lead = {
  id: string; nome: string; email: string; whatsapp: string; marca_modelo: string;
  preco_max: number; tipo_compra?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead | null;
  lojistaEmpresa?: string;
  lojistaWhatsapp?: string;
  lojistaEmail?: string;
  totalPropostasAfter: number;
  onSent: () => void;
}

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_PHOTOS = 3;

export const PropostaDialog = ({ open, onOpenChange, lead, lojistaEmpresa, lojistaWhatsapp, lojistaEmail, totalPropostasAfter, onSent }: Props) => {
  const navigate = useNavigate();
  const [preco, setPreco] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [km, setKm] = useState("");
  const [combustivel, setCombustivel] = useState("");
  const [caixa, setCaixa] = useState("");
  const [link, setLink] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [retoma, setRetoma] = useState(false);
  const [valorRetoma, setValorRetoma] = useState("");
  const [financiamento, setFinanciamento] = useState(false);
  const [condFin, setCondFin] = useState("");
  const [temGarantia, setTemGarantia] = useState(false);
  const [garantiaMeses, setGarantiaMeses] = useState("");
  const [distrito, setDistrito] = useState("");
  const [disponibilidade, setDisponibilidade] = useState("imediato");
  const [extras, setExtras] = useState("");
  const [revisao, setRevisao] = useState(false);
  const [historico, setHistorico] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const contact = checkLojistaContact(lojistaEmail, lojistaWhatsapp);
  const isRevenda = (lead?.tipo_compra || "").toLowerCase() === "revenda";

  useEffect(() => {
    if (isRevenda) {
      setTemGarantia(false);
      setGarantiaMeses("");
    }
  }, [isRevenda, open]);

  const reset = () => {
    setPreco(""); setMarca(""); setModelo(""); setAno(""); setKm("");
    setCombustivel(""); setCaixa(""); setLink(""); setDescricao(""); setMensagem("");
    setRetoma(false); setValorRetoma(""); setFinanciamento(false); setCondFin("");
    setTemGarantia(false); setGarantiaMeses(""); setDistrito("");
    setDisponibilidade("imediato"); setExtras(""); setRevisao(false); setHistorico(false);
    previews.forEach(URL.revokeObjectURL);
    setFotos([]); setPreviews([]);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const valid: File[] = [];
    for (const f of incoming) {
      if (!/^image\/(jpeg|png|jpg)$/i.test(f.type)) {
        toast.error(`${f.name}: apenas JPG/PNG`);
        continue;
      }
      if (f.size > MAX_PHOTO_SIZE) {
        toast.error(`${f.name}: máximo 10MB`);
        continue;
      }
      valid.push(f);
    }
    setFotos(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const removeFoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setFotos(fotos.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!lead) return;
    if (!contact.valid) { toast.error(contact.errors[0]); return; }
    if (!marca.trim() || !modelo.trim()) { toast.error("Indica marca e modelo"); return; }
    if (!ano || Number(ano) < 1950) { toast.error("Indica um ano válido"); return; }
    if (!km || Number(km) < 0) { toast.error("Indica os quilómetros"); return; }
    if (!combustivel) { toast.error("Seleciona o combustível"); return; }
    if (!caixa) { toast.error("Seleciona o tipo de caixa"); return; }
    if (!preco || Number(preco) <= 0) { toast.error("Indica um preço válido"); return; }
    if (fotos.length < MIN_PHOTOS) { toast.error(`Envia pelo menos ${MIN_PHOTOS} fotos`); return; }
    if (!descricao.trim()) { toast.error("Descreve o veículo"); return; }
    if (!mensagem.trim()) { toast.error("Escreve uma mensagem para o cliente"); return; }
    if (!distrito) { toast.error("Seleciona o distrito"); return; }
    if (temGarantia && (!garantiaMeses || Number(garantiaMeses) <= 0)) {
      toast.error("Indica os meses de garantia"); return;
    }
    if (retoma && (!valorRetoma || Number(valorRetoma) <= 0)) {
      toast.error("Indica o valor que paga pela retoma"); return;
    }
    if (link && (!/^https?:\/\/[^\s]+$/i.test(link.trim()) || link.trim().length > 2048)) {
      toast.error("Link do anúncio inválido");
      return;
    }
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setBusy(false); toast.error("Sessão expirada"); return; }

    // Upload photos
    const uploadedUrls: string[] = [];
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i];
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/${lead.id}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("proposta-fotos").upload(path, f, {
        contentType: f.type, upsert: false,
      });
      if (upErr) {
        setBusy(false);
        toast.error(`Erro ao enviar foto: ${upErr.message}`);
        return;
      }
      const { data: pub } = supabase.storage.from("proposta-fotos").getPublicUrl(path);
      uploadedUrls.push(pub.publicUrl);
    }

    const marcaModelo = `${marca.trim()} ${modelo.trim()}`.trim();
    const { error } = await supabase.from("propostas").insert({
      lead_id: lead.id,
      lojista_id: session.user.id,
      mensagem: mensagem.trim(),
      preco: Number(preco),
      marca_modelo: marcaModelo,
      ano: Number(ano),
      km: Number(km),
      combustivel,
      caixa,
      descricao: descricao.trim(),
      link_anuncio: link || null,
      aceita_retoma: retoma,
      valor_retoma: retoma ? Number(valorRetoma) : null,
      oferece_financiamento: financiamento,
      condicoes_financiamento: condFin || null,
      tem_garantia: temGarantia,
      garantia_meses: temGarantia ? Number(garantiaMeses) : null,
      distrito,
      disponibilidade,
      extras: extras || null,
      revisao_recente: revisao,
      historico_manutencao: historico,
      fotos: uploadedUrls,
    });
    if (error) {
      setBusy(false);
      toast.error(error.message.includes("limite") ? "Lead já atingiu 10 propostas" : "Erro ao enviar proposta");
      return;
    }

    // Fetch real client contact (email/nome) — only available after proposta exists.
    // The leads list masks email until the lojista has a proposta for that lead,
    // so we MUST fetch it here to ensure the email send has a valid recipient.
    let recipientEmail = lead.email;
    let recipientNome = lead.nome;
    let linkCliente: string | undefined;
    try {
      const { data: contact } = await supabase.rpc("lojista_get_lead_contact", { _lead_id: lead.id });
      if (contact && typeof contact === "object") {
        const c = contact as { email?: string; nome?: string; client_token?: string };
        if (c.email) recipientEmail = c.email;
        if (c.nome) recipientNome = c.nome;
        if (c.client_token) linkCliente = `${window.location.origin}/minhas-propostas/${c.client_token}`;
      }
    } catch (e) { console.error("contact fetch error", e); }

    if (!recipientEmail) {
      console.error("No recipient email available for proposta email", { lead_id: lead.id });
      setBusy(false);
      toast.success("Proposta enviada!");
      reset();
      onOpenChange(false);
      onSent();
      return;
    }

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "proposta-recebida",
        recipientEmail,
        idempotencyKey: `proposta-${lead.id}-${session.user.id}`,
        templateData: {
          nome: recipientNome,
          empresa: lojistaEmpresa,
          preco: Number(preco),
          marca_modelo: marcaModelo,
          ano: Number(ano),
          km: Number(km),
          mensagem: mensagem.trim(),
          link_anuncio: link || undefined,
          whatsapp: contact.whatsapp ? formatPtPhoneDisplay(contact.whatsapp) : undefined,
          email_lojista: contact.email,
          aceita_retoma: retoma,
          valor_retoma: retoma ? Number(valorRetoma) : undefined,
          oferece_financiamento: financiamento,
          condicoes_financiamento: condFin || undefined,
          total_propostas: totalPropostasAfter,
          link_cliente: linkCliente,
        },
      },
    }).catch((e) => { console.error("email error", e); });

    setBusy(false);
    toast.success("Proposta enviada!");
    reset();
    onOpenChange(false);
    onSent();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar proposta</DialogTitle>
          <DialogDescription>
            {lead ? `Para ${lead.nome} — pedido: ${lead.marca_modelo || "—"}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!contact.valid && (
          <div className="flex items-start gap-3 rounded-xl border-2 border-destructive bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-destructive">Contactos do stand incompletos</p>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {contact.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              <Button size="sm" variant="outline" className="mt-3"
                onClick={() => { onOpenChange(false); navigate("/perfil"); }}>
                Atualizar perfil
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Propostas com fotos e descrição completa têm mais chances de serem aceitas.</span>
        </div>

        <div className="grid gap-4 py-2">
          {/* Veículo */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Dados do veículo</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Marca *</Label>
                <Input value={marca} onChange={e => setMarca(e.target.value)} placeholder="ex: BMW" />
              </div>
              <div>
                <Label>Modelo *</Label>
                <Input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="ex: Série 1" />
              </div>
              <div>
                <Label>Ano *</Label>
                <Input type="number" value={ano} onChange={e => setAno(e.target.value)} placeholder="2020" />
              </div>
              <div>
                <Label>Quilómetros *</Label>
                <Input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="65000" />
              </div>
              <div>
                <Label>Combustível *</Label>
                <Select value={combustivel} onValueChange={setCombustivel}>
                  <SelectTrigger><SelectValue placeholder="Seleciona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gasolina">Gasolina</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                    <SelectItem value="Híbrido Plug-in">Híbrido Plug-in</SelectItem>
                    <SelectItem value="Elétrico">Elétrico</SelectItem>
                    <SelectItem value="GPL">GPL</SelectItem>
                    <SelectItem value="GNC">GNC</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Caixa *</Label>
                <Select value={caixa} onValueChange={setCaixa}>
                  <SelectTrigger><SelectValue placeholder="Seleciona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatico">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preço */}
          <div>
            <Label>Preço (€) *</Label>
            <Input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="18500" />
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <Label>Fotos do veículo * (mínimo {MIN_PHOTOS}, ideal 6+)</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-6 hover:bg-secondary/40">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar JPG/PNG (máx 10MB cada)</span>
              <input type="file" accept="image/jpeg,image/png" multiple className="hidden"
                onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
            </label>
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border">
                    <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeFoto(i)}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{fotos.length} foto(s) selecionada(s)</p>
          </div>

          {/* Descrição & mensagem */}
          <div>
            <Label>Descrição do veículo *</Label>
            <Textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Estado do carro, histórico, pontos fortes..." />
          </div>
          <div>
            <Label>Mensagem ao cliente *</Label>
            <Textarea rows={3} value={mensagem} onChange={e => setMensagem(e.target.value)}
              placeholder="Apresenta a oferta, condições, etc." />
          </div>

          {/* Garantia */}
          <div className="grid gap-3 rounded-xl bg-secondary/60 p-4">
            <Label>Garantia do veículo *</Label>
            {isRevenda ? (
              <>
                <Select value="sem" disabled>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Sem garantia</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-start gap-2 rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span className="text-destructive">
                    Este veículo é destinado a revenda. Não possui garantia e é vendido no estado em que se encontra.
                  </span>
                </div>
              </>
            ) : (
              <>
                <Select
                  value={temGarantia ? "com" : "sem"}
                  onValueChange={(v) => { setTemGarantia(v === "com"); if (v === "sem") setGarantiaMeses(""); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="com">Com garantia</SelectItem>
                    <SelectItem value="sem">Sem garantia</SelectItem>
                  </SelectContent>
                </Select>
                {temGarantia && (
                  <div>
                    <Label>Tempo de garantia (meses) *</Label>
                    <Input type="number" value={garantiaMeses} onChange={e => setGarantiaMeses(e.target.value)} placeholder="ex: 12" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Condições */}
          <div className="grid gap-3 rounded-xl bg-secondary/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between">
                <Label>Aceita retoma</Label>
                <Switch checked={retoma} onCheckedChange={setRetoma} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Oferece financiamento</Label>
                <Switch checked={financiamento} onCheckedChange={setFinanciamento} />
              </div>
            </div>
            {retoma && (
              <div>
                <Label>Valor que paga pela retoma (€) *</Label>
                <Input type="number" value={valorRetoma} onChange={e => setValorRetoma(e.target.value)} placeholder="ex: 5000" />
              </div>
            )}
          </div>
          {financiamento && (
            <div>
              <Label>Condições de financiamento</Label>
              <Textarea rows={2} value={condFin} onChange={e => setCondFin(e.target.value)}
                placeholder="Entrada, prazo, prestação..." />
            </div>
          )}

          {/* Localização & disponibilidade */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Distrito *</Label>
              <Select value={distrito} onValueChange={setDistrito}>
                <SelectTrigger><SelectValue placeholder="Seleciona" /></SelectTrigger>
                <SelectContent>
                  {DISTRITOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disponibilidade *</Label>
              <Select value={disponibilidade} onValueChange={setDisponibilidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="imediato">Disponível imediato</SelectItem>
                  <SelectItem value="encomenda">Sob encomenda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opcionais */}
          <details className="rounded-xl bg-secondary/40 p-4">
            <summary className="cursor-pointer text-sm font-medium">Campos opcionais</summary>
            <div className="mt-3 space-y-3">
              <div>
                <Label>Extras</Label>
                <Input value={extras} onChange={e => setExtras(e.target.value)}
                  placeholder="GPS, sensores, teto, jantes..." />
              </div>
              <div>
                <Label>Link do anúncio</Label>
                <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label>Revisão recente</Label>
                  <Switch checked={revisao} onCheckedChange={setRevisao} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Histórico de manutenção</Label>
                  <Switch checked={historico} onCheckedChange={setHistorico} />
                </div>
              </div>
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant="hero" onClick={submit} disabled={busy || !contact.valid}>
            {busy ? "A enviar…" : "Enviar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
