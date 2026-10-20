// Leitura IMAP SOMENTE LEITURA: caixa aberta com EXAMINE (readOnly), download com BODY.PEEK.
// Nunca envia, apaga, move nem marca e-mails como lidos. Nada do conteúdo vai para log.
// Adaptado de jarvis-fenix-desktop/src/main/mail/imap.ts, com limite por execução e cursor
// (a Vercel corta a função depois de alguns minutos).

import 'server-only'
import { normalizarTexto } from '@/core/ptbr'
import { PALAVRAS_CHAVE, type AnexoTexto, type MensagemCandidata } from '@/core/extrair'
import type { TipoContaEmail } from '@/core/types'
import { textoDoPdf } from './pdf'

export interface ConfigImap {
  tipo: TipoContaEmail
  email: string
  senha: string
  servidor: string
  porta: number
}

export const PROVEDORES: Record<Exclude<TipoContaEmail, 'outro'>, { servidor: string; porta: number }> = {
  gmail: { servidor: 'imap.gmail.com', porta: 993 },
  outlook: { servidor: 'outlook.office365.com', porta: 993 }
}

const TAMANHO_MAXIMO = 20 * 1024 * 1024
const MAX_CANDIDATAS_POR_CAIXA = 400

async function conectar(cfg: ConfigImap) {
  const { ImapFlow } = await import('imapflow')
  const cliente = new ImapFlow({
    host: cfg.servidor,
    port: cfg.porta,
    secure: cfg.porta === 993,
    auth: { user: cfg.email, pass: cfg.senha },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 90_000
  })
  await cliente.connect()
  return cliente
}

/** Traduz erros comuns de IMAP para algo que o Tulio entenda. */
export function mensagemErroImap(e: unknown): string {
  const err = e as { authenticationFailed?: boolean; responseText?: string; code?: string; message?: string }
  const texto = `${err.responseText ?? ''} ${err.message ?? ''}`
  if (err.authenticationFailed || /AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed|authentication failed/i.test(texto)) {
    return 'E-mail ou senha de app incorretos. Gere uma nova senha de app e tente de novo.'
  }
  if (/Application-specific password required|WEBALERT|Web login required/i.test(texto)) {
    return 'Este e-mail exige uma senha de app (veja as instruções).'
  }
  if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') return 'Servidor de e-mail não encontrado. Confira o endereço.'
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') return 'O servidor de e-mail não respondeu. Confira servidor e porta.'
  if (/IMAP.*disabled|IMAP access/i.test(texto)) return 'O acesso IMAP está desligado nesta conta.'
  return 'Não foi possível conectar ao e-mail.'
}

export async function testarConexao(cfg: ConfigImap): Promise<{ ok: true; caixas: number } | { ok: false; erro: string }> {
  try {
    const cliente = await conectar(cfg)
    try {
      const caixas = await cliente.list()
      return { ok: true, caixas: caixas.length }
    } finally {
      await cliente.logout().catch(() => undefined)
    }
  } catch (e) {
    return { ok: false, erro: mensagemErroImap(e) }
  }
}

function dataGmail(d: Date): string {
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
}

export function consultaGmail(desde: Date): string {
  const termos = PALAVRAS_CHAVE.map((p) => (p.includes(' ') ? `"${p}"` : p))
  return `after:${dataGmail(desde)} -in:sent -in:drafts -in:chats (${termos.join(' OR ')} OR filename:pdf)`
}

function htmlParaTexto(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
}

/** Converte o e-mail cru (RFC 822) em MensagemCandidata, lendo os PDFs anexos. */
export async function analisarMensagem(fonte: Buffer, messageIdReserva: string): Promise<MensagemCandidata> {
  const { simpleParser } = await import('mailparser')
  const m = await simpleParser(fonte, { skipImageLinks: true, skipTextToHtml: true })
  const de = m.from?.value?.[0]
  const anexos: AnexoTexto[] = []
  for (const a of m.attachments ?? []) {
    const ePdf = a.contentType === 'application/pdf' || /\.pdf$/i.test(a.filename ?? '')
    if (!ePdf || a.size > TAMANHO_MAXIMO) continue
    const pdf = await textoDoPdf(a.content)
    anexos.push({ nome: a.filename ?? 'anexo.pdf', texto: pdf.texto, ilegivel: pdf.ilegivel })
  }
  const texto = m.text?.trim() ? m.text : typeof m.html === 'string' ? htmlParaTexto(m.html) : ''
  return {
    messageId: (m.messageId ?? messageIdReserva).trim(),
    deEmail: (de?.address ?? '').toLowerCase(),
    deNome: de?.name ?? '',
    assunto: m.subject ?? '',
    data: m.date ?? new Date(),
    texto,
    anexos
  }
}

/** Até onde já lemos cada caixa (UIDVALIDITY muda se o servidor renumerar). */
export type CursorImap = Record<string, { uidValidity: string; ultimoUid: number }>

export interface OpcoesBusca {
  desde: Date
  /** Message-IDs já processados: não baixamos de novo. */
  jaProcessados: Set<string>
  cursor: CursorImap
  /** Máximo de mensagens baixadas nesta execução. */
  limite: number
  /** Para de baixar quando passar deste instante (ms), deixando o resto para a próxima. */
  prazo: number
  aoEncontrar: (msg: MensagemCandidata) => Promise<void>
}

export interface ResultadoBusca {
  lidas: number
  /** Sobrou mensagem para a próxima execução. */
  pendente: boolean
}

/** Busca e entrega, uma a uma, as mensagens candidatas da conta. Atualiza `opcoes.cursor`. */
export async function buscarCandidatas(cfg: ConfigImap, opcoes: OpcoesBusca): Promise<ResultadoBusca> {
  const cliente = await conectar(cfg)
  const vistos = new Set<string>()
  let lidas = 0
  let pendente = false
  try {
    const caixas = ['INBOX']
    if (cfg.tipo === 'gmail') {
      // "[Gmail]/Todos os e-mails" (o nome muda com o idioma; usamos a marca \All)
      const lista = await cliente.list()
      const todos = lista.find((c) => c.specialUse === '\\All')
      if (todos) caixas.push(todos.path)
    }
    for (const caixa of caixas) {
      if (pendente) break
      const trava = await cliente.getMailboxLock(caixa, { readOnly: true })
      try {
        const mb = cliente.mailbox
        const uidValidity = mb && typeof mb === 'object' ? String(mb.uidValidity) : ''
        const anterior = opcoes.cursor[caixa]
        const ultimoUid = anterior && anterior.uidValidity === uidValidity ? anterior.ultimoUid : 0
        const avancar = (uid: number): void => {
          opcoes.cursor[caixa] = { uidValidity, ultimoUid: Math.max(uid, opcoes.cursor[caixa]?.ultimoUid ?? 0) }
        }

        const consulta =
          cfg.tipo === 'gmail'
            ? { gmailraw: consultaGmail(opcoes.desde) }
            : { since: opcoes.desde, or: PALAVRAS_CHAVE.flatMap((p) => [{ subject: p }, { body: p }]) }
        const uids = ((await cliente.search(consulta, { uid: true })) || [])
          .filter((u) => u > ultimoUid)
          .sort((a, b) => a - b)
          .slice(0, MAX_CANDIDATAS_POR_CAIXA)
        if (!uids.length) continue

        // 1ª passada: só envelope e tamanho, para pular o que já vimos
        const fila: { uid: number; id: string }[] = []
        for await (const msg of cliente.fetch(uids, { envelope: true, size: true }, { uid: true })) {
          const id = msg.envelope?.messageId?.trim() ?? `uid:${caixa}:${msg.uid}`
          const remetente = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? ''
          const pular =
            vistos.has(id) ||
            opcoes.jaProcessados.has(id) ||
            (msg.size ?? 0) > TAMANHO_MAXIMO ||
            remetente === cfg.email.toLowerCase()
          vistos.add(id)
          fila.push({ uid: msg.uid, id: pular ? '' : id })
        }
        fila.sort((a, b) => a.uid - b.uid)

        // 2ª passada: conteúdo completo (BODY.PEEK, não marca como lido), em ordem de UID
        for (const item of fila) {
          if (!item.id) {
            avancar(item.uid)
            continue
          }
          if (lidas >= opcoes.limite || Date.now() > opcoes.prazo) {
            pendente = true
            break
          }
          const msg = await cliente.fetchOne(String(item.uid), { source: true, envelope: true }, { uid: true })
          if (msg && msg.source) {
            const candidata = await analisarMensagem(msg.source, item.id)
            lidas++
            await opcoes.aoEncontrar(candidata)
          }
          avancar(item.uid)
        }
      } finally {
        trava.release()
      }
    }
  } finally {
    await cliente.logout().catch(() => undefined)
  }
  return { lidas, pendente }
}

/** E-mail é da conta da empresa (já lida pelo briefing da nuvem)? */
export function eContaDaEmpresa(email: string): boolean {
  return normalizarTexto(email) === normalizarTexto('fenix.hospitalares@gmail.com')
}
