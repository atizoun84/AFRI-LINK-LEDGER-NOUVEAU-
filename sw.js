const CACHE_NAME = 'afri-link-ledger-v2'; // Incrémentation de version pour forcer la mise à jour
const ASSETS = [
  './index.html',
  './manifest.json',
  './benin.png',
  './rdc.png',
  './logo.png'
];

// Installation : Mise en cache des ressources statiques essentielles
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activation : Nettoyage des anciens caches pour libérer l'espace
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch : Stratégie "Cache First" pour les images/HTML, avec fallback réseau
self.addEventListener('fetch', (e) => {
  // Ignorer les requêtes non-GET ou externes si nécessaire
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Optionnel : Mettre en cache les nouvelles ressources récupérées du réseau
        if (networkResponse && networkResponse.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback ultime si hors ligne et pas en cache
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});