import { NextResponse } from 'next/server'
import { exigirUsuario } from '@/lib/acesso'
import { esquemaConexao } from '@/lib/esquemas'
import { testarConexao } from '@/lib/mail/imap'
import { lerJson, respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const cfg = await lerJson(req, esquemaConexao)
    return NextResponse.json(await testarConexao(cfg))
  } catch (e) {
    return respostaErro(e, 'testar-conta')
  }
}
