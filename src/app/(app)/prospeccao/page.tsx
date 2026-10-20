'use client'

import { Info, PenLine } from 'lucide-react'
import { RASCUNHOS_EMPRESA } from '@/core/links'
import { usePainel } from '@/components/provedor'
import { AvisoEstado, Cabecalho, Conteudo, Etiqueta, LinkBotao, PuxarParaAtualizar, Vazio } from '@/components/ui'

export default function Prospeccao() {
  const { painel } = usePainel()
  const prospects = painel?.dados.prospects ?? []
  return (
    <PuxarParaAtualizar>
      <Cabecalho titulo="Prospecção" subtitulo={painel ? `${prospects.length} ${prospects.length === 1 ? 'empresa' : 'empresas'}` : undefined} />
      <main className="flex flex-col gap-4 px-4 pt-4">
        <p className="flex gap-3 rounded-2xl border border-primaria/30 bg-primaria-suave p-4 text-base font-medium">
          <Info size={22} aria-hidden className="mt-0.5 shrink-0 text-primaria" />
          Os e-mails só saem depois que você revisar e enviar.
        </p>
        <LinkBotao variante="primaria" href={RASCUNHOS_EMPRESA} target="_blank" rel="noopener noreferrer">
          <PenLine size={20} aria-hidden /> Ver rascunhos no Gmail
        </LinkBotao>
        <AvisoEstado />
        <Conteudo>
          {prospects.length === 0 ? (
            <Vazio>Nenhum prospect novo. O próximo lote chega no próximo dia útil.</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {prospects.map((p, i) => (
                <li key={`${p.empresa}-${i}`} className="rounded-2xl border border-borda bg-superficie p-4">
                  <p className="text-lg leading-snug font-bold">{p.empresa}</p>
                  <p className="text-base text-suave">{[p.segmento, p.cidade].filter(Boolean).join(' · ')}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {p.situacao && <Etiqueta tom="primaria">{p.situacao}</Etiqueta>}
                    {p.data && <span className="tabular text-sm text-suave">desde {p.data}</span>}
                  </div>
                  {p.proximoPasso && (
                    <p className="mt-3 text-base">
                      <b>Próximo passo:</b> {p.proximoPasso}
                      {p.dataProximoPasso && <span className="tabular text-suave"> ({p.dataProximoPasso})</span>}
                    </p>
                  )}
                  {p.email && <p className="mt-1 text-sm break-all text-suave">{p.email}</p>}
                </li>
              ))}
            </ul>
          )}
        </Conteudo>
      </main>
    </PuxarParaAtualizar>
  )
}
