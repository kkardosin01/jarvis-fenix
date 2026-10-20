import { NextResponse } from 'next/server'
import { exigirUsuario } from '@/lib/acesso'
import { ErroUsuario } from '@/lib/boletos-acoes'
import { alterarConta, configImapDaConta, removerConta } from '@/lib/contas-email'
import { esquemaAlterarConta, esquemaId } from '@/lib/esquemas'
import { testarConexao } from '@/lib/mail/imap'
import { lerJson, respostaErro } from '@/lib/rota'

export const runtime = 'nodejs'
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

async function idValido(ctx: Ctx): Promise<string> {
  const { id } = await ctx.params
  if (!esquemaId.safeParse(id).success) throw new ErroUsuario('Conta inválida')
  return id
}

/** Pausar/retomar, trocar apelido, PF/PJ ou senha (a senha nova é testada antes de salvar). */
export async function PATCH(req: Request, ctx: Ctx) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    const id = await idValido(ctx)
    const a = await lerJson(req, esquemaAlterarConta)
    if (a.senha) {
      const cfg = await configImapDaConta(id)
      if (!cfg) throw new ErroUsuario('Conta não encontrada')
      const t = await testarConexao({ ...cfg, senha: a.senha })
      if (!t.ok) throw new ErroUsuario(t.erro)
    }
    return NextResponse.json({ conta: await alterarConta(id, a) })
  } catch (e) {
    return respostaErro(e, 'alterar-conta')
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const u = await exigirUsuario()
  if (u instanceof NextResponse) return u
  try {
    await removerConta(await idValido(ctx))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return respostaErro(e, 'remover-conta')
  }
}
