/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Achacarro'

interface Props {
  empresa?: string
  tipo_compra?: string
  distrito?: string
  preco_max?: number
  marca_modelo?: string
  forma_pagamento?: string
  tem_retoma?: boolean
  link_painel?: string
}

const fmt = (v?: number) => (typeof v === 'number' ? v.toLocaleString('pt-PT') + ' €' : '—')

const NovoLeadEmail = (p: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Novo lead disponível no {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚗 Novo lead disponível</Heading>
        <Text style={text}>
          {p.empresa ? `Olá ${p.empresa}, ` : ''}há um novo cliente à procura de carro compatível com o seu stand.
        </Text>

        <Section style={card}>
          <Row label="Tipo de compra" value={p.tipo_compra || '—'} />
          <Row label="Distrito" value={p.distrito || '—'} />
          <Row label="Orçamento" value={fmt(p.preco_max)} />
          <Row label="Marca / modelo" value={p.marca_modelo || 'Aberto a sugestões'} />
          <Row label="Forma de pagamento" value={p.forma_pagamento || '—'} />
          <Row label="Tem retoma" value={p.tem_retoma ? 'Sim' : 'Não'} />
        </Section>

        {p.link_painel ? (
          <Section style={{ textAlign: 'center' as const, margin: '8px 0 24px' }}>
            <Button href={p.link_painel} style={cta}>Ver lead</Button>
          </Section>
        ) : null}

        <Text style={footer}>{SITE_NAME} — só recebe este aviso enquanto a conta estiver ativa.</Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <>
    <table style={{ width: '100%' }}>
      <tbody>
        <tr>
          <td style={tdLabel}>{label}</td>
          <td style={tdValue}><strong>{value}</strong></td>
        </tr>
      </tbody>
    </table>
    <Hr style={hr} />
  </>
)

export const template = {
  component: NovoLeadEmail,
  subject: () => `Novo lead disponível no ${SITE_NAME}`,
  displayName: 'Novo lead (stand)',
  previewData: {
    empresa: 'Stand Lisboa Motors',
    tipo_compra: 'Uso próprio',
    distrito: 'Lisboa',
    preco_max: 20000,
    marca_modelo: 'BMW Série 1',
    forma_pagamento: 'Pronto pagamento',
    tem_retoma: true,
    link_painel: 'https://achacarro.pt/painel',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '600px' }
const h1 = { fontFamily: "'Plus Jakarta Sans', Arial, sans-serif", fontSize: '24px', fontWeight: 'bold' as const, color: '#0A1F44', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5b6478', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f6f7fb', borderRadius: '14px', padding: '16px 22px', margin: '0 0 20px' }
const tdLabel = { fontSize: '13px', color: '#8a93a6', padding: '8px 0', width: '45%' }
const tdValue = { fontSize: '14px', color: '#0A1F44', padding: '8px 0' }
const hr = { borderColor: '#e5e8ef', margin: '0' }
const cta = { backgroundColor: '#FF5A00', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9aa1ad', margin: '24px 0 0' }
