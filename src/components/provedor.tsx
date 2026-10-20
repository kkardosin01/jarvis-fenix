'use client'

// Estado do painel compartilhado entre as telas: busca, cache local (sem internet) e sincronização de e-mails.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { RespostaPainel } from '@/lib/tipos'

const CHAVE_CACHE = 'jarvis:painel'
const TRINTA_MIN = 30 * 60_000

interface EstadoPainel {
  painel: RespostaPainel | null
  carregando: boolean
  erro: string | null
  /** Mostrando o último resumo salvo porque a internet caiu. */
  offline: boolean
  sincronizandoEmails: boolean
  chaveVapid: string
  email: string
  atualizar: () => Promise<void>
  sincronizarEmails: () => Promise<void>
  /** Chamadas à API com tratamento de erro em português. */
  api: <T = unknown>(url: string, init?: RequestInit) => Promise<T>
}

const Contexto = createContext<EstadoPainel | null>(null)

export function usePainel(): EstadoPainel {
  const c = useContext(Contexto)
  if (!c) throw new Error('usePainel fora do ProvedorPainel')
  return c
}

function lerCache(): RespostaPainel | null {
  try {
    const s = localStorage.getItem(CHAVE_CACHE)
    return s ? (JSON.parse(s) as RespostaPainel) : null
  } catch {
    return null
  }
}

export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function chamar<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response
  try {
    r = await fetch(url, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      cache: 'no-store'
    })
  } catch {
    throw new ErroApi('Sem internet. Confira a conexão e tente de novo.', 0)
  }
  if (r.status === 401) {
    // Recarga completa de propósito: descarta o estado do app ao perder a sessão
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login'
    throw new ErroApi('Sua sessão terminou. Entre de novo.', 401)
  }
  const corpo = (await r.json().catch(() => ({}))) as { erro?: string }
  if (!r.ok) throw new ErroApi(corpo.erro ?? 'Algo deu errado. Tente de novo.', r.status)
  return corpo as T
}

/** Ao sair: apaga o resumo guardado neste aparelho (localStorage e cache do service worker). */
export async function limparDadosLocais(): Promise<void> {
  try {
    localStorage.removeItem(CHAVE_CACHE)
  } catch {
    /* nada a limpar */
  }
  navigator.serviceWorker?.controller?.postMessage('limpar')
  if ('caches' in window) {
    const ks = await caches.keys()
    await Promise.all(ks.map((k) => caches.delete(k)))
  }
}

export function ProvedorPainel({ children, chaveVapid, email }: { children: React.ReactNode; chaveVapid: string; email: string }) {
  const [painel, setPainel] = useState<RespostaPainel | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [sincronizandoEmails, setSincronizando] = useState(false)
  const emAndamento = useRef(false)
  const syncFeito = useRef(false)

  const atualizar = useCallback(async () => {
    if (emAndamento.current) return
    emAndamento.current = true
    setCarregando(true)
    try {
      const p = await chamar<RespostaPainel & { offlineCache?: boolean }>('/api/painel')
      setPainel(p)
      setErro(null)
      // O service worker devolve o último resumo salvo quando não há internet
      setOffline(!!p.offlineCache)
      if (p.offlineCache) return
      try {
        localStorage.setItem(CHAVE_CACHE, JSON.stringify(p))
      } catch {
        /* cheio ou bloqueado: segue sem cache */
      }
    } catch (e) {
      const err = e as ErroApi
      if (err.status === 0) setOffline(true)
      setErro(err.message)
    } finally {
      emAndamento.current = false
      setCarregando(false)
    }
  }, [])

  const sincronizar = useCallback(
    async (seAntigo: boolean) => {
      setSincronizando(true)
      try {
        const r = await chamar<{ novos: number }>('/api/sync', { method: 'POST', body: JSON.stringify({ seAntigo }) })
        if (r.novos > 0 || !seAntigo) await atualizar()
      } finally {
        setSincronizando(false)
      }
    },
    [atualizar]
  )

  // Primeira carga: mostra o cache na hora e busca o novo
  useEffect(() => {
    void Promise.resolve().then(() => {
      const cache = lerCache()
      if (cache) setPainel((atual) => atual ?? cache)
      return atualizar()
    })
  }, [atualizar])

  // Ao abrir o app: sincroniza os e-mails pessoais se a última vez foi há mais de 30 minutos
  useEffect(() => {
    if (!painel || painel.demo || syncFeito.current) return
    syncFeito.current = true
    const ultima = painel.ultimaSyncEmails
    if (ultima !== null && Date.now() - ultima <= TRINTA_MIN) return
    // Espera a tela assentar antes de começar a leitura (pode levar um minuto)
    const t = setTimeout(() => void sincronizar(true).catch(() => undefined), 1500)
    return () => clearTimeout(t)
  }, [painel, sincronizar])

  // Volta para o app depois de um tempo, ou a internet volta → atualiza
  useEffect(() => {
    const aoVoltar = (): void => {
      if (document.visibilityState !== 'visible') return
      const lido = painel?.lidoEm ?? 0
      if (Date.now() - lido > 5 * 60_000) void atualizar()
    }
    const aoReconectar = (): void => void atualizar()
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('online', aoReconectar)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('online', aoReconectar)
    }
  }, [painel, atualizar])

  const valor = useMemo<EstadoPainel>(
    () => ({
      painel,
      carregando,
      erro,
      offline,
      sincronizandoEmails,
      chaveVapid,
      email,
      atualizar,
      sincronizarEmails: () => sincronizar(false),
      api: chamar
    }),
    [painel, carregando, erro, offline, sincronizandoEmails, chaveVapid, email, atualizar, sincronizar]
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
