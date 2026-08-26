// System-triggered emails (lojista welcome, new lead notification to matching lojistas).
// verify_jwt=false because it's invoked by anon clients on signup / lead creation.
// Safe because it only operates on existing DB records and sends pre-defined templates.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = 'carro-certo-propostas'
const SENDER_DOMAIN = 'notify.achacarro.pt'
const FROM_DOMAIN = 'notify.achacarro.pt'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function enqueue(supabase: any, templateName: string, recipient: string, data: Record<string, any>, idempotencyKey: string, metadata: Record<string, any>) {
  const tpl = TEMPLATES[templateName]
  if (!tpl) throw new Error(`template ${templateName} not found`)
  const recipientLower = recipient.trim().toLowerCase()

  // suppression check
  const { data: sup } = await supabase.from('suppressed_emails').select('id').eq('email', recipientLower).maybeSingle()
  if (sup) return { skipped: 'suppressed' }

  // unsubscribe token
  let token: string
  const { data: existing } = await supabase.from('email_unsubscribe_tokens').select('token, used_at').eq('email', recipientLower).maybeSingle()
  if (existing && !existing.used_at) {
    token = existing.token
  } else {
    token = generateToken()
    await supabase.from('email_unsubscribe_tokens').upsert({ email: recipientLower, token }, { onConflict: 'email', ignoreDuplicates: true })
    const { data: stored } = await supabase.from('email_unsubscribe_tokens').select('token').eq('email', recipientLower).maybeSingle()
    token = stored?.token || token
  }

  const html = await renderAsync(React.createElement(tpl.component, data))
  const text = await renderAsync(React.createElement(tpl.component, data), { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject
  const messageId = crypto.randomUUID()

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipientLower,
    status: 'pending',
    metadata,
  })

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientLower,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: token,
      queued_at: new Date().toISOString(),
    },
  })
  if (error) {
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: templateName, recipient_email: recipientLower,
      status: 'failed', error_message: error.message, metadata,
    })
    return { error: error.message }
  }
  return { ok: true, message_id: messageId }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const origin = req.headers.get('origin') || 'https://achacarro.pt'

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: corsHeaders }) }

  const { event } = body || {}

  // Authentication:
  // - lojista-welcome: requires authenticated JWT matching lojista_id (or admin)
  // - new-lead / pedido-recebido: requires client_token that matches the lead
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  try {
    if (event === 'lojista-welcome') {
      const { lojista_id } = body
      if (!lojista_id) return new Response(JSON.stringify({ error: 'lojista_id required' }), { status: 400, headers: corsHeaders })

      const authHeader = req.headers.get('Authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data: claimsData } = await userClient.auth.getClaims(token)
      const uid = (claimsData?.claims as any)?.sub as string | undefined
      if (!uid) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
      if (uid !== lojista_id) {
        const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: uid, _role: 'admin' })
        if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
      }

      const { data: existingWelcome } = await supabase
        .from('email_send_log').select('id')
        .eq('template_name', 'lojista-bemvindo')
        .filter('metadata->>lojista_id', 'eq', lojista_id)
        .limit(1).maybeSingle()
      if (existingWelcome) {
        return new Response(JSON.stringify({ ok: true, skipped: 'already_sent' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: lojista } = await supabase.from('lojistas').select('id, email, empresa, nome_responsavel').eq('id', lojista_id).single()
      if (!lojista?.email) return new Response(JSON.stringify({ error: 'lojista not found' }), { status: 404, headers: corsHeaders })
      const r = await enqueue(supabase, 'lojista-bemvindo', lojista.email, {
        nome: lojista.nome_responsavel,
        empresa: lojista.empresa,
        link_painel: `${origin}/painel`,
      }, `welcome-${lojista.id}`, { lojista_id: lojista.id })
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (event === 'new-lead' || event === 'pedido-recebido') {
      const { lead_id, client_token } = body
      if (!lead_id) return new Response(JSON.stringify({ error: 'lead_id required' }), { status: 400, headers: corsHeaders })
      if (!client_token || typeof client_token !== 'string') {
        return new Response(JSON.stringify({ error: 'client_token required' }), { status: 401, headers: corsHeaders })
      }
      const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single()
      if (!lead) return new Response(JSON.stringify({ error: 'lead not found' }), { status: 404, headers: corsHeaders })
      if (lead.client_token !== client_token) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
      }

      if (event === 'new-lead') {
        const { data: alreadySent } = await supabase
          .from('email_send_log').select('id')
          .eq('template_name', 'novo-lead-lojista')
          .filter('metadata->>lead_id', 'eq', lead_id)
          .limit(1).maybeSingle()
        if (alreadySent) {
          return new Response(JSON.stringify({ ok: true, skipped: 'already_notified' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const nowIso = new Date().toISOString()
        const { data: lojistas } = await supabase
          .from('lojistas')
          .select('id, email, empresa, status, subscription_active, trial_ends_at, aceita_revenda, aceita_particular')
          .eq('status', 'aprovado')

        const isRevenda = (lead.tipo_compra || '').toLowerCase() === 'revenda'
        const eligible = (lojistas || []).filter((l: any) => {
          const active = l.subscription_active || (l.trial_ends_at && l.trial_ends_at > nowIso)
          if (!active) return false
          if (isRevenda && !l.aceita_revenda) return false
          if (!isRevenda && !l.aceita_particular) return false
          return !!l.email
        })

        const results: any[] = []
        for (const l of eligible) {
          const r = await enqueue(supabase, 'novo-lead-lojista', l.email, {
            empresa: l.empresa,
            tipo_compra: lead.tipo_compra,
            distrito: lead.localizacao,
            preco_max: lead.preco_max ? Number(lead.preco_max) : undefined,
            marca_modelo: lead.marca_modelo,
            forma_pagamento: lead.forma_pagamento,
            tem_retoma: !!lead.tem_retoma,
            link_painel: `${origin}/painel`,
          }, `new-lead-${lead.id}-${l.id}`, { lead_id: lead.id, lojista_id: l.id })
          results.push({ lojista_id: l.id, ...r })
        }
        return new Response(JSON.stringify({ ok: true, sent: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // pedido-recebido
      if (!lead.email) return new Response(JSON.stringify({ error: 'lead has no email' }), { status: 400, headers: corsHeaders })
      const { data: alreadyPedido } = await supabase
        .from('email_send_log').select('id')
        .eq('template_name', 'pedido-recebido-cliente')
        .filter('metadata->>lead_id', 'eq', lead_id)
        .limit(1).maybeSingle()
      if (alreadyPedido) {
        return new Response(JSON.stringify({ ok: true, skipped: 'already_sent' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const r = await enqueue(supabase, 'pedido-recebido-cliente', lead.email, {
        nome: lead.nome,
        tipo_compra: lead.tipo_compra,
        marca_modelo: lead.marca_modelo,
        preco_max: lead.preco_max ? Number(lead.preco_max) : undefined,
        forma_pagamento: lead.forma_pagamento,
        distrito: lead.localizacao,
        link_cliente: lead.client_token ? `${origin}/minhas-propostas/${lead.client_token}` : undefined,
      }, `pedido-${lead.id}`, { lead_id: lead.id })
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }


    return new Response(JSON.stringify({ error: 'unknown event' }), { status: 400, headers: corsHeaders })
  } catch (e: any) {
    console.error('notify-system-email error', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})
