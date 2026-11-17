/* SantriTrack service worker
   - Halaman: network-first (selalu ambil versi terbaru, cadangan dari cache saat offline)
   - Pustaka CDN & font: stale-while-revalidate
   - Supabase/API & permintaan non-GET: tidak pernah di-cache (data selalu langsung dari server) */
const VER='santritrack-v2';
const SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const CDN=['cdn.jsdelivr.net','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin===location.origin){
    if(req.mode==='navigate'||u.pathname.endsWith('.html')){
      e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(VER).then(c=>c.put(req,cp));return r}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    }else{
      e.respondWith(caches.match(req).then(r=>r||fetch(req).then(n=>{const cp=n.clone();caches.open(VER).then(c=>c.put(req,cp));return n})));
    }
    return;
  }
  if(CDN.includes(u.hostname)){
    // Ambil lewat mode CORS agar status terbaca; hanya respons sukses (200) yang disimpan di cache
    e.respondWith((async()=>{
      const c=await caches.open(VER);
      const hit=await c.match(req.url);
      const net=fetch(req.url,{mode:'cors',credentials:'omit'}).then(r=>{if(r.ok)c.put(req.url,r.clone());return r}).catch(()=>fetch(req));
      if(hit){e.waitUntil(net.catch(()=>{}));return hit}
      return net;
    })());
    return;
  }
  // lainnya (Supabase, dll.): langsung ke jaringan
});
