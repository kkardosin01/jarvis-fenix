'use client'

import { MessageCircle, Phone } from 'lucide-react'
import { linksWhatsApp, normalizarTelefone } from '@/core/whatsapp'
import { usePainel } from '@/components/provedor'
import { AvisoEstado, BotaoCopiar, Cabecalho, Conteudo, Etiqueta, LinkBotao, PuxarParaAtualizar, Vazio } from '@/components/ui'

export default function Clientes() {
  const { painel } = usePainel()
  const contatos = [...(painel?.dados.contatos ?? [])].sort((a, b) => (b.diasSemComprar ?? 0) - (a.diasSemComprar ?? 0))
  return (
    <PuxarParaAtualizar>
      <Cabecalho titulo="Clientes para ligar" subtitulo={painel ? `${contatos.length} na lista de hoje` : undefined} />
      <main className="flex flex-col gap-4 px-4 pt-4">
        <AvisoEstado />
        <Conteudo>
          {contatos.length === 0 ? (
            <Vazio>Nenhum cliente para ligar hoje.</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {contatos.map((c, i) => {
                const wa = c.telefone ? linksWhatsApp(c.telefone, c.mensagemSugerida) : null
                const digitos = c.telefone.replace(/\D/g, '')
                const internacional = normalizarTelefone(c.telefone)
                return (
                  <li key={`${c.cliente}-${i}`} className="rounded-2xl border border-borda bg-superficie p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg leading-snug font-bold">{c.cliente}</p>
                        <p className="text-base text-suave">{[c.contato, c.cidade].filter(Boolean).join(' · ')}</p>
                      </div>
                      {c.diasSemComprar !== null && (
                        <div className="shrink-0 text-right">
                          <p className="tabular text-3xl leading-none font-bold">{c.diasSemComprar}</p>
                          <p className="text-sm text-suave">dias sem comprar</p>
                        </div>
                      )}
                    </div>
                    {c.motivo && (
                      <div className="mt-2">
                        <Etiqueta tom="primaria">{c.motivo}</Etiqueta>
                      </div>
                    )}
                    {c.mensagemSugerida && <p className="mt-3 rounded-xl bg-superficie-2 p-3 text-base">“{c.mensagemSugerida}”</p>}
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {wa && (
                        <LinkBotao variante="primaria" href={wa.web} target="_blank" rel="noopener noreferrer">
                          <MessageCircle size={20} aria-hidden /> Abrir no WhatsApp
                        </LinkBotao>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {digitos.length >= 8 && (
                          <LinkBotao href={`tel:${internacional ? `+${internacional}` : digitos}`}>
                            <Phone size={20} aria-hidden /> Ligar
                          </LinkBotao>
                        )}
                        {c.mensagemSugerida && <BotaoCopiar texto={c.mensagemSugerida} rotulo="Copiar mensagem" className={digitos.length >= 8 ? '' : 'col-span-2'} />}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Conteudo>
      </main>
    </PuxarParaAtualizar>
  )
}
