// Pequeno chave/valor no Supabase (ex.: se o bom dia de hoje já saiu).

import 'server-only'
import { supabase } from './supabase'

export async function lerEstado(chave: string): Promise<string | null> {
  const { data } = await supabase().from('jarvis_estado').select('valor').eq('chave', chave).maybeSingle()
  return (data?.valor as string | undefined) ?? null
}

export async function gravarEstado(chave: string, valor: string): Promise<void> {
  const { error } = await supabase().from('jarvis_estado').upsert({ chave, valor, atualizado_em: new Date().toISOString() })
  if (error) throw new Error('Não foi possível gravar o estado')
}
