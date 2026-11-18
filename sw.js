// sw.js — Пуля (Ably)
const VERSION = 'v6';   // ← подняли!
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

// Абсолютный URL для фоллбэка — вычисляется один раз
const FALLBACK_URL = new URL('./index.html', self.location.href).href;

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(SHELL)
            .then((c) => c.addAll(PRECACHE))
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.warn('precache failed', err);
                // даже если precache упал — активируемся, чтобы не залипнуть в waiting
                return self.skipWaiting();
            })
    );
});

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

self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    if (url.hostname.endsWith('ably.io') ||
        url.hostname.endsWith('ably.com') ||
        url.hostname.endsWith('ably-realtime.com')) return;

    if (url.origin !== location.origin) return;

    // HTML — network-first с надёжным фоллбэком
    if (url.pathname.endsWith('/') ||
        url.pathname.endsWith('/index.html') ||
        url.pathname.endsWith('/game.html')) {
        e.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(SHELL)
                            .then((c) => c.put(req, copy))
                            .catch(() => {});
                    }
                    return res;
                })
                .catch(() =>
                    caches.match(req).then((hit) =>
                        hit || caches.match(FALLBACK_URL).then((f) =>
                            f || new Response(
                                '<!doctype html><html><body style="background:#0a0f1e;color:#ffaa44;font-family:sans-serif;text-align:center;padding:40px"><h1>🚀 Пуля</h1><p>Офлайн. Проверьте интернет.</p><button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;border:none;border-radius:10px;background:#ffaa44;color:#0a0f1e;font-weight:bold;font-size:16px;cursor:pointer">Обновить</button></body></html>',
                                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                            )
                        )
                    )
                )
        );
        return;
    }

    // Остальное — cache-first + фоновое обновление
    e.respondWith(
        caches.match(req).then((hit) => {
            const network = fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(RUNTIME)
                            .then((c) => c.put(req, copy))
                            .catch(() => {});
                    }
                    return res;
                })
                .catch(() => hit);
            return hit || network;
        })
    );
});
