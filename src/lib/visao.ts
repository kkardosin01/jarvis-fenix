// Contas/situações para as telas (sem rede).

import type { Conta, Situacao } from '@/core/types'

export function tomSituacao(s: Situacao | null): 'perigo' | 'alerta' | 'neutro' {
  if (s === 'Atrasado' || s === 'Vencido há mais de 30 dias') return 'perigo'
  if (s === 'Vence hoje') return 'alerta'
  return 'neutro'
}

/** Filtro de origem da tela Contas: Empresa, cada conta pessoal ou Lançado à mão. */
export function origemFiltro(c: Conta): string {
  if (c.fonte === 'Boletos') return 'Empresa'
  if (c.fonte === 'Boletos_Manual') return 'Lançado à mão'
  return c.origem || 'E-mail pessoal'
}

export function rotuloOrigem(origem: string): string {
  return origem.replace(/^E-mail\s+/i, '')
}

export function urgenciaTom(u: string): 'perigo' | 'alerta' | 'neutro' {
  const n = u.toLowerCase()
  if (n.startsWith('alt')) return 'perigo'
  if (n.startsWith('m')) return 'alerta'
  return 'neutro'
}

const PESO_URGENCIA: Record<string, number> = { alta: 0, média: 1, media: 1, baixa: 2 }

export function pesoUrgencia(u: string): number {
  return PESO_URGENCIA[u.trim().toLowerCase()] ?? 3
}
