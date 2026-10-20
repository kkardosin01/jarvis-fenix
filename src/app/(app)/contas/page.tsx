'use client'

import { CheckCircle2, ExternalLink, Plus } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { encontrarLinhasDigitaveis, formatarLinhaDigitavel } from 'jarvis-fenix-core/boleto-codigo'
import { linkEmailDaConta } from 'jarvis-fenix-core/links'
import { formatarDiaMes, formatarMoeda, hojeISO, parseNumeroBR } from 'jarvis-fenix-core/ptbr'
import type { Conta } from 'jarvis-fenix-core/types'
import { usePainel } from '@/components/provedor'
import {
  AvisoEstado,
  Botao,
  BotaoCopiar,
  Cabecalho,
  Campo,
  Chips,
  Conteudo,
  Etiqueta,
  Modal,
  PuxarParaAtualizar,
  Vazio,
  classeEntrada,
  cx
} from '@/components/ui'
import { origemFiltro, rotuloOrigem, tomSituacao } from '@/lib/visao'

type FiltroSituacao = 'todas' | 'atrasado' | 'hoje' | 'proximos'
type FiltroConta = 'todas' | 'PJ' | 'PF'

const SITUACOES: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'atrasado', rotulo: 'Atrasadas' },
  { valor: 'hoje', rotulo: 'Vencem hoje' },
  { valor: 'proximos', rotulo: 'Próximos dias' }
]

function bateSituacao(c: Conta, f: FiltroSituacao): boolean {
  if (f === 'todas') return true
  if (f === 'atrasado') return c.situacao === 'Atrasado' || c.situacao === 'Vencido há mais de 30 dias'
  if (f === 'hoje') return c.situacao === 'Vence hoje'
  return c.situacao === 'Próximos dias'
}

/** Linha digitável: a já validada, ou a primeira válida dentro do texto "como pagar". */
function linhaDaConta(c: Conta): string | null {
  if (c.linhaDigitavel) return c.linhaDigitavel
  if (!c.comoPagar) return null
  return encontrarLinhasDigitaveis(c.comoPagar, c.vencimento ?? hojeISO())[0]?.linha ?? null
}

function ItemConta({ c, aoPagar }: { c: Conta; aoPagar: (c: Conta) => void }) {
  const linha = linhaDaConta(c)
  const link = linkEmailDaConta(c)
  const textoComoPagar = !linha && !c.pix && c.comoPagar ? c.comoPagar : ''
  return (
    <li className="rounded-2xl border border-borda bg-superficie p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg leading-snug font-bold break-words">{c.beneficiario || 'Sem beneficiário'}</p>
          <p className="text-base text-suave">
            {rotuloOrigem(origemFiltro(c))}
            {c.conta && ` · ${c.conta}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {c.valor !== null ? (
            <p className="tabular text-2xl font-bold">{formatarMoeda(c.valor)}</p>
          ) : link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-primaria underline">
              ver PDF
            </a>
          ) : (
            <p className="text-lg font-semibold text-suave">ver PDF</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Etiqueta tom={tomSituacao(c.situacao)}>{c.situacao ?? 'Sem data'}</Etiqueta>
        <span className="tabular text-base font-semibold">vence {formatarDiaMes(c.vencimento)}</span>
      </div>
      {(c.observacao || textoComoPagar) && (
        <p className="mt-2 text-base break-words text-suave">{[textoComoPagar, c.observacao].filter(Boolean).join(' · ')}</p>
      )}
      {linha && <p className="tabular mt-2 font-mono text-sm break-all text-suave">{formatarLinhaDigitavel(linha)}</p>}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {linha && <BotaoCopiar texto={linha} rotulo="Copiar linha digitável" />}
        {c.pix && <BotaoCopiar texto={c.pix} rotulo="Copiar PIX" />}
        {link && c.valor !== null && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-borda px-4 font-semibold">
            <ExternalLink size={20} aria-hidden /> Abrir e-mail
          </a>
        )}
        <Botao onClick={() => aoPagar(c)}>
          <CheckCircle2 size={20} aria-hidden /> Marcar como pago
        </Botao>
      </div>
    </li>
  )
}

function FormLancar({ aoFechar }: { aoFechar: () => void }) {
  const { api, atualizar } = usePainel()
  const [vencimento, setVencimento] = useState(hojeISO())
  const [beneficiario, setBeneficiario] = useState('')
  const [valor, setValor] = useState('')
  const [conta, setConta] = useState<'PJ' | 'PF'>('PJ')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const v = valor.trim() ? parseNumeroBR(valor) : null
        if (valor.trim() && (v === null || v <= 0)) return setErro('Valor inválido. Use, por exemplo, 1.234,56')
        setSalvando(true)
        setErro(null)
        try {
          await api('/api/boletos', { method: 'POST', body: JSON.stringify({ vencimento, beneficiario, valor: v, conta, observacao }) })
          await atualizar()
          aoFechar()
        } catch (err) {
          setErro((err as Error).message)
        } finally {
          setSalvando(false)
        }
      }}
    >
      <Campo rotulo="Vencimento">
        <input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={classeEntrada} />
      </Campo>
      <Campo rotulo="Quem vai receber (beneficiário)">
        <input required minLength={2} maxLength={80} value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} className={classeEntrada} placeholder="Ex.: Celesc" />
      </Campo>
      <Campo rotulo="Valor (R$)" dica="Pode deixar em branco se não souber.">
        <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={cx(classeEntrada, 'tabular')} placeholder="0,00" />
      </Campo>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-base font-semibold">Conta</legend>
        <Chips
          rotulo="Conta"
          valor={conta}
          aoMudar={setConta}
          opcoes={[
            { valor: 'PJ', rotulo: 'PJ (empresa)' },
            { valor: 'PF', rotulo: 'PF (pessoal)' }
          ]}
        />
      </fieldset>
      <Campo rotulo="Observação (opcional)">
        <input maxLength={200} value={observacao} onChange={(e) => setObservacao(e.target.value)} className={classeEntrada} />
      </Campo>
      {erro && (
        <p role="alert" className="text-base font-semibold text-perigo">
          {erro}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Botao type="button" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primaria" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Lançar'}
        </Botao>
      </div>
    </form>
  )
}

function ConfirmarPago({ conta, aoFechar }: { conta: Conta; aoFechar: () => void }) {
  const { api, atualizar } = usePainel()
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">
        <b>{conta.beneficiario || 'Este boleto'}</b>, vence {formatarDiaMes(conta.vencimento)}
        {conta.valor !== null && <> — {formatarMoeda(conta.valor)}</>}. Ele some da lista.
      </p>
      {erro && (
        <p role="alert" className="text-base font-semibold text-perigo">
          {erro}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Botao onClick={aoFechar}>Cancelar</Botao>
        <Botao
          variante="primaria"
          disabled={salvando}
          onClick={async () => {
            setSalvando(true)
            setErro(null)
            try {
              await api('/api/boletos/pagar', { method: 'POST', body: JSON.stringify({ chave: conta.chave }) })
              await atualizar()
              aoFechar()
            } catch (e) {
              setErro((e as Error).message)
            } finally {
              setSalvando(false)
            }
          }}
        >
          {salvando ? 'Salvando…' : 'Já paguei'}
        </Botao>
      </div>
    </div>
  )
}

function TelaContas() {
  const { painel } = usePainel()
  const params = useSearchParams()
  const inicial = params.get('situacao')
  const [situacao, setSituacao] = useState<FiltroSituacao>(inicial === 'hoje' || inicial === 'atrasado' || inicial === 'proximos' ? inicial : 'todas')
  const [origem, setOrigem] = useState('todas')
  const [conta, setConta] = useState<FiltroConta>('todas')
  const [lancando, setLancando] = useState(false)
  const [pagando, setPagando] = useState<Conta | null>(null)

  const contas = useMemo(() => painel?.dados.contas ?? [], [painel])
  const origens = useMemo(() => {
    const set = new Set(contas.map(origemFiltro))
    const ordem = ['Empresa', ...[...set].filter((o) => o !== 'Empresa' && o !== 'Lançado à mão').sort(), 'Lançado à mão']
    return [{ valor: 'todas', rotulo: 'Todas' }, ...ordem.filter((o) => set.has(o)).map((o) => ({ valor: o, rotulo: rotuloOrigem(o) }))]
  }, [contas])

  const lista = contas
    .filter((c) => bateSituacao(c, situacao) && (origem === 'todas' || origemFiltro(c) === origem) && (conta === 'todas' || c.conta === conta))
    .sort((a, b) => (a.vencimento ?? '9999').localeCompare(b.vencimento ?? '9999'))
  const total = lista.reduce((s, c) => s + (c.valor ?? 0), 0)
  const semValor = lista.filter((c) => c.valor === null).length

  return (
    <PuxarParaAtualizar>
      <Cabecalho
        titulo="Contas a pagar"
        subtitulo={painel ? `${lista.length} ${lista.length === 1 ? 'conta' : 'contas'}` : undefined}
        direita={
          <Botao variante="primaria" onClick={() => setLancando(true)}>
            <Plus size={20} aria-hidden /> Lançar boleto
          </Botao>
        }
      />
      <main className="flex flex-col gap-4 px-4 pt-4">
        <AvisoEstado />
        <Conteudo>
          <div className="flex flex-col gap-2">
            <Chips rotulo="Situação" opcoes={SITUACOES} valor={situacao} aoMudar={setSituacao} />
            {origens.length > 2 && <Chips rotulo="Origem" opcoes={origens} valor={origem} aoMudar={setOrigem} />}
            <Chips
              rotulo="PJ ou PF"
              valor={conta}
              aoMudar={setConta}
              opcoes={[
                { valor: 'todas', rotulo: 'PJ e PF' },
                { valor: 'PJ', rotulo: 'Só PJ' },
                { valor: 'PF', rotulo: 'Só PF' }
              ]}
            />
          </div>
          {lista.length > 0 && (
            <p className="tabular text-base text-suave">
              Total com valor conhecido: <b className="text-texto">{formatarMoeda(total)}</b>
              {semValor > 0 && ` · ${semValor} no PDF`}
            </p>
          )}
          {lista.length === 0 ? (
            <Vazio>{situacao === 'hoje' ? 'Nenhuma conta para hoje.' : situacao === 'atrasado' ? 'Nenhuma conta atrasada.' : 'Nenhuma conta por aqui.'}</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {lista.map((c) => (
                <ItemConta key={c.chave} c={c} aoPagar={setPagando} />
              ))}
            </ul>
          )}
        </Conteudo>
      </main>

      <Modal aberto={lancando} aoFechar={() => setLancando(false)} titulo="Lançar boleto">
        {lancando && <FormLancar aoFechar={() => setLancando(false)} />}
      </Modal>
      <Modal aberto={!!pagando} aoFechar={() => setPagando(null)} titulo="Marcar como pago?">
        {pagando && <ConfirmarPago conta={pagando} aoFechar={() => setPagando(null)} />}
      </Modal>
    </PuxarParaAtualizar>
  )
}

export default function Contas() {
  return (
    <Suspense>
      <TelaContas />
    </Suspense>
  )
}
