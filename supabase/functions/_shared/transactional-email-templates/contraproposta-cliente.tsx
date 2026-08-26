/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Achacarro'
const PAINEL_URL = 'https://achacarro.com/painel/propostas'

interface Props {
  empresa?: string
  cliente?: string
  cliente_nome?: string
  marca_modelo?: string
  preco_original?: number
  preco_proposto?: number
  mensagem?: string
  whatsapp_cliente?: string
  email_cliente?: string
  sent_at?: string
}

const fmt = (v?: number) => (typeof v === 'number' ? v.toLocaleString('pt-PT') + ' €' : '—')
const fmtDate = (s?: string) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('pt-PT') } catch { return s }
}

const ContrapropostaEmail = (p: Props) => {
  const nomeCliente = p.cliente || p.cliente_nome || 'O cliente'
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{nomeCliente} quer negociar a sua proposta no {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>💬 Cliente quer negociar</Heading>
          <Text style={text}>Olá{p.empresa ? `, ${p.empresa}` : ''}.</Text>
          <Text style={text}>
            <strong>{nomeCliente}</strong> respondeu à sua proposta e quer negociar.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Cliente</Text>
            <Text style={cardValue}>{nomeCliente}</Text>
            {p.whatsapp_cliente ? <>
              <Text style={cardLabel}>Telemóvel / WhatsApp</Text>
              <Text style={cardValue}><strong>{p.whatsapp_cliente}</strong></Text>
            </> : null}
            {p.email_cliente ? <>
              <Text style={cardLabel}>Email</Text>
              <Text style={cardValue}><strong>{p.email_cliente}</strong></Text>
            </> : null}
            <Text style={cardLabel}>Carro pretendido</Text>
            <Text style={cardValue}>{p.marca_modelo || '—'}</Text>
            <Text style={cardLabel}>Valor da proposta original</Text>
            <Text style={cardValue}>{fmt(p.preco_original)}</Text>
            <Text style={cardLabel}>Contraproposta do cliente</Text>
            <Text style={{ ...cardValue, color: '#FF5A00', fontSize: '20px' }}><strong>{fmt(p.preco_proposto)}</strong></Text>
            {p.mensagem ? <>
              <Text style={cardLabel}>Mensagem do cliente</Text>
              <Text style={cardValue}>"{p.mensagem}"</Text>
            </> : null}
            <Text style={cardLabel}>Data e hora da resposta</Text>
            <Text style={cardValue}>{fmtDate(p.sent_at)}</Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={PAINEL_URL} style={button}>Responder negociação no painel</Button>
          </Section>

          <Text style={footer}>{SITE_NAME} — propostas claras, decisões rápidas.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContrapropostaEmail,
  subject: () => 'Cliente quer negociar a sua proposta no AchaCarro',
  displayName: 'Contraproposta (stand)',
  previewData: {
    empresa: 'Stand Lisboa Motors',
    cliente: 'Joana Silva',
    marca_modelo: 'BMW Série 1 118d',
    preco_original: 18500,
    preco_proposto: 17000,
    mensagem: 'Consigo fechar hoje a este valor.',
    whatsapp_cliente: '+351 912 345 678',
    email_cliente: 'joana@exemplo.pt',
    sent_at: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '600px' }
const h1 = { fontFamily: "'Plus Jakarta Sans', Arial, sans-serif", fontSize: '24px', fontWeight: 'bold' as const, color: '#0A1F44', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5b6478', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f6f7fb', borderRadius: '14px', padding: '20px 22px', margin: '0 0 20px' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8a93a6', margin: '0 0 4px', fontWeight: 'bold' as const }
const cardValue = { fontSize: '15px', color: '#0A1F44', margin: '0 0 12px', lineHeight: '1.5' }
const button = { backgroundColor: '#FF5A00', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9aa1ad', margin: '24px 0 0' }
