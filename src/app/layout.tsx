import type { Metadata, Viewport } from 'next'
import { Manrope, Oswald } from 'next/font/google'
import './globals.css'

// Mesmas fontes do site da Fênix (servidas pelo próprio app, sem chamar o Google no navegador)
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap', weight: ['400', '500', '600'] })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

export const metadata: Metadata = {
  title: 'Jarvis Fênix',
  description: 'O dia da Comercial Fênix num toque: contas, clientes, e-mails e prospecção.',
  applicationName: 'Jarvis Fênix',
  appleWebApp: { capable: true, title: 'Jarvis', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/icones/apple-touch-icon.png', sizes: '180x180' }]
  },
  robots: { index: false, follow: false },
  formatDetection: { telephone: false }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f1e8' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ]
}

// Aplica o tamanho de letra salvo antes de pintar a tela (sem "pulo")
const scriptFonte = `try{var f=localStorage.getItem('jarvis:fonte');if(f)document.documentElement.dataset.fonte=f}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${oswald.variable} ${manrope.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptFonte }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
