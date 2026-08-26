/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Achacarro'

interface PropostaRecebidaProps {
  nome?: string
  empresa?: string
  preco?: number
  marca_modelo?: string
  ano?: number
  km?: number
  mensagem?: string
  link_anuncio?: string
  whatsapp?: string
  email_lojista?: string
  aceita_retoma?: boolean
  valor_retoma?: number
  oferece_financiamento?: boolean
  condicoes_financiamento?: string
  total_propostas?: number
  link_cliente?: string
}

const fmtPreco = (v?: number) =>
  typeof v === 'number' ? v.toLocaleString('pt-PT') + ' €' : '—'

const PropostaRecebidaEmail = (p: PropostaRecebidaProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>
      {(p.empresa || 'Um stand')} enviou-te uma proposta no {SITE_NAME}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {p.nome ? `Olá ${p.nome},` : 'Olá,'} tens uma nova proposta 🚗
        </Heading>
        <Text style={text}>
          <strong>{p.empresa || 'Um stand'}</strong> respondeu ao teu pedido com a seguinte oferta:
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Carro proposto</Text>
          <Text style={cardValue}>{p.marca_modelo || '—'}</Text>

          <Hr style={hr} />

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={tdLabel}>Preço</td>
                <td style={tdValue}><strong>{fmtPreco(p.preco)}</strong></td>
              </tr>
              <tr>
                <td style={tdLabel}>Ano</td>
                <td style={tdValue}>{p.ano ?? '—'}</td>
              </tr>
              <tr>
                <td style={tdLabel}>Quilómetros</td>
                <td style={tdValue}>{p.km != null ? String(p.km).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' km' : '—'}</td>
              </tr>
              <tr>
                <td style={tdLabel}>Aceita retoma</td>
                <td style={tdValue}>{p.aceita_retoma ? (p.valor_retoma ? `Sim — ${fmtPreco(p.valor_retoma)}` : 'Sim') : 'Não'}</td>
              </tr>
              <tr>
                <td style={tdLabel}>Financiamento</td>
                <td style={tdValue}>{p.oferece_financiamento ? 'Sim' : 'Não'}</td>
              </tr>
            </tbody>
          </table>

          {p.condicoes_financiamento ? (
            <>
              <Hr style={hr} />
              <Text style={cardLabel}>Condições de financiamento</Text>
              <Text style={cardValue}>{p.condicoes_financiamento}</Text>
            </>
          ) : null}

          {p.mensagem ? (
            <>
              <Hr style={hr} />
              <Text style={cardLabel}>Mensagem do stand</Text>
              <Text style={cardValue}>{p.mensagem}</Text>
            </>
          ) : null}

          {p.link_anuncio ? (
            <>
              <Hr style={hr} />
              <Text style={cardLabel}>Link do anúncio</Text>
              <Text style={cardValue}>
                <a href={p.link_anuncio} style={link}>{p.link_anuncio}</a>
              </Text>
            </>
          ) : null}
        </Section>

        {p.link_cliente ? (
          <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
            <Button href={p.link_cliente} style={cta}>Ver e responder à proposta</Button>
            <Text style={{ ...text, fontSize: '12px', margin: '10px 0 0' }}>
              Ou copia este link: <a href={p.link_cliente} style={link}>{p.link_cliente}</a>
            </Text>
          </Section>
        ) : null}

        <Section style={contact}>
          <Text style={contactTitle}>Contacto direto</Text>
          {p.whatsapp ? <Text style={contactLine}>WhatsApp: <strong>{p.whatsapp}</strong></Text> : null}
          {p.email_lojista ? <Text style={contactLine}>Email: <strong>{p.email_lojista}</strong></Text> : null}
        </Section>

        {typeof p.total_propostas === 'number' ? (
          <Text style={badge}>
            Já recebeste {p.total_propostas} de 10 propostas para este pedido.
          </Text>
        ) : null}

        <Text style={footer}>
          Recebeste este email porque submeteste um pedido no {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PropostaRecebidaEmail,
  subject: (d: Record<string, any>) =>
    `Nova proposta${d?.empresa ? ` de ${d.empresa}` : ''}${d?.preco ? ` — ${Number(d.preco).toLocaleString('pt-PT')} €` : ''}`,
  displayName: 'Proposta recebida',
  previewData: {
    nome: 'Joana',
    empresa: 'Stand Lisboa Motors',
    preco: 18500,
    marca_modelo: 'BMW Série 1 118d',
    ano: 2020,
    km: 65000,
    mensagem: 'Temos esta unidade em excelente estado, com livro de revisões.',
    link_anuncio: 'https://exemplo.pt/anuncio/123',
    whatsapp: '+351 912 345 678',
    email_lojista: 'vendas@standlisboa.pt',
    aceita_retoma: true,
    oferece_financiamento: true,
    condicoes_financiamento: 'Entrada de 2.000 € e 60 meses a partir de 250 €/mês.',
    total_propostas: 3,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '600px' }
const h1 = {
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
  fontSize: '24px', fontWeight: 'bold' as const, color: '#0A1F44', margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#5b6478', lineHeight: '1.6', margin: '0 0 20px' }
const card = {
  backgroundColor: '#f6f7fb', borderRadius: '14px', padding: '20px 22px', margin: '0 0 20px',
}
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8a93a6', margin: '0 0 4px', fontWeight: 'bold' as const }
const cardValue = { fontSize: '15px', color: '#0A1F44', margin: '0 0 8px', lineHeight: '1.5' }
const hr = { borderColor: '#e5e8ef', margin: '14px 0' }
const tdLabel = { fontSize: '13px', color: '#8a93a6', padding: '6px 0', width: '45%' }
const tdValue = { fontSize: '14px', color: '#0A1F44', padding: '6px 0' }
const contact = {
  border: '1px solid #FF5A00', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px',
}
const contactTitle = { fontSize: '13px', fontWeight: 'bold' as const, color: '#FF5A00', margin: '0 0 8px', textTransform: 'uppercase' as const }
const contactLine = { fontSize: '14px', color: '#0A1F44', margin: '4px 0' }
const link = { color: '#FF5A00', textDecoration: 'underline' }
const badge = { fontSize: '13px', color: '#5b6478', backgroundColor: '#fff4ec', padding: '10px 14px', borderRadius: '10px', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#9aa1ad', margin: '24px 0 0' }
const cta = { backgroundColor: '#FF5A00', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
