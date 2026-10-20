import type { Metadata, Viewport } from 'next'
import './globals.css'

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
    { media: '(prefers-color-scheme: light)', color: '#1f2933' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1116' }
  ]
}

// Aplica o tamanho de letra salvo antes de pintar a tela (sem "pulo")
const scriptFonte = `try{var f=localStorage.getItem('jarvis:fonte');if(f)document.documentElement.dataset.fonte=f}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptFonte }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
