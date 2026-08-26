import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

const fmtDate = (v: any) => (v ? new Date(v).toLocaleString("pt-PT") : "");
const fmtBool = (v: any) => (v === true ? "Sim" : v === false ? "Não" : "");
const fmtNum = (v: any) => (v === null || v === undefined ? "" : Number(v));
const fmtList = (v: any) => (Array.isArray(v) ? v.join(" | ") : v || "");

const LEAD_COLUMNS: [string, (l: any) => any][] = [
  ["ID", l => l.id],
  ["Criado em", l => fmtDate(l.created_at)],
  ["Expira em", l => fmtDate(l.expires_at)],
  ["Estado", l => (l.deleted_at ? "Excluído" : l.propostas_count >= 10 ? "Completo" : new Date(l.expires_at) <= new Date() ? "Expirado" : "Ativo")],
  ["Nome", l => l.nome],
  ["Email", l => l.email],
  ["WhatsApp", l => l.whatsapp],
  ["Localização", l => l.localizacao],
  ["Tipo de compra", l => l.tipo_compra],
  ["Tem carro específico", l => fmtBool(l.tem_carro_especifico)],
  ["Marca/Modelo", l => l.marca_modelo],
  ["Marcas preferidas", l => fmtList(l.marcas_preferidas)],
  ["Versão", l => l.versao],
  ["Tipo de carro", l => l.tipo_carro],
  ["Combustível", l => l.combustivel],
  ["Caixa", l => l.caixa],
  ["Cor", l => l.cor],
  ["Extras", l => l.extras],
  ["Orçamento máx (€)", l => fmtNum(l.preco_max)],
  ["Ano mín", l => fmtNum(l.ano_min)],
  ["Ano máx", l => fmtNum(l.ano_max)],
  ["Km máx", l => fmtNum(l.km_max)],
  ["Forma de pagamento", l => l.forma_pagamento],
  ["Precisa financiamento", l => fmtBool(l.precisa_financiamento)],
  ["Financiamento entrada (€)", l => fmtNum(l.financiamento_entrada)],
  ["Financiamento prestação (€)", l => fmtNum(l.financiamento_prestacao)],
  ["Situação residência", l => l.situacao_residencia],
  ["Situação profissional", l => l.situacao_profissional],
  ["Situação profissional (outros)", l => l.situacao_profissional_outros],
  ["Urgência", l => l.urgencia],
  ["Tem retoma", l => fmtBool(l.tem_retoma)],
  ["Retoma marca", l => l.retoma_marca],
  ["Retoma modelo", l => l.retoma_modelo],
  ["Retoma ano", l => fmtNum(l.retoma_ano)],
  ["Retoma km", l => fmtNum(l.retoma_km)],
  ["Retoma estado", l => l.retoma_estado],
  ["Retoma combustível", l => l.retoma_combustivel],
  ["Retoma caixa", l => l.retoma_caixa],
  ["Retoma valor esperado (€)", l => fmtNum(l.retoma_valor_esperado)],
  ["Retoma tem danos", l => fmtBool(l.retoma_tem_danos)],
  ["Retoma observações", l => l.retoma_observacoes],
  ["Retoma fotos", l => fmtList(l.retoma_fotos)],
  ["Retoma fotos danos", l => fmtList(l.retoma_fotos_danos)],
  ["Observações", l => l.observacoes],
  ["Nº propostas", l => fmtNum(l.propostas_count)],
];

const PROPOSTA_COLUMNS: [string, (p: any, leads: Map<string, any>) => any][] = [
  ["Lead ID", p => p.lead_id],
  ["Cliente", (p, m) => m.get(p.lead_id)?.nome || ""],
  ["Email cliente", (p, m) => m.get(p.lead_id)?.email || ""],
  ["Stand", p => p.lojistas?.empresa || p.lojista_empresa || ""],
  ["Email stand", p => p.lojistas?.email || p.lojista_email || ""],
  ["Criada em", p => fmtDate(p.created_at)],
  ["Status", p => p.status],
  ["Marca/Modelo", p => [p.marca, p.modelo].filter(Boolean).join(" ")],
  ["Versão", p => p.versao],
  ["Ano", p => fmtNum(p.ano)],
  ["Km", p => fmtNum(p.km)],
  ["Combustível", p => p.combustivel],
  ["Caixa", p => p.caixa],
  ["Preço (€)", p => fmtNum(p.preco)],
  ["Valor retoma (€)", p => fmtNum(p.valor_retoma)],
  ["Mensagem", p => p.mensagem],
  ["Contra-proposta (€)", p => fmtNum(p.contraproposta_valor)],
  ["Mensagem cliente", p => p.contraproposta_mensagem],
  ["Respondida em", p => fmtDate(p.respondida_em ?? p.updated_at)],
];

const autoWidth = (rows: any[][]) =>
  rows[0].map((_, i) => ({
    wch: Math.min(45, Math.max(10, ...rows.map(r => String(r[i] ?? "").length + 2))),
  }));

export async function exportLeadsToExcel() {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const leadRows = (leads as any[]) || [];

  const { data: propostas } = await supabase
    .from("propostas")
    .select("*, lojistas:lojista_id(empresa,email,whatsapp)")
    .order("created_at", { ascending: false });

  const leadMap = new Map(leadRows.map(l => [l.id, l]));

  const wb = XLSX.utils.book_new();

  const leadsAoa = [LEAD_COLUMNS.map(c => c[0]), ...leadRows.map(l => LEAD_COLUMNS.map(c => c[1](l)))];
  const wsLeads = XLSX.utils.aoa_to_sheet(leadsAoa);
  wsLeads["!cols"] = autoWidth(leadsAoa);
  wsLeads["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: leadRows.length, c: LEAD_COLUMNS.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, wsLeads, "Leads");

  const propRows = (propostas as any[]) || [];
  const propAoa = [PROPOSTA_COLUMNS.map(c => c[0]), ...propRows.map(p => PROPOSTA_COLUMNS.map(c => c[1](p, leadMap)))];
  const wsProps = XLSX.utils.aoa_to_sheet(propAoa);
  wsProps["!cols"] = autoWidth(propAoa);
  XLSX.utils.book_append_sheet(wb, wsProps, "Propostas");

  const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "h");
  XLSX.writeFile(wb, `achacarro-leads_${stamp}.xlsx`);
  return { leads: leadRows.length, propostas: propRows.length };
}
