const CACHE_NAME = 'alivio-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/app.js',
  '/icon-192.png',
  '/icon-512.png',
  '/fallback-misericordia.png',
  '/SS1.png',
  '/SS2.png',
  '/SS3.png',
  '/SS4.png'
];

// Instalar el Service Worker y cachear recursos
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forzar activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Guardando recursos estáticos en cache...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('⚠️ Error parcial al cachear archivos (pueden faltar iconos):', err);
      });
    })
  );
});

// Activar el Service Worker y limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Tomar control de inmediato
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('🗑️ Eliminando cache obsoleto:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Estrategia de Cache: Network First falling back to Cache
self.addEventListener('fetch', (event) => {
  // No cachear peticiones a la API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guardar copia fresca en cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Si no hay red, usar cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline content unavailable');
        });
      })
  );
});

// Escuchar las notificaciones push en segundo plano
self.addEventListener('push', function(event) {
  console.log('🔔 Recibida una notificación push!');
  let data = { title: 'Alivio', body: 'Respira hondo, es momento de soltar cargas.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Alivio', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png', // icono pequeño en barra de tareas
    vibrate: [100, 50, 100],
    data: { url: '/?from_push=true' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Al dar clic en la notificación, abre la PWA
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/?from_push=true';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la app ya está abierta, hacerle focus y redirigir
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('navigate' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // Si no, abrir una ventana nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
