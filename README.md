# VITA — Rede institucional B2B

Conectando quem pode doar a quem precisa viver.

Versão funcional de demonstração para o Pitch Day. Todas as instituições, credenciais, estoques, solicitações e conversas são fictícias. Desenvolvimento em `feature/logins-b2b`; integração à `main` e publicação aguardam aprovação do usuário.

## Executar localmente

Requer Node.js 24+ e pnpm 11.25.0.

```sh
pnpm install
node scripts/generate-assets.mjs
pnpm local
```

Abra http://localhost:4173/login.html. O primeiro início aplica as migrações e insere seis contas fictícias. O banco persistente fica em `.data/vita.sqlite`, fora do Git. A migração e o seed não sobrescrevem dados já existentes. Para selecionar outro banco ou porta, use `VITA_DB_PATH` e `PORT`.

## Contas de demonstração

| Instituição | E-mail | Senha de demonstração |
| --- | --- | --- |
| Hemocentro Aurora | admin@hemocentro-aurora.example.com | VitaDemo!Aurora2026 |
| Hemocentro Horizonte | admin@hemocentro-horizonte.example.com | VitaDemo!Horizonte2026 |
| Hemocentro Essência | admin@hemocentro-essencia.example.com | VitaDemo!Essencia2026 |
| Hospital Vida Nova | admin@hospital-vida-nova.example.com | VitaDemo!VidaNova2026 |
| Hospital São Horizonte | admin@hospital-sao-horizonte.example.com | VitaDemo!SaoHorizonte2026 |
| Hospital Integra | admin@hospital-integra.example.com | VitaDemo!Integra2026 |

Estas senhas são fixtures conhecidas da demonstração, não segredos de produção. O arquivo local `Users/vitausers.txt` também reúne as contas. No banco, somente hashes bcrypt com custo 12 são armazenados. `server/seed-data.json` contém hashes, não senhas em texto.

## Experiência implementada

- Login por e-mail e senha, logout e sessão de oito horas em cookie HttpOnly; Secure em HTTPS e SameSite=Strict.
- Painéis específicos por instituição e autorização no servidor. Não depende de identidade ou login ChatGPT.
- Rede de conexões hospital/hemocentro com convite e aceite pela outra empresa.
- Consulta de estoques de parceiros conectados e atualização pelos hemocentros.
- Solicitação hospital → hemocentro, reserva, recusa, envio físico, confirmação de recebimento e cancelamento com motivo.
- Conversa e histórico por pedido, com atualização de tela a cada dez segundos.
- Reservas atômicas: concorrência não pode consumir a mesma disponibilidade duas vezes.
- Isolamento de pedidos, hashes de sessão, limitação de tentativas e rejeição de mutações de outra origem.

Não há cadastro público, envio de e-mails, recuperação de senha, pagamentos, previsão de escassez, dados de pacientes ou integração com instituições reais. Os papéis admin/operator/reader são respeitados pelo servidor; a gestão visual de equipes ficará para evolução futura.

Volumes são exibidos em litros na interface e armazenados como inteiros em mililitros, evitando erros de arredondamento. Todas as quantidades são fictícias para o Pitch Day.

## Organização

- `web/`: HTML, CSS e JavaScript da interface.
- `server/core.mjs`: autenticação, autorização e operações do produto.
- `server/local.mjs` e `server/sqlite.mjs`: servidor local e adaptador SQLite.
- `db/schema.ts` e `drizzle/`: esquema relacional e migrações versionadas.
- `server/seed-data.json`: empresas e hashes das contas fictícias.
- `app/[[...path]]/route.ts`: adaptador de hospedagem Vinext/Cloudflare D1.
- `tests/b2b.test.mjs`: testes de autenticação, isolamento, colaboração, reservas e sessões.

## Verificar

```sh
pnpm test
node scripts/generate-assets.mjs
pnpm build
```

O banco local usa SQLite. A adaptação para Cloudflare D1 usa o mesmo esquema e as mesmas operações; o banco hospedado não foi provisionado nem alterado nesta etapa de revisão local.

O seed hospedado é uma operação explícita em `/api/setup`, protegida por uma chave temporária `VITA_SETUP_KEY`, nunca colocada no código. Ela só pode inserir os fixtures uma vez. A publicação futura deverá aplicar as migrações, inserir os fixtures e remover essa chave.

Para a versão hospedada apresentar apenas o login empresarial, o acesso Sites também precisará ser configurado para permitir a página de entrada sem autenticação ChatGPT. Essa alteração será feita junto da publicação, depois da aprovação. Até lá, o site publicado e a branch main permanecem na versão anterior.


## Vercel + Supabase

A publicação na Vercel utiliza `api/entry.mjs` e o banco PostgreSQL da Supabase. O ambiente local continua usando SQLite, com a mesma lógica de negócio.

1. Criar um projeto Supabase dedicado à VITA.
2. Aplicar `supabase/migrations/202610090001_vita_b2b.sql` uma única vez no novo banco. As tabelas ficam no schema privado `vita`, sem acesso de navegador pela API pública da Supabase.
3. Configurar `DATABASE_URL` ou os campos separados `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD` somente no ambiente do servidor da Vercel, com a conexão pooler da Supabase e TLS. Não colocar credenciais no GitHub ou no código do navegador.
4. Inicializar as seis empresas fictícias com `pnpm db:seed:cloud`, no ambiente que possui `DATABASE_URL`.
5. Importar a branch `feature/logins-b2b` na Vercel. `vercel.json` gera os recursos e encaminha páginas e APIs para o servidor.

Os testes PostgreSQL validam login, isolamento entre instituições, conversa, reserva concorrente, cancelamento e recebimento de volumes em litros. Publicar esta branch não modifica a `main`.
