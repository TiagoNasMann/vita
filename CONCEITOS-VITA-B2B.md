# VITA — Conceito do produto B2B

**Proposta para aprovação.** Este documento orienta a próxima versão. As funcionalidades descritas ainda não estão implementadas. O banco de dados será criado após a aprovação.

## 1. O negócio

A Vita é uma plataforma B2B de coordenação entre hemocentros e hospitais. Seu valor está em transformar informações sobre disponibilidade e demanda de hemocomponentes em comunicação, planejamento e mobilização direcionados.

**Slogan:** Conectando quem pode doar a quem precisa viver.

O cliente é a instituição. Cada instituição contrata e administra sua empresa na Vita; seus profissionais acessam o ambiente por contas individuais. Hospital e hemocentro não são apenas perfis visuais: possuem responsabilidades e permissões diferentes.

A Vita apoia processos institucionais. Não decide compatibilidade transfusional, indicação clínica, elegibilidade de doadores ou liberação de hemocomponentes. Essas decisões continuam com os profissionais responsáveis.

## 2. Duas experiências conectadas

### Hemocentro

O hemocentro acompanha disponibilidade, reservas e necessidades, recebe solicitações de hospitais conectados e organiza respostas. Pode publicar campanhas para sua rede e acompanhar a evolução da demanda.

Seu início mostra: solicitações recebidas, itens aguardando resposta, reservas em andamento, situação dos estoques e idade da última atualização.

### Hospital

O hospital encontra hemocentros da sua rede, consulta informações compartilhadas, solicita atendimento de uma demanda e acompanha respostas e movimentações.

Seu início mostra: solicitações abertas, respostas recebidas, previsão de atendimento informada pela outra instituição e pendências de recebimento.

**Uma empresa pode ter vários profissionais.** O primeiro administrador convida sua equipe. Uma pessoa pode atuar em mais de uma empresa somente com vínculo autorizado; o contexto da empresa ativa fica sempre visível.

## 3. Rede institucional e interação entre contas

Uma instituição possui perfil com nome, tipo, região, contatos institucionais e situação de verificação. Na demonstração, todas serão claramente fictícias.

O fluxo de conexão será: encontrar instituição → enviar solicitação → a outra empresa aceitar ou recusar → configurar informações compartilhadas → iniciar colaboração.

A aceitação abre o canal de trabalho, mas não expõe automaticamente todos os dados. Cada hemocentro escolhe quais informações de disponibilidade compartilha e com quais parceiros. Conexões podem ser suspensas para novas operações; solicitações anteriores preservam seu histórico e acesso às partes envolvidas.

As contas interagem por solicitações, respostas, mensagens vinculadas a um pedido, notificações internas e atualizações de estado. Mensagens gerais podem entrar depois; no MVP, a conversa vinculada ao pedido mantém o contexto e a rastreabilidade.

## 4. Fluxo principal: solicitação institucional

**Exemplo fictício:** o Hospital Vida Nova solicita ao Hemocentro Aurora atendimento de uma demanda de concentrado de hemácias O−. A quantidade e o prazo são informados pelo profissional. A Vita encaminha o pedido; o hemocentro analisa e responde. Isso não equivale a liberação clínica ou autorização automática de transporte.

1. O hospital cria um rascunho com hemocomponente, grupo ABO/Rh quando aplicável, quantidade e unidade, prazo solicitado, prioridade institucional e observação operacional.
2. Seleciona um hemocentro conectado e envia. O pedido recebe identificador e horário; alterações posteriores ficam registradas.
3. O hemocentro aceita, recusa, solicita esclarecimento ou propõe atendimento parcial e prazo alternativo.
4. O hospital confirma uma proposta. Uma reserva só surge quando explicitamente confirmada no fluxo, nunca apenas pela existência do pedido.
5. O responsável registra a liberação e o envio conforme seu processo institucional; o hospital confirma o recebimento.
6. Ambas as instituições consultam a linha do tempo e encerram o pedido. Cancelamentos, divergências e atendimento parcial exigem motivo.

**Estados sugeridos:** rascunho, enviado, em análise, aguardando esclarecimento, proposta enviada, confirmado, em preparação, enviado fisicamente, recebido e encerrado. Recusado e cancelado são estados alternativos com motivo. O nome “enviado fisicamente” distingue o transporte do envio inicial do pedido.

Cada mudança tem ator autorizado, empresa, data, motivo quando necessário e versão. Ações repetidas não podem gerar reservas duplicadas. Se um pedido for dividido entre fornecedores, cada atendimento terá seu próprio acompanhamento; esse recurso fica fora do primeiro MVP.

Urgência terá identificação clara e notificações internas, mas a plataforma não prometerá atendimento emergencial nem substituirá os canais institucionais de urgência.

## 5. Estoques com contexto

O estoque pertence ao hemocentro. A estrutura deve distinguir hemocomponente, ABO/Rh quando pertinente, quantidade, unidade de medida, disponível, reservado e data/hora da atualização. Tipos sanguíneos isolados não bastam para representar a operação.

No MVP, as atualizações serão manuais e auditadas. A interface identificará “informado pela instituição” e sinalizará dados desatualizados. Limites de atenção serão configurados pelo hemocentro, sem apresentar valores arbitrários como regras clínicas.

A disponibilidade compartilhada pode ser resumida em faixas e categorias. Informações detalhadas de lotes, validade e identificação de bolsas ficam para uma integração validada com o sistema do hemocentro.

O aceite de pedidos não poderá consumir a mesma disponibilidade duas vezes. Reservas e alterações de quantidade precisam de transações consistentes no servidor. A primeira versão não usará um painel estático como fonte operacional de estoque.

## 6. Inteligência e mobilização: o diferencial original

O conceito da conversa compartilhada se mantém: antecipar escassez, encontrar potenciais doadores e mobilizar de forma direcionada. Para um negócio B2B, a inteligência começa na coordenação entre instituições.

**Fase inicial:** regras transparentes sobre estoque informado, volume de pedidos e parâmetros institucionais. O sistema explica o motivo de cada alerta e a atualização que o originou.

**Fase seguinte:** tendências de demanda e possíveis cenários de escassez, depois de existir histórico suficiente e validação com as instituições. Previsões devem apresentar contexto, limitações e acompanhamento do desempenho; não serão chamadas de IA preditiva antes dessa validação.

**Mobilização de doadores:** módulo futuro administrado pelo hemocentro, com consentimento, preferências de contato e integração institucional. A Vita poderá selecionar candidatos para campanhas por informações autorizadas; a aptidão final depende de triagem. O MVP B2B não armazenará um cadastro de doadores nem enviará mensagens externas.

## 7. Permissões e isolamento

Papéis propostos:

- **Administrador da empresa:** gerencia cadastro, equipe, papéis e conexões.
- **Operador:** atua nos pedidos e, no hemocentro, no estoque conforme autorização.
- **Gestor:** acompanha indicadores e aprova ações que a instituição configurar.
- **Leitor:** consulta informações permitidas, sem alterar dados.

O servidor verifica empresa, vínculo, papel e participação em cada pedido. Conhecer o identificador de outra empresa não concede acesso. Pedidos são visíveis apenas às empresas participantes e aos usuários autorizados dentro delas.

O administrador da Vita cuida da operação da plataforma e verificação institucional. Não recebe acesso irrestrito ao conteúdo das empresas por padrão; eventual suporte excepcional precisa de autorização e registro.

## 8. Produto e telas do MVP

1. Site institucional com proposta B2B e apresentação dos dois tipos de instituição.
2. Login empresarial, recuperação de acesso e seleção da empresa quando necessário.
3. Painel específico para hospital ou hemocentro.
4. Rede de instituições: busca, perfis, convites e conexões.
5. Solicitações: lista, filtros, criação e detalhes com conversa e linha do tempo.
6. Estoques: atualização pelo hemocentro e consulta permitida pelos parceiros.
7. Central de notificações internas e marcação de leitura.
8. Gestão da empresa, membros e permissões.

Campanhas e tendências aparecem como evolução após o fluxo principal estar consistente. Não vamos incluir cobrança, geolocalização de doadores ou automação de mensagens no primeiro MVP.

## 9. Negócio e lançamento

Hipótese comercial: assinatura institucional. A oferta para hemocentros enfatiza coordenação da demanda, estoque e campanhas; a oferta para hospitais enfatiza acesso à rede e acompanhamento de solicitações. Preços e limites dependem de entrevistas e piloto, sem valores inventados nesta etapa.

A aquisição inicial pode começar com um pequeno conjunto regional de instituições, porque o valor da rede exige participantes dos dois lados. A verificação institucional é necessária antes de permitir operação real. Indicadores úteis: tempo até primeira resposta, taxa de atendimento, pedidos pendentes e consistência de atualização dos estoques. Não apresentaremos “vidas salvas” como métrica atribuída ao software sem evidência.

## 10. Banco de dados proposto — ainda não criado

Proposta: PostgreSQL com modelo de múltiplas empresas, autorização no servidor e políticas de isolamento compatíveis com a infraestrutura escolhida. A hospedagem atual do site estático precisará evoluir para um serviço de aplicação capaz de acessar esse banco; a escolha final deve respeitar a infraestrutura de publicação.

Entidades principais: empresas, usuários, vínculos e papéis, convites de equipe, conexões entre empresas, permissões de compartilhamento, estoques e atualizações, solicitações e itens, propostas de atendimento, reservas, mensagens, eventos do pedido, notificações e auditoria.

Relacionamentos essenciais: usuário → vínculos → empresas; conexão → duas empresas; pedido → hospital solicitante + hemocentro destinatário; itens → pedido; mensagens e eventos → pedido + autor. A empresa responsável e as partes autorizadas são explícitas em cada operação.

Senhas serão armazenadas apenas como hashes apropriados; segredos ficam fora do código e do repositório. As credenciais no arquivo Users/vitausers.txt são exemplos solicitados para desenvolvimento, ainda sem autenticação funcional. Nenhum dado de paciente é necessário para a demonstração.

Antes de criar o banco, precisamos escolher o provedor e o ambiente. Dados operacionais reais, retenção e integrações devem ser validados com as instituições antes de uso em produção.

## 11. Critérios de aceite da próxima versão

- As seis empresas fictícias acessam ambientes distintos.
- Hospital pode solicitar uma conexão e hemocentro pode aceitá-la.
- Hospital cria um pedido e o hemocentro conectado consegue responder.
- As duas empresas veem a mesma linha do tempo e conversa.
- Uma terceira empresa não consegue ler ou alterar o pedido, inclusive por acesso direto à API.
- Estoques compartilhados respeitam permissões e mostram sua atualização.
- Reserva simultânea não duplica disponibilidade.
- As ações deixam registro de autoria e horário.
- Interface funciona em telas pequenas e deixa clara a empresa ativa.

## 12. Aprovação necessária para seguir

A proposta recomendada é priorizar **rede institucional + solicitações + conversa por pedido + estoque compartilhado + permissões**, mantendo campanhas para doadores e previsão avançada para uma fase posterior.

Após aprovação desse recorte, a próxima etapa será definir a infraestrutura do banco e implementar autenticação empresarial e o fluxo entre hospital e hemocentro. Aprovar os conceitos autoriza iniciar essa etapa; contratação de serviços pagos ou uso de dados reais dependerá de instruções específicas.
