// Push alerts for favorites (user, November 8, 2026: "Let's do push alerts
// next"). Checks the Web Push encryption against a vector made by http_ece
// (an independent RFC 8291 implementation), the VAPID signature, which alerts
// are due, and the whole run in the Worker: subscribe, a favorite's game goes
// live (one alert), stays live (none), ends (the final), a dropped
// subscription is deleted, and scopes stay apart.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import nodeCrypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {b64url,fromB64url,encryptPayload,vapidSigningKey,vapidHeader,validSubscription,cleanFavorites,dueAlerts,alertMessage,pushEventKey} from '../src/push-alerts.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// ---- Encryption: the same bytes http_ece makes for the same keys and salt.
{
  const v=JSON.parse(read('./fixtures/push-vector.json'));
  const pub=fromB64url(v.as_public);
  const privateKey=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:b64url(pub.slice(1,33)),y:b64url(pub.slice(33)),d:v.as_private,ext:true},{name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const publicKey=await crypto.subtle.importKey('raw',pub,{name:'ECDH',namedCurve:'P-256'},true,[]);
  const out=await encryptPayload(v.message,{p256dh:v.ua_public,auth:v.auth},{salt:fromB64url(v.salt),serverKeys:{publicKey,privateKey}});
  assert.equal(b64url(out),v.expected,'aes128gcm output matches http_ece');
}
// The phone's side, to read what the Worker sends.
function decrypt(body,ua,auth){
  const h=(k,d)=>nodeCrypto.createHmac('sha256',k).update(d).digest();
  const salt=body.subarray(0,16),idlen=body[20],as=body.subarray(21,21+idlen),cipher=body.subarray(21+idlen);
  const prkKey=h(auth,ua.computeSecret(as));
  const ikm=h(prkKey,Buffer.concat([Buffer.from('WebPush: info\0'),ua.getPublicKey(),as,Buffer.from([1])]));
  const prk=h(salt,ikm);
  const cek=h(prk,Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'),Buffer.from([1])])).subarray(0,16);
  const nonce=h(prk,Buffer.concat([Buffer.from('Content-Encoding: nonce\0'),Buffer.from([1])])).subarray(0,12);
  const d=nodeCrypto.createDecipheriv('aes-128-gcm',cek,nonce);d.setAuthTag(cipher.subarray(-16));
  const plain=Buffer.concat([d.update(cipher.subarray(0,-16)),d.final()]);
  assert.equal(plain.at(-1),2,'last-record delimiter');
  return JSON.parse(plain.subarray(0,-1).toString());
}

// ---- VAPID
const vapid=nodeCrypto.createECDH('prime256v1');vapid.generateKeys();
const VAPID_PUBLIC_KEY=b64url(vapid.getPublicKey()),VAPID_PRIVATE_KEY=b64url(vapid.getPrivateKey());
{
  const key=await vapidSigningKey(VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
  const header=await vapidHeader('https://fcm.googleapis.com/fcm/send/x',{publicKey:VAPID_PUBLIC_KEY,signingKey:key,subject:'https://sas.example/bot',now:Date.UTC(2026,10,8)});
  const [,t,k]=header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k,VAPID_PUBLIC_KEY);
  const [a,b,s]=t.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(b,'base64url')),{aud:'https://fcm.googleapis.com',exp:Date.UTC(2026,10,8)/1000+43200,sub:'https://sas.example/bot'});
  const verify=await crypto.subtle.importKey('raw',fromB64url(VAPID_PUBLIC_KEY),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verify,fromB64url(s),new TextEncoder().encode(`${a}.${b}`)),'ES256 signature verifies');
}

// ---- The key check (reported by /api/push/config, never the key itself)
{
  const {vapidKeyCheck}=await import('../src/push-alerts.mjs');
  assert.deepEqual(await vapidKeyCheck(VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY),{ok:true});
  assert.deepEqual(await vapidKeyCheck(VAPID_PUBLIC_KEY,` ${VAPID_PRIVATE_KEY}\n`),{ok:true},'spaces and a newline are trimmed');
  // As pasted: quotes, a label, a line break inside the key.
  for(const pasted of [`"${VAPID_PRIVATE_KEY}"`,`'${VAPID_PRIVATE_KEY}'`,`VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}`,`VAPID_PRIVATE_KEY: "${VAPID_PRIVATE_KEY}"`,`${VAPID_PRIVATE_KEY.slice(0,20)}\n${VAPID_PRIVATE_KEY.slice(20)}`])
    assert.deepEqual(await vapidKeyCheck(VAPID_PUBLIC_KEY,pasted),{ok:true},`key found in ${JSON.stringify(pasted.replace(VAPID_PRIVATE_KEY,'<key>'))}`);
  assert.match((await vapidKeyCheck(VAPID_PUBLIC_KEY,VAPID_PUBLIC_KEY)).problem,/87-character public key/,'the public key pasted as the secret is reported');
  assert.match((await vapidKeyCheck(VAPID_PUBLIC_KEY,'"oops"')).problem,/no 43-character key/);
  const other=nodeCrypto.createECDH('prime256v1');other.generateKeys();
  const mismatch=await vapidKeyCheck(VAPID_PUBLIC_KEY,b64url(other.getPrivateKey()));
  assert.equal(mismatch.ok,false,'a private key from another pair is reported');
}

// ---- Pure rules
const ua=nodeCrypto.createECDH('prime256v1');ua.generateKeys();
const auth=nodeCrypto.randomBytes(16);
const subscription={endpoint:'https://push.example/send/phone-1',keys:{p256dh:b64url(ua.getPublicKey()),auth:b64url(auth)}};
assert.ok(validSubscription(subscription));
assert.equal(validSubscription({...subscription,endpoint:'http://push.example/x'}),null,'https only');
assert.equal(validSubscription({...subscription,keys:{...subscription.keys,auth:'AAAA'}}),null,'16-byte auth');
assert.deepEqual(cleanFavorites(['kstate','kstate','Bad Id',7,'x'],id=>id!=='x'),['kstate']);
{
  const live={espn_event_id:'1',school_id:'kstate',status:'Live'},final={...live,status:'Final'};
  assert.deepEqual(dueAlerts([live],new Map()).alerts.map(a=>a.kind),['start']);
  assert.deepEqual(dueAlerts([live],new Map([['1|kstate','live']])).alerts,[],'once per game');
  assert.deepEqual(dueAlerts([final],new Map([['1|kstate','live']])).alerts.map(a=>a.kind),['final']);
  const quiet=dueAlerts([final],new Map());
  assert.deepEqual([quiet.alerts.length,quiet.rows[0].state],[0,'final'],'a final never seen live is recorded, not sent');
  assert.deepEqual(dueAlerts([final],new Map([['1|kstate','final']])).alerts,[]);
  const m=alertMessage({kind:'final',game:{...final,short_name:'K-State',sport:'Football',opponent:'Baylor',school_score:'31',opponent_score:'24'}});
  assert.deepEqual(m,{title:'Final: K-State Football',body:'K-State 31, Baylor 24 (W)',url:'/?school=kstate',tag:pushEventKey(final)});
  assert.equal(alertMessage({kind:'start',game:{...live,short_name:'K-State',sport:'Football',relation:'at',opponent:'Baylor',headline:'1st 12:00'}}).title,'K-State Football is live');
}

// ---- The Worker: fake D1 (SQLite), fake caches, ESPN's Nov 8 NBA board.
function fakeD1(){
  const sqlite=new DatabaseSync(':memory:');
  const statement=(sql,args=[])=>({
    bind:(...a)=>statement(sql,a),
    async first(){return sqlite.prepare(sql).get(...args)??null},
    async all(){return{results:sqlite.prepare(sql).all(...args)}},
    async run(){sqlite.prepare(sql).run(...args);return{}},
    exec(){if(/^\s*SELECT/i.test(sql))return{results:sqlite.prepare(sql).all(...args)};sqlite.prepare(sql).run(...args);return{}}
  });
  return{sqlite,prepare:sql=>statement(sql),async batch(list){sqlite.exec('BEGIN');try{const out=list.map(s=>s.exec());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
const store=new Map();
globalThis.caches={default:{async match(r){return store.get(typeof r==='string'?r:r.url)?.clone()},async put(r,res){store.set(typeof r==='string'?r:r.url,res)},async delete(r){return store.delete(typeof r==='string'?r:r.url)}}};
const board=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/pro-sports/nba-board-20261108.json.gz',import.meta.url))).toString('utf8'));
const boardReads=[],sent=[];let pushStatus=201;
const fetch=async(input,init={})=>{
  const url=String(input?.url||input);
  if(url.startsWith('https://push.example/')){sent.push({url,init});return new Response(null,{status:pushStatus})}
  if(url.includes('/basketball/nba/scoreboard')){boardReads.push(url);return new Response(JSON.stringify(board),{status:200,headers:{'content-type':'application/json'}})}
  if(url.includes('site.api.espn.com'))boardReads.push(url);
  return new Response('',{status:404});
};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {handler,runPushAlerts,PRODUCTION_HOST,PUSH_CRON}')(...Object.values(deps));
const db=fakeD1();
const env={CATALOG_DB:db,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,SOURCE_FETCH_KEY:'secret'};
const host=worker.PRODUCTION_HOST,ctx={waitUntil(){}};
const call=(path,body,{method='POST',headers={},on=env,at=host}={})=>worker.handler.fetch(new Request(`https://${at}${path}`,{method,headers:{'content-type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})}),on,ctx);

assert.deepEqual(await (await call('/api/push/config',null,{method:'GET',on:{}})).json(),{enabled:false,public_key:null,covers:'College and pro teams: when a game starts and its final score'},'off without keys');
assert.equal((await call('/api/push/subscribe',{subscription,favorites:['chicago-bulls']},{on:{}})).status,503);
assert.equal((await (await call('/api/push/config',null,{method:'GET'})).json()).public_key,VAPID_PUBLIC_KEY);
{
  const bad=await (await call('/api/push/config',null,{method:'GET',on:{...env,VAPID_PRIVATE_KEY:'"oops"'}})).json();
  assert.deepEqual([bad.enabled,bad.public_key],[false,null]);
  assert.match(bad.key_problem,/VAPID_PRIVATE_KEY/);
  assert.ok(!JSON.stringify(bad).includes('oops'),'the secret is never echoed');
}
assert.equal((await call('/api/push/subscribe',{subscription:{endpoint:'nope'},favorites:[]})).status,400);
const subscribed=await (await call('/api/push/subscribe',{subscription,favorites:['chicago-bulls','philadelphia-76ers','manhattan-ks','no-such-team']})).json();
assert.deepEqual(subscribed,{subscribed:true,favorites:['chicago-bulls','philadelphia-76ers','manhattan-ks'],covered:['chicago-bulls','philadelphia-76ers']});
assert.equal((await call('/api/push/run',{})).status,401,'the run needs the source key');

// No subscriptions on a host: nothing is read.
assert.deepEqual(await worker.runPushAlerts(env,{origin:'https://other.example',now:new Date('2026-11-08T21:00:00Z')}),{scope:'other.example',subscriptions:0,boards:0,games:0,alerts:0,sent:0});
assert.equal(boardReads.length,0);

const now=new Date('2026-11-08T21:00:00Z');
let run=await worker.runPushAlerts(env,{now});
assert.equal(run.boards,1,'only the NBA board (the favorites\' league) is read');
assert.deepEqual(boardReads.filter(url=>!url.endsWith('/robots.txt')).map(url=>new URL(url).pathname),['/apis/site/v2/sports/basketball/nba/scoreboard'],'one board read (plus the source fetcher\'s robots.txt check)');
assert.deepEqual(run.alerts.map(a=>`${a.kind} ${a.school_id}`).sort(),['start chicago-bulls','start philadelphia-76ers'],'both sides of 76ers at Bulls are favorites');
assert.equal(sent.length,2);
for(const message of sent){
  assert.equal(message.init.method,'POST');
  assert.equal(message.init.headers['Content-Encoding'],'aes128gcm');
  assert.match(message.init.headers.Authorization,/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
  const body=decrypt(Buffer.from(message.init.body),ua,auth);
  assert.match(body.title,/ is live$/);
  assert.match(body.url,/^\/\?school=(chicago-bulls|philadelphia-76ers)$/);
}
run=await worker.runPushAlerts(env,{now});
assert.deepEqual([run.alerts.length,sent.length],[0,2],'no second start alert');

// The game ends: the final, with its score.
const game=board.events.find(e=>e.id==='401909945'),status=game.competitions[0].status;
status.type={...status.type,state:'post',completed:true,name:'STATUS_FINAL',detail:'Final',shortDetail:'Final',description:'Final'};
store.clear();
run=await worker.runPushAlerts(env,{now:new Date('2026-11-08T22:40:00Z')});
assert.deepEqual(run.alerts.map(a=>`${a.kind} ${a.school_id}`).sort(),['final chicago-bulls','final philadelphia-76ers']);
const finals=sent.slice(2).map(m=>decrypt(Buffer.from(m.init.body),ua,auth));
const phi=finals.find(m=>m.url.includes('76ers')),chi=finals.find(m=>m.url.includes('bulls'));
assert.match(phi.title,/^Final: /);assert.match(phi.body,/118, .* 116 \(W\)$/);
assert.match(chi.body,/116, .* 118 \(L\)$/);
run=await worker.runPushAlerts(env,{now:new Date('2026-11-08T22:42:00Z')});
assert.equal(run.alerts.length,0,'one final per game');

// The test alert, then a phone that dropped the subscription (410) is deleted.
const test=await (await call('/api/push/test',{endpoint:subscription.endpoint})).json();
assert.deepEqual(test,{sent:true,status:201});
assert.equal(decrypt(Buffer.from(sent.at(-1).init.body),ua,auth).title,'SAS Sports alerts are on');
assert.equal((await call('/api/push/test',{endpoint:subscription.endpoint})).status,429,'one test every 30 seconds');
db.sqlite.prepare("UPDATE push_subscriptions SET last_sent=NULL").run();
pushStatus=410;
assert.equal((await call('/api/push/test',{endpoint:subscription.endpoint})).status,410);
assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,0,'dropped subscription deleted');

// Unsubscribe; a preview's subscription is its own scope.
pushStatus=201;
await call('/api/push/subscribe',{subscription,favorites:['chicago-bulls']},{at:'branch-sas-sports.example'});
assert.equal(db.sqlite.prepare('SELECT scope FROM push_subscriptions').get().scope,'branch-sas-sports.example');
assert.equal((await worker.runPushAlerts(env,{now})).subscriptions,0,'production does not send to a preview\'s subscriptions');
await call('/api/push/unsubscribe',{endpoint:subscription.endpoint},{at:'branch-sas-sports.example'});
assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,0);

// The page and the service worker.
const html=read('../public/index.html'),sw=read('../public/sw.js');
assert.match(html,/id="alertsButton"[^>]*hidden/,'Alerts button starts hidden (shown only when alerts are set up)');
assert.match(html,/dispatchEvent\(new Event\('sas-favorites-changed'\)\)/,'favorites changes are sent again');
assert.match(sw,/addEventListener\('push'/);assert.match(sw,/addEventListener\('notificationclick'/);
assert.equal(worker.PUSH_CRON,'*/2 * * * *');
console.log('push-alerts: encryption, VAPID, rules and the Worker run OK');
