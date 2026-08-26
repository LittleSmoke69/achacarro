import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = "carro-certo-propostas"
const SENDER_DOMAIN = "notify.achacarro.pt"
const FROM_DOMAIN = "notify.achacarro.pt"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // One-off admin tool — protected by shared secret stored in env
  const expectedSecret = Deno.env.get('ADMIN_RESEND_SECRET') || ''
  const secret = req.headers.get('x-admin-secret') || ''
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  // Find pending proposta-recebida emails
  const { data: pendingLogs, error: logErr } = await supabase
    .from('email_send_log')
    .select('message_id, recipient_email, created_at')
    .eq('template_name', 'proposta-recebida')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (logErr) return new Response(JSON.stringify({ error: logErr.message }), { status: 500, headers: corsHeaders })

  // For each, find matching proposta(s) and re-enqueue
  const results: any[] = []
  // Get all propostas for these recipients
  const recipients = [...new Set((pendingLogs || []).map(l => l.recipient_email))]
  if (recipients.length === 0) {
    return new Response(JSON.stringify({ message: 'No pending emails', results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: leads } = await supabase.from('leads').select('id, nome, email, marca_modelo').in('email', recipients)
  const leadIds = (leads || []).map(l => l.id)
  const { data: propostas } = await supabase.from('propostas').select('*').in('lead_id', leadIds)
  const { data: lojistas } = await supabase.from('lojistas').select('id, empresa, email, whatsapp').in('id', [...new Set((propostas || []).map(p => p.lojista_id))])

  const template = TEMPLATES['proposta-recebida']

  for (const log of pendingLogs || []) {
    const lead = (leads || []).find(l => l.email === log.recipient_email)
    if (!lead) { results.push({ message_id: log.message_id, skipped: 'no lead' }); continue }
    // Find the most recent proposta for this lead that matches log timing approximately
    const leadPropostas = (propostas || []).filter(p => p.lead_id === lead.id)
    if (leadPropostas.length === 0) { results.push({ message_id: log.message_id, skipped: 'no proposta' }); continue }
    // Pick proposta closest in time to log
    const logTime = new Date(log.created_at).getTime()
    const proposta = leadPropostas.sort((a, b) =>
      Math.abs(new Date(a.created_at).getTime() - logTime) - Math.abs(new Date(b.created_at).getTime() - logTime)
    )[0]
    const lojista = (lojistas || []).find(l => l.id === proposta.lojista_id)
    const totalPropostas = leadPropostas.length

    const templateData = {
      nome: lead.nome,
      empresa: lojista?.empresa,
      preco: Number(proposta.preco),
      marca_modelo: proposta.marca_modelo || lead.marca_modelo,
      ano: proposta.ano || undefined,
      km: proposta.km || undefined,
      mensagem: proposta.mensagem,
      link_anuncio: proposta.link_anuncio || undefined,
      whatsapp: lojista?.whatsapp || undefined,
      email_lojista: lojista?.email,
      aceita_retoma: proposta.aceita_retoma,
      oferece_financiamento: proposta.oferece_financiamento,
      condicoes_financiamento: proposta.condicoes_financiamento || undefined,
      total_propostas: totalPropostas,
    }

    const html = await renderAsync(React.createElement(template.component, templateData))
    const plainText = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
    const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

    const newMessageId = crypto.randomUUID()
    const unsubToken = generateToken()

    // Insert/get unsubscribe token
    await supabase.from('email_unsubscribe_tokens').insert({ email: lead.email.toLowerCase(), token: unsubToken }).select().maybeSingle()

    await supabase.from('email_send_log').insert({
      message_id: newMessageId,
      template_name: 'proposta-recebida',
      recipient_email: lead.email,
      status: 'pending',
      metadata: { lojista_id: proposta.lojista_id, template: 'proposta-recebida', resend_of: log.message_id },
    })

    const { error: enqErr } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: newMessageId,
        to: lead.email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: plainText,
        purpose: 'transactional',
        label: 'proposta-recebida',
        idempotency_key: `resend-${newMessageId}`,
        unsubscribe_token: unsubToken,
        queued_at: new Date().toISOString(),
      },
    })

    // Mark old log as superseded (insert a new row to replace pending status)
    await supabase.from('email_send_log').insert({
      message_id: log.message_id,
      template_name: 'proposta-recebida',
      recipient_email: log.recipient_email,
      status: 'failed',
      error_message: 'Superseded by resend',
      metadata: { resent_as: newMessageId },
    })

    results.push({ original: log.message_id, new: newMessageId, recipient: lead.email, enqueued: !enqErr, error: enqErr?.message })
  }

  return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
