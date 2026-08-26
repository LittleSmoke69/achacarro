/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Achacarro'

interface Props { nome?: string; empresa?: string; link_painel?: string }

const LojistaBemvindoEmail = (p: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Bem-vindo ao {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bem-vindo ao {SITE_NAME} 👋</Heading>
        <Text style={text}>
          {p.nome ? `Olá ${p.nome},` : 'Olá,'} recebemos o registo
          {p.empresa ? ` de ${p.empresa}` : ''} com sucesso.
        </Text>
        <Text style={text}>
          Após aprovação da conta, poderá começar a receber leads de clientes
          interessados em comprar veículos.
        </Text>
        {p.link_painel ? (
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button href={p.link_painel} style={cta}>Ir para o painel</Button>
          </Section>
        ) : null}
        <Text style={footer}>{SITE_NAME} — propostas claras, decisões rápidas.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LojistaBemvindoEmail,
  subject: () => `Bem-vindo ao ${SITE_NAME}`,
  displayName: 'Boas-vindas ao stand',
  previewData: { nome: 'João', empresa: 'Stand Lisboa Motors', link_painel: 'https://achacarro.pt/painel' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '600px' }
const h1 = { fontFamily: "'Plus Jakarta Sans', Arial, sans-serif", fontSize: '24px', fontWeight: 'bold' as const, color: '#0A1F44', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#5b6478', lineHeight: '1.6', margin: '0 0 16px' }
const cta = { backgroundColor: '#FF5A00', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9aa1ad', margin: '24px 0 0' }
