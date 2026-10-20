// Cliente do Supabase com a service role. SOMENTE no servidor: as tabelas têm RLS ligado
// e nenhuma política, então só esta chave consegue ler e gravar.

import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (cliente) return cliente
  const url = process.env.SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chave) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados')
  cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
  return cliente
}
