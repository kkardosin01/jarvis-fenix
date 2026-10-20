import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/acesso'
import { sincronizarContas } from '@/lib/mail/orquestrador'
import { respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Sincroniza todas as contas pessoais ativas (cron diário 8h45; de hora em hora se o plano permitir). */
export async function GET(req: Request) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  try {
    const resultados = await sincronizarContas({ orcamentoMs: 270_000 })
    // Só números: nada de conteúdo de e-mail na resposta nem no log
    return NextResponse.json({
      contas: resultados.length,
      novos: resultados.reduce((s, r) => s + r.novos, 0),
      erros: resultados.filter((r) => r.erro).length,
      pendentes: resultados.filter((r) => r.pendente).length
    })
  } catch (e) {
    return respostaErro(e, 'cron-sync')
  }
}
