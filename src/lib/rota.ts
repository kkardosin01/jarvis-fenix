// Utilidades dos Route Handlers: JSON, erros em português e sem vazar detalhes.

import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ErroUsuario } from './boletos-acoes'
import { mensagemZod } from './esquemas'

export async function lerJson<T>(req: Request, esquema: z.ZodType<T>): Promise<T> {
  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    throw new ErroUsuario('Pedido inválido')
  }
  const r = esquema.safeParse(corpo)
  if (!r.success) throw new ErroUsuario(mensagemZod(r.error))
  return r.data
}

export function respostaErro(e: unknown, contexto: string): NextResponse {
  if (e instanceof ErroUsuario) return NextResponse.json({ erro: e.message }, { status: 400 })
  // Só o nome do erro vai para o log: nada de conteúdo de e-mail ou da planilha
  console.error(`${contexto}: ${(e as Error)?.name ?? 'erro'} ${(e as { code?: string | number })?.code ?? ''}`)
  const msg = (e as Error)?.message ?? ''
  const amigavel = /não configurad|Conta de serviço/.test(msg)
    ? 'O servidor ainda não foi configurado. Avise o Pedro.'
    : /PERMISSION_DENIED|caller does not have permission/i.test(msg)
      ? 'A planilha não está compartilhada com a conta de serviço.'
      : 'Algo deu errado. Tente de novo em instantes.'
  return NextResponse.json({ erro: amigavel }, { status: 500 })
}
