import { NextResponse } from 'next/server'
import { exigirUsuario, modoDemo } from '@/lib/acesso'
import { marcarPago } from '@/lib/boletos-acoes'
import { esquemaPagar } from '@/lib/esquemas'
import { abrirPlanilha } from '@/lib/planilha'
import { lerJson, respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const { chave } = await lerJson(req, esquemaPagar)
    if (!modoDemo()) await marcarPago(await abrirPlanilha(), chave, u.email)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return respostaErro(e, 'marcar-pago')
  }
}
