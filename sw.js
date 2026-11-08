// Guarda la app para que abra sin internet. Cambia con cada versión de index.html.
const CACHE="caja-2577aca2";
const BASE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
const EXTRA=["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE).then(()=>Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{}))))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  if(new URL(e.request.url).origin!==self.location.origin&&!EXTRA.includes(e.request.url))return;
  if(e.request.mode==="navigate"){
    e.respondWith(fetch(e.request,{cache:"no-cache"}).then(r=>{const c=r.clone();caches.open(CACHE).then(k=>k.put("./index.html",c));return r})
      .catch(()=>caches.match("./index.html").then(h=>h||caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>{
    const red=fetch(e.request).then(r=>{if(r&&(r.ok||r.type==="opaque")){const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c))}return r}).catch(()=>hit);
    return hit||red;
  }));
});
