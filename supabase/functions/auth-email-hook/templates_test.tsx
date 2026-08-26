/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { assert, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'

import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const SITE = 'Achacarro'
const URL = 'https://achacarro.pt'
const CONFIRM = 'https://achacarro.pt/confirm?token=abc123XYZ'
const RECIPIENT = 'user@example.com'
const OLD_EMAIL = 'old@example.com'
const NEW_EMAIL = 'new@example.com'
const TOKEN = '654321'

async function render(node: React.ReactElement) {
  const html = await renderAsync(node)
  assert(html.length > 100, 'rendered HTML too short')
  assertStringIncludes(html, '<html')
  return html
}

Deno.test('SignupEmail renders with confirmationUrl and recipient', async () => {
  const html = await render(
    <SignupEmail siteName={SITE} siteUrl={URL} recipient={RECIPIENT} confirmationUrl={CONFIRM} />
  )
  assertStringIncludes(html, CONFIRM)
  assertStringIncludes(html, RECIPIENT)
  assertStringIncludes(html, URL)
})

Deno.test('RecoveryEmail renders with confirmationUrl', async () => {
  const html = await render(
    <RecoveryEmail siteName={SITE} confirmationUrl={CONFIRM} />
  )
  assertStringIncludes(html, CONFIRM)
})

Deno.test('MagicLinkEmail renders with confirmationUrl', async () => {
  const html = await render(
    <MagicLinkEmail siteName={SITE} confirmationUrl={CONFIRM} />
  )
  assertStringIncludes(html, CONFIRM)
})

Deno.test('InviteEmail renders with siteUrl and confirmationUrl', async () => {
  const html = await render(
    <InviteEmail siteName={SITE} siteUrl={URL} confirmationUrl={CONFIRM} />
  )
  assertStringIncludes(html, CONFIRM)
  assertStringIncludes(html, URL)
})

Deno.test('EmailChangeEmail renders with old/new emails and confirmationUrl', async () => {
  const html = await render(
    <EmailChangeEmail
      siteName={SITE}
      oldEmail={OLD_EMAIL}
      email={OLD_EMAIL}
      newEmail={NEW_EMAIL}
      confirmationUrl={CONFIRM}
    />
  )
  assertStringIncludes(html, CONFIRM)
  assertStringIncludes(html, OLD_EMAIL)
  assertStringIncludes(html, NEW_EMAIL)
})

Deno.test('ReauthenticationEmail renders with token', async () => {
  const html = await render(<ReauthenticationEmail token={TOKEN} />)
  assertStringIncludes(html, TOKEN)
})
