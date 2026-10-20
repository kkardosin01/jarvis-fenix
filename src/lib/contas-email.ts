// Contas de e-mail pessoais guardadas no Supabase. A senha vai cifrada e nunca sai do servidor.

import 'server-only'
import type { ContaPFPJ, TipoContaEmail } from '@/core/types'
import { cifrar, decifrar } from './cripto'
import { normalizarEstado, type EstadoContaSync } from './mail/sync'
import { supabase } from './supabase'
import type { ContaEmailWeb } from './tipos'

const TABELA = 'contas_email'
const COLUNAS_PUBLICAS = 'id, tipo, email, apelido, servidor, porta, conta_boleto, pausada, ultima_sync, boletos_achados, erro, pendente'

interface LinhaPublica {
  id: string
  tipo: TipoContaEmail
  email: string
  apelido: string
  servidor: string
  porta: number
  conta_boleto: ContaPFPJ
  pausada: boolean
  ultima_sync: string | null
  boletos_achados: number
  erro: string | null
  pendente: boolean
}

function paraWeb(l: LinhaPublica): ContaEmailWeb {
  return {
    id: l.id,
    tipo: l.tipo,
    email: l.email,
    apelido: l.apelido,
    servidor: l.servidor,
    porta: l.porta,
    contaBoleto: l.conta_boleto,
    pausada: l.pausada,
    ultimaSincronizacao: l.ultima_sync ? Date.parse(l.ultima_sync) : null,
    boletosAchados: l.boletos_achados ?? 0,
    erro: l.erro,
    pendente: !!l.pendente
  }
}

export async function listarContas(): Promise<ContaEmailWeb[]> {
  const { data, error } = await supabase().from(TABELA).select(COLUNAS_PUBLICAS).order('criado_em')
  if (error) throw new Error('Não foi possível ler as contas de e-mail')
  return (data as LinhaPublica[]).map(paraWeb)
}

export interface NovaContaEmail {
  tipo: TipoContaEmail
  email: string
  senha: string
  servidor: string
  porta: number
  apelido: string
  contaBoleto: ContaPFPJ
}

export async function criarConta(n: NovaContaEmail): Promise<ContaEmailWeb> {
  const { data, error } = await supabase()
    .from(TABELA)
    .insert({
      tipo: n.tipo,
      email: n.email,
      apelido: n.apelido,
      servidor: n.servidor,
      porta: n.porta,
      conta_boleto: n.contaBoleto,
      senha_cifrada: cifrar(n.senha),
      estado: {}
    })
    .select(COLUNAS_PUBLICAS)
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Esta conta de e-mail já está cadastrada')
    throw new Error('Não foi possível salvar a conta')
  }
  return paraWeb(data as LinhaPublica)
}

export interface AlteracaoConta {
  pausada?: boolean
  apelido?: string
  contaBoleto?: ContaPFPJ
  senha?: string
}

export async function alterarConta(id: string, a: AlteracaoConta): Promise<ContaEmailWeb> {
  const campos: Record<string, unknown> = {}
  if (a.pausada !== undefined) campos.pausada = a.pausada
  if (a.apelido !== undefined) campos.apelido = a.apelido
  if (a.contaBoleto !== undefined) campos.conta_boleto = a.contaBoleto
  if (a.senha !== undefined) {
    campos.senha_cifrada = cifrar(a.senha)
    campos.erro = null
  }
  const { data, error } = await supabase().from(TABELA).update(campos).eq('id', id).select(COLUNAS_PUBLICAS).single()
  if (error) throw new Error('Não foi possível alterar a conta')
  return paraWeb(data as LinhaPublica)
}

export async function removerConta(id: string): Promise<void> {
  const { error } = await supabase().from(TABELA).delete().eq('id', id)
  if (error) throw new Error('Não foi possível remover a conta')
}

/** Dados completos para conectar (só dentro do servidor). */
export interface ContaParaSync {
  id: string
  tipo: TipoContaEmail
  email: string
  apelido: string
  servidor: string
  porta: number
  contaBoleto: ContaPFPJ
  senha: string
  estado: EstadoContaSync
  boletosAchados: number
}

export async function configImapDaConta(id: string): Promise<{ tipo: TipoContaEmail; email: string; servidor: string; porta: number; senha: string } | null> {
  const { data } = await supabase().from(TABELA).select('tipo, email, servidor, porta, senha_cifrada').eq('id', id).maybeSingle()
  if (!data) return null
  return { tipo: data.tipo, email: data.email, servidor: data.servidor, porta: data.porta, senha: decifrar(data.senha_cifrada) }
}

/** Ids das contas ativas; com `maisAntigaQueMin`, só as que não sincronizam há esse tempo (ou ficaram pela metade). */
export async function contasParaSincronizar(opts: { id?: string; maisAntigaQueMin?: number }): Promise<string[]> {
  let q = supabase().from(TABELA).select('id, ultima_sync, pendente').eq('pausada', false)
  if (opts.id) q = q.eq('id', opts.id)
  const { data, error } = await q
  if (error) throw new Error('Não foi possível ler as contas de e-mail')
  const limite = opts.maisAntigaQueMin ? Date.now() - opts.maisAntigaQueMin * 60_000 : Infinity
  return (data ?? [])
    .filter((c) => c.pendente || !c.ultima_sync || Date.parse(c.ultima_sync) < limite)
    .map((c) => c.id as string)
}

/**
 * Trava a conta para esta execução (evita duas sincronizações ao mesmo tempo:
 * cron + app aberto). Devolve null se outra execução estiver com ela.
 */
export async function travarConta(id: string, minutos = 6): Promise<ContaParaSync | null> {
  const agora = new Date()
  const ate = new Date(agora.getTime() + minutos * 60_000).toISOString()
  const { data, error } = await supabase()
    .from(TABELA)
    .update({ travada_ate: ate })
    .eq('id', id)
    .eq('pausada', false)
    .or(`travada_ate.is.null,travada_ate.lt.${agora.toISOString()}`)
    .select('id, tipo, email, apelido, servidor, porta, conta_boleto, senha_cifrada, estado, boletos_achados')
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id,
    tipo: data.tipo,
    email: data.email,
    apelido: data.apelido,
    servidor: data.servidor,
    porta: data.porta,
    contaBoleto: data.conta_boleto,
    senha: decifrar(data.senha_cifrada),
    estado: normalizarEstado(data.estado),
    boletosAchados: data.boletos_achados ?? 0
  }
}

export async function liberarConta(
  id: string,
  r: { estado?: EstadoContaSync; erro: string | null; novos: number; boletosAchados: number; pendente: boolean; concluiu: boolean }
): Promise<void> {
  const campos: Record<string, unknown> = {
    travada_ate: null,
    erro: r.erro,
    boletos_achados: r.boletosAchados + r.novos,
    pendente: r.pendente
  }
  if (r.estado) campos.estado = r.estado
  if (r.concluiu) campos.ultima_sync = new Date().toISOString()
  await supabase().from(TABELA).update(campos).eq('id', id)
}
