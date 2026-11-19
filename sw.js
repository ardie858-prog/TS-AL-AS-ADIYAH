/* SantriTrack · Service Worker (mode offline)
   Taruh file ini di folder yang sama dengan index.html (ST-v9.html).
   Yang disimpan offline: kerangka aplikasi, ikon, pustaka (CDN), font, ikon FontAwesome, logo.
   TIDAK disimpan: data santri/akun (Supabase REST/Auth/Realtime), audio murottal, cuaca. */
const VER='st-v9-2';
const CORE=['./','manifest.json','icon-192.png','apple-touch-icon.png'];
const CDN=[
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
];
const CSS=[
 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Amiri:wght@400;700&display=swap'
];
const ASET='https://mkbpucoojmeiuhhjvgrg.supabase.co/storage/v1/object/public/aset/';
const PUB=[ASET+'logo.png',ASET+'kartu-logo.png',ASET+'ttd.png'];
const HOSTS=['cdn.jsdelivr.net','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com','unpkg.com'];

async function putSafe(c,u,opt){try{const r=await fetch(opt?new Request(u,opt):u);if(r&&(r.ok||r.type==='opaque'))await c.put(u,r.clone());return r}catch(e){return null}}
async function precacheCss(c,u){
 const r=await putSafe(c,u);if(!r||!r.ok)return;
 try{const t=await r.clone().text();const seen={};
  const re=/url\(\s*['"]?([^'")]+\.woff2[^'")]*)['"]?\s*\)/g;let m;
  while((m=re.exec(t))){const f=new URL(m[1],u).href;if(!seen[f]){seen[f]=1;await putSafe(c,f)}}
 }catch(e){}
}
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const c=await caches.open(VER);
 await Promise.all(CORE.map(u=>putSafe(c,u)));
 await Promise.all(CDN.concat(PUB).map(u=>putSafe(c,u)));
 await Promise.all(CSS.map(u=>precacheCss(c,u)));
 self.skipWaiting();
})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 const ks=await caches.keys();await Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)));
 await self.clients.claim();
})())});

async function swr(req){
 const c=await caches.open(VER),hit=await c.match(req);
 const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>null);
 return hit||(await net)||Response.error();
}
async function cacheFirst(req){
 const c=await caches.open(VER),hit=await c.match(req);if(hit)return hit;
 try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}catch(e){return Response.error()}
}
async function page(req){
 const c=await caches.open(VER);
 try{
  const r=await Promise.race([fetch(req),new Promise((_,j)=>setTimeout(j,4000))]);
  if(r&&r.ok)c.put(req,r.clone());
  return r;
 }catch(e){
  return (await c.match(req,{ignoreSearch:true}))||(await c.match('./',{ignoreSearch:true}))||new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}});
 }
}
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 const u=new URL(req.url);
 if(req.mode==='navigate'){e.respondWith(page(req));return}
 if(u.origin===location.origin){e.respondWith(swr(req));return}
 if(HOSTS.includes(u.hostname)){e.respondWith(cacheFirst(req));return}
 if(u.hostname.endsWith('.supabase.co')&&u.pathname.startsWith('/storage/v1/object/public/')){e.respondWith(swr(req));return}
 /* selain itu (data Supabase, audio, cuaca, dll) langsung ke jaringan */
});
