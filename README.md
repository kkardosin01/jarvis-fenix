# Jarvis Fênix — app de celular

> **Em produção:** <https://jarvis-fenix.vercel.app> · como está implantado: [docs/PRODUCAO.md](docs/PRODUCAO.md) · por que foi feito assim: [docs/DECISOES.md](docs/DECISOES.md) · [CHANGELOG](CHANGELOG.md)

App instalável (PWA) para Android e iPhone com o dia da **Comercial Fênix SC Ltda** num toque: contas a pagar, clientes para ligar, e-mails que importam e prospecção.

O "cérebro" continua na nuvem e **não é alterado** por este app: as tarefas agendadas do Claude (prospecção às 8h13 nos dias úteis e briefing às 8h38) reescrevem a planilha **Jarvis_Fenix**. Este app:

- **lê** a planilha (todas as abas);
- **escreve só** em `Boletos_Manual` (lançar boleto, marcar como pago) e `Boletos_Outras_Contas` (boletos achados nos e-mails pessoais) — qualquer outra escrita é bloqueada no código (`src/lib/sheets.ts`);
- **lê** (somente leitura, por IMAP) as contas de e-mail **pessoais** do Tulio para achar boletos que não chegam no e-mail da empresa.

O app de computador (`jarvis-fenix-desktop`) usa os **mesmos extratores**: os dois dependem do pacote `jarvis-fenix-core` (pt-BR, linha digitável/PIX, extração e deduplicação), guardado em `vendor/` como tarball — por isso o build da Vercel não precisa de token. Para mudar o núcleo, altere o repositório `jarvis-fenix-core` e rode `npm run entregar` lá; não edite o núcleo aqui.

---

## Sumário

1. [Telas](#telas)
2. [Configuração passo a passo](#configuração-passo-a-passo)
3. [Crons e o plano da Vercel](#crons-e-o-plano-da-vercel)
4. [Como funciona a leitura de boletos](#como-funciona-a-leitura-de-boletos)
5. [Segurança e privacidade](#segurança-e-privacidade)
6. [Desenvolvimento](#desenvolvimento)
7. [Instalar no celular do Tulio](#instalar-no-celular-do-tulio)

---

## Telas

| Tela | O que mostra |
|---|---|
| **Hoje** | Saudação, "Atualizado em…", frase do dia, cartões (vencem hoje, atrasados, clientes, e-mails, rascunhos), 3 prioridades, "Atualizar" e puxar para atualizar, "Ativar notificações". |
| **Contas** | `Boletos` + `Boletos_Outras_Contas` + `Boletos_Manual` (não pagos), por vencimento. Filtros por situação, origem (Empresa / cada conta pessoal / Lançado à mão) e PJ/PF. Copiar linha digitável / PIX, "+ Lançar boleto", "Marcar como pago". |
| **Clientes** | Aba `Contatos`: dias sem comprar, motivo, mensagem sugerida, **Abrir no WhatsApp**, Ligar, Copiar mensagem. Telefone sem DDD → só "Copiar mensagem". |
| **E-mails** | Aba `Emails` por urgência, filtro por categoria, atalho para o Gmail da empresa. |
| **Prospecção** | Aba `Prospects`, atalho para os rascunhos e o lembrete "Os e-mails só saem depois que você revisar e enviar." |
| **Configurações** (⚙️ na tela Hoje) | Contas de e-mail pessoais (testar, sincronizar, pausar, trocar senha, remover), instruções da senha de app, notificações e tamanho da letra. |

"Marcar como pago":

- `Boletos_Manual`: escreve `sim` na coluna `pago?` da linha certa (relê a aba e acha pelos dados, nunca por posição fixa);
- `Boletos_Outras_Contas`: guarda o `id_mensagem` em `boletos_pagos` (Supabase) e remove a linha — a sincronização não regrava;
- `Boletos` (da nuvem): guarda beneficiário + vencimento em `boletos_pagos` e esconde (a aba é reescrita todo dia pela nuvem).

---

## Configuração passo a passo

Você vai precisar de: conta Google da empresa, conta no **Supabase**, conta na **Vercel** e este repositório no GitHub.

### 1. Conta de serviço do Google (para ler/escrever a planilha)

A conta de serviço é um "usuário robô" do Google.

> Se o app de computador já tem uma conta de serviço (`jarvis-desktop@…`), você pode só **criar uma chave nova** para ela (passo 5) e pular o passo 7, porque a planilha já está compartilhada com ela.

1. Acesse <https://console.cloud.google.com/> com a conta Google da empresa.
2. Seletor de projeto (topo) → use o projeto `jarvis-fenix` (ou **Novo projeto** com esse nome).
3. Menu ☰ → **APIs e serviços → Biblioteca** → **Google Sheets API** → **Ativar**.
4. Menu ☰ → **IAM e administrador → Contas de serviço → Criar conta de serviço** → nome `jarvis-web` → **Criar e continuar** → pule as permissões → **Concluir**.
5. Abra a conta → aba **Chaves → Adicionar chave → Criar nova chave → JSON**. Um arquivo `.json` é baixado. **Não mande por e-mail nem coloque no GitHub.**
6. Do JSON você vai precisar de `client_email` (→ `GOOGLE_SERVICE_ACCOUNT_EMAIL`) e `private_key` (→ `GOOGLE_PRIVATE_KEY`, colado inteiro, com os `\n`).
7. Abra a planilha **Jarvis_Fenix** → **Compartilhar** → cole o `client_email` → permissão **Editor** → desmarque "Notificar" → **Compartilhar**.

### 2. Login com Google (OAuth)

1. No mesmo projeto: **APIs e serviços → Tela de consentimento OAuth** → tipo **Externo** → nome "Jarvis Fênix", e-mail de suporte da empresa → salve. Em **Público-alvo**, adicione o seu e-mail e o do Tulio como **usuários de teste** (ou publique o app; o login só pede nome e e-mail).
2. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
   - Origens JavaScript autorizadas: `https://SEU-APP.vercel.app` (e `http://localhost:3001` para testes).
   - URIs de redirecionamento autorizados: `https://SEU-APP.vercel.app/api/auth/callback/google` (e `http://localhost:3001/api/auth/callback/google`).
3. Copie o **ID do cliente** (→ `AUTH_GOOGLE_ID`) e a **chave secreta** (→ `AUTH_GOOGLE_SECRET`).
4. `ALLOWED_EMAILS` = os e-mails que podem entrar, separados por vírgula. Qualquer outra conta vê "Acesso não autorizado".
5. `AUTH_SECRET`: gere com `openssl rand -base64 33`.

### 3. Chaves de notificação (VAPID)

```bash
npm run vapid
```

Copie a "Public Key" para `VAPID_PUBLIC_KEY` e a "Private Key" para `VAPID_PRIVATE_KEY`.

### 4. Supabase

1. Use um projeto do Supabase (região São Paulo, de preferência).
2. **SQL Editor** → cole e rode `supabase/migrations/0001_jarvis.sql`. Ele cria 4 tabelas (`contas_email`, `boletos_pagos`, `push_inscricoes`, `jarvis_estado`) com **RLS ligado e nenhuma política**: só a chave de serviço (no servidor) acessa.
3. **Project Settings → API**: copie a URL (→ `SUPABASE_URL`) e a chave `service_role` (→ `SUPABASE_SERVICE_ROLE_KEY`).

### 5. Chaves que você mesmo gera

```bash
openssl rand -hex 32   # CRON_SECRET
openssl rand -hex 32   # EMAIL_ENC_KEY (não troque depois: as senhas salvas deixariam de abrir)
```

### 6. Vercel

1. **Add New → Project** → importe o repositório `kkardosin01/jarvis-fenix`. Confira se o **Framework Preset** é **Next.js**: um projeto criado pelo CLI nasce sem framework e todas as rotas dão 404.
2. **Settings → Environment Variables**: cadastre todas as variáveis de `.env.example` (Production).
3. Deploy. Os crons de `vercel.json` são criados sozinhos (veja a próxima seção).
4. Volte ao Google Cloud e confira se a URL final está nas origens/redirecionamentos do OAuth.

---

## Crons e o plano da Vercel

| Horário (Brasília) | Rota | O que faz |
|---|---|---|
| 8h45 | `/api/cron/sync` | Lê os e-mails pessoais e grava boletos novos |
| 9h05 | `/api/cron/notify` | "Bom dia, Tulio! 2 contas vencem hoje, 3 atrasadas e 6 clientes para ligar." (só números > 0). Se o briefing ainda não rodou: "O resumo de hoje ainda não ficou pronto." |
| 9h35 | `/api/cron/notify-retry` | Se às 9h05 o resumo não estava pronto e agora está, manda o bom dia. Nunca duplica. |

Todas exigem `Authorization: Bearer ${CRON_SECRET}` (a Vercel manda sozinha).

**Plano Hobby (grátis):** cron só 1x por dia e pode disparar **em qualquer minuto dentro da hora** marcada (o "9h05" pode sair às 9h50). O código aguenta a ordem trocada, mas o horário não é exato e não há sincronização de hora em hora. Duas saídas:

- **Supabase pg_cron (grátis, recomendado — é o que está em uso):** rode `supabase/cron-de-hora-em-hora.sql`. Horário exato, sync de hora em hora das 7h às 22h. Pode manter os crons da Vercel como reserva.
- **Vercel Pro (US$ 20/mês):** horário exato e crons frequentes direto no `vercel.json`.

Além dos crons, o app sincroniza ao abrir (se a última vez foi há mais de 30 min) e no botão "Sincronizar agora".

---

## Como funciona a leitura de boletos

- **Somente leitura:** a caixa é aberta com `EXAMINE` (read-only) e as mensagens são baixadas com `BODY.PEEK` — nada é enviado, apagado, movido ou marcado como lido.
- **Onde busca:** `INBOX` e, no Gmail, `[Gmail]/Todos os e-mails`. Últimos 45 dias na primeira vez; depois, desde a última sincronização (com 2 dias de folga).
- **Palavras:** boleto, fatura, vencimento, "linha digitável", "código de barras", "2ª via", cobrança, DAS, guia, IPTU, IPVA, condomínio, mensalidade, "conta de luz", "conta de água", Celesc, Casan, cartão. Propaganda e e-mails da própria conta são ignorados.
- **Extração** (texto do e-mail e PDFs anexos): linha digitável de 47/48 dígitos com **dígito verificador conferido**; no boleto bancário, vencimento pelo fator de vencimento (já com a virada de 2025) e valor pelos últimos 10 dígitos; PIX copia-e-cola com CRC conferido; datas perto de "vencimento"/"vence em"; valores perto de "valor"/"total a pagar"; beneficiário escrito no boleto ou o remetente.
- **Descarta:** comprovantes de pagamento, notas fiscais sem cobrança e boletos **emitidos pela Fênix** para clientes.
- **Grava** em `Boletos_Outras_Contas` só o que vence entre 30 dias atrás e 7 dias à frente. Os que vencem depois ficam guardados e entram quando chegarem a 7 dias. A cada sincronização a situação é recalculada e as linhas vencidas há mais de 30 dias saem.
- **Sem duplicidade:** não grava se já houver o mesmo `id_mensagem`, a mesma linha digitável ou o mesmo beneficiário + vencimento + valor em `Boletos_Outras_Contas`, `Boletos` ou `Boletos_Manual`, nem se estiver em `boletos_pagos`.
- **Limites da Vercel:** no máximo 40 e-mails por conta por execução; o cursor (UID por caixa) fica no Supabase e a próxima execução continua de onde parou. Duas execuções ao mesmo tempo não pegam a mesma conta (trava de 6 min). Uma conta com erro não trava as outras.
- **Push** "Novo boleto: Celesc — vence 22/10 — R$ 230,10" quando acha algo novo (nunca entre 22h e 7h).

---

## Segurança e privacidade

- Login Google só para `ALLOWED_EMAILS`; todas as rotas de API conferem a sessão; crons exigem `CRON_SECRET`.
- Credenciais do Google, Supabase e VAPID só no servidor. Nada de segredo no código; `.env*` no `.gitignore`.
- Senhas de app cifradas com **AES-256-GCM** (`EMAIL_ENC_KEY`) e **nunca** voltam para o navegador (a tela mostra "••••" e "Trocar senha").
- O conteúdo dos e-mails pessoais **não é salvo em lugar nenhum** e não vai para log: só os campos do boleto vão para a planilha. No Supabase fica apenas o Message-ID dos e-mails já vistos (para não reler).
- Ao "Sair", o app apaga o resumo guardado no aparelho.
- Cabeçalhos de segurança (CSP, HSTS, `noindex`).

---

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha
npm run dev                  # http://localhost:3000
```

Modo demonstração (sem login e com dados fictícios, **só em desenvolvimento**): coloque `JARVIS_DEMO=1` e um `AUTH_SECRET` qualquer no `.env.local`.

```bash
npm run lint
npm run typecheck
npm test        # vitest: pt-BR, linha digitável, PIX, PDFs, extração, deduplicação, sincronização, pagos
npm run build
npm run icones  # regera os ícones do PWA
```

Os e-mails e PDFs dos testes são **fictícios**, gerados em `tests/fixtures/`.

Estrutura:

```
vendor/            jarvis-fenix-core (tarball): núcleo compartilhado com o app de computador
src/lib/           servidor: planilha, Supabase, IMAP, sincronização, push, notificações
src/app/(app)/     as telas (Hoje, Contas, Clientes, E-mails, Prospecção, Configurações)
src/app/api/       rotas (painel, boletos, contas de e-mail, push, crons)
public/sw.js       service worker (abre sem internet e recebe notificações)
supabase/          SQL das tabelas e crons opcionais
```

---

## Instalar no celular do Tulio

**Android (Chrome)**

1. Abra o endereço do app no **Chrome** e entre com a conta Google.
2. Toque nos **⋮** (canto de cima) → **Instalar app** (ou "Adicionar à tela inicial") → **Instalar**.
3. Abra o **Jarvis** pelo ícone novo e toque em **Ativar notificações** → **Permitir**.

**iPhone (Safari, iOS 16.4 ou mais novo)**

1. Abra o endereço no **Safari** e entre com a conta Google.
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início** → **Adicionar**.
3. Abra o **Jarvis** pelo ícone novo (as notificações só funcionam assim) e toque em **Ativar notificações** → **Permitir**.
