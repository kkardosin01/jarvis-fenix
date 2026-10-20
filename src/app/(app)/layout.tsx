import { redirect } from 'next/navigation'
import { BarraNavegacao } from '@/components/navegacao'
import { ProvedorPainel } from '@/components/provedor'
import { RegistrarServiceWorker } from '@/components/service-worker'
import { auth } from '@/auth'
import { modoDemo, usuarioAtual } from '@/lib/acesso'

export const dynamic = 'force-dynamic'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const u = await usuarioAtual()
  if (!u) {
    // Logado com conta fora da lista → "não autorizado"; sem login → tela de entrar
    if (!modoDemo() && (await auth())?.user) redirect('/nao-autorizado')
    redirect('/login')
  }
  return (
    <ProvedorPainel chaveVapid={process.env.VAPID_PUBLIC_KEY ?? ''} email={u.email}>
      <RegistrarServiceWorker />
      <div className="mx-auto min-h-dvh max-w-2xl pb-28">{children}</div>
      <BarraNavegacao />
    </ProvedorPainel>
  )
}
