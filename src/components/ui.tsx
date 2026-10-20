'use client'

// Peças de interface: letras grandes, alvos de toque ≥ 44px, poucas cores.

import { Check, Copy, RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { horaMinuto } from 'jarvis-fenix-core/ptbr'
import { usePainel } from './provedor'

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

export function Cabecalho({ titulo, subtitulo, direita }: { titulo: string; subtitulo?: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <header className="pt-seguro sticky top-0 z-20 border-b border-borda bg-fundo/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{titulo}</h1>
          {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
        </div>
        {direita && <div className="flex shrink-0 items-center gap-2">{direita}</div>}
      </div>
    </header>
  )
}

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'fantasma'

export function Botao({
  variante = 'secundaria',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition active:scale-[0.98] disabled:opacity-50',
        variante === 'primaria' && 'bg-primaria text-primaria-texto',
        variante === 'secundaria' && 'border border-borda bg-superficie text-texto',
        variante === 'perigo' && 'border border-perigo/40 bg-perigo-suave text-perigo',
        variante === 'fantasma' && 'text-primaria',
        className
      )}
    >
      {children}
    </button>
  )
}

export function LinkBotao({
  variante = 'secundaria',
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variante?: Variante }) {
  return (
    <a
      {...props}
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold',
        variante === 'primaria' && 'bg-primaria text-primaria-texto',
        variante === 'secundaria' && 'border border-borda bg-superficie text-texto',
        variante === 'fantasma' && 'text-primaria',
        className
      )}
    >
      {children}
    </a>
  )
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Navegadores antigos / sem permissão
    const t = document.createElement('textarea')
    t.value = texto
    t.style.position = 'fixed'
    t.style.opacity = '0'
    document.body.appendChild(t)
    t.select()
    const ok = document.execCommand('copy')
    t.remove()
    return ok
  }
}

export function BotaoCopiar({ texto, rotulo, className }: { texto: string; rotulo: string; className?: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <Botao
      className={className}
      onClick={async () => {
        if (await copiarTexto(texto)) {
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        }
      }}
      aria-live="polite"
    >
      {copiado ? <Check size={20} aria-hidden /> : <Copy size={20} aria-hidden />}
      {copiado ? 'Copiado!' : rotulo}
    </Botao>
  )
}

export function Cartao({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cx('rounded-2xl border border-borda bg-superficie p-4', className)}>{children}</section>
}

type Tom = 'perigo' | 'alerta' | 'neutro' | 'ok' | 'primaria'

export function Etiqueta({ tom = 'neutro', children }: { tom?: Tom; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
        tom === 'perigo' && 'bg-perigo-suave text-perigo',
        tom === 'alerta' && 'bg-alerta-suave text-alerta',
        tom === 'neutro' && 'bg-superficie-2 text-suave',
        tom === 'ok' && 'bg-ok-suave text-ok',
        tom === 'primaria' && 'bg-primaria-suave text-primaria'
      )}
    >
      {children}
    </span>
  )
}

export function Chips<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo
}: {
  opcoes: { valor: T; rotulo: string }[]
  valor: T
  aoMudar: (v: T) => void
  rotulo: string
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => aoMudar(o.valor)}
          className={cx(
            'min-h-11 shrink-0 rounded-full border px-4 text-base font-medium',
            valor === o.valor ? 'border-primaria bg-primaria text-primaria-texto' : 'border-borda bg-superficie text-texto'
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Esqueleto({ linhas = 4, altura = 'h-28' }: { linhas?: number; altura?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className={cx('esqueleto', altura)} />
      ))}
    </div>
  )
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-borda px-4 py-10 text-center text-lg text-suave">{children}</p>
}

export function CaixaErro({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-perigo/40 bg-perigo-suave p-4 text-perigo">
      <p className="text-lg font-semibold">{mensagem}</p>
      {aoTentar && (
        <Botao onClick={aoTentar} className="self-start">
          <RefreshCw size={20} aria-hidden /> Tentar de novo
        </Botao>
      )}
    </div>
  )
}

/** Aviso de sem internet / erro, mostrando de quando são os dados na tela. */
export function AvisoEstado() {
  const { offline, erro, painel, atualizar } = usePainel()
  if (offline && painel) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl bg-alerta-suave p-3 text-alerta">
        <WifiOff size={22} aria-hidden className="shrink-0" />
        <p className="font-medium">Sem internet — mostrando o resumo salvo às {horaMinuto(painel.lidoEm)}.</p>
      </div>
    )
  }
  if (erro && painel) return <CaixaErro mensagem={erro} aoTentar={() => void atualizar()} />
  return null
}

/** Conteúdo padrão de uma tela: esqueleto, erro sem dados ou o conteúdo. */
export function Conteudo({ children, esqueleto }: { children: React.ReactNode; esqueleto?: React.ReactNode }) {
  const { painel, erro, atualizar } = usePainel()
  if (!painel) {
    if (erro) return <CaixaErro mensagem={erro} aoTentar={() => void atualizar()} />
    return <>{esqueleto ?? <Esqueleto />}</>
  }
  return <>{children}</>
}

/** Puxar para atualizar (toque) — o botão "Atualizar" faz o mesmo. */
export function PuxarParaAtualizar({ children }: { children: React.ReactNode }) {
  const { atualizar, carregando } = usePainel()
  const [puxado, setPuxado] = useState(0)
  const inicio = useRef<number | null>(null)
  const LIMITE = 80

  useEffect(() => {
    const aoTocar = (e: TouchEvent): void => {
      inicio.current = window.scrollY <= 0 ? (e.touches[0]?.clientY ?? null) : null
    }
    const aoMover = (e: TouchEvent): void => {
      if (inicio.current === null) return
      const d = (e.touches[0]?.clientY ?? 0) - inicio.current
      setPuxado(d > 0 ? Math.min(d * 0.5, LIMITE + 20) : 0)
    }
    const aoSoltar = (): void => {
      setPuxado((p) => {
        if (p >= LIMITE) void atualizar()
        return 0
      })
      inicio.current = null
    }
    window.addEventListener('touchstart', aoTocar, { passive: true })
    window.addEventListener('touchmove', aoMover, { passive: true })
    window.addEventListener('touchend', aoSoltar)
    return () => {
      window.removeEventListener('touchstart', aoTocar)
      window.removeEventListener('touchmove', aoMover)
      window.removeEventListener('touchend', aoSoltar)
    }
  }, [atualizar])

  const mostrar = puxado > 10 || carregando
  return (
    <>
      <div
        aria-hidden
        className="flex justify-center overflow-hidden text-primaria transition-[height]"
        style={{ height: carregando ? 40 : puxado / 2 }}
      >
        {mostrar && <RefreshCw size={24} className={cx('mt-2', (carregando || puxado >= LIMITE) && 'animate-spin')} />}
      </div>
      {children}
    </>
  )
}

/** Janela modal simples com <dialog>. */
export function Modal({ aberto, aoFechar, titulo, children }: { aberto: boolean; aoFechar: () => void; titulo: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])
  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-label={titulo}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-borda bg-superficie p-0 text-texto backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      <div className="pb-seguro p-5">
        <h2 className="mb-4 text-2xl font-bold">{titulo}</h2>
        {children}
      </div>
    </dialog>
  )
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-base font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="text-sm text-suave">{dica}</span>}
    </label>
  )
}

export const classeEntrada =
  'min-h-12 w-full rounded-xl border border-borda bg-fundo px-3 text-lg text-texto placeholder:text-suave/70 focus:border-primaria'
