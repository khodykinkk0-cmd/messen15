// sw.js — пустышка: пропускает всё в сеть, ничего не кэширует.
// Нужен только для права на установку PWA.

const VERSION = 'v8-nocache';

self.addEventListener('install', (e) => {
    e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // Пустой обработчик — браузер запрашивает всё с сети.
    // Без respondWith() запрос идёт напрямую.
});
