import 'server-only'
import { supabase } from './supabase'

export async function lerPagos(): Promise<Set<string>> {
  // Só os últimos 120 dias importam (a planilha não mostra nada mais velho que 30)
  const desde = new Date(Date.now() - 120 * 86_400_000).toISOString()
  const { data, error } = await supabase().from('boletos_pagos').select('chave').gte('criado_em', desde)
  if (error) throw new Error('Não foi possível ler os boletos pagos')
  return new Set((data ?? []).map((r) => r.chave as string))
}

export async function registrarPago(chave: string, email: string): Promise<void> {
  const { error } = await supabase().from('boletos_pagos').upsert({ chave, marcado_por: email })
  if (error) throw new Error('Não foi possível registrar o pagamento')
}
