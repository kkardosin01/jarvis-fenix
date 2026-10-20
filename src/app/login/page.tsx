import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { usuarioAtual } from '@/lib/acesso'

export const dynamic = 'force-dynamic'

export default async function Login() {
  if (await usuarioAtual()) redirect('/')
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/fenix-emblema.png" alt="" width={160} height={143} />
        <p className="sobretitulo">Comercial Fênix</p>
        <h1 className="text-5xl">Jarvis Fênix</h1>
        <div className="linha-ouro w-40" aria-hidden />
        <p className="text-lg text-suave">Entre com a sua conta Google para ver o dia da Fênix.</p>
      </div>
      <form
        action={async () => {
          'use server'
          await signIn('google', { redirectTo: '/' })
        }}
      >
        <button className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primaria px-6 text-lg font-semibold text-primaria-texto">
          Entrar com Google
        </button>
      </form>
    </main>
  )
}
