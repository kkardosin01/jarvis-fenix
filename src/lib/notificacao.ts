// Textos e regras das notificações (sem rede, para testar).

import { agoraSP, formatarDiaMes, formatarMoeda, hojeISO } from 'jarvis-fenix-core/ptbr'
import type { DadosPainel } from 'jarvis-fenix-core/types'

/** Sem notificação entre 22h e 7h. */
export function horarioSilencioso(hora: number): boolean {
  return hora >= 22 || hora < 7
}

export function agoraSilencioso(agora: Date = new Date()): boolean {
  return horarioSilencioso(agoraSP(agora).hora)
}

function juntar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}

export function contagens(dados: DadosPainel): { hoje: number; atrasados: number; clientes: number } {
  return {
    hoje: dados.contas.filter((c) => c.situacao === 'Vence hoje').length,
    atrasados: dados.contas.filter((c) => c.situacao === 'Atrasado').length,
    clientes: dados.contatos.length
  }
}

/** "Bom dia, Tulio! 2 contas vencem hoje, 3 atrasadas e 6 clientes para ligar." (só números > 0). */
export function textoBomDia(nome: string, dados: DadosPainel): string {
  const { hoje, atrasados, clientes } = contagens(dados)
  const partes: string[] = []
  if (hoje > 0) partes.push(hoje === 1 ? '1 conta vence hoje' : `${hoje} contas vencem hoje`)
  if (atrasados > 0) partes.push(atrasados === 1 ? '1 atrasada' : `${atrasados} atrasadas`)
  if (clientes > 0) partes.push(clientes === 1 ? '1 cliente para ligar' : `${clientes} clientes para ligar`)
  if (!partes.length) return `Bom dia, ${nome}! Nenhuma conta vencendo hoje e nenhum cliente na fila.`
  return `Bom dia, ${nome}! ${juntar(partes)}.`
}

export const TEXTO_RESUMO_ATRASADO = 'O resumo de hoje ainda não ficou pronto.'

/** O Resumo da planilha foi atualizado hoje (Brasília)? */
export function resumoDeHoje(dados: DadosPainel, agora: Date): boolean {
  const iso = dados.resumo.atualizadoEmISO
  return !!iso && hojeISO(new Date(iso)) === hojeISO(agora)
}

export type EstadoBomDia = 'completo' | 'pendente' | null

/**
 * O que a rota de notificação deve fazer.
 * - 9h05: resumo pronto → bom dia; senão avisa que não ficou pronto.
 * - 9h35: só age se o bom dia completo ainda não saiu. Se o resumo segue atrasado e o aviso já foi, fica quieto.
 * (No plano Hobby da Vercel os crons podem atrasar até 1 hora; a ordem pode trocar e isto continua certo.)
 */
export function decidirBomDia(
  tentativa: 'primeira' | 'segunda',
  estado: EstadoBomDia,
  pronto: boolean
): { enviar: 'bomDia' | 'pendente' | null; novoEstado: EstadoBomDia } {
  if (estado === 'completo') return { enviar: null, novoEstado: 'completo' }
  if (pronto) return { enviar: 'bomDia', novoEstado: 'completo' }
  if (estado === 'pendente') return { enviar: null, novoEstado: 'pendente' }
  return { enviar: tentativa === 'primeira' || estado === null ? 'pendente' : null, novoEstado: 'pendente' }
}

export function textoNovoBoleto(b: { beneficiario: string; vencimento: string; valor: number | null }): string {
  const valor = b.valor !== null ? ` — ${formatarMoeda(b.valor)}` : ' — valor no PDF'
  return `Novo boleto: ${b.beneficiario} — vence ${formatarDiaMes(b.vencimento)}${valor}`
}
