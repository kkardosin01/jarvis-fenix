import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/acesso'
import { notificarBomDia } from '@/lib/bom-dia'
import { respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  try {
    return NextResponse.json(await notificarBomDia('primeira'))
  } catch (e) {
    return respostaErro(e, 'cron-notify')
  }
}
