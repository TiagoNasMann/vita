# VITA — Conectando vidas

Conectando quem pode doar a quem precisa viver.

Site institucional responsivo, tela de acesso e painel de demonstração da proposta Vita. Identidade vinho, branco e tons neutros, com a logo original fornecida.

## Executar localmente

Sirva `dist/` com qualquer servidor HTTP estático. Exemplo: `python3 -m http.server 4173 --directory dist`.

Páginas: `/`, `/login.html`, `/painel.html`. Sem dependências de build.

## Autenticação e acesso

O deploy Sites é privado ao proprietário. A plataforma hospedada aplica autenticação ChatGPT; a tela usa `/signin-with-chatgpt?return_to=%2Fpainel.html`. O código estático não recebe senhas nem implementa contas próprias. No servidor local, essa rota de autenticação não existe. O painel não contém dados privados e pode ser explorado localmente.

## Limites explícitos

Estoques e campanhas são fictícios, não há parceria com hemocentros, previsão real, cadastro de doadores, envio de mensagens ou confirmação de agendamento. Links direcionam ao canal oficial Hemominas. A Vita não avalia elegibilidade médica.

## Evolução

Operação real requer validação institucional, autenticação por perfil, banco de dados protegido, consentimento e integrações oficiais para estoques, alertas e agendamento.
