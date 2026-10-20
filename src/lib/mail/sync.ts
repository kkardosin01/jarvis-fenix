// Sincronização: e-mails → Boletos_Outras_Contas, sem duplicidade, com limpeza.
// Grava SÓ os campos do boleto; o conteúdo do e-mail nunca vai para a planilha nem para o log.
// Mesmas regras de jarvis-fenix-desktop/src/main/mail/sync.ts (sem a IA opcional),
// para os dois apps gravarem e deduplicarem igual.

import {
  calcularSituacao,
  chavesExistentes,
  dentroDaJanela,
  eDuplicado,
  manualVazia,
  paraConta,
  registrarChaves,
  type ChavesExistentes
} from 'jarvis-fenix-core/boletos'
import { formatarLinhaDigitavel } from 'jarvis-fenix-core/boleto-codigo'
import { extrairBoletos, type BoletoExtraido, type MensagemCandidata } from 'jarvis-fenix-core/extrair'
import type { Conta, ContaPFPJ } from 'jarvis-fenix-core/types'
import type { Planilha } from '../sheets'
import type { CursorImap, ResultadoBusca } from './imap'

export const ABA_DESTINO = 'Boletos_Outras_Contas'
export const DIAS_PRIMEIRA_SYNC = 45
const DIAS_GUARDAR_PROCESSADOS = 90

export interface ContaSync {
  id: string
  email: string
  apelido: string
  contaBoleto: ContaPFPJ
}

/** Boleto achado com vencimento a mais de 7 dias: guardamos só os campos e gravamos quando entrar na janela. */
export interface BoletoFuturo {
  idMensagem: string
  vencimento: string
  valor: number | null
  beneficiario: string
  linhaDigitavel: string | null
  comoPagar: string
}

export interface EstadoContaSync {
  /** Início da última varredura COMPLETA (ms). A próxima busca começa 2 dias antes. */
  ultimaSync: number | null
  /** Message-ID → quando foi processado (ms). */
  processados: Record<string, number>
  futuros: BoletoFuturo[]
  cursor: CursorImap
  /** Início da varredura em andamento, quando a anterior parou no limite. */
  emAndamentoDesde: number | null
}

export function estadoVazio(): EstadoContaSync {
  return { ultimaSync: null, processados: {}, futuros: [], cursor: {}, emAndamentoDesde: null }
}

/** Aceita o JSON salvo no Supabase mesmo se vier incompleto. */
export function normalizarEstado(bruto: unknown): EstadoContaSync {
  const e = (bruto && typeof bruto === 'object' ? bruto : {}) as Partial<EstadoContaSync>
  return {
    ultimaSync: typeof e.ultimaSync === 'number' ? e.ultimaSync : null,
    processados: e.processados && typeof e.processados === 'object' ? e.processados : {},
    futuros: Array.isArray(e.futuros) ? e.futuros : [],
    cursor: e.cursor && typeof e.cursor === 'object' ? e.cursor : {},
    emAndamentoDesde: typeof e.emAndamentoDesde === 'number' ? e.emAndamentoDesde : null
  }
}

export interface BoletoNovo {
  vencimento: string
  valor: number | null
  beneficiario: string
}

export interface ResultadoSync {
  contaId: string
  novos: number
  ignorados: number
  semVencimento: number
  pendente: boolean
  erro: string | null
}

export type Buscar = (opcoes: {
  desde: Date
  jaProcessados: Set<string>
  cursor: CursorImap
  aoEncontrar: (m: MensagemCandidata) => Promise<void>
}) => Promise<ResultadoBusca>

export interface DepsSync {
  planilha: Planilha
  hoje: string
  agora: number
  buscar: Buscar
  aoNovoBoleto?: (b: BoletoNovo) => void
}

export type RegistroLinha = Record<string, string | number>

export function montarRegistro(
  b: { vencimento: string; valor: number | null; beneficiario: string; comoPagar: string },
  idMensagem: string,
  conta: ContaSync,
  hoje: string
): RegistroLinha {
  return {
    vencimento: b.vencimento,
    beneficiario: b.beneficiario,
    valor: b.valor ?? '',
    conta: conta.contaBoleto,
    origem: `E-mail ${conta.apelido}`,
    situacao: calcularSituacao(b.vencimento, hoje) ?? '',
    como_pagar: b.comoPagar,
    observacao: b.valor === null ? 'Valor no PDF' : '',
    conta_email: conta.email,
    id_mensagem: idMensagem
  }
}

export interface Panorama {
  contas: Conta[]
  existentes: ChavesExistentes
}

/**
 * Lê as três abas de boletos, faz a limpeza de Boletos_Outras_Contas
 * (pagos e vencidos há mais de 30 dias saem; situação é recalculada) e devolve as chaves para deduplicar.
 * `pagos` = chaves da tabela boletos_pagos ("outras:<id>" e "nuvem:<beneficiário>|<vencimento>").
 */
export async function prepararPanorama(planilha: Planilha, hoje: string, pagos: Set<string>): Promise<Panorama> {
  const pagosOutras = idsPagosOutras(pagos)
  const abas = await planilha.lerAbas(['Boletos', 'Boletos_Manual', 'Boletos_Outras_Contas'] as const)
  const remover: number[] = []
  const contas: Conta[] = []
  for (const l of abas.Boletos_Outras_Contas.linhas) {
    const c = paraConta('Boletos_Outras_Contas', l.dados, l.numero, hoje)
    if ((c.idMensagem && pagosOutras.has(c.idMensagem)) || c.situacao === 'Vencido há mais de 30 dias') {
      remover.push(l.numero)
      continue
    }
    const atual = (l.dados.situacao ?? '').trim()
    if (c.situacao && dentroDaJanela(c.situacao) && atual !== c.situacao) {
      await planilha.atualizarCelula(ABA_DESTINO, l.numero, 'situacao', c.situacao)
    }
    contas.push(c)
  }
  if (remover.length) await planilha.removerLinhas(ABA_DESTINO, remover)

  for (const l of abas.Boletos.linhas) contas.push(paraConta('Boletos', l.dados, l.numero, hoje))
  for (const l of abas.Boletos_Manual.linhas) {
    if (manualVazia(l.dados)) continue
    // Mesmo os pagos entram na deduplicação: não queremos regravar um boleto que o Tulio já pagou
    contas.push(paraConta('Boletos_Manual', l.dados, l.numero, hoje))
  }
  const existentes = chavesExistentes(contas)
  for (const id of pagosOutras) existentes.ids.add(id.split('#')[0]!)
  return { contas, existentes }
}

export function idsPagosOutras(pagos: Set<string>): Set<string> {
  const ids = new Set<string>()
  for (const k of pagos) if (k.startsWith('outras:')) ids.add(k.slice(7))
  return ids
}

/** Sincroniza uma conta. Muta `estado` e `panorama.existentes`. */
export async function sincronizarConta(
  conta: ContaSync,
  estado: EstadoContaSync,
  panorama: Panorama,
  deps: DepsSync
): Promise<ResultadoSync> {
  const resultado: ResultadoSync = { contaId: conta.id, novos: 0, ignorados: 0, semVencimento: 0, pendente: false, erro: null }
  const inicioVarredura = estado.emAndamentoDesde ?? deps.agora
  const desde = estado.ultimaSync
    ? new Date(estado.ultimaSync - 2 * 86_400_000)
    : new Date(inicioVarredura - DIAS_PRIMEIRA_SYNC * 86_400_000)

  const gravar = async (b: BoletoFuturo): Promise<'gravado' | 'duplicado' | 'fora' | 'futuro'> => {
    const situacao = calcularSituacao(b.vencimento, deps.hoje)
    if (situacao === 'Futuro') return 'futuro'
    if (!dentroDaJanela(situacao)) return 'fora'
    if (eDuplicado(panorama.existentes, b)) return 'duplicado'
    await deps.planilha.acrescentar(ABA_DESTINO, montarRegistro(b, b.idMensagem, conta, deps.hoje))
    deps.aoNovoBoleto?.({ vencimento: b.vencimento, valor: b.valor, beneficiario: b.beneficiario })
    registrarChaves(panorama.existentes, b)
    resultado.novos++
    return 'gravado'
  }

  // Boletos guardados que agora entraram na janela de 7 dias
  const aindaFuturos: BoletoFuturo[] = []
  for (const f of estado.futuros) {
    if ((await gravar(f)) === 'futuro') aindaFuturos.push(f)
  }
  estado.futuros = aindaFuturos

  const busca = await deps.buscar({
    desde,
    jaProcessados: new Set(Object.keys(estado.processados)),
    cursor: estado.cursor,
    aoEncontrar: async (msg) => {
      estado.processados[msg.messageId] = deps.agora
      const r = extrairBoletos(msg, { contaEmail: conta.email, hoje: deps.hoje })
      if (r.tipo === 'descartado') {
        resultado.ignorados++
        return
      }
      if (r.tipo === 'incompleto') {
        resultado.semVencimento++
        return
      }
      const boletos: BoletoExtraido[] = r.boletos
      for (let i = 0; i < boletos.length; i++) {
        const b = boletos[i]!
        if (!b.vencimento) {
          resultado.semVencimento++
          continue
        }
        const idMensagem = i === 0 ? msg.messageId : `${msg.messageId}#${i + 1}`
        const item: BoletoFuturo = {
          idMensagem,
          vencimento: b.vencimento,
          valor: b.valor,
          beneficiario: b.beneficiario,
          linhaDigitavel: b.linhaDigitavel,
          comoPagar: b.linhaDigitavel ? formatarLinhaDigitavel(b.linhaDigitavel) : b.comoPagar
        }
        const s = await gravar(item)
        if (s === 'futuro') estado.futuros.push(item)
        else if (s !== 'gravado') resultado.ignorados++
      }
    }
  })

  // Esquece processados antigos para o estado não crescer sem limite
  const limite = deps.agora - DIAS_GUARDAR_PROCESSADOS * 86_400_000
  for (const [id, quando] of Object.entries(estado.processados)) if (quando < limite) delete estado.processados[id]

  resultado.pendente = busca.pendente
  if (busca.pendente) {
    estado.emAndamentoDesde = inicioVarredura
  } else {
    estado.ultimaSync = inicioVarredura
    estado.emAndamentoDesde = null
  }
  return resultado
}
