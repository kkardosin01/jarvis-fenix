// Criptografia das senhas de app (AES-256-GCM). A chave fica só no servidor (EMAIL_ENC_KEY).

import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function chave(): Buffer {
  const bruta = process.env.EMAIL_ENC_KEY ?? ''
  const k = /^[0-9a-f]{64}$/i.test(bruta) ? Buffer.from(bruta, 'hex') : Buffer.from(bruta, 'base64')
  if (k.length !== 32) throw new Error('EMAIL_ENC_KEY precisa ter 32 bytes (64 caracteres hex ou base64)')
  return k
}

/** "v1.<iv>.<tag>.<cifrado>" em base64url. */
export function cifrar(texto: string, k: Buffer = chave()): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', k, iv)
  const cifrado = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return ['v1', iv, c.getAuthTag(), cifrado].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.')
}

export function decifrar(pacote: string, k: Buffer = chave()): string {
  const [versao, iv, tag, cifrado] = pacote.split('.')
  if (versao !== 'v1' || !iv || !tag || !cifrado) throw new Error('Senha guardada em formato desconhecido')
  const d = createDecipheriv('aes-256-gcm', k, Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(cifrado, 'base64url')), d.final()]).toString('utf8')
}
