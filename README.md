// Guarda la app para que abra sin internet. Cambia con cada versión de index.html.
const CACHE="caja-fdc9aae7";
const BASE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
const EXTRA=["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"]; // si falla no impide instalar
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE).then(()=>Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{}))))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  // La página principal: primero internet (para ver siempre la versión nueva) y si no hay, la guardada
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
