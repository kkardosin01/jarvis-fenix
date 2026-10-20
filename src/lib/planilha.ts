// Planilha Jarvis_Fenix a partir das variáveis de ambiente (conta de serviço do Google).

import 'server-only'
import { criarApiGoogle, Planilha } from './sheets'

export const PLANILHA_PADRAO = '1krSssMZcSLsD7mmCOOGQp_foJMEJqhAS2t4ExjHZAVE'

export async function abrirPlanilha(): Promise<Planilha> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  // Na Vercel a chave costuma ser colada com "\n" literais
  const chave = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  if (!email || !chave) throw new Error('Conta de serviço do Google não configurada')
  const api = await criarApiGoogle({ client_email: email, private_key: chave }, process.env.SHEET_ID || PLANILHA_PADRAO)
  return new Planilha(api)
}
