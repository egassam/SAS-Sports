import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {portlandSchool} from '../src/schools/portland.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='portland');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,portlandHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/portland-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit portlandpilots.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['portland'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',portlandSchool.scheduleUrls],['roster',portlandSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('portland|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'portlandpilots.com',`${key} must stay on portlandpilots.com`);
  }
}
const parity={"Baseball":{"schedule":["https://portlandpilots.com/sports/baseball/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://portlandpilots.com/sports/mens-basketball/schedule","https://portlandpilots.com/sports/womens-basketball/schedule","https://portlandpilots.com/sports/basketball/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/mens-basketball/roster","https://portlandpilots.com/sports/womens-basketball/roster","https://portlandpilots.com/sports/basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://portlandpilots.com/sports/beach-volleyball/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://portlandpilots.com/sports/cross-country/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/cross-country/roster"],"combined":false},"Rowing":{"schedule":["https://portlandpilots.com/sports/womens-rowing/schedule","https://portlandpilots.com/sports/rowing/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/womens-rowing/roster","https://portlandpilots.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://portlandpilots.com/sports/womens-soccer/schedule","https://portlandpilots.com/sports/wsoc/schedule","https://portlandpilots.com/sports/soccer/schedule","https://portlandpilots.com/sports/mens-soccer/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/womens-soccer/roster","https://portlandpilots.com/sports/wsoc/roster","https://portlandpilots.com/sports/soccer/roster","https://portlandpilots.com/sports/mens-soccer/roster"],"combined":false},"Tennis":{"schedule":["https://portlandpilots.com/sports/womens-tennis/schedule","https://portlandpilots.com/sports/mens-tennis/schedule","https://portlandpilots.com/sports/tennis/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/womens-tennis/roster","https://portlandpilots.com/sports/mens-tennis/roster","https://portlandpilots.com/sports/tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://portlandpilots.com/sports/track-and-field/schedule","https://portlandpilots.com/sports/track-field/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/track-and-field/roster","https://portlandpilots.com/sports/track-field/roster"],"combined":false},"Volleyball":{"schedule":["https://portlandpilots.com/sports/womens-volleyball/schedule","https://portlandpilots.com/sports/wvball/schedule","https://portlandpilots.com/sports/volleyball/schedule","https://portlandpilots.com/"],"roster":["https://portlandpilots.com/sports/womens-volleyball/roster","https://portlandpilots.com/sports/wvball/roster","https://portlandpilots.com/sports/volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'portland|"+sport+"':"),`${sport} routes must live in the Portland module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://portlandpilots.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.portlandHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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
console.log("Portland module checks passed");
