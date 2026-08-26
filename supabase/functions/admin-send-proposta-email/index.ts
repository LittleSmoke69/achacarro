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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Auth: accept either env-stored admin secret OR an authenticated admin user JWT
  const expectedSecret = Deno.env.get('ADMIN_RESEND_SECRET') || ''
  const headerSecret = req.headers.get('x-admin-secret') || ''
  let authorized = !!expectedSecret && headerSecret === expectedSecret

  if (!authorized) {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: claimsData } = await userClient.auth.getClaims(token)
    const claims = claimsData?.claims as { sub?: string } | undefined
    if (!claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: claims.sub, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }
    authorized = true
  }

  const { proposta_id } = await req.json().catch(() => ({}))
  if (!proposta_id) {
    return new Response(JSON.stringify({ error: 'proposta_id required' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: proposta, error: pErr } = await supabase.from('propostas').select('*').eq('id', proposta_id).single()
  if (pErr || !proposta) return new Response(JSON.stringify({ error: 'proposta not found' }), { status: 404, headers: corsHeaders })

  const { data: lead } = await supabase.from('leads').select('id, nome, email, marca_modelo, client_token').eq('id', proposta.lead_id).single()
  const { data: lojista } = await supabase.from('lojistas').select('id, empresa, email, whatsapp').eq('id', proposta.lojista_id).single()
  if (!lead || !lojista) return new Response(JSON.stringify({ error: 'lead or lojista not found' }), { status: 404, headers: corsHeaders })

  const { count: totalPropostas } = await supabase.from('propostas').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id)

  const recipientEmail = lead.email.trim().toLowerCase()
  const origin = req.headers.get('origin') || 'https://achacarro.pt'

  const templateData = {
    nome: lead.nome,
    empresa: lojista.empresa,
    preco: Number(proposta.preco),
    marca_modelo: proposta.marca_modelo || lead.marca_modelo,
    ano: proposta.ano || undefined,
    km: proposta.km || undefined,
    mensagem: proposta.mensagem,
    link_anuncio: proposta.link_anuncio || undefined,
    whatsapp: lojista.whatsapp || undefined,
    email_lojista: lojista.email,
    aceita_retoma: proposta.aceita_retoma,
    valor_retoma: proposta.valor_retoma ? Number(proposta.valor_retoma) : undefined,
    oferece_financiamento: proposta.oferece_financiamento,
    condicoes_financiamento: proposta.condicoes_financiamento || undefined,
    total_propostas: totalPropostas || 1,
    link_cliente: lead.client_token ? `${origin}/minhas-propostas/${lead.client_token}` : undefined,
  }

  const template = TEMPLATES['proposta-recebida']
  const html = await renderAsync(React.createElement(template.component, templateData))
  const plainText = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  const messageId = crypto.randomUUID()
  const unsubToken = generateToken()

  await supabase.from('email_unsubscribe_tokens').upsert({ email: recipientEmail, token: unsubToken }, { onConflict: 'email', ignoreDuplicates: true })

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'proposta-recebida',
    recipient_email: recipientEmail,
    status: 'pending',
    metadata: { lojista_id: proposta.lojista_id, proposta_id, manual_resend: true },
  })

  const { error: enqErr } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: 'proposta-recebida',
      idempotency_key: `manual-${messageId}`,
      unsubscribe_token: unsubToken,
      queued_at: new Date().toISOString(),
    },
  })

  return new Response(JSON.stringify({ ok: !enqErr, message_id: messageId, recipient: recipientEmail, error: enqErr?.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
