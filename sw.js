// Receipt Box phone app: keeps the app working without internet,
// and accepts files shared into it (Android "Share" > Receipt Box).
const VERSION = "rb-phone-v5";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./jsQR.js", "./jszip.min.js",
  "./pdf.min.js", "./pdf.worker.min.js", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "rb-shared").map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.method === "POST" && url.pathname.endsWith("/share")) {
    e.respondWith((async () => {
      try {
        const form = await req.formData();
        const c = await caches.open("rb-shared");
        let i = 0;
        for (const f of form.getAll("files")) {
          if (!(f instanceof File)) continue;
          await c.put(new Request(`./shared/${Date.now()}-${i++}`), new Response(f, {
            headers: { "Content-Type": f.type || "application/octet-stream", "X-Name": encodeURIComponent(f.name || "shared") },
          }));
        }
      } catch (err) { /* nothing to keep */ }
      return Response.redirect("./?shared=1", 303);
    })());
    return;
  }

  if (req.method !== "GET") return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); }
    catch (err) {
      if (req.mode === "navigate") return caches.match("./index.html");
      throw err;
    }
  })());
});
