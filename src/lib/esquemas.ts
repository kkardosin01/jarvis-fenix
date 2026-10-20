// Validação (zod) de tudo que chega do navegador.

import { z } from 'zod'

export const esquemaLancarBoleto = z
  .object({
    vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    beneficiario: z.string().trim().min(2, 'Informe quem vai receber').max(80),
    valor: z.number().positive('Valor inválido').max(10_000_000).nullable(),
    conta: z.enum(['PF', 'PJ']),
    observacao: z.string().trim().max(200).default('')
  })
  .strict()
export type LancarBoleto = z.infer<typeof esquemaLancarBoleto>

export const esquemaPagar = z.object({ chave: z.string().min(3).max(600) }).strict()

const servidor = z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Servidor inválido')

export const esquemaConexao = z
  .object({
    tipo: z.enum(['gmail', 'outlook', 'outro']),
    email: z.string().trim().toLowerCase().email('E-mail inválido'),
    senha: z.string().min(4, 'Informe a senha de app').max(200),
    servidor,
    porta: z.number().int().min(1).max(65535)
  })
  .strict()

export const esquemaNovaConta = esquemaConexao
  .extend({
    apelido: z.string().trim().min(1, 'Dê um apelido para a conta').max(40),
    contaBoleto: z.enum(['PF', 'PJ'])
  })
  .strict()

export const esquemaAlterarConta = z
  .object({
    pausada: z.boolean().optional(),
    apelido: z.string().trim().min(1).max(40).optional(),
    contaBoleto: z.enum(['PF', 'PJ']).optional(),
    senha: z.string().min(4).max(200).optional()
  })
  .strict()

export const esquemaId = z.string().uuid()

export const esquemaInscricao = z.object({
  endpoint: z.string().url().max(1000).startsWith('https://'),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(5).max(100) })
})

/** Primeira mensagem de erro do zod, para mostrar ao Tulio. */
export function mensagemZod(e: z.ZodError): string {
  return e.issues[0]?.message ?? 'Dados inválidos'
}
