import { NextResponse } from 'next/server'
import { z } from 'zod'
import { exigirUsuario, modoDemo } from '@/lib/acesso'
import { sincronizarContas } from '@/lib/mail/orquestrador'
import { lerJson, respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const maxDuration = 300

const esquema = z.object({ seAntigo: z.boolean().default(false) }).strict()

/** Sincroniza as contas pessoais. Com seAntigo, só as paradas há mais de 30 minutos (ao abrir o app). */
export async function POST(req: Request) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const { seAntigo } = await lerJson(req, esquema)
    if (modoDemo()) return NextResponse.json({ resultados: [], novos: 0 })
    const resultados = await sincronizarContas({ maisAntigaQueMin: seAntigo ? 30 : undefined, orcamentoMs: 270_000 })
    return NextResponse.json({ resultados, novos: resultados.reduce((s, r) => s + r.novos, 0) })
  } catch (e) {
    return respostaErro(e, 'sync')
  }
}
