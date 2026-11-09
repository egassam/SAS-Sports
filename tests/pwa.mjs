// Installable app (PWA) checks (user, November 9, 2026: "Begin the pwa").
// The manifest, icons and page tags make the site installable; the service
// worker must never answer score or feed requests from a cache.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../public/',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const html=read('index.html').toString();

// Page tags
for(const tag of ['<link rel="manifest" href="/manifest.webmanifest">','<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">','<meta name="apple-mobile-web-app-capable" content="yes">','<meta name="apple-mobile-web-app-title" content="SAS Sports">'])
  assert.ok(html.includes(tag),`index.html must include ${tag}`);
assert.match(html,/navigator\.serviceWorker\.register\('\/sw\.js'\)/,'index.html registers /sw.js');
assert.match(html,/id="installApp"[^>]*hidden/,'the Install app button starts hidden');

// Manifest
const manifest=JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.name,'SAS Sports');
assert.equal(manifest.start_url,'/');
assert.equal(manifest.scope,'/');
assert.equal(manifest.display,'standalone');
assert.match(manifest.theme_color,/^#[0-9a-f]{6}$/i);
const pngSize=p=>{const b=read(p.replace(/^\//,''));assert.equal(b.toString('latin1',1,4),'PNG',`${p} is a PNG`);return [b.readUInt32BE(16),b.readUInt32BE(20)]};
for(const icon of manifest.icons){
  const [w,h]=pngSize(icon.src);
  assert.equal(`${w}x${h}`,icon.sizes,`${icon.src} is ${icon.sizes}`);
}
for(const purpose of ['any','maskable'])for(const size of ['192x192','512x512'])
  assert.ok(manifest.icons.some(i=>i.purpose===purpose&&i.sizes===size),`manifest has a ${purpose} ${size} icon`);
assert.deepEqual(pngSize('/icons/apple-touch-icon.png'),[180,180]);
assert.ok(existsSync(new URL('offline.html',root)),'offline page exists');

// Service worker: run it with a stand-in for the worker scope.
const handlers={},cached=new Map([['/offline','OFFLINE'],['/icons/icon-192.png','ICON']]);
const scope={location:new URL('https://sas.example/'),registration:{},clients:{claim:async()=>{}},skipWaiting:async()=>{},
  addEventListener:(type,fn)=>{handlers[type]=fn}};
let network=async()=>'NETWORK';
const context=vm.createContext({self:scope,URL,Response:{error:()=>'ERROR'},
  caches:{match:async r=>cached.get(new URL(typeof r==='string'?r:r.url,scope.location).pathname),open:async()=>({addAll:async()=>{}}),keys:async()=>[],delete:async()=>{}},
  fetch:(...a)=>network(...a)});
vm.runInContext(read('sw.js').toString(),context);
assert.doesNotMatch(read('sw.js').toString(),/'\/[^']*\.html'/,'sw.js uses clean paths: Cloudflare redirects /x.html to /x, and a redirect cannot answer a page');
for(const t of ['install','activate','fetch'])assert.equal(typeof handlers[t],'function',`sw.js handles ${t}`);
const fire=(url,{mode='cors',method='GET'}={})=>{let answer=null;handlers.fetch({request:{url,mode,method},preloadResponse:Promise.resolve(undefined),respondWith:p=>{answer=p}});return answer};
for(const url of ['https://sas.example/api/schools','https://sas.example/api/feed?school=kstate&refresh=1','https://sas.example/live/highlights','https://sas.example/catalog/x','https://sas.example/score/'])
  assert.equal(fire(url),null,`sw.js leaves ${url} to the network`);
assert.equal(fire('https://other.example/api/x',{mode:'navigate'}),null,'other origins are left alone');
assert.equal(fire('https://sas.example/api/x',{method:'POST'}),null,'POSTs are left alone');
assert.equal(await fire('https://sas.example/',{mode:'navigate'}),'NETWORK','pages come from the network when online');
network=async()=>{throw new TypeError('offline')};
assert.equal(await fire('https://sas.example/?school=kstate',{mode:'navigate'}),'OFFLINE','offline pages show the offline page');
assert.equal(await fire('https://sas.example/icons/icon-192.png'),'ICON','icons come from the device');
console.log('pwa: manifest, icons, page tags and service worker OK');
