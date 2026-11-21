// Guarda la app para que abra sin internet. Cambia con cada versión de index.html.
const CACHE="caja-f0cb8ead";
const BASE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
const EXTRA=["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"]; // si falla no impide instalar
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE).then(()=>Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{}))))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// Avisos: tocar una notificación abre la app en la sección que corresponde
self.addEventListener("notificationclick",e=>{e.notification.close();const d=e.notification.data||{};
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{const c=cs[0];
    if(c){c.postMessage({caja:"ir",v:d.v||"inicio",lib:d.lib||""});return c.focus()}
    return self.clients.openWindow("./#"+String(d.v||"inicio").split(":")[0]+(d.lib?"@"+d.lib:""))}))});
// Listo para avisos desde un servidor (push), si algún día se agrega
self.addEventListener("push",e=>{let d={};try{d=e.data.json()}catch(_){d={body:e.data?e.data.text():""}}
  e.waitUntil(self.registration.showNotification(d.title||"Kaja",{body:d.body||"",tag:d.tag||"caja-push",icon:"icon-192.png",data:{v:d.v||"inicio",lib:d.lib||""}}))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  // Lo de otras páginas (como el precio del dólar) siempre va a internet, nunca se guarda
  if(new URL(e.request.url).origin!==self.location.origin&&!EXTRA.includes(e.request.url))return;
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
