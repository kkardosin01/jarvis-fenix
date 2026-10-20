import { NextResponse } from 'next/server'
import { exigirUsuario, modoDemo } from '@/lib/acesso'
import { enviarParaTodos } from '@/lib/push'
import { respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'

export async function POST() {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    if (modoDemo()) return NextResponse.json({ enviados: 0 })
    const r = await enviarParaTodos({ titulo: 'Jarvis Fênix', corpo: 'Notificações ligadas. Até amanhã às 9h!', url: '/', tag: 'teste' })
    return NextResponse.json(r)
  } catch (e) {
    return respostaErro(e, 'push-teste')
  }
}
