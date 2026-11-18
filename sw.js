const CACHE_NAME = 'Nexus-T0151-v1.9.39';
const STATIC_ASSETS = [
    './',
    'index.html',
    'manifest.json',
    'fonts.css',
    'nexus.svg',
    'icon-180.png',
    'icon-192.png',
    'icon-512.png',
    'src/teclado.js',
    'src/fonts/Geist-Regular.ttf',
    'src/fonts/Geist-SemiBold.ttf',
    'src/icons/checador-96.png',
    'src/icons/corte-96.png',
    'src/icons/ventas-96.png',
    'corte/index.html',
    'existencias/index.html',
    'fases/index.html',
    'tickets/index.html',
    'ventas/index.html',
    'notas/index.html',
    'checks/index.html',
    'minisers/index.html',
    'checador/checador.html',
    'checador/admin.html',
    'corte/corte.svg',
    'existencias/existencias.svg',
    'fases/fases.svg',
    'ventas/ventas.svg',
    'tickets/tickets.svg',
    'notas/notas.svg',
    'checks/checks.svg',
    'minisers/agenda.svg',
    'checador/checador.svg',
    'checador/admin.svg'
];

// Resuelve cada ruta relativa contra el scope de registro del SW.
function assetUrl(path) {
    return new URL(path, self.registration.scope).href;
}

function indexUrl() {
    return new URL('index.html', self.registration.scope).href;
}

// Instalación: guardar recursos propios.
// Se cachea archivo por archivo (allSettled) para que un solo asset
// que falle NO cancele todo el cacheo inicial, como pasaba con addAll().
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

// Activación: limpiar cachés antiguas y tomar control inmediato de las pestañas
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

// Intercepción de solicitudes
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const acceptHeader = event.request.headers.get('accept') || '';

    // Omitir peticiones a Supabase en tiempo real
    if (url.origin.includes('supabase.co')) {
        return;
    }

    // 1. Manejo para Navegación / Páginas HTML (Network First con fallback robusto a index.html)
    if (event.request.mode === 'navigate' || acceptHeader.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    // Buscar la ruta exacta en caché
                    let cachedResponse = await caches.match(event.request, { ignoreSearch: true });
                    if (cachedResponse) return cachedResponse;

                    // Fallback universal a index.html para soportar SPA / rutas hijas
                    cachedResponse = await caches.match(indexUrl(), { ignoreSearch: true });
                    if (cachedResponse) return cachedResponse;

                    cachedResponse = await caches.match(assetUrl('./'), { ignoreSearch: true });
                    if (cachedResponse) return cachedResponse;

                    // Respuesta de emergencia si la caché está vacía
                    return new Response('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nexus G.P. Sin Conexión</title></head><body style="font-family:sans-serif;text-align:center;padding-top:50px;background:#f8fafc;color:#334155;"><h2>Aplicación sin conexión</h2><p>No se encontraron archivos en la caché local. Conéctate a internet una vez para sincronizar los recursos.</p></body></html>', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                })
        );
        return;
    }

    // 2. Manejo para Assets, Scripts y CDNs externos (Stale-While-Revalidate)
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Aceptamos status 200 o respuestas opacas (opaque) comunes en CDNs externos
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Si falla la red y no está en caché, devolvemos lo que haya o un fallback vacío
                return cachedResponse || new Response('', { status: 404, statusText: 'Not Found Offline' });
            });

            return cachedResponse || fetchPromise;
        })
    );
});
