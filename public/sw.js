// Service Worker for Mtask Workspace PWA
const CACHE_NAME = 'mtask-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through all network requests directly without caching HTML/JS bundles
  return;
});

// Handle incoming background pushes
self.addEventListener('push', (event) => {
  let data = { title: 'Mtask Workspace 🔔', body: 'Terjadi pembaruan tugas baru.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Mtask Workspace 🔔', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: 'https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20M-TASK.png',
    badge: 'https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20M-TASK.png',
    vibrate: [100, 60, 120],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle background notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
