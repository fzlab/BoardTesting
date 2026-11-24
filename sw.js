const CACHE_NAME = 'Nexus-T0151-v1.9.50.15';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './fonts.css',
    './nexus.svg',
    './icon-180.png',
    './icon-192.png',
    './icon-512.png',
    './src/teclado.js',
    './src/fonts/Geist-Regular.ttf',
    './src/fonts/Geist-SemiBold.ttf',
    './src/icons/checador-96.png',
    './src/icons/corte-96.png',
    './src/icons/ventas-96.png',
    './corte/index.html',
    './existencias/index.html',
    './fases/index.html',
    './tickets/index.html',
    './ventas/index.html',
    './notas/index.html',
    './checks/index.html',
    './minisers/index.html',
    './checador/checador.html',
    './checador/admin.html',
    './corte/corte.svg',
    './existencias/existencias.svg',
    './fases/fases.svg',
    './ventas/ventas.svg',
    './tickets/tickets.svg',
    './notas/notas.svg',
    './checks/checks.svg',
    './minisers/agenda.svg',
    './checador/checador.svg',
    './checador/admin.svg',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@1.72.0',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

function assetUrl(path) {
    return new URL(path, self.registration.scope).href;
}

function indexUrl() {
    return new URL('./index.html', self.registration.scope).href;
}

// FIX offline: Cloudflare responde 307 a las .html (URLs limpias), así que la
// respuesta cacheada queda marcada como "redirected" y su URL es la del destino
// del redirect (p. ej. '/'), no la pedida ('/index.html'). Chrome rechaza usar
// esa respuesta para una navegación y la petición falla con ERR_FAILED. Al
// re-servirla como una Response nueva ya no está marcada como redirect y la
// navegación offline funciona.
async function deRedirect(match) {
    if (!match || !match.redirected) return match;
    return new Response(await match.blob(), {
        status: match.status,
        statusText: match.statusText,
        headers: match.headers,
    });
}

async function resolveOfflineHtml(request) {
    // 1. Coincidencia exacta ignorando query string
    let match = await caches.match(request, { ignoreSearch: true });
    if (match) return deRedirect(match);

    // 2. Resolver rutas de carpeta o sin extensión
    const url = new URL(request.url);
    if (url.origin === self.location.origin) {
        const cleanPath = url.pathname.replace(/^\/+/, '');
        const candidates = [];

        if (cleanPath.endsWith('/')) {
            candidates.push(`${cleanPath}index.html`);
        } else if (cleanPath && !cleanPath.includes('.')) {
            candidates.push(`${cleanPath}/index.html`, `${cleanPath}.html`);
        }

        for (const candidate of candidates) {
            match = await caches.match(assetUrl(candidate), { ignoreSearch: true });
            if (match) return deRedirect(match);
        }
    }

    // 3. Fallback a index.html o './'
    match = await caches.match(indexUrl(), { ignoreSearch: true });
    if (match) return deRedirect(match);

    match = await caches.match(assetUrl('./'), { ignoreSearch: true });
    if (match) return deRedirect(match);

    return new Response(
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nexus G.P. Sin Conexión</title></head><body style="font-family:sans-serif;text-align:center;padding-top:50px;background:#f8fafc;color:#334155;"><h2>Aplicación sin conexión</h2><p>No se encontraron archivos en la caché local. Conéctate a internet una vez para sincronizar los recursos.</p></body></html>',
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
    );
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            const results = await Promise.allSettled(
                STATIC_ASSETS.map((asset) => cache.add(assetUrl(asset)))
            );
            results.forEach((result, i) => {
                if (result.status === 'rejected') {
                    console.warn('[SW] No se pudo cachear:', STATIC_ASSETS[i], result.reason);
                }
            });
            const ok = results.filter((r) => r.status === 'fulfilled').length;
            console.log(`[SW] Cache inicial: ${ok}/${STATIC_ASSETS.length} assets en ${CACHE_NAME}`);
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
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const acceptHeader = event.request.headers.get('accept') || '';

    if (url.origin.includes('supabase.co') || url.origin.includes('docs.google.com') || url.origin.includes('googleusercontent.com')) {
        return;
    }

    // 1. Navegación / HTML: Network First con resolución inteligente offline
// 1. Navegación / HTML: Cache First si estamos sin conexión, Network First con conexión
if (event.request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    if (!self.navigator.onLine) {
        event.respondWith(resolveOfflineHtml(event.request));
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    }).catch(() => {});
                }
                return networkResponse;
            })
            .catch(() => resolveOfflineHtml(event.request))
    );
    return;
}


    // 2. Assets / CDNs: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            const networkUpdate = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        }).catch(() => {});
                    }
                    return networkResponse;
                })
                .catch(() => null);

            if (cachedResponse) {
                return cachedResponse;
            }

            return networkUpdate.then((res) => res || new Response('', { status: 404, statusText: 'Not Found Offline' }));
        })
    );
});
