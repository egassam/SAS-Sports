// Polite access to official school sites. Every download from a school goes
// through one cached fetcher so a burst of SAS Sports traffic (visitors, the
// forced-refresh merge gate, the daily health check) reaches each school as a
// small, steady trickle:
// - one copy of each page per Cloudflare location per freshness window;
// - expired copies are revalidated with If-None-Match / If-Modified-Since;
// - 429/503 Retry-After and other refusals start a backoff with no new
//   requests to that page until it ends;
// - robots.txt rules for "SAS-Sports" (or "*") are obeyed.
// Without a Cache API (Node tests) it is a plain fetch.

export const SOURCE_TTL={schedule:120,listing:600,article:1800,document:6*3600};
const KEEP_SECONDS=24*3600,ROBOTS_TTL=24*3600,DEFAULT_BACKOFF=60,MAX_BACKOFF=3600;
const CACHE_VERSION='1';

// robots.txt: the group naming our product token wins over "*"; within the
// group the longest matching Allow/Disallow rule wins, Allow on a tie.
export function parseRobots(text,agent='sas-sports'){
  const groups=[];let current=null,lastWasAgent=false;
  for(const raw of String(text||'').split(/\r?\n/)){
    const line=raw.replace(/#.*/,'').trim(),m=line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);if(!m)continue;
    const field=m[1].toLowerCase(),value=m[2].trim();
    if(field==='user-agent'){if(!lastWasAgent){current={agents:[],rules:[]};groups.push(current)}current.agents.push(value.toLowerCase());lastWasAgent=true;continue}
    lastWasAgent=false;
    if(current&&(field==='allow'||field==='disallow'))current.rules.push({allow:field==='allow',path:value});
  }
  const named=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.includes(a)));
  const chosen=named.length?named:groups.filter(g=>g.agents.includes('*'));
  return chosen.flatMap(g=>g.rules).filter(r=>r.path);
}
function ruleMatches(rulePath,path){
  const anchored=rulePath.endsWith('$'),body=anchored?rulePath.slice(0,-1):rulePath;
  const pattern=body.split('*').map(s=>s.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*');
  return new RegExp('^'+pattern+(anchored?'$':'')).test(path);
}
export function robotsAllows(rules,url){
  const u=new URL(url),path=u.pathname+u.search;let best=null;
  for(const rule of rules)if(ruleMatches(rule.path,path)&&(!best||rule.path.length>best.path.length||rule.path.length===best.path.length&&rule.allow))best=rule;
  return!best||best.allow;
}

function retryAfterSeconds(response){
  const value=response.headers.get('retry-after');if(!value)return DEFAULT_BACKOFF;
  const seconds=/^\d+$/.test(value.trim())?Number(value):Math.ceil((Date.parse(value)-Date.now())/1000);
  return Math.min(MAX_BACKOFF,Math.max(DEFAULT_BACKOFF,Number.isFinite(seconds)?seconds:DEFAULT_BACKOFF));
}
function withUrl(response,url){Object.defineProperty(response,'url',{value:url});return response}
function synthetic(status,url,reason){return withUrl(new Response('',{status,headers:{'x-sas-source':reason}}),url)}

export function createSourceFetch({fetch:rawFetch,headers,cache=()=>globalThis.caches?.default,cacheOrigin=()=>null,now=()=>Date.now()}){
  // One cache entry per page holds its body and any backoff, so a download
  // costs at most one match and one put. robots.txt rules are also kept in
  // memory for the isolate's lifetime (up to a day).
  const robotsMemo=new Map();
  const keyFor=url=>{
    const origin=cacheOrigin();if(!origin)return null;
    const key=new URL('/__sas_cache/source',origin);key.searchParams.set('v',CACHE_VERSION);key.searchParams.set('u',url);
    return new Request(key.toString(),{method:'GET'});
  };
  async function save(store,key,{body,status,finalUrl,from,fetchedAt,backoffUntil=0,placeholder=false}){
    const h=new Headers({'cache-control':`max-age=${Math.max(KEEP_SECONDS,Math.ceil((backoffUntil-now())/1000))}`,'x-sas-status':String(status),'x-sas-final-url':finalUrl,'x-sas-fetched-at':new Date(fetchedAt).toISOString()});
    if(backoffUntil)h.set('x-sas-backoff-until',String(backoffUntil));
    if(placeholder)h.set('x-sas-placeholder','1');
    for(const name of['content-type','etag','last-modified']){const v=from?.headers.get(name)||from?.headers.get(`x-sas-${name}`);if(v)h.set(`x-sas-${name}`,v)}
    try{await store.put(key,new Response(body,{status:200,headers:h}))}catch{}
  }
  function fromCache(entry,body,state){
    const h=new Headers({'x-sas-source':state});const type=entry.headers.get('x-sas-content-type');if(type)h.set('content-type',type);
    return withUrl(new Response(body,{status:Number(entry.headers.get('x-sas-status'))||200,headers:h}),entry.headers.get('x-sas-final-url')||'');
  }
  async function robotsRules(url){
    const origin=new URL(url).origin,memo=robotsMemo.get(origin);
    if(memo&&memo.expires>now())return memo.rules;
    const response=await sourceFetch(`${origin}/robots.txt`,{},{ttl:ROBOTS_TTL,robots:false,cacheErrors:true});
    // No readable robots.txt (missing, or refused by the site's bot defense):
    // nothing is disallowed.
    const rules=response.ok&&/text\/plain/i.test(response.headers.get('content-type')||'text/plain')?parseRobots(await response.text()):[];
    robotsMemo.set(origin,{rules,expires:now()+ROBOTS_TTL*1000});
    return rules;
  }
  async function sourceFetch(input,init={},{ttl=SOURCE_TTL.article,robots=true,staleOnError=ttl>=SOURCE_TTL.listing,cacheErrors=false}={}){
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    const send=(extra={})=>rawFetch(url,{redirect:'follow',...init,headers:{...headers,...(init.headers||{}),...extra}});
    const store=cache(),key=store&&keyFor(url);
    if(!store||!key)return send();
    let entry=null;try{entry=await store.match(key)}catch{}
    const placeholder=entry?.headers.get('x-sas-placeholder')==='1';
    const body=entry&&!placeholder?await entry.arrayBuffer():null;
    const age=entry?(now()-Date.parse(entry.headers.get('x-sas-fetched-at')||''))/1000:Infinity;
    if(body&&age<=ttl)return fromCache(entry,body,'fresh');
    const stale=()=>body&&staleOnError?fromCache(entry,body,'stale-on-error'):null;
    const backoffUntil=Number(entry?.headers.get('x-sas-backoff-until')||0);
    if(backoffUntil>now())return stale()||synthetic(503,url,'backoff');
    if(robots&&!robotsAllows(await robotsRules(url),url))return synthetic(403,url,'robots-disallowed');
    const conditional={};
    if(body){const etag=entry.headers.get('x-sas-etag'),modified=entry.headers.get('x-sas-last-modified');if(etag)conditional['If-None-Match']=etag;if(modified)conditional['If-Modified-Since']=modified}
    let response;
    try{response=await send(conditional)}
    catch(error){const fallback=stale();if(fallback)return fallback;throw error}
    const fetchedAt=now();
    if(response.status===304&&body){
      await save(store,key,{body,status:Number(entry.headers.get('x-sas-status'))||200,finalUrl:entry.headers.get('x-sas-final-url')||url,from:entry,fetchedAt});
      return fromCache(entry,body,'revalidated');
    }
    if(!response.ok&&!cacheErrors){
      // A refusal or overload starts a backoff: no new request to this page
      // until it ends, honouring Retry-After when the site sends one. A saved
      // copy is kept for articles and documents.
      const until=fetchedAt+([429,503].includes(response.status)?retryAfterSeconds(response):DEFAULT_BACKOFF)*1000;
      if(body)await save(store,key,{body,status:Number(entry.headers.get('x-sas-status'))||200,finalUrl:entry.headers.get('x-sas-final-url')||url,from:entry,fetchedAt:Date.parse(entry.headers.get('x-sas-fetched-at')),backoffUntil:until});
      else await save(store,key,{body:'',status:response.status,finalUrl:response.url||url,fetchedAt,backoffUntil:until,placeholder:true});
      return stale()||withUrl(response,response.url||url);
    }
    // robots.txt keeps its answer, a refusal included, for a day.
    const fresh=await response.arrayBuffer(),finalUrl=response.url||url;
    await save(store,key,{body:fresh,status:response.status,finalUrl,from:response,fetchedAt});
    return withUrl(new Response(fresh,{status:response.status,headers:{'content-type':response.headers.get('content-type')||'','x-sas-source':'network'}}),finalUrl);
  }
  return sourceFetch;
}
