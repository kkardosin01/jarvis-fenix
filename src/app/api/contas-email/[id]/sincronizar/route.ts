import { NextResponse } from 'next/server'
import { exigirUsuario } from '@/lib/acesso'
import { ErroUsuario } from '@/lib/boletos-acoes'
import { esquemaId } from '@/lib/esquemas'
import { sincronizarContas } from '@/lib/mail/orquestrador'
import { respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const { id } = await ctx.params
    if (!esquemaId.safeParse(id).success) throw new ErroUsuario('Conta inválida')
    const [r] = await sincronizarContas({ id, orcamentoMs: 270_000 })
    if (!r) throw new ErroUsuario('Esta conta já está sincronizando ou está pausada. Tente de novo em alguns minutos.')
    return NextResponse.json({ resultado: r })
  } catch (e) {
    return respostaErro(e, 'sincronizar-conta')
  }
}
