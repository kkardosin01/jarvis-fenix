// Web Push (VAPID). Inscrições na tabela push_inscricoes; 404/410 = inscrição morta, removemos.

import 'server-only'
import webpush from 'web-push'
import { supabase } from './supabase'

export interface MensagemPush {
  titulo: string
  corpo: string
  /** Tela que abre ao tocar. */
  url: string
  tag?: string
}

export interface InscricaoPush {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

function configurar(): void {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) throw new Error('Chaves VAPID não configuradas')
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:fenix.hospitalares@gmail.com', pub, priv)
}

export async function salvarInscricao(i: InscricaoPush, email: string, aparelho: string): Promise<void> {
  const { error } = await supabase()
    .from('push_inscricoes')
    .upsert({ endpoint: i.endpoint, p256dh: i.keys.p256dh, auth: i.keys.auth, email, aparelho, atualizado_em: new Date().toISOString() })
  if (error) throw new Error('Não foi possível salvar a inscrição')
}

export async function removerInscricao(endpoint: string): Promise<void> {
  await supabase().from('push_inscricoes').delete().eq('endpoint', endpoint)
}

export async function enviarParaTodos(m: MensagemPush): Promise<{ enviados: number; removidos: number; falhas: number }> {
  configurar()
  const { data, error } = await supabase().from('push_inscricoes').select('endpoint, p256dh, auth')
  if (error) throw new Error('Não foi possível ler as inscrições')
  const payload = JSON.stringify({ title: m.titulo, body: m.corpo, url: m.url, tag: m.tag })
  let enviados = 0
  let removidos = 0
  let falhas = 0
  await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 6 * 60 * 60,
          urgency: 'normal'
        })
        enviados++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await removerInscricao(s.endpoint)
          removidos++
        } else falhas++
      }
    })
  )
  return { enviados, removidos, falhas }
}
