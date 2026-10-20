import { NextResponse } from 'next/server'
import { exigirUsuario, modoDemo } from '@/lib/acesso'
import { carregarPainel } from '@/lib/dados'
import { painelDemo } from '@/lib/demo'
import { respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    return NextResponse.json(modoDemo() ? painelDemo() : await carregarPainel())
  } catch (e) {
    return respostaErro(e, 'painel')
  }
}
