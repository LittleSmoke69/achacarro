import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ticket, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "valid"; days: number; remaining: number }
  | { kind: "invalid"; reason: string; message: string };

const reasonMessage = (reason: string, extra?: any): string => {
  switch (reason) {
    case "invalid": return "Código inválido. Verifica e tenta novamente.";
    case "expired": return "Cupom expirado.";
    case "exhausted": return `Cupom esgotado (${extra?.used_count}/${extra?.max_uses} usos).`;
    case "already_used": return "Já usaste este cupom.";
    case "unauthorized": return "Sessão expirada. Faz login novamente.";
    default: return "Cupom não disponível.";
  }
};

export function CouponRedeemForm({ onSuccess }: { onSuccess?: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) { setStatus({ kind: "idle" }); return; }
    setStatus({ kind: "checking" });
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("check_coupon" as any, { _code: trimmed });
      if (error) {
        setStatus({ kind: "invalid", reason: "error", message: error.message });
        return;
      }
      const d = data as any;
      if (d?.valid) {
        setStatus({ kind: "valid", days: d.duration_days, remaining: d.remaining_uses });
      } else {
        setStatus({ kind: "invalid", reason: d?.reason || "invalid", message: reasonMessage(d?.reason, d) });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code]);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) { toast.error("Insere um código"); return; }
    if (status.kind === "invalid") { toast.error(status.message); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_coupon", { _code: trimmed });
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      let reason = "";
      if (msg.includes("inválido") || msg.includes("invalido")) reason = "invalid";
      else if (msg.includes("expirado")) reason = "expired";
      else if (msg.includes("esgotado")) reason = "exhausted";
      else if (msg.includes("já usaste") || msg.includes("ja usaste")) reason = "already_used";
      else if (msg.includes("unauthorized")) reason = "unauthorized";
      toast.error(reason ? reasonMessage(reason) : (error.message || "Erro ao resgatar"));
      return;
    }
    const days = (data as any)?.granted_days;
    const newEnd = (data as any)?.new_end ? new Date((data as any).new_end).toLocaleDateString("pt-PT") : null;
    toast.success(`Acesso ativado por ${days} dias!`, {
      description: newEnd ? `Válido até ${newEnd}.` : undefined,
    });
    setCode("");
    setStatus({ kind: "idle" });
    setOpen(false);
    onSuccess?.();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 text-xs text-muted-foreground underline hover:text-foreground inline-flex items-center gap-1">
        <Ticket className="h-3 w-3" /> Tenho um código promocional
      </button>
    );
  }

  const canSubmit = status.kind === "valid" && !loading;

  return (
    <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <Input
          placeholder="CÓDIGO"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="uppercase rounded-full"
          onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
          autoFocus
        />
        <Button size="sm" variant="hero" className="rounded-full" onClick={submit} disabled={!canSubmit}>
          {loading ? "..." : "Resgatar"}
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setOpen(false); setCode(""); setStatus({ kind: "idle" }); }}>Cancelar</Button>
      </div>
      {status.kind === "checking" && (
        <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> A validar...
        </p>
      )}
      {status.kind === "valid" && (
        <p className="mt-2 text-xs text-emerald-600 inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Válido — concede {status.days} dias ({status.remaining} usos restantes)
        </p>
      )}
      {status.kind === "invalid" && (
        <p className="mt-2 text-xs text-red-600 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {status.message}
        </p>
      )}
    </div>
  );
}
