'use client'

import { Building2, Home, Mail, Receipt, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from './ui'

const ABAS = [
  { href: '/', rotulo: 'Hoje', Icone: Home },
  { href: '/contas', rotulo: 'Contas', Icone: Receipt },
  { href: '/clientes', rotulo: 'Clientes', Icone: Users },
  { href: '/emails', rotulo: 'E-mails', Icone: Mail },
  { href: '/prospeccao', rotulo: 'Prospecção', Icone: Building2 }
] as const

export function BarraNavegacao() {
  const atual = usePathname()
  return (
    <nav aria-label="Telas" className="pb-seguro fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie/95 backdrop-blur">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {ABAS.map(({ href, rotulo, Icone }) => {
          const ativo = href === '/' ? atual === '/' : atual.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={cx(
                  'flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 text-[0.7rem] font-semibold tracking-tight',
                  ativo ? 'text-primaria' : 'text-suave'
                )}
              >
                <Icone size={26} strokeWidth={ativo ? 2.5 : 2} aria-hidden />
                {rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
