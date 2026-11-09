// SAS Sports service worker (user, November 9, 2026: "Begin the pwa").
// It makes the site installable and shows an offline page when the phone has
// no connection. It never caches scores: the page, /api/*, /live/* and every
// other request go to the network exactly as they do without it. Only the
// offline page and the app icons are kept on the device.
const CACHE='sas-sports-shell-v1';
const OFFLINE='/offline.html';
const PRECACHE=[OFFLINE,'/icons/icon-192.png','/icons/icon-512.png','/icons/apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);
    if(self.registration.navigationPreload)await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    // Network first, always: the page is served no-store so scores stay current.
    event.respondWith((async()=>{
      try{return (await event.preloadResponse)||await fetch(request)}
      catch{return (await caches.match(OFFLINE))||Response.error()}
    })());
    return;
  }
  if(url.pathname.startsWith('/icons/')){
    event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
  }
  // Everything else (scores, feeds, images) is left to the network.
});
