# Jarvis Fênix (celular) — como está em produção

Estado em **20/10/2026**. O app foi construído e publicado em 19/10; em 20/10 ganhou a identidade visual do site, foi instalado no iPhone do Tulio e passou a ler o Gmail pessoal dele. Este documento diz **onde cada peça está**; o passo a passo genérico de configuração fica no [README](../README.md). Nenhum segredo aparece aqui: só o nome de cada variável e onde ela fica.

## Endereços

| O quê | Onde |
|---|---|
| App em produção | <https://jarvis-fenix.vercel.app> |
| Código | <https://github.com/kkardosin01/jarvis-fenix> (privado) |
| Projeto na Vercel | time **comercialfenix** ("Comercial Fênix"; antes se chamava `fin-ez`) → projeto **jarvis-fenix** (plano Hobby), região `gru1` (São Paulo) |
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
- O projeto **não** está ligado ao GitHub: publicar é manual, a partir da pasta do app (já vinculada em `.vercel/`), com `vercel deploy --prod`.
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

## Verificado em 20/10

- Crons do pg_cron rodando sozinhos durante a manhã (7h, 8h, 8h45, 9h, 9h05, 9h35, 10h…), todos com HTTP 200.
- 9h05: o resumo da nuvem estava pronto e o "Bom dia" foi montado (estado `bom_dia:2026-10-20 = completo`), mas ainda não havia celular inscrito.
- iPhone do Tulio: login com `tuliocardoso1711@gmail.com`, app na tela de início e **notificações ativadas** (1 inscrição em `push_inscricoes`, 20/10 11h10).
- Gmail pessoal do Tulio conectado ("Pessoal do Tulio", PF). Primeira leitura dos últimos 45 dias: **105 e-mails, 3 boletos** gravados em `Boletos_Outras_Contas` (condomínio, Internacional, Serasa).

## Incidentes resolvidos

| Data | O que aconteceu | Causa | Correção |
|---|---|---|---|
| 19/10 | Todas as rotas davam 404 depois do primeiro deploy | Projeto criado pelo CLI sem framework | Framework Preset → Next.js e novo deploy |
| 20/10 | A primeira sincronização do Gmail do Tulio parava com "Não foi possível conectar ao e-mail", depois de ler 5 e-mails | Na Vercel, o `pdfjs-dist` não achava o `@napi-rs/canvas` (`DOMMatrix is not defined`), que o rastreador de arquivos não incluía no pacote. A conexão IMAP estava funcionando | `@napi-rs/canvas` como dependência e em `outputFileTracingIncludes` (next.config.ts); o import do pdfjs foi para dentro do `try` (um PDF com problema conta como ilegível e a leitura segue); a mensagem de erro agora diferencia falha de conexão de falha ao processar um e-mail; o log registra o tipo do erro (nunca o conteúdo do e-mail) |

## Pendente

Deixado para depois pelo Pedro em 20/10:

- [ ] **Boleto da Serasa** (venc. 28/09, R$ 19.055,66, "Pessoal do Tulio"): conferir com o Tulio. Pode ser aviso de dívida ou oferta de acordo, e não conta a pagar. Se não for, "Marcar como pago" no app. Se esse tipo de e-mail se repetir, ensinar o extrator (no `jarvis-fenix-core`) a ignorá-lo.
- [ ] **Confirmar em 21/10, às 9h05,** que o "Bom dia" chegou de fato no iPhone do Tulio. A primeira notificação real ainda não aconteceu.
- [ ] **Celular do Pedro:** ainda não está inscrito nas notificações. Ativar mais tarde, quando quiser receber.

Outros:

- [ ] Acompanhar o uso da Vercel na primeira semana (<https://vercel.com/comercialfenix/~/usage>): o limite do Hobby é da conta inteira, **compartilhado com o site comercial-fenix**. Se subir, reduzir o `jarvis-sync-hora-em-hora`.
- [ ] Não ligar o mesmo Gmail pessoal do Tulio no app de computador (ver `jarvis-fenix-desktop/docs/ESTADO.md`).
- [ ] Opcional: ligar o projeto da Vercel ao GitHub para publicar a cada push.
- [ ] Opcional: plano Vercel Pro (o Hobby é para uso não comercial; também tira o risco de o Jarvis consumir o limite do site).
