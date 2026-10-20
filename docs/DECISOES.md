# Decisões do Jarvis Fênix (celular)

Registro das escolhas feitas em 19/10/2026 e do motivo de cada uma, para quem for mexer depois.

| # | Decisão | Por quê | Alternativa descartada |
|---|---|---|---|
| 1 | Núcleo de boletos (pt-BR, linha digitável/PIX, extração, deduplicação) num pacote próprio, `jarvis-fenix-core`, usado pelos dois apps | O app de computador e o de celular gravam na mesma aba (`Boletos_Outras_Contas`); só deduplicam certo se extraírem igual | Copiar os arquivos em cada app (foi o primeiro passo, substituído no mesmo dia) |
| 2 | O pacote entra como tarball em `vendor/` (`file:vendor/...tgz`) | O build da Vercel e o electron-builder rodam sem token; um repositório privado no `package.json` exigiria token | Publicar em registro npm ou instalar direto do GitHub |
| 3 | `pdfjs-dist` (o mesmo do app de computador) para ler PDFs, em vez de `pdf-parse` | Mesmo texto extraído nos dois apps = mesma deduplicação; já testado com os PDFs fictícios | `pdf-parse`, citado no pedido original |
| 4 | `@googleapis/sheets` + `google-auth-library` em vez do pacote `googleapis` inteiro | Mesma API, fração do tamanho; função mais rápida para iniciar na Vercel | `googleapis` completo |
| 5 | Sem IA opcional no app web | A versão de computador tem IA opcional (chave da Anthropic); no web isso exigiria mais um segredo e custo. E-mails sem vencimento identificável só entram na contagem "sem vencimento" | Portar a IA |
| 6 | Tabelas no Supabase **comercial-fenix**, o mesmo do site | O plano grátis permite 2 projetos ativos e os 2 já existiam; o projeto fica em São Paulo. As tabelas são separadas e não tocam nas do site | Projeto novo (pausar outro ou pagar US$ 25/mês) |
| 7 | Horários pelo **pg_cron do Supabase**, com os crons da Vercel como reserva | A conta da Vercel é Hobby: cron 1×/dia e horário aproximado (o "9h05" pode sair às 9h50). O pg_cron é grátis, exato e permite sincronizar de hora em hora | Só a Vercel Hobby; Vercel Pro (US$ 20/mês) |
| 8 | O cron chama o app com `CRON_SECRET` guardado no **Vault** do Supabase | O segredo não fica no texto do job nem visível em `cron.job` | Segredo escrito no SQL do job |
| 9 | Senhas de app cifradas com AES-256-GCM no servidor (`EMAIL_ENC_KEY`), nunca devolvidas ao navegador | Pedido de segurança; o banco sozinho não abre as senhas | Guardar só com RLS |
| 10 | No máximo 40 e-mails por conta por execução, com cursor por caixa (UIDVALIDITY + último UID) e trava de 6 minutos por conta | Limite de tempo das funções da Vercel; evita duas sincronizações ao mesmo tempo (cron + app aberto) | Ler tudo de uma vez |
| 11 | Boletos que vencem a mais de 7 dias ficam guardados no estado da conta e entram na planilha só quando chegam a 7 dias | Mesma regra do app de computador (a aba mostra de −30 a +7 dias) | Gravar tudo na hora |
| 12 | "Marcar como pago": Manual → `pago? = sim` na linha achada pelos dados; Outras contas → remove a linha e guarda o id em `boletos_pagos`; Boletos (nuvem) → guarda beneficiário + vencimento em `boletos_pagos` | A aba Boletos é reescrita todo dia pela nuvem e o app não pode escrever nela | Escrever nas abas da nuvem |
| 13 | Login com Google (Auth.js) em modo **Teste**, liberado só para `ALLOWED_EMAILS` | Dois usuários; publicar o app no Google exigiria verificação. Custo: o aviso "O Google não verificou este app" na primeira entrada | Publicar o app OAuth |
| 14 | Service worker próprio, registrado só em produção; ao sair, o app apaga o resumo guardado no aparelho | Abrir sem internet sem deixar dados de quem saiu; em desenvolvimento o cache confundia o HMR | Biblioteca de PWA |
| 15 | Modo demonstração (`JARVIS_DEMO=1`) só com `NODE_ENV=development` | Testar as telas sem credenciais reais; impossível ligar em produção | Sem modo demo |
| 16 | `@napi-rs/canvas` como dependência direta e incluído à mão no pacote da Vercel | O `pdfjs-dist` só o carrega em tempo de execução (para ter `DOMMatrix`); o rastreador de arquivos do Next não o encontrava e a leitura de PDF quebrava em produção (20/10) | Polyfill caseiro de `DOMMatrix` ou trocar de biblioteca de PDF (quebraria a paridade com o app de computador) |
| 17 | Identidade visual igual à do site: fênix dourada, preto/carvão/dourado no escuro, creme no claro, Oswald + Manrope | Pedido do Pedro em 20/10; o app passa a ser reconhecido como da Fênix | Manter o verde-petróleo do primeiro dia |
