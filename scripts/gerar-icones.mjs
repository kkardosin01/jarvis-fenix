// Gera os ícones do PWA com a identidade do site da Fênix: fênix dourada sobre preto.
// Fonte: assets/fenix-emblema.png (mesmo emblema de comercial-fenix/public/brand).
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const FUNDO = '#0a0a0a'
const EMBLEMA = 'assets/fenix-emblema.png'

/** Quadrado `tam` com o emblema ocupando `fracao` da largura, centralizado (um pouco acima, como no site). */
async function icone(tam, fracao, { cantos = 0, fundo = FUNDO } = {}) {
  const largura = Math.round(tam * fracao)
  const emblema = await sharp(EMBLEMA).trim().resize({ width: largura, height: largura, fit: 'inside' }).toBuffer({ resolveWithObject: true })
  const left = Math.round((tam - emblema.info.width) / 2)
  const top = Math.round((tam - emblema.info.height) / 2 - tam * 0.02)
  let base = sharp({ create: { width: tam, height: tam, channels: 4, background: fundo ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
  const camadas = [{ input: emblema.data, left, top }]
  if (cantos) {
    const r = Math.round(tam * cantos)
    camadas.push({ input: Buffer.from(`<svg width="${tam}" height="${tam}"><rect width="${tam}" height="${tam}" rx="${r}" fill="#fff"/></svg>`), blend: 'dest-in' })
  }
  return base.composite(camadas).png()
}

/** Ícone pequeno da barra de notificação do Android: só a silhueta, em branco. */
async function badge(tam) {
  const alfa = await sharp(EMBLEMA).trim().resize({ width: Math.round(tam * 0.9), height: Math.round(tam * 0.9), fit: 'inside' }).extractChannel('alpha').raw().toBuffer({ resolveWithObject: true })
  const branco = await sharp({ create: { width: alfa.info.width, height: alfa.info.height, channels: 3, background: '#ffffff' } })
    .joinChannel(alfa.data, { raw: { width: alfa.info.width, height: alfa.info.height, channels: 1 } })
    .png()
    .toBuffer()
  return sharp({ create: { width: tam, height: tam, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: branco, gravity: 'center' }])
    .png()
}

mkdirSync('public/icones', { recursive: true })
await (await icone(192, 0.78, { cantos: 0.2 })).toFile('public/icones/icone-192.png')
await (await icone(512, 0.78, { cantos: 0.2 })).toFile('public/icones/icone-512.png')
// Maskable: o Android recorta em círculo/gota; o emblema fica dentro da zona segura (80% central)
await (await icone(512, 0.6)).toFile('public/icones/maskable-512.png')
// iPhone: quadrado cheio (o iOS arredonda sozinho)
await (await icone(180, 0.74)).toFile('public/icones/apple-touch-icon.png')
await (await badge(96)).toFile('public/icones/badge-96.png')
await (await icone(48, 0.84, { cantos: 0.2 })).toFile('src/app/icon.png')
// Emblema solto (fundo transparente) para a tela de login
await sharp(EMBLEMA).trim().resize({ width: 320 }).png().toFile('public/marca/fenix-emblema.png')
console.log('Ícones gerados em public/icones e public/marca')
