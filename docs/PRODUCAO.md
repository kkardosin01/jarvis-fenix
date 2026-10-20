# Jarvis Fênix (celular) — como está em produção

Estado em **19/10/2026**, dia em que o app foi construído e publicado. Este documento diz **onde cada peça está**; o passo a passo genérico de configuração fica no [README](../README.md). Nenhum segredo aparece aqui: só o nome de cada variável e onde ela fica.

## Endereços

| O quê | Onde |
|---|---|
| App em produção | <https://jarvis-fenix.vercel.app> |
| Código | <https://github.com/kkardosin01/jarvis-fenix> (privado) |
| Projeto na Vercel | time **fin-ez** → projeto **jarvis-fenix** (plano Hobby), região `gru1` (São Paulo) |
| Banco | Supabase, projeto **comercial-fenix** (`gxbqwnsmfuntbmfltqey`, São Paulo) — **o mesmo do site** |
| Google Cloud | projeto **jarvis-fenix**, na conta Google da empresa (`fenix.hospitalares@gmail.com`) |
| Planilha | Jarvis_Fenix (`1krSssMZcSLsD7mmCOOGQp_foJMEJqhAS2t4ExjHZAVE`) |

## Google Cloud (projeto `jarvis-fenix`)

- **Google Sheets API** ativada.
- **Conta de serviço** `jarvis-web@jarvis-fenix.iam.gserviceaccount.com`, sem papéis no projeto. Tem acesso **Editor** à planilha Jarvis_Fenix (compartilhada direto na planilha). Uma chave JSON criada em 19/10; o arquivo baixado foi apagado depois de copiado para as variáveis.
- **Login com Google (Google Auth Platform)**
  - Branding: app "Jarvis Fenix", suporte e contato `fenix.hospitalares@gmail.com`; política de dados do usuário das APIs do Google aceita.
  - Público: **Externo, modo Teste**. Usuários de teste: `cardosopedro0709@gmail.com` e `tuliocardoso1711@gmail.com`. Por isso, na primeira entrada aparece "O Google não verificou este app" → **Continuar**. Para incluir outra pessoa: adicionar como usuário de teste **e** em `ALLOWED_EMAILS`.
  - Cliente OAuth "Jarvis web" (Aplicativo da Web): origem `https://jarvis-fenix.vercel.app`, redirecionamento `https://jarvis-fenix.vercel.app/api/auth/callback/google`. Para testar em `localhost`, acrescente `http://localhost:3001` e `http://localhost:3001/api/auth/callback/google` no mesmo cliente.

## Supabase (projeto `comercial-fenix`)

Migração `jarvis_tabelas` (= `supabase/migrations/0001_jarvis.sql`): tabelas `contas_email`, `boletos_pagos`, `push_inscricoes`, `jarvis_estado`, todas com RLS ligado e **sem políticas** (só a service role acessa). As tabelas do site não foram tocadas. O aviso "RLS Enabled No Policy" do painel de segurança é esperado.

Migração `jarvis_pg_cron`:

- extensão `pg_net` ligada (o `pg_cron` já existia);
- função `public.jarvis_chamar(caminho)` — chama `https://jarvis-fenix.vercel.app<caminho>` com `Authorization: Bearer` lido do Vault (segredo `jarvis_cron_secret`, igual ao `CRON_SECRET` da Vercel); acesso revogado de `anon` e `authenticated`.

Jobs do `pg_cron` (horário UTC; Brasília = UTC−3):

| Job | Agenda (UTC) | Brasília | Rota |
|---|---|---|---|
| `jarvis-sync-hora-em-hora` | `0 10-23,0-1 * * *` | de hora em hora, 7h–22h | `/api/cron/sync` |
| `jarvis-sync-0845` | `45 11 * * *` | 8h45 | `/api/cron/sync` |
| `jarvis-bom-dia` | `5 12 * * *` | 9h05 | `/api/cron/notify` |
| `jarvis-bom-dia-2` | `35 12 * * *` | 9h35 | `/api/cron/notify-retry` |

Testado em 19/10: `select public.jarvis_chamar('/api/cron/sync')` → HTTP 200.

Conferir execuções:

```sql
select jobname, status, start_time from cron.job_run_details d join cron.job j using (jobid)
where jobname like 'jarvis%' order by start_time desc limit 20;
select status_code, left(content, 200), created from net._http_response order by created desc limit 10;
```

Os crons do `vercel.json` (8h45, 9h05, 9h35, um disparo por dia no Hobby, com horário aproximado) continuam como **reserva**. Sincronizações repetidas não duplicam (trava por conta + deduplicação) e o bom dia não sai duas vezes (estado `bom_dia:<data>` em `jarvis_estado`).

## Vercel (projeto `jarvis-fenix`)

- Criado pelo CLI. **Atenção:** nasceu sem framework e todas as rotas davam 404; foi corrigido para **Next.js** (Settings → Build and Deployment → Framework Preset). Se recriar o projeto, confira isso.
- O projeto **não** está ligado ao GitHub: publicar é manual, a partir da pasta do app, com `vercel deploy --prod --scope fin-ez`.
- Variáveis (Production). As marcadas como "sensível" não podem ser lidas de volta pelo painel:

| Variável | Tipo |
|---|---|
| `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, `CRON_SECRET`, `EMAIL_ENC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PRIVATE_KEY` | sensível |
| `AUTH_GOOGLE_ID`, `ALLOWED_EMAILS`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `SHEET_ID`, `SUPABASE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | comum |

A cópia local de todas elas fica em `.env.production.local`, no Mac do Pedro (fora do Git, permissão 600). **Não troque `EMAIL_ENC_KEY`**: as senhas de e-mail já salvas deixariam de abrir. Se `CRON_SECRET` mudar, atualize também o Vault do Supabase:

```sql
select vault.update_secret((select id from vault.secrets where name = 'jarvis_cron_secret'), '<novo valor>');
```

## Verificado em 19/10

- `/` redireciona para `/login` sem sessão; `/api/painel` responde 401 sem sessão.
- Rotas de cron respondem 401 sem `CRON_SECRET` e 200 com ele.
- A conta de serviço lê a planilha; a service role acessa as tabelas.
- `/api/auth/providers` mostra o Google com o callback de produção.
- Testes (vitest), typecheck, lint e build passando.
- As 5 telas foram vistas em 390 px (claro e escuro) com dados fictícios (`JARVIS_DEMO=1`, só em desenvolvimento).

## Pendente

- [ ] Entrar no app pelo celular (Pedro e Tulio), instalar na tela inicial e ativar as notificações. O login real ainda não foi testado de ponta a ponta.
- [ ] Ver o primeiro "Bom dia" às 9h05 (20/10).
- [ ] Conectar as contas de e-mail pessoais em ⚙️ (Pedro testando com o Gmail pessoal).
- [ ] Acompanhar o uso da Vercel na primeira semana (<https://vercel.com/fin-ez/~/usage>): o limite do Hobby é da conta inteira, **compartilhado com o site comercial-fenix**. Se subir, reduzir o `jarvis-sync-hora-em-hora`.
- [ ] Opcional: ligar o projeto da Vercel ao GitHub para publicar a cada push.
- [ ] Opcional: plano Vercel Pro (o Hobby é para uso não comercial; também tira o risco de o Jarvis consumir o limite do site).
