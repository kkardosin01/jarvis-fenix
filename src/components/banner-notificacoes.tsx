'use client'

import { Bell, Share, SquarePlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ligarPush, situacaoPush, type SituacaoPush } from './notificacoes'
import { usePainel } from './provedor'
import { Botao } from './ui'

/** Mostra "Ativar notificações" até o usuário aceitar. No iPhone, explica a Tela de Início antes. */
export function BannerNotificacoes() {
  const { chaveVapid } = usePainel()
  const [s, setS] = useState<SituacaoPush>('carregando')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    situacaoPush()
      .then(setS)
      .catch(() => setS('sem-suporte'))
  }, [])

  if (s === 'carregando' || s === 'ligada' || s === 'sem-suporte') return null

  if (s === 'precisa-instalar') {
    return (
      <section className="rounded-2xl border border-primaria/30 bg-primaria-suave p-4">
        <p className="flex items-center gap-2 text-lg font-bold text-primaria">
          <Bell size={22} aria-hidden /> Quer receber o resumo às 9h?
        </p>
        <p className="mt-2 text-base">No iPhone, as notificações só funcionam com o Jarvis na Tela de Início:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-6 text-base">
          <li>
            Toque em <Share size={18} className="inline align-text-bottom" aria-label="Compartilhar" /> <b>Compartilhar</b> (no Safari).
          </li>
          <li>
            Escolha <SquarePlus size={18} className="inline align-text-bottom" aria-hidden /> <b>Adicionar à Tela de Início</b>.
          </li>
          <li>Abra o Jarvis pelo ícone novo e toque em “Ativar notificações”.</li>
        </ol>
      </section>
    )
  }

  if (s === 'bloqueada') {
    return (
      <section className="rounded-2xl border border-borda bg-superficie p-4 text-base">
        <p className="font-semibold">As notificações estão bloqueadas neste aparelho.</p>
        <p className="text-suave">Libere em Ajustes do aparelho → Notificações → Jarvis (ou nas permissões do site no Chrome).</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-primaria/30 bg-primaria-suave p-4">
      <p className="flex items-center gap-2 text-lg font-bold text-primaria">
        <Bell size={22} aria-hidden /> Receba o resumo do dia às 9h
      </p>
      <Botao
        variante="primaria"
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true)
          setErro(null)
          try {
            await ligarPush(chaveVapid)
            setS('ligada')
          } catch (e) {
            setErro((e as Error).message)
            setS(await situacaoPush())
          } finally {
            setOcupado(false)
          }
        }}
      >
        {ocupado ? 'Ativando…' : 'Ativar notificações'}
      </Botao>
      {erro && <p className="text-base text-perigo">{erro}</p>}
    </section>
  )
}
