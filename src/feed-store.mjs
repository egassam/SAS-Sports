// Scheduled feed refresh. A Cron Trigger rebuilds the feeds people are
// actually viewing and stores them in Workers KV, which every Cloudflare
// location can read. Visitors are then served the stored copy and do not
// cause downloads from school sites; only a missing or overdue copy (the
// first view of a feed, or the Cron Trigger falling behind) is rebuilt on
// request, exactly as before.
//
// Keys (scope is "prod" for the production host and the Cron Trigger, and
// "preview" for any other host, so branch previews never overwrite
// production copies):
//   feed|<scope>|<version>|<school>|<sport>  feed JSON; metadata {b: built at ms, h: 1 when hot}
//   want|<scope>|<version>|<school>|<sport>  ""; metadata {t: last viewed ms}
//   cron|<scope>|<version>                   ""; metadata: last run summary

export const FEED_STORE={
  hotEveryMs:2*60*1000,        // live or game-day feeds (the school schedule page is cached 2 min)
  coolEveryMs:15*60*1000,      // everything else
  hotServeMs:5*60*1000,        // oldest stored copy a visitor is served, hot
  coolServeMs:45*60*1000,      // and otherwise
  wantedForMs:6*60*60*1000,    // keep refreshing a feed for 6 h after its last view
  wantNoteEveryS:10*60,        // a location records a view at most every 10 min per feed
  perRun:20,                   // most rebuilds in one Cron Trigger run (30 s CPU limit)
  keepS:7*24*60*60,
  readCacheS:30
};

// A feed is hot while it has a live event or an event today.
export function isHotFeed(groups){
  return(groups||[]).some(g=>(g.live||[]).length||['results','upcoming','other'].some(k=>(g[k]||[]).some(e=>e?.priority_bucket==='today')));
}

export function createFeedStore({kv,version,scope='prod',now=()=>Date.now(),cache=()=>globalThis.caches?.default,cacheOrigin=()=>null,settings=FEED_STORE}){
  const id=(kind,school,sport)=>[kind,scope,version,school,sport].join('|');
  const parse=key=>{const[, , ,school,sport]=key.split('|');return{school,sport}};
  async function read(school,sport){
    if(!kv)return null;
    try{
      const{value,metadata}=await kv.getWithMetadata(id('feed',school,sport),{type:'text',cacheTtl:settings.readCacheS});
      if(value==null||!metadata?.b)return null;
      return{body:value,builtAt:metadata.b,hot:metadata.h===1};
    }catch{return null}
  }
  // A copy is served to visitors while it is recent enough for its kind.
  const servable=entry=>Boolean(entry)&&now()-entry.builtAt<=(entry.hot?settings.hotServeMs:settings.coolServeMs);
  async function write(school,sport,body,groups){
    if(!kv)return false;
    try{await kv.put(id('feed',school,sport),body,{metadata:{b:now(),h:isHotFeed(groups)?1:0},expirationTtl:settings.keepS});return true}catch{return false}
  }
  // Record that someone viewed this feed, at most once per location every
  // ten minutes, so the Cron Trigger knows which feeds to keep fresh.
  async function noteView(school,sport){
    if(!kv)return false;
    const store=cache(),origin=cacheOrigin();let marker=null;
    if(store&&origin){
      marker=new URL('/__sas_cache/feed-viewed',origin);marker.searchParams.set('k',id('want',school,sport));marker=new Request(marker.toString());
      try{if(await store.match(marker))return false}catch{}
    }
    try{await kv.put(id('want',school,sport),'',{metadata:{t:now()},expirationTtl:Math.ceil(settings.wantedForMs/1000)+3600})}catch{return false}
    if(store&&marker)try{await store.put(marker,new Response('',{headers:{'cache-control':`max-age=${settings.wantNoteEveryS}`}}))}catch{}
    return true;
  }
  async function listAll(prefix){
    const keys=[];let cursor;
    do{const page=await kv.list({prefix,cursor});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
    return keys;
  }
  // Feeds viewed recently whose stored copy is missing or older than its
  // refresh interval, oldest first, at most perRun of them.
  async function due(){
    if(!kv)return[];
    const[wanted,stored]=await Promise.all([listAll(`want|${scope}|${version}|`),listAll(`feed|${scope}|${version}|`)]);
    const built=new Map(stored.map(k=>[`${parse(k.name).school}|${parse(k.name).sport}`,k.metadata||{}]));
    const t=now();
    return wanted.filter(k=>t-(k.metadata?.t||0)<=settings.wantedForMs).map(k=>{
      const{school,sport}=parse(k.name),meta=built.get(`${school}|${sport}`)||{};
      return{school,sport,builtAt:meta.b||0,hot:meta.h===1};
    }).filter(f=>t-f.builtAt>=(f.hot?settings.hotEveryMs:settings.coolEveryMs)).sort((a,b)=>a.builtAt-b.builtAt).slice(0,settings.perRun);
  }
  async function noteRun(summary){
    if(!kv)return;
    try{await kv.put(`cron|${scope}|${version}`,'',{metadata:{...summary,t:now()},expirationTtl:settings.keepS})}catch{}
  }
  async function status(){
    if(!kv)return{enabled:false};
    const[run,wanted,stored]=await Promise.all([kv.getWithMetadata(`cron|${scope}|${version}`,{type:'text',cacheTtl:settings.readCacheS}).catch(()=>null),listAll(`want|${scope}|${version}|`),listAll(`feed|${scope}|${version}|`)]);
    const t=now(),viewed=new Set(wanted.filter(k=>t-(k.metadata?.t||0)<=settings.wantedForMs).map(k=>k.name.replace(/^want\|/,''))),kept=stored.filter(k=>viewed.has(k.name.replace(/^feed\|/,'')));
    // Age of the stalest copy the Cron Trigger is keeping fresh.
    return{enabled:true,scope,version,last_run:run?.metadata||null,viewed_feeds:viewed.size,stored_feeds:stored.length,
      oldest_viewed_copy_s:kept.length?Math.round((t-Math.min(...kept.map(k=>k.metadata?.b||t)))/1000):null};
  }
  return{read,servable,write,noteView,due,noteRun,status};
}
