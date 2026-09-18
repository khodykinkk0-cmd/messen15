const CACHE = 'chat-v1';

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then((c) => c.addAll(['./', './index.html']))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (url.hostname === 'broker.hivemq.com') return;
    if (url.hostname === 'broker.emqx.io') return;
    if (url.hostname === 'test.mosquitto.org') return;
    if (e.request.method !== 'GET') return;
    if (url.origin !== location.origin) return;

    e.respondWith(
        caches.match(e.request).then((cached) => {
            return cached || fetch(e.request).then((res) => {
                if (res.ok && res.type === 'basic') {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(e.request, copy));
                }
                return res;
            }).catch(() => caches.match('./index.html'));
        })
    );
});
