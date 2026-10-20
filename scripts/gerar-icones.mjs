// Gera os ícones do PWA com a mesma identidade do app de computador:
// quadrado verde-petróleo, "F" branco e barra âmbar (a chama da Fênix).
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const FUNDO = '#0F5C56'
const DESTAQUE = '#F59E0B'

/** Desenho em 100×100. `escala` < 1 encolhe o símbolo (zona segura do ícone maskable). */
function svg({ cantos, escala = 1, fundo = FUNDO, letra = '#fff', barra = DESTAQUE }) {
  const t = (50 - 50 * escala).toFixed(2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  ${fundo ? `<rect width="100" height="100" rx="${cantos}" fill="${fundo}"/>` : ''}
  <g transform="translate(${t} ${t}) scale(${escala})">
    <path d="M27 14h47v15H43v12h27v15H43v16H27z" fill="${letra}"/>
    <rect x="27" y="78" width="47" height="8" fill="${barra}"/>
  </g>
</svg>`
}

mkdirSync('public/icones', { recursive: true })
const saidas = [
  ['icone-192.png', 192, svg({ cantos: 20 })],
  ['icone-512.png', 512, svg({ cantos: 20 })],
  ['maskable-512.png', 512, svg({ cantos: 0, escala: 0.72 })],
  ['apple-touch-icon.png', 180, svg({ cantos: 0, escala: 0.85 })],
  // Ícone pequeno da barra de notificações do Android: só a forma, em branco
  ['badge-96.png', 96, svg({ cantos: 0, fundo: null, letra: '#fff', barra: '#fff' })]
]
for (const [nome, tam, desenho] of saidas) {
  await sharp(Buffer.from(desenho)).resize(tam, tam).png().toFile(`public/icones/${nome}`)
}
await sharp(Buffer.from(svg({ cantos: 20 }))).resize(48, 48).png().toFile('src/app/icon.png')
console.log('Ícones gerados em public/icones')
