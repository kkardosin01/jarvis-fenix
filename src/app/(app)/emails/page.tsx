'use client'

import { ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GMAIL_EMPRESA } from '@/core/links'
import { usePainel } from '@/components/provedor'
import { AvisoEstado, Cabecalho, Chips, Conteudo, Etiqueta, LinkBotao, PuxarParaAtualizar, Vazio } from '@/components/ui'
import { pesoUrgencia, urgenciaTom } from '@/lib/visao'

export default function Emails() {
  const { painel } = usePainel()
  const [categoria, setCategoria] = useState('todas')
  const emails = useMemo(() => [...(painel?.dados.emails ?? [])].sort((a, b) => pesoUrgencia(a.urgencia) - pesoUrgencia(b.urgencia)), [painel])
  const categorias = useMemo(
    () => [{ valor: 'todas', rotulo: 'Todas' }, ...[...new Set(emails.map((e) => e.categoria).filter(Boolean))].sort().map((c) => ({ valor: c, rotulo: c }))],
    [emails]
  )
  const lista = emails.filter((e) => categoria === 'todas' || e.categoria === categoria)

  return (
    <PuxarParaAtualizar>
      <Cabecalho
        titulo="E-mails"
        subtitulo={painel ? `${emails.length} que importam` : undefined}
        direita={
          <LinkBotao href={GMAIL_EMPRESA} target="_blank" rel="noopener noreferrer" aria-label="Abrir Gmail da empresa">
            <ExternalLink size={20} aria-hidden /> Gmail
          </LinkBotao>
        }
      />
      <main className="flex flex-col gap-4 px-4 pt-4">
        <AvisoEstado />
        <Conteudo>
          {categorias.length > 2 && <Chips rotulo="Categoria" opcoes={categorias} valor={categoria} aoMudar={setCategoria} />}
          {lista.length === 0 ? (
            <Vazio>Nenhum e-mail importante por enquanto.</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {lista.map((e, i) => (
                <li key={`${e.assunto}-${i}`} className="rounded-2xl border border-borda bg-superficie p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {e.urgencia && <Etiqueta tom={urgenciaTom(e.urgencia)}>{e.urgencia}</Etiqueta>}
                    {e.categoria && <Etiqueta>{e.categoria}</Etiqueta>}
                    {e.recebidoEm && <span className="tabular text-sm text-suave">{e.recebidoEm}</span>}
                  </div>
                  <p className="mt-2 text-base font-semibold text-suave">{e.remetente}</p>
                  <p className="text-lg leading-snug font-bold">{e.assunto}</p>
                  {e.resumo && <p className="mt-1 text-base">{e.resumo}</p>}
                  {e.acao && (
                    <p className="mt-3 rounded-xl bg-primaria-suave p-3 text-base">
                      <b className="text-primaria">O que fazer:</b> {e.acao}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <LinkBotao variante="primaria" href={GMAIL_EMPRESA} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={20} aria-hidden /> Abrir Gmail da empresa
          </LinkBotao>
        </Conteudo>
      </main>
    </PuxarParaAtualizar>
  )
}
