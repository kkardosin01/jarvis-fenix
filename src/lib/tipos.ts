// Tipos que só existem no app web (o núcleo compartilhado fica em src/core).

import type { ContaPFPJ, DadosPainel, TipoContaEmail } from 'jarvis-fenix-core/types'

/** Conta de e-mail como o navegador vê: nunca com a senha. */
export interface ContaEmailWeb {
  id: string
  tipo: TipoContaEmail
  email: string
  apelido: string
  servidor: string
  porta: number
  contaBoleto: ContaPFPJ
  pausada: boolean
  ultimaSincronizacao: number | null
  boletosAchados: number
  erro: string | null
  pendente: boolean
}

export interface RespostaPainel {
  dados: DadosPainel
  /** Quando os dados foram lidos da planilha (ms). */
  lidoEm: number
  hoje: string
  /** Última sincronização de e-mails pessoais (ms), a mais antiga entre as contas ativas. */
  ultimaSyncEmails: number | null
  demo?: boolean
}
