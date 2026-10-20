'use client'

// Inscrição em Web Push. No iPhone só funciona com o app na Tela de Início (iOS 16.4+).

export type SituacaoPush = 'carregando' | 'sem-suporte' | 'precisa-instalar' | 'bloqueada' | 'desligada' | 'ligada'

export function eIOS(): boolean {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return false
  // iPad recente se apresenta como Mac com tela de toque
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function instalado(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

export async function situacaoPush(): Promise<SituacaoPush> {
  if (eIOS() && !instalado()) return 'precisa-instalar'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'sem-suporte'
  if (Notification.permission === 'denied') return 'bloqueada'
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'ligada' : 'desligada'
}

function base64ParaBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bruto = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(bruto.length))
  for (let i = 0; i < bruto.length; i++) out[i] = bruto.charCodeAt(i)
  return out
}

function nomeAparelho(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac/.test(ua)) return 'Mac'
  return 'Outro'
}

export async function ligarPush(chaveVapid: string): Promise<void> {
  if (!chaveVapid) throw new Error('As notificações ainda não foram configuradas no servidor.')
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error('Permissão negada. Libere as notificações nas configurações do aparelho.')
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chaveVapid) }))
  const r = await fetch('/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inscricao: sub.toJSON(), aparelho: nomeAparelho() })
  })
  if (!r.ok) throw new Error('Não foi possível ligar as notificações. Tente de novo.')
}

export async function desligarPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await fetch('/api/push', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
  await sub.unsubscribe()
}
