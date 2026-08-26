/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as propostaRecebida } from './proposta-recebida.tsx'
import { template as propostaRespondida } from './proposta-respondida.tsx'
import { template as contrapropostaCliente } from './contraproposta-cliente.tsx'
import { template as lojistaBemvindo } from './lojista-bemvindo.tsx'
import { template as novoLeadLojista } from './novo-lead-lojista.tsx'
import { template as pedidoRecebidoCliente } from './pedido-recebido-cliente.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'proposta-recebida': propostaRecebida,
  'proposta-respondida': propostaRespondida,
  'contraproposta-cliente': contrapropostaCliente,
  'lojista-bemvindo': lojistaBemvindo,
  'novo-lead-lojista': novoLeadLojista,
  'pedido-recebido-cliente': pedidoRecebidoCliente,
}
