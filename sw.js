const CACHE_NAME = 'afri-link-ledger-v3'; // Version incrémentée pour forcer la mise à jour du cache

// Liste des ressources essentielles à mettre en cache pour le fonctionnement hors ligne
const ASSETS = [
  './index.html',
  './manifest.json',
  './logo.png',
  './benin.png',
  './rdc.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js'
];

// 1. Installation : Mise en cache des ressources statiques essentielles
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Mise en cache des ressources essentielles');
      return cache.addAll(ASSETS);
    }).then(() => {
      console.log('[Service Worker] Installation terminée, activation immédiate');
      return self.skipWaiting();
    })
  );
});

// 2. Activation : Nettoyage des anciens caches pour libérer l'espace de stockage
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache :', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation terminée, prise de contrôle des clients');
      return self.clients.claim();
    })
  );
});

// 3. Fetch : Stratégie "Cache First" avec fallback réseau et mise en cache dynamique
self.addEventListener('fetch', (e) => {
  // Ignorer les requêtes non-GET (comme les requêtes Firebase POST/PUT)
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Si la ressource est en cache, on la renvoie immédiatement (ultra-rapide)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Sinon, on la demande au réseau
      return fetch(e.request).then((networkResponse) => {
        // Si la réponse est valide et provient de notre propre origine, on la met en cache pour la prochaine fois
        if (networkResponse && networkResponse.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback ultime : si hors ligne et pas en cache, renvoyer la page d'accueil pour les navigations
        if (e.request.destination === 'document' || e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // Pour les images ou autres, retourner une réponse vide pour éviter les erreurs de casse
        return new Response('', { status: 404, statusText: 'Non trouvé hors ligne' });
      });
    })
  );
});