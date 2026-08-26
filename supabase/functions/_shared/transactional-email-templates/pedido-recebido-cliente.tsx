/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Achacarro'

interface Props {
  nome?: string
  tipo_compra?: string
  marca_modelo?: string
  preco_max?: number
  forma_pagamento?: string
  distrito?: string
  link_cliente?: string
}

const fmt = (v?: number) => (typeof v === 'number' ? v.toLocaleString('pt-PT') + ' €' : '—')

const PedidoRecebidoEmail = (p: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Recebemos o seu pedido no {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{p.nome ? `Olá ${p.nome},` : 'Olá,'} recebemos o seu pedido ✅</Heading>
        <Text style={text}>
          O seu pedido foi recebido com sucesso. Stands parceiros poderão enviar
          propostas em até 24 horas. Avisaremos por email assim que chegarem.
        </Text>

        <Section style={card}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr><td style={tdLabel}>Tipo de compra</td><td style={tdValue}>{p.tipo_compra || '—'}</td></tr>
              <tr><td style={tdLabel}>Carro pretendido</td><td style={tdValue}>{p.marca_modelo || 'Aberto a sugestões'}</td></tr>
              <tr><td style={tdLabel}>Orçamento</td><td style={tdValue}>{fmt(p.preco_max)}</td></tr>
              <tr><td style={tdLabel}>Forma de pagamento</td><td style={tdValue}>{p.forma_pagamento || '—'}</td></tr>
              <tr><td style={tdLabel}>Distrito</td><td style={tdValue}>{p.distrito || '—'}</td></tr>
            </tbody>
          </table>
        </Section>

        {p.link_cliente ? (
          <Section style={{ textAlign: 'center' as const, margin: '0 0 20px' }}>
            <Button href={p.link_cliente} style={cta}>Ver as minhas propostas</Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — propostas claras, decisões rápidas.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PedidoRecebidoEmail,
  subject: () => `Recebemos o seu pedido no ${SITE_NAME}`,
  displayName: 'Pedido recebido (cliente)',
  previewData: {
    nome: 'Joana',
    tipo_compra: 'Uso próprio',
    marca_modelo: 'BMW Série 1',
    preco_max: 20000,
    forma_pagamento: 'Pronto pagamento',
    distrito: 'Lisboa',
    link_cliente: 'https://achacarro.pt/minhas-propostas/abc',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '600px' }
const h1 = { fontFamily: "'Plus Jakarta Sans', Arial, sans-serif", fontSize: '24px', fontWeight: 'bold' as const, color: '#0A1F44', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5b6478', lineHeight: '1.6', margin: '0 0 20px' }
const card = { backgroundColor: '#f6f7fb', borderRadius: '14px', padding: '16px 22px', margin: '0 0 20px' }
const tdLabel = { fontSize: '13px', color: '#8a93a6', padding: '8px 0', width: '45%' }
const tdValue = { fontSize: '14px', color: '#0A1F44', padding: '8px 0' }
const hr = { borderColor: '#e5e8ef', margin: '14px 0' }
const cta = { backgroundColor: '#FF5A00', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9aa1ad', margin: '24px 0 0' }
