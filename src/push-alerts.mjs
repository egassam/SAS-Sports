// Push alerts for favorites (user, November 8, 2026: "Let's do push alerts
// next"). A phone that turns alerts on sends its Web Push subscription and its
// favorite teams; a scheduled run (every 2 minutes) reads only the live
// scoreboards those favorites play on and sends an alert when a favorite's
// game starts and when it ends (the final score). Nothing is sent for a game
// the run never saw live, so a final already on the board when alerts were
// turned on, or a postponed game, is silent.
//
// Web Push is standard (RFC 8030); the message is encrypted for the phone
// (RFC 8291, aes128gcm) and signed with the app's VAPID key (RFC 8292), all
// with the Worker's own WebCrypto. The private key is the Worker secret
// VAPID_PRIVATE_KEY (base64url "d" of a P-256 key); the public key is
// VAPID_PUBLIC_KEY (base64url, 65 bytes uncompressed). Without both, alerts
// are off and the page hides the button.

export const PUSH_TABLES_SQL=[
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    scope TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
    favorites TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL, last_sent TEXT, failures INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (scope, endpoint))`,
  // One row per favorite's game the run has seen: its state ('live', 'final')
  // decides which alert is due. Rows older than PUSH_EVENT_KEEP_DAYS go.
  `CREATE TABLE IF NOT EXISTS push_events (
    scope TEXT NOT NULL, event_key TEXT NOT NULL, school_id TEXT NOT NULL, state TEXT NOT NULL, seen TEXT NOT NULL,
    PRIMARY KEY (scope, event_key))`
];
export const PUSH_EVENT_KEEP_DAYS=3;
export const PUSH_MAX_FAVORITES=60;
export const PUSH_FAILURES_TO_DROP=5;

// ---------- base64url ----------
export function b64url(bytes){
  let s='';const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function fromB64url(text){
  const s=String(text||'').replace(/-/g,'+').replace(/_/g,'/');
  const bin=atob(s+'='.repeat((4-s.length%4)%4)),out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
const enc=new TextEncoder();
const concat=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out};

// ---------- subscriptions ----------
// A subscription the page sends: an https endpoint, a 65-byte P-256 key and a
// 16-byte auth secret. Anything else is refused.
export function validSubscription(sub){
  try{
    const endpoint=String(sub?.endpoint||'');const url=new URL(endpoint);
    if(url.protocol!=='https:'||endpoint.length>1024)return null;
    const p256dh=String(sub?.keys?.p256dh||''),auth=String(sub?.keys?.auth||'');
    const key=fromB64url(p256dh),secret=fromB64url(auth);
    if(key.length!==65||key[0]!==4||secret.length!==16)return null;
    return{endpoint,p256dh,auth};
  }catch{return null}
}
// Favorites kept for a subscription: catalog ids only, no repeats, capped.
export function cleanFavorites(list,known=()=>true){
  if(!Array.isArray(list))return[];
  return[...new Set(list.filter(id=>typeof id==='string'&&/^[a-z0-9-]{1,80}$/.test(id)&&known(id)))].slice(0,PUSH_MAX_FAVORITES);
}

// ---------- which alerts are due ----------
// games: board games for favorites ({espn_event_id, school_id, status, ...});
// seen: Map event_key -> state already recorded. Returns the alerts to send
// and the rows to record.
export const pushEventKey=game=>`${game.espn_event_id||game.id}|${game.school_id}`;
export function dueAlerts(games,seen){
  const alerts=[],rows=[],done=new Set();
  for(const game of games){
    const key=pushEventKey(game);if(done.has(key))continue;done.add(key);
    const before=seen.get(key)||null;
    if(game.status==='Live'){
      if(!before){alerts.push({kind:'start',game});rows.push({key,school_id:game.school_id,state:'live'});}
    }else if(game.status==='Final'){
      if(before==='live'){alerts.push({kind:'final',game});rows.push({key,school_id:game.school_id,state:'final'});}
      else if(!before)rows.push({key,school_id:game.school_id,state:'final'});
    }
  }
  return{alerts,rows};
}
const num=v=>v==null||v===''?null:String(v).trim();
// The notification for an alert: short title, one-line body, the school's page.
export function alertMessage({kind,game}){
  const team=game.short_name||game.school||game.school_id;
  const label=[game.team_label,game.sport].filter(Boolean).join(' ');
  const rel=game.relation==='at'?'at':'vs';
  const opponent=game.opponent||'Opponent';
  const url=`/?school=${encodeURIComponent(game.school_id)}`,tag=`${pushEventKey(game)}`;
  if(kind==='start'){
    const score=num(game.school_score)!=null&&num(game.opponent_score)!=null?` · ${game.school_score}-${game.opponent_score}`:'';
    return{title:`${team} ${label} is live`,body:`${team} ${rel} ${opponent}${game.headline?` · ${game.headline}`:''}${score}`,url,tag};
  }
  const ours=Number(game.school_score),theirs=Number(game.opponent_score);
  const result=Number.isFinite(ours)&&Number.isFinite(theirs)?(ours>theirs?'W':ours<theirs?'L':'T'):null;
  const score=num(game.school_score)!=null&&num(game.opponent_score)!=null?`${team} ${game.school_score}, ${opponent} ${game.opponent_score}`:`${team} ${rel} ${opponent}`;
  return{title:`Final: ${team} ${label}`.trim(),body:`${score}${result?` (${result})`:''}`,url,tag};
}

// ---------- Web Push encryption (RFC 8291, aes128gcm) ----------
async function hmac(key,data){
  const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC',k,data));
}
// Encrypts one message for a subscription. salt and the server key pair can
// be passed for tests; otherwise they are new for every message.
export async function encryptPayload(payload,{p256dh,auth},{salt=crypto.getRandomValues(new Uint8Array(16)),serverKeys=null}={}){
  const uaPublic=fromB64url(p256dh),authSecret=fromB64url(auth);
  const keys=serverKeys||await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const asPublic=new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey));
  const uaKey=await crypto.subtle.importKey('raw',uaPublic,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const ecdh=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:uaKey},keys.privateKey,256));
  const prkKey=await hmac(authSecret,ecdh);
  const ikm=(await hmac(prkKey,concat(enc.encode('WebPush: info\0'),uaPublic,asPublic,new Uint8Array([1])))).slice(0,32);
  const prk=await hmac(salt,ikm);
  const cek=(await hmac(prk,concat(enc.encode('Content-Encoding: aes128gcm\0'),new Uint8Array([1])))).slice(0,16);
  const nonce=(await hmac(prk,concat(enc.encode('Content-Encoding: nonce\0'),new Uint8Array([1])))).slice(0,12);
  const body=typeof payload==='string'?enc.encode(payload):payload;
  const key=await crypto.subtle.importKey('raw',cek,{name:'AES-GCM'},false,['encrypt']);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,concat(body,new Uint8Array([2]))));
  const rs=new Uint8Array([0,0,16,0]);// record size 4096
  return concat(salt,rs,new Uint8Array([asPublic.length]),asPublic,cipher);
}

// ---------- VAPID (RFC 8292) ----------
export async function vapidSigningKey(publicKey,privateKey){
  const pub=fromB64url(publicKey);
  if(pub.length!==65||pub[0]!==4)throw new Error('VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 key');
  const jwk={kty:'EC',crv:'P-256',x:b64url(pub.slice(1,33)),y:b64url(pub.slice(33,65)),d:String(privateKey).trim(),ext:true};
  return crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
}
// Whether the secret and the public key work together: sign with one, verify
// with the other. Returns {ok} or {ok:false, problem} (never the key).
export async function vapidKeyCheck(publicKey,privateKey){
  try{
    const text=String(privateKey).trim();
    if(!/^[A-Za-z0-9_-]+$/.test(text))return{ok:false,problem:'VAPID_PRIVATE_KEY has characters that are not part of the key (quotes, spaces or a label?): paste only the 43-character key'};
    const d=fromB64url(text);
    if(d.length!==32)return{ok:false,problem:`VAPID_PRIVATE_KEY decodes to ${d.length} bytes; it must be the 43-character key (32 bytes), with no quotes or spaces`};
    const signing=await vapidSigningKey(publicKey,privateKey),data=enc.encode('sas-sports key check');
    const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signing,data);
    const verify=await crypto.subtle.importKey('raw',fromB64url(publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    return await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verify,sig,data)?{ok:true}:{ok:false,problem:'VAPID_PRIVATE_KEY does not match the public key'};
  }catch(error){return{ok:false,problem:`VAPID_PRIVATE_KEY could not be loaded (${error?.name||'Error'})`}}
}
export async function vapidHeader(endpoint,{publicKey,signingKey,subject,now=Date.now()}){
  const aud=new URL(endpoint).origin;
  const head=b64url(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const claims=b64url(enc.encode(JSON.stringify({aud,exp:Math.floor(now/1000)+12*3600,sub:subject})));
  const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signingKey,enc.encode(`${head}.${claims}`)));
  return`vapid t=${head}.${claims}.${b64url(sig)}, k=${publicKey}`;
}

// Sends one message. Returns {ok, status, gone}: gone means the phone has
// dropped the subscription (404/410) and it should be deleted.
export async function sendPush(sub,message,{publicKey,signingKey,subject,ttl=3600,urgency='high',fetchImpl=fetch}){
  const body=await encryptPayload(JSON.stringify(message),sub);
  const headers={'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',TTL:String(ttl),Urgency:urgency,Authorization:await vapidHeader(sub.endpoint,{publicKey,signingKey,subject})};
  if(message.tag)headers.Topic=String(message.tag).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,32);
  try{
    const r=await fetchImpl(sub.endpoint,{method:'POST',headers,body});
    return{ok:r.status>=200&&r.status<300,status:r.status,gone:r.status===404||r.status===410};
  }catch(error){return{ok:false,status:0,gone:false,error:String(error?.message||error)}}
}
