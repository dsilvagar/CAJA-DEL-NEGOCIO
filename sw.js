// Guarda la app para que abra sin internet. Cambia con cada versión de index.html.
const CACHE="caja-a95463ea";
const BASE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
const EXTRA=["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"]; // si falla no impide instalar
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE).then(()=>Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{}))))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>{
    const red=fetch(e.request).then(r=>{if(r&&(r.ok||r.type==="opaque")){const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c))}return r}).catch(()=>hit);
    return hit||red;
  }));
});
