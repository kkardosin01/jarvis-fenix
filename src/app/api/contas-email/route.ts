import { NextResponse } from 'next/server'
import { exigirUsuario, modoDemo } from '@/lib/acesso'
import { criarConta, listarContas } from '@/lib/contas-email'
import { esquemaNovaConta } from '@/lib/esquemas'
import { eContaDaEmpresa, testarConexao } from '@/lib/mail/imap'
import { ErroUsuario } from '@/lib/boletos-acoes'
import { lerJson, respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    return NextResponse.json({ contas: modoDemo() ? [] : await listarContas() })
  } catch (e) {
    return respostaErro(e, 'listar-contas')
  }
}

/** Salva a conta depois de testar a conexão de novo (a senha nunca volta para o navegador). */
export async function POST(req: Request) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const n = await lerJson(req, esquemaNovaConta)
    if (eContaDaEmpresa(n.email)) throw new ErroUsuario('A conta da empresa já é lida pelo resumo da nuvem. Cadastre só contas pessoais.')
    const t = await testarConexao(n)
    if (!t.ok) throw new ErroUsuario(t.erro)
    return NextResponse.json({ conta: await criarConta(n) })
  } catch (e) {
    if (e instanceof Error && /já está cadastrada/.test(e.message)) return NextResponse.json({ erro: e.message }, { status: 409 })
    return respostaErro(e, 'criar-conta')
  }
}
