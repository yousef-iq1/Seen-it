const BUILD = new URL(self.location.href).searchParams.get("v") || "dev";
const VERSION = `seen-it-${BUILD}`;
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png"];
self.addEventListener("install", (event) => {
    event.waitUntil(caches
        .open(SHELL)
        .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
        .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
    event.waitUntil(caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET")
        return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin)
        return;
    if (url.pathname.startsWith("/api/"))
        return;
    if (req.mode === "navigate") {
        event.respondWith(fetch(req)
            .then((res) => {
            const copy = res.clone();
            void caches.open(SHELL).then((c) => c.put(req, copy));
            return res;
        })
            .catch(() => caches.match(req).then((hit) => hit ?? caches.match("/"))));
        return;
    }
    const isData = url.pathname.endsWith(".json");
    if (isData) {
        event.respondWith(caches.open(DATA).then(async (cache) => {
            const hit = await cache.match(req);
            const fresh = fetch(req)
                .then((res) => {
                if (res.ok && res.status === 200)
                    void cache.put(req, res.clone());
                return res;
            })
                .catch(() => null);
            return hit ?? (await fresh) ?? new Response("", { status: 503 });
        }));
        return;
    }
    event.respondWith(caches.match(req).then((hit) => {
        if (hit)
            return hit;
        return fetch(req).then((res) => {
            if (res.ok && res.status === 200) {
                const copy = res.clone();
                void caches.open(SHELL).then((c) => c.put(req, copy));
            }
            return res;
        });
    }));
});
