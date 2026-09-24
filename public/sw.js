// Service Worker — recebe push notifications da agenda Morais Barber
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let dados = { title: 'Morais Barber', body: 'A agenda foi atualizada', url: 'https://morais-barberv2.vercel.app/#/admin.morais' }
  try {
    if (event.data) dados = { ...dados, ...event.data.json() }
  } catch (e) {
    if (event.data) dados.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230a0a0a"/><text x="50" y="62" font-size="52" text-anchor="middle" fill="%23d4a853">M</text></svg>'),
      badge: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23d4a853"/><text x="50" y="62" font-size="52" text-anchor="middle" fill="%230a0a0a">M</text></svg>'),
      vibrate: [200, 100, 200],
      tag: 'agenda-morais',
      data: { url: dados.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || 'https://morais-barberv2.vercel.app/#/admin.morais'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes('morais-barberv2') && 'focus' in cliente) return cliente.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
