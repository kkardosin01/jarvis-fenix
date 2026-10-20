import type { NextConfig } from 'next'

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://lh3.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com"
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Pacotes de e-mail/PDF rodam como Node puro (não passam pelo bundler)
  serverExternalPackages: ['imapflow', 'mailparser', 'pdfjs-dist', '@napi-rs/canvas'],
  // O pdfjs carrega o canvas e o worker em tempo de execução; o rastreador não os acha sozinho
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/@napi-rs/**/*', './node_modules/pdfjs-dist/legacy/build/**/*']
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' }
        ]
      },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] }
    ]
  }
}

export default nextConfig
