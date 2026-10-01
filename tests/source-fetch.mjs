// Polite official-site access: caching, revalidation, backoff and robots.txt.
import assert from 'node:assert/strict';
import {createSourceFetch,parseRobots,robotsAllows,SOURCE_TTL} from '../src/source-fetch.mjs';

class MemoryCache{
  constructor(clock){this.clock=clock;this.entries=new Map()}
  async match(request){
    const hit=this.entries.get(request.url);if(!hit)return undefined;
    if(this.clock.t>hit.expires){this.entries.delete(request.url);return undefined}
    return hit.response.clone();
  }
  async put(request,response){
    const maxAge=Number((response.headers.get('cache-control')||'').match(/max-age=(\d+)/)?.[1]||0);
    this.entries.set(request.url,{response:response.clone(),expires:this.clock.t+maxAge*1000});
  }
}
function site(routes){
  const calls=[];
  const fetch=async(url,init)=>{
    calls.push({url,headers:init.headers});
    const route=routes[new URL(url).pathname];
    const value=typeof route==='function'?route(init):route;
    if(!value)return new Response('missing',{status:404});
    return value instanceof Response?value:new Response(value,{headers:{'content-type':'text/html'}});
  };
  return{fetch,calls,pageCalls:path=>calls.filter(c=>new URL(c.url).pathname===path).length};
}
function setup(routes){
  const clock={t:Date.parse('2026-10-01T12:00:00Z')},cache=new MemoryCache(clock),s=site(routes);
  const sourceFetch=createSourceFetch({fetch:s.fetch,headers:{'User-Agent':'SAS-Sports/test'},cache:()=>cache,cacheOrigin:()=>'https://sas.test',now:()=>clock.t});
  return{...s,clock,cache,sourceFetch};
}
const PAGE='https://school.test/sports/football/schedule';

// 1. A burst of forced refreshes reaches the school once per freshness window.
{
  const {sourceFetch,pageCalls,clock}=setup({'/robots.txt':new Response('User-agent: *\nDisallow: /admin/',{headers:{'content-type':'text/plain'}}),'/sports/football/schedule':'<html>schedule</html>'});
  for(let i=0;i<36;i++){const r=await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule});assert.equal(r.status,200);assert.equal(await r.text(),'<html>schedule</html>');assert.equal(r.url,PAGE)}
  assert.equal(pageCalls('/sports/football/schedule'),1,'36 refreshes must cost one school request');
  assert.equal(pageCalls('/robots.txt'),1);
  clock.t+=(SOURCE_TTL.schedule+1)*1000;await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule});
  assert.equal(pageCalls('/sports/football/schedule'),2,'an expired copy is fetched again');
  assert.equal(pageCalls('/robots.txt'),1,'robots.txt is kept for a day');
}

// 2. Honest headers are sent; expired copies are revalidated and a 304 reuses the body.
{
  const {sourceFetch,calls,clock}=setup({'/sports/football/schedule':init=>init.headers['If-None-Match']==='"v1"'?new Response(null,{status:304}):new Response('<html>v1</html>',{headers:{etag:'"v1"','content-type':'text/html'}})});
  await sourceFetch(PAGE);
  assert.equal(calls.find(c=>c.url===PAGE).headers['User-Agent'],'SAS-Sports/test');
  clock.t+=(SOURCE_TTL.article+1)*1000;
  const r=await sourceFetch(PAGE);
  assert.equal(r.status,200);assert.equal(await r.text(),'<html>v1</html>');assert.equal(r.headers.get('x-sas-source'),'revalidated');
  assert.equal(calls.at(-1).headers['If-None-Match'],'"v1"');
}

// 3. 429 with Retry-After: no further requests until it ends.
{
  let busy=true;
  const {sourceFetch,pageCalls,clock}=setup({'/sports/football/schedule':()=>busy?new Response('slow down',{status:429,headers:{'retry-after':'300'}}):'<html>ok</html>'});
  assert.equal((await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule})).status,429);
  for(let i=0;i<10;i++)assert.equal((await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule})).status,503);
  assert.equal((await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule})).headers.get('x-sas-upstream-status'),'429','a backoff reports what the school returned');
  assert.equal(pageCalls('/sports/football/schedule'),1,'backoff must not touch the school');
  busy=false;clock.t+=299*1000;await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule});
  assert.equal(pageCalls('/sports/football/schedule'),1,'Retry-After is honoured in full');
  clock.t+=2*1000;assert.equal((await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule})).status,200);
  assert.equal(pageCalls('/sports/football/schedule'),2);
}

// 4. A refusal of an article keeps serving the last good copy; a schedule page does not.
{
  let refuse=false;
  const ARTICLE='https://school.test/news/2026/9/27/recap.aspx';
  const {sourceFetch,clock}=setup({'/news/2026/9/27/recap.aspx':()=>refuse?new Response('blocked',{status:403}):'<html>recap</html>','/sports/football/schedule':()=>refuse?new Response('blocked',{status:403}):'<html>schedule</html>'});
  await sourceFetch(ARTICLE);await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule});
  refuse=true;clock.t+=(SOURCE_TTL.article+1)*1000;
  const article=await sourceFetch(ARTICLE);
  assert.equal(article.status,200);assert.equal(await article.text(),'<html>recap</html>');assert.equal(article.headers.get('x-sas-source'),'stale-on-error');
  assert.equal((await sourceFetch(PAGE,{},{ttl:SOURCE_TTL.schedule})).status,403,'live schedules are never served stale');
}

// 5. robots.txt rules are obeyed without requesting the page.
{
  const {sourceFetch,pageCalls}=setup({'/robots.txt':new Response('User-agent: *\nDisallow: /documents/\n',{headers:{'content-type':'text/plain'}}),'/documents/2026/9/1/results.pdf':'pdf'});
  const r=await sourceFetch('https://school.test/documents/2026/9/1/results.pdf');
  assert.equal(r.status,403);assert.equal(r.headers.get('x-sas-source'),'robots-disallowed');
  assert.equal(pageCalls('/documents/2026/9/1/results.pdf'),0);
}
// A robots.txt the bot defense refuses (HTML challenge) disallows nothing, and is not re-requested.
{
  const {sourceFetch,pageCalls}=setup({'/robots.txt':new Response('<html>Incapsula</html>',{status:403,headers:{'content-type':'text/html'}}),'/sports/football/schedule':'<html>ok</html>'});
  assert.equal((await sourceFetch(PAGE)).status,200);
  await sourceFetch('https://school.test/sports/soccer/schedule');
  assert.equal(pageCalls('/robots.txt'),1);
}

// 6. robots.txt parsing.
{
  const text='User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /services/\nDisallow: /*.pdf$\nAllow: /services/public\n';
  const rules=parseRobots(text);
  assert.equal(robotsAllows(rules,'https://x.test/sports/football/schedule'),true);
  assert.equal(robotsAllows(rules,'https://x.test/services/schedule_txt.ashx'),false);
  assert.equal(robotsAllows(rules,'https://x.test/services/public/feed'),true);
  assert.equal(robotsAllows(rules,'https://x.test/a/b.pdf'),false);
  assert.equal(robotsAllows(rules,'https://x.test/a/b.pdf?x=1'),true);
  assert.equal(robotsAllows(parseRobots('User-agent: SAS-Sports\nDisallow: /news/\n\nUser-agent: *\nDisallow:\n'),'https://x.test/news/a'),false,'our own group wins over *');
  assert.equal(robotsAllows(parseRobots(''),'https://x.test/anything'),true);
}

// 7. Without a Cache API (Node, tests) it is a plain fetch with our headers.
{
  const s=site({'/sports/football/schedule':'<html>plain</html>'});
  const sourceFetch=createSourceFetch({fetch:s.fetch,headers:{'User-Agent':'SAS-Sports/test'},cache:()=>undefined});
  assert.equal(await (await sourceFetch(new URL(PAGE))).text(),'<html>plain</html>');
  assert.equal(s.calls[0].headers['User-Agent'],'SAS-Sports/test');
}
// 8. Cache API calls share the per-request subrequest budget: a cold download
// costs one match and one put, a cached one a single match, a refusal one put.
{
  const {sourceFetch,cache}=setup({'/robots.txt':new Response('User-agent: *\nDisallow:\n',{headers:{'content-type':'text/plain'}}),'/sports/football/schedule':'<html>s</html>','/sports/soccer/schedule':new Response('no',{status:403})});
  let ops=0;for(const name of['match','put']){const original=cache[name].bind(cache);cache[name]=(...a)=>{ops++;return original(...a)}}
  await sourceFetch(PAGE);ops=0;
  await sourceFetch('https://school.test/sports/volleyball/schedule');assert.ok(ops<=2,`cold download used ${ops} cache calls`);
  ops=0;await sourceFetch(PAGE);assert.equal(ops,1,'a cached page costs one match');
  ops=0;await sourceFetch('https://school.test/sports/soccer/schedule');assert.ok(ops<=2,`refusal used ${ops} cache calls`);
  ops=0;assert.equal((await sourceFetch('https://school.test/sports/soccer/schedule')).status,503);assert.equal(ops,1,'backoff costs one match');
}
console.log('source-fetch: 8 groups passed');
