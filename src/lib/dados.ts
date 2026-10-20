// Lê a planilha e monta os dados de todas as telas.

import 'server-only'
import { hojeISO } from 'jarvis-fenix-core/ptbr'
import { ABAS_LEITURA } from './sheets'
import { montarDados } from './painel'
import { esconderPagos } from './pagos'
import { lerPagos } from './pagos-db'
import { abrirPlanilha } from './planilha'
import { supabase } from './supabase'
import type { RespostaPainel } from './tipos'

export async function carregarPainel(): Promise<RespostaPainel> {
  const hoje = hojeISO()
  const planilha = await abrirPlanilha()
  const [abas, pagos, ultimaSyncEmails] = await Promise.all([planilha.lerAbas(ABAS_LEITURA), lerPagos(), ultimaSync()])
  const dados = montarDados(abas, hoje, { nuvem: [], outras: [] })
  dados.contas = esconderPagos(dados.contas, pagos)
  return { dados, lidoEm: Date.now(), hoje, ultimaSyncEmails }
}

async function ultimaSync(): Promise<number | null> {
  const { data } = await supabase().from('contas_email').select('ultima_sync').eq('pausada', false)
  if (!data?.length) return null
  const vs = data.map((d) => (d.ultima_sync ? Date.parse(d.ultima_sync as string) : 0))
  return Math.min(...vs) || null
}
