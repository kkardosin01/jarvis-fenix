import { signOut } from '@/auth'

export default function NaoAutorizado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-bold">Acesso não autorizado</h1>
      <p className="text-lg text-suave">
        Esta conta Google não tem permissão para usar o Jarvis Fênix. Entre com o e-mail cadastrado ou fale com o Pedro.
      </p>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}
      >
        <button className="min-h-14 w-full rounded-2xl border border-borda bg-superficie px-6 text-lg font-semibold">
          Entrar com outra conta
        </button>
      </form>
    </main>
  )
}
