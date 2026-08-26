## Plano para resolver os emails

### Diagnóstico atual
Encontrei dois pontos diferentes a bloquear o envio:

1. **O domínio de envio `notify.achacarro.pt` ainda está pendente** no backend de emails.
2. Nos registos recentes de envio, os emails mais novos falharam com **`Emails disabled for this project`** — ou seja, além do DNS, o envio do projeto também ficou desativado em algum momento.

Isso explica porque “mesmo alterando o DNS” continua sem funcionar: neste momento há indícios de **duplo bloqueio**.

### O que vou fazer quando aprovares
1. **Reativar os emails do projeto** para remover o bloqueio global de envio.
2. **Realinhar a infraestrutura de emails** com o domínio atual `notify.achacarro.pt`, garantindo que a fila e o remetente estão configurados para esse domínio.
3. **Validar a configuração do domínio** e confirmar se ele continua pendente ou se passou a ativo após a atualização.
4. **Testar o fluxo real da proposta** para verificar se o email volta a entrar corretamente na fila.
5. **Confirmar o resultado nos registos de envio**, verificando se o estado muda de `dlq/failed` para `pending/sent`.

### Resultado esperado
Depois disso, teremos um destes cenários:

- **Cenário A — tudo normalizado:** os emails voltam a sair.
- **Cenário B — envio reativado, mas domínio ainda pendente:** o sistema fica corretamente configurado do lado da app, e o único bloqueio restante será a verificação final do DNS.

### Detalhes técnicos
- Os registos mais recentes em `email_send_log` mostram falhas com `Emails disabled for this project`.
- A estrutura de emails (`email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`) existe, por isso a base da infraestrutura está criada.
- O problema atual parece estar entre **estado global de envio** + **verificação do domínio**, não na interface de proposta em si.

Se aprovares, eu sigo com a correção diretamente.