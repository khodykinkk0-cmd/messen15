// sw.js — Пуля (Ably-версия)
const VERSION = 'v5';                       // ← поднимайте при каждом апдейте
const SHELL = 'pulya-shell-' + VERSION;
const RUNTIME = 'pulya-runtime-' + VERSION;

const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon.svg'
];

// ---------- install ----------
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(SHELL)
            .then((c) => c.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

// ---------- activate ----------
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== SHELL && k !== RUNTIME)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ---------- message ----------
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ---------- fetch ----------
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // 1) WebSocket и всё, что не http(s) — не трогаем
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    // 2) Ably — никогда не кэшируем (auth, history, presence, WS-handshake)
    if (url.hostname.endsWith('ably.io') ||
        url.hostname.endsWith('ably.com') ||
        url.hostname.endsWith('ably-realtime.com')) return;

    // 3) Чужие origin'ы — только сеть
    if (url.origin !== location.origin) return;

    // 4) HTML — network-first, чтобы правки подхватывались сразу
    if (url.pathname.endsWith('/') ||
        url.pathname.endsWith('/index.html') ||
        url.pathname.endsWith('/game.html')) {
        e.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(SHELL).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
        );
        return;
    }

    // 5) Всё остальное (иконки, act01-28.js, manifest) — cache-first + фоновое обновление
    e.respondWith(
        caches.match(req).then((hit) => {
            const network = fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(RUNTIME).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => hit);
            return hit || network;
        })
    );
});
