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
        <img src="/icones/icone-192.png" alt="" width={96} height={96} className="rounded-3xl" />
        <h1 className="text-3xl font-bold">Jarvis Fênix</h1>
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
