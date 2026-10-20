'use client'

import { useEffect } from 'react'

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') {
      // Em desenvolvimento o cache só atrapalha: remove o que tiver ficado
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()))
      return
    }
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
  }, [])
  return null
}
