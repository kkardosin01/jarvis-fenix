// Quem pode usar o app: só os e-mails de ALLOWED_EMAILS.

import 'server-only'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export function emailsPermitidos(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function emailPermitido(email: string | null | undefined): boolean {
  return !!email && emailsPermitidos().includes(email.trim().toLowerCase())
}

/** Modo demonstração: dados fictícios e sem login. NUNCA liga em produção. */
export function modoDemo(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.JARVIS_DEMO === '1'
}

export async function usuarioAtual(): Promise<{ email: string; nome: string } | null> {
  if (modoDemo()) return { email: 'demo@exemplo.com', nome: 'Tulio' }
  const s = await auth()
  const email = s?.user?.email
  if (!emailPermitido(email)) return null
  return { email: email!, nome: s?.user?.name ?? '' }
}

/** Para Route Handlers: devolve a resposta 401 pronta quando não há sessão válida. */
export async function exigirUsuario(): Promise<{ email: string } | NextResponse> {
  const u = await usuarioAtual()
  if (!u) return NextResponse.json({ erro: 'Acesso não autorizado' }, { status: 401 })
  return u
}

/** Rotas de cron: exigem Authorization: Bearer ${CRON_SECRET}. */
export function cronAutorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET
  if (!segredo || segredo.length < 16) return false
  const recebido = req.headers.get('authorization') ?? ''
  const esperado = `Bearer ${segredo}`
  if (recebido.length !== esperado.length) return false
  let dif = 0
  for (let i = 0; i < esperado.length; i++) dif |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i)
  return dif === 0
}
