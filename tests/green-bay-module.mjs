import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {greenBaySchool} from '../src/schools/green-bay.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='green-bay');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official pages served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,greenBayHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/green-bay-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit greenbayphoenix.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['green-bay'];
assert.equal(sports.length,7);
for(const [name,map] of [['schedule',greenBaySchool.scheduleUrls],['roster',greenBaySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('green-bay|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'greenbayphoenix.com',`${key} must stay on greenbayphoenix.com`);
  }
}
const parity={"Basketball":{"schedule":["https://greenbayphoenix.com/sports/mens-basketball/schedule","https://greenbayphoenix.com/sports/womens-basketball/schedule","https://greenbayphoenix.com/sports/basketball/schedule","https://greenbayphoenix.com/"],"roster":["https://greenbayphoenix.com/sports/mens-basketball/roster","https://greenbayphoenix.com/sports/womens-basketball/roster","https://greenbayphoenix.com/sports/basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://greenbayphoenix.com/sports/cross-country/schedule","https://greenbayphoenix.com/"],"roster":["https://greenbayphoenix.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://greenbayphoenix.com/sports/womens-golf/schedule","https://greenbayphoenix.com/sports/mens-golf/schedule","https://greenbayphoenix.com/sports/golf/schedule","https://greenbayphoenix.com/"],"roster":["https://greenbayphoenix.com/sports/womens-golf/roster","https://greenbayphoenix.com/sports/mens-golf/roster","https://greenbayphoenix.com/sports/golf/roster"],"combined":false},"Soccer":{"schedule":["https://greenbayphoenix.com/sports/womens-soccer/schedule","https://greenbayphoenix.com/sports/wsoc/schedule","https://greenbayphoenix.com/sports/soccer/schedule","https://greenbayphoenix.com/sports/mens-soccer/schedule","https://greenbayphoenix.com/"],"roster":["https://greenbayphoenix.com/sports/womens-soccer/roster","https://greenbayphoenix.com/sports/wsoc/roster","https://greenbayphoenix.com/sports/soccer/roster","https://greenbayphoenix.com/sports/mens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://greenbayphoenix.com/sports/softball/schedule","https://greenbayphoenix.com/"],"roster":["https://greenbayphoenix.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://greenbayphoenix.com/sports/womens-swimming-and-diving/schedule","https://greenbayphoenix.com/sports/mens-swimming-and-diving/schedule","https://greenbayphoenix.com/sports/womens-swimming-diving/schedule","https://greenbayphoenix.com/sports/mens-swimming-diving/schedule","https://greenbayphoenix.com/sports/swimming-and-diving/schedule","https://greenbayphoenix.com/sports/swimming-diving/schedule","https://greenbayphoenix.com/sports/swimming/schedule","https://greenbayphoenix.com/"],"roster":["https://greenbayphoenix.com/sports/womens-swimming-and-diving/roster","https://greenbayphoenix.com/sports/mens-swimming-and-diving/roster","https://greenbayphoenix.com/sports/womens-swimming-diving/roster","https://greenbayphoenix.com/sports/mens-swimming-diving/roster","https://greenbayphoenix.com/sports/swimming-and-diving/roster","https://greenbayphoenix.com/sports/swimming-diving/roster","https://greenbayphoenix.com/sports/swimming/roster"],"combined":true},"Volleyball":{"schedule":["https://greenbayphoenix.com/sports/womens-volleyball/schedule","https://greenbayphoenix.com/sports/wvball/schedule","https://greenbayphoenix.com/sports/volleyball/schedule","https://greenbayphoenix.com/"],"roster":["https://greenbayphoenix.com/sports/womens-volleyball/roster","https://greenbayphoenix.com/sports/wvball/roster","https://greenbayphoenix.com/sports/volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'green-bay|"+sport+"':"),`${sport} routes must live in the Green Bay module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://greenbayphoenix.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.greenBayHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  for(const provider of worker.liveScoreboardProviders(school,sport))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Green Bay module checks passed");
