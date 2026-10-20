// Boletos marcados como pagos que não dá para marcar na própria planilha:
// - "outras:<id_mensagem>": linha removida de Boletos_Outras_Contas (a sincronização não regrava)
// - "nuvem:<beneficiário>|<vencimento>": linha da aba Boletos (a nuvem reescreve a aba todo dia)

import { normalizarTexto } from 'jarvis-fenix-core/ptbr'
import type { Conta } from 'jarvis-fenix-core/types'

export function chavePagoNuvem(beneficiario: string, vencimento: string | null): string {
  return `nuvem:${normalizarTexto(beneficiario)}|${vencimento ?? ''}`
}

export function chavePagoOutras(idMensagem: string): string {
  return `outras:${idMensagem}`
}

/** Tira das contas o que já foi marcado como pago fora da planilha. */
export function esconderPagos(contas: Conta[], pagos: Set<string>): Conta[] {
  return contas.filter((c) => {
    if (c.fonte === 'Boletos') return !pagos.has(chavePagoNuvem(c.beneficiario, c.vencimento))
    if (c.fonte === 'Boletos_Outras_Contas') return !(c.idMensagem && pagos.has(chavePagoOutras(c.idMensagem)))
    return true
  })
}
