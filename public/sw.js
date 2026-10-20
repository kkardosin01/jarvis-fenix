// Service worker do Jarvis Fênix: abre sem internet (último resumo salvo) e recebe notificações.
const VERSAO = 'jarvis-v2'
const CACHE_PAGINAS = `${VERSAO}-paginas`
const CACHE_ESTATICOS = `${VERSAO}-estaticos`
const CACHE_DADOS = `${VERSAO}-dados`
const TELAS = ['/', '/contas', '/clientes', '/emails', '/prospeccao']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE_ESTATICOS)
      .then((c) => c.addAll(['/icones/icone-192.png', '/icones/badge-96.png']))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function podeGuardar(r) {
  return r && r.ok && !r.redirected && r.type === 'basic'
}

async function redePrimeiro(req, nomeCache, reserva) {
  const cache = await caches.open(nomeCache)
  try {
    const r = await fetch(req)
    if (podeGuardar(r)) cache.put(req, r.clone())
    return r
  } catch (err) {
    const salvo = (await cache.match(req, { ignoreSearch: true })) || (reserva && (await cache.match(reserva)))
    if (salvo) return salvo
    throw err
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Último resumo: rede primeiro; sem internet, devolve o salvo marcado como "offlineCache"
  if (url.pathname === '/api/painel') {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_DADOS)
        try {
          const r = await fetch(req)
          if (podeGuardar(r)) cache.put('/api/painel', r.clone())
          return r
        } catch (err) {
          const salvo = await cache.match('/api/painel')
          if (!salvo) throw err
          const corpo = await salvo.json()
          return new Response(JSON.stringify({ ...corpo, offlineCache: true }), { headers: { 'content-type': 'application/json' } })
        }
      })()
    )
    return
  }
  if (url.pathname.startsWith('/api/')) return

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icones/')) {
    e.respondWith(
      caches.open(CACHE_ESTATICOS).then(async (c) => {
        const salvo = await c.match(req)
        if (salvo) return salvo
        const r = await fetch(req)
        if (podeGuardar(r)) c.put(req, r.clone())
        return r
      })
    )
    return
  }

  if (req.mode === 'navigate' && TELAS.includes(url.pathname)) {
    e.respondWith(redePrimeiro(req, CACHE_PAGINAS, '/'))
  }
})

// Ao sair da conta, o app pede para apagar tudo que ficou guardado
self.addEventListener('message', (e) => {
  if (e.data === 'limpar') e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))))
})

self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { body: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Jarvis Fênix', {
      body: d.body || '',
      icon: '/icones/icone-192.png',
      badge: '/icones/badge-96.png',
      tag: d.tag,
      lang: 'pt-BR',
      data: { url: d.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const destino = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
          c.navigate(destino).catch(() => undefined)
          return c.focus()
        }
      }
      return self.clients.openWindow(destino)
    })
  )
})
