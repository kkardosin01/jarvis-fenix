import { NextResponse } from 'next/server'
import { exigirUsuario, modoDemo } from '@/lib/acesso'
import { lancarBoleto } from '@/lib/boletos-acoes'
import { esquemaLancarBoleto } from '@/lib/esquemas'
import { abrirPlanilha } from '@/lib/planilha'
import { lerJson, respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'

/** Lança um boleto em Boletos_Manual (pago? = não). */
export async function POST(req: Request) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const b = await lerJson(req, esquemaLancarBoleto)
    if (!modoDemo()) await lancarBoleto(await abrirPlanilha(), b)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return respostaErro(e, 'lancar-boleto')
  }
}
