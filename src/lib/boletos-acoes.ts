// Escritas na planilha: lançar boleto (Boletos_Manual) e marcar como pago.
// Sempre relê a aba antes de escrever, para achar a linha certa (nunca posição fixa).

import 'server-only'
import { chaveBeneficiario, coluna, manualPago, manualVazia, paraConta } from 'jarvis-fenix-core/boletos'
import { hojeISO } from 'jarvis-fenix-core/ptbr'
import type { LancarBoleto } from './esquemas'
import { chavePagoNuvem, chavePagoOutras } from './pagos'
import { registrarPago } from './pagos-db'
import type { Planilha } from './sheets'

export async function lancarBoleto(planilha: Planilha, b: LancarBoleto): Promise<void> {
  await planilha.acrescentar('Boletos_Manual', {
    vencimento: b.vencimento,
    beneficiario: b.beneficiario,
    valor: b.valor ?? '',
    conta: b.conta,
    'pago?': 'não',
    observacao: b.observacao
  })
}

export class ErroUsuario extends Error {}

/** `chave` é a Conta.chave que o navegador recebeu ("manual:…", "outras:…" ou "nuvem:…"). */
export async function marcarPago(planilha: Planilha, chave: string, email: string): Promise<void> {
  const hoje = hojeISO()
  if (chave.startsWith('manual:')) {
    const m = /^manual:(\d+):(.*)$/.exec(chave)
    if (!m) throw new ErroUsuario('Boleto inválido')
    const numero = Number(m[1])
    const combo = m[2]!
    const aba = await planilha.lerAba('Boletos_Manual')
    const candidatos = aba.linhas.filter((l) => {
      if (manualVazia(l.dados) || manualPago(l.dados)) return false
      const c = paraConta('Boletos_Manual', l.dados, l.numero, hoje)
      return chaveBeneficiario(c.beneficiario, c.vencimento, c.valor) === combo
    })
    // Prefere a mesma linha; se a planilha mudou, a primeira com os mesmos dados
    const alvo = candidatos.find((l) => l.numero === numero) ?? candidatos[0]
    if (!alvo) throw new ErroUsuario('Não achei esse boleto na planilha. Toque em Atualizar e tente de novo.')
    await planilha.atualizarCelula('Boletos_Manual', alvo.numero, 'pago?', 'sim')
    return
  }
  if (chave.startsWith('outras:')) {
    const id = chave.slice(7)
    if (!id) throw new ErroUsuario('Boleto inválido')
    // Primeiro registra (para a sincronização não regravar), depois remove a linha
    await registrarPago(chavePagoOutras(id), email)
    await planilha.removerPorChave('Boletos_Outras_Contas', 'id_mensagem', [id])
    return
  }
  if (chave.startsWith('nuvem:')) {
    const aba = await planilha.lerAba('Boletos')
    const linha = aba.linhas.find((l) => paraConta('Boletos', l.dados, l.numero, hoje).chave === chave)
    if (!linha) throw new ErroUsuario('Não achei esse boleto na planilha. Toque em Atualizar e tente de novo.')
    await registrarPago(chavePagoNuvem(coluna(linha.dados, 'beneficiario'), paraConta('Boletos', linha.dados, linha.numero, hoje).vencimento), email)
    return
  }
  throw new ErroUsuario('Boleto inválido')
}
