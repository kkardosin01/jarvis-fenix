import { NextResponse } from 'next/server'
import { z } from 'zod'
import { exigirUsuario, modoDemo } from '@/lib/acesso'
import { esquemaInscricao } from '@/lib/esquemas'
import { removerInscricao, salvarInscricao } from '@/lib/push'
import { lerJson, respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'

const esquemaPost = z.object({ inscricao: esquemaInscricao, aparelho: z.string().max(120).default('') })
const esquemaDelete = z.object({ endpoint: z.string().url().max(1000) })

export async function POST(req: Request) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const { inscricao, aparelho } = await lerJson(req, esquemaPost)
    if (!modoDemo()) await salvarInscricao(inscricao, u.email, aparelho)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return respostaErro(e, 'push-inscrever')
  }
}

export async function DELETE(req: Request) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const { endpoint } = await lerJson(req, esquemaDelete)
    if (!modoDemo()) await removerInscricao(endpoint)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return respostaErro(e, 'push-remover')
  }
}
