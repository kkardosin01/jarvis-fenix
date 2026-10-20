# Histórico

## 0.1.2 — 20/10/2026 · correções do primeiro uso real

- **Leitura de PDF na Vercel:** o `@napi-rs/canvas`, que o `pdfjs-dist` carrega em tempo de execução, entra no pacote da função (`outputFileTracingIncludes`). Sem ele, a sincronização parava no primeiro PDF anexo.
- Um PDF com problema não para mais a sincronização: conta como ilegível e a leitura segue.
- Mensagem de erro mais honesta ("A leitura parou num e-mail com problema…" em vez de "Não foi possível conectar") e log com o tipo do erro, sem conteúdo do e-mail.
- Instruções da senha de app do Gmail e do Outlook com links tocáveis.
- Em uso: iPhone do Tulio com notificações e Gmail pessoal dele conectado (3 boletos na primeira leitura).

## 0.1.1 — 20/10/2026 · identidade visual do site

- Ícones do app (Android, iPhone, notificação) com a fênix dourada sobre preto do site comercial-fenix; fonte em `assets/fenix-emblema.png`, gerados por `npm run icones`.
- Cores do site: tema escuro preto/carvão/dourado; tema claro creme com dourado escuro (contraste AA). Títulos em Oswald e texto em Manrope, as mesmas fontes do site.
- Tela de entrada e "Acesso não autorizado" com o emblema. Cache do service worker renovado (`jarvis-v2`) para os ícones novos aparecerem.
- Publicado em https://jarvis-fenix.vercel.app.

## 0.1.0 — 19/10/2026 · primeira versão, publicada em https://jarvis-fenix.vercel.app

**App**

- PWA instalável (Android e iPhone) com 5 telas: Hoje, Contas, Clientes, E-mails e Prospecção, mais Configurações. Tema claro e escuro, letra ajustável e uso sem internet (último resumo salvo).
- Lê a planilha Jarvis_Fenix pelos nomes de coluna; escreve **só** em `Boletos_Manual` (lançar boleto, marcar como pago) e `Boletos_Outras_Contas`.
- Login com Google restrito a `ALLOWED_EMAILS`; todas as rotas de API conferem a sessão.
- Leitura **somente leitura** (IMAP) dos e-mails pessoais: linha digitável com DV, PIX, PDFs anexos; grava boletos sem duplicidade; até 40 e-mails por conta por execução, continuando de onde parou. Senhas de app cifradas (AES-256-GCM).
- Notificações (Web Push): "Bom dia" às 9h05, nova tentativa às 9h35 se o resumo atrasar, e aviso de boleto novo (nunca entre 22h e 7h).
- Testes com e-mails e PDFs fictícios: pt-BR, telefone, cifra, pagos, lançar/marcar como pago, sincronização com limite, notificações.
- O núcleo de boletos passou a vir do pacote compartilhado `jarvis-fenix-core` (tarball em `vendor/`), o mesmo do app de computador.

**Implantação** (detalhes em [docs/PRODUCAO.md](docs/PRODUCAO.md); motivos em [docs/DECISOES.md](docs/DECISOES.md))

- Google Cloud: projeto `jarvis-fenix` na conta da empresa, Sheets API, conta de serviço `jarvis-web` (Editor da planilha), login com Google em modo Teste para Pedro e Tulio.
- Supabase: 4 tabelas no projeto `comercial-fenix` com RLS; `pg_cron` + `pg_net` chamando os crons do app (segredo no Vault).
- Vercel: projeto `jarvis-fenix` (time fin-ez, hoje `comercialfenix`), 14 variáveis de produção, crons do `vercel.json` como reserva.
