// Roda a sincronização de todas as contas (ou de uma), uma por vez, sem que o erro de uma trave as outras.

import 'server-only'
import { hojeISO } from '@/core/ptbr'
import { contasParaSincronizar, liberarConta, travarConta } from '../contas-email'
import { agoraSilencioso, textoNovoBoleto } from '../notificacao'
import { lerPagos } from '../pagos-db'
import { abrirPlanilha } from '../planilha'
import { enviarParaTodos } from '../push'
import { buscarCandidatas, mensagemErroImap } from './imap'
import { prepararPanorama, sincronizarConta, type BoletoNovo, type ResultadoSync } from './sync'

/** Máximo de e-mails baixados por conta em cada execução (o resto fica para a próxima). */
export const MAX_MENSAGENS_POR_CONTA = 40

export interface OpcoesOrquestrador {
  id?: string
  /** Só sincroniza contas paradas há mais que isso (minutos). */
  maisAntigaQueMin?: number
  /** Tempo total disponível para a função (ms). */
  orcamentoMs: number
}

export async function sincronizarContas(o: OpcoesOrquestrador): Promise<ResultadoSync[]> {
  const inicio = Date.now()
  const ids = await contasParaSincronizar({ id: o.id, maisAntigaQueMin: o.maisAntigaQueMin })
  if (!ids.length) return []

  const planilha = await abrirPlanilha()
  const hoje = hojeISO()
  const pagos = await lerPagos()
  const panorama = await prepararPanorama(planilha, hoje, pagos)
  const novos: BoletoNovo[] = []
  const resultados: ResultadoSync[] = []

  for (let i = 0; i < ids.length; i++) {
    const restante = o.orcamentoMs - (Date.now() - inicio)
    if (restante < 20_000) break // deixa para a próxima execução
    const conta = await travarConta(ids[i]!)
    if (!conta) continue
    // Divide o tempo que sobra entre as contas que faltam
    const prazo = Date.now() + Math.max(15_000, (restante - 15_000) / (ids.length - i))
    try {
      const r = await sincronizarConta(conta, conta.estado, panorama, {
        planilha,
        hoje,
        agora: Date.now(),
        aoNovoBoleto: (b) => novos.push(b),
        buscar: ({ desde, jaProcessados, cursor, aoEncontrar }) =>
          buscarCandidatas(conta, { desde, jaProcessados, cursor, aoEncontrar, limite: MAX_MENSAGENS_POR_CONTA, prazo })
      })
      await liberarConta(conta.id, {
        estado: conta.estado,
        erro: null,
        novos: r.novos,
        boletosAchados: conta.boletosAchados,
        pendente: r.pendente,
        concluiu: true
      })
      resultados.push(r)
    } catch (e) {
      // Guardamos o estado parcial: o que já foi gravado não é regravado
      const erro = mensagemErroImap(e)
      console.error(`sync: conta ${conta.id} falhou (${(e as { code?: string }).code ?? 'erro'})`)
      await liberarConta(conta.id, { estado: conta.estado, erro, novos: 0, boletosAchados: conta.boletosAchados, pendente: false, concluiu: false })
      resultados.push({ contaId: conta.id, novos: 0, ignorados: 0, semVencimento: 0, pendente: false, erro })
    }
  }

  if (novos.length && !agoraSilencioso()) {
    try {
      if (novos.length <= 3) {
        for (const b of novos) {
          await enviarParaTodos({ titulo: 'Jarvis Fênix', corpo: textoNovoBoleto(b), url: '/contas', tag: `boleto-${b.beneficiario}-${b.vencimento}` })
        }
      } else {
        await enviarParaTodos({ titulo: 'Jarvis Fênix', corpo: `${novos.length} boletos novos nos e-mails pessoais.`, url: '/contas', tag: 'boletos-novos' })
      }
    } catch {
      console.error('sync: falha ao enviar push de boleto novo')
    }
  }
  return resultados
}
