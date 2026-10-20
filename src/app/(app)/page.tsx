'use client'

import { AlertTriangle, Building2, CalendarClock, Mail, RefreshCw, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { dataPorExtenso, formatarMoeda, saudacao } from 'jarvis-fenix-core/ptbr'
import { BannerNotificacoes } from '@/components/banner-notificacoes'
import { usePainel } from '@/components/provedor'
import { AvisoEstado, Botao, Cartao, Conteudo, Esqueleto, PuxarParaAtualizar, cx } from '@/components/ui'

function CartaoNumero({
  href,
  numero,
  rotulo,
  detalhe,
  Icone,
  tom,
  largo
}: {
  href: string
  numero: number
  rotulo: string
  detalhe?: string
  Icone: typeof Mail
  tom: 'perigo' | 'alerta' | 'neutro'
  largo?: boolean
}) {
  const destaque = numero > 0 && tom !== 'neutro'
  return (
    <Link
      href={href}
      className={cx(
        'flex min-h-32 flex-col justify-between gap-2 rounded-2xl border p-4 active:scale-[0.99]',
        largo && 'col-span-2 min-h-24',
        destaque && tom === 'perigo' && 'border-perigo/40 bg-perigo-suave',
        destaque && tom === 'alerta' && 'border-alerta/40 bg-alerta-suave',
        !destaque && 'border-borda bg-superficie'
      )}
    >
      <Icone size={26} aria-hidden className={cx(destaque && tom === 'perigo' && 'text-perigo', destaque && tom === 'alerta' && 'text-alerta', !destaque && 'text-primaria')} />
      <div>
        <p className="tabular text-4xl font-bold leading-none">{numero}</p>
        <p className="mt-1 text-base font-semibold leading-tight">{rotulo}</p>
        {detalhe && <p className="tabular text-sm text-suave">{detalhe}</p>}
      </div>
    </Link>
  )
}

export default function Hoje() {
  const { painel, atualizar, carregando, sincronizandoEmails } = usePainel()
  const dados = painel?.dados
  const hoje = dados?.contas.filter((c) => c.situacao === 'Vence hoje') ?? []
  const atrasados = dados?.contas.filter((c) => c.situacao === 'Atrasado') ?? []
  const valorHoje = hoje.reduce((s, c) => s + (c.valor ?? 0), 0)

  return (
    <PuxarParaAtualizar>
      <header className="pt-seguro flex items-start justify-between gap-3 px-4 pt-5">
        <div>
          <p suppressHydrationWarning className="text-base text-suave first-letter:uppercase">{dataPorExtenso()}</p>
          <h1 suppressHydrationWarning className="text-3xl font-bold">{saudacao()}, Tulio</h1>
        </div>
        <Link href="/configuracoes" aria-label="Configurações" className="flex size-12 items-center justify-center rounded-full border border-borda bg-superficie">
          <Settings size={24} aria-hidden />
        </Link>
      </header>

      <main className="flex flex-col gap-5 px-4 pt-4">
        <AvisoEstado />
        <Conteudo
          esqueleto={
            <>
              <div className="esqueleto h-20" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="esqueleto h-32" />
                ))}
              </div>
              <Esqueleto linhas={3} altura="h-16" />
            </>
          }
        >
          {dados && (
            <>
              <div>
                <p className="text-sm text-suave">
                  Atualizado em {dados.resumo.atualizadoEm || '—'}
                  {painel?.demo && ' · dados de demonstração'}
                </p>
                {dados.resumo.fraseDoDia && <p className="mt-2 text-xl leading-snug font-medium">{dados.resumo.fraseDoDia}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CartaoNumero
                  href="/contas?situacao=hoje"
                  numero={hoje.length}
                  rotulo={hoje.length === 1 ? 'Boleto vence hoje' : 'Boletos vencem hoje'}
                  detalhe={valorHoje > 0 ? formatarMoeda(valorHoje) : undefined}
                  Icone={CalendarClock}
                  tom="alerta"
                />
                <CartaoNumero href="/contas?situacao=atrasado" numero={atrasados.length} rotulo={atrasados.length === 1 ? 'Atrasado' : 'Atrasados'} Icone={AlertTriangle} tom="perigo" />
                <CartaoNumero href="/clientes" numero={dados.contatos.length} rotulo="Clientes para ligar" Icone={Users} tom="neutro" />
                <CartaoNumero href="/emails" numero={dados.resumo.emailsRelevantes ?? dados.emails.length} rotulo="E-mails que importam" Icone={Mail} tom="neutro" />
                <CartaoNumero
                  href="/prospeccao"
                  numero={dados.resumo.rascunhosProspeccao ?? 0}
                  rotulo="Rascunhos de prospecção"
                  Icone={Building2}
                  tom="neutro"
                  largo
                />
              </div>

              <BannerNotificacoes />

              {dados.prioridades.length > 0 && (
                <Cartao>
                  <h2 className="mb-3 text-xl font-bold">Prioridades de hoje</h2>
                  <ol className="flex flex-col gap-4">
                    {dados.prioridades.slice(0, 3).map((p, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="tabular flex size-9 shrink-0 items-center justify-center rounded-full bg-primaria text-lg font-bold text-primaria-texto">{i + 1}</span>
                        <div>
                          <p className="text-lg leading-snug font-semibold">{p.prioridade}</p>
                          {p.porQue && <p className="text-base text-suave">{p.porQue}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </Cartao>
              )}
            </>
          )}
        </Conteudo>

        <Botao onClick={() => void atualizar()} disabled={carregando}>
          <RefreshCw size={20} aria-hidden className={cx(carregando && 'animate-spin')} />
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </Botao>
        {sincronizandoEmails && <p className="text-center text-sm text-suave">Procurando boletos nos e-mails pessoais…</p>}
      </main>
    </PuxarParaAtualizar>
  )
}
