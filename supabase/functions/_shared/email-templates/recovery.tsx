/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Repõe a tua password no Achacarro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Repor password</Heading>
        <Text style={text}>
          Recebemos um pedido para repores a tua password no Achacarro. Clica
          no botão abaixo para escolher uma nova.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Repor password
        </Button>
        <Text style={footer}>
          Se não pediste para repor a password, podes ignorar este email — a
          tua password não será alterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0A1F44',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#5b6478',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#FF5A00',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9aa1ad', margin: '32px 0 0' }
