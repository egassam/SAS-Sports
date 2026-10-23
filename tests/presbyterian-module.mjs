import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {presbyterianSchool} from '../src/schools/presbyterian.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='presbyterian');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,presbyterianHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/presbyterian-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gobluehose.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['presbyterian'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',presbyterianSchool.scheduleUrls],['roster',presbyterianSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('presbyterian|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gobluehose.com',`${key} must stay on gobluehose.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://gobluehose.com/sports/acrobatics-tumbling/schedule","https://gobluehose.com/sports/acrobatics-and-tumbling/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/acrobatics-tumbling/roster","https://gobluehose.com/sports/acrobatics-and-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://gobluehose.com/sports/baseball/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gobluehose.com/sports/mens-basketball/schedule","https://gobluehose.com/sports/womens-basketball/schedule","https://gobluehose.com/sports/basketball/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/mens-basketball/roster","https://gobluehose.com/sports/womens-basketball/roster","https://gobluehose.com/sports/basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gobluehose.com/sports/cross-country/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gobluehose.com/sports/football/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gobluehose.com/sports/womens-golf/schedule","https://gobluehose.com/sports/mens-golf/schedule","https://gobluehose.com/sports/golf/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/womens-golf/roster","https://gobluehose.com/sports/mens-golf/roster","https://gobluehose.com/sports/golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://gobluehose.com/sports/womens-lacrosse/schedule","https://gobluehose.com/sports/mens-lacrosse/schedule","https://gobluehose.com/sports/lacrosse/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/womens-lacrosse/roster","https://gobluehose.com/sports/mens-lacrosse/roster","https://gobluehose.com/sports/lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://gobluehose.com/sports/womens-soccer/schedule","https://gobluehose.com/sports/wsoc/schedule","https://gobluehose.com/sports/soccer/schedule","https://gobluehose.com/sports/mens-soccer/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/womens-soccer/roster","https://gobluehose.com/sports/wsoc/roster","https://gobluehose.com/sports/soccer/roster","https://gobluehose.com/sports/mens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gobluehose.com/sports/softball/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gobluehose.com/sports/womens-tennis/schedule","https://gobluehose.com/sports/mens-tennis/schedule","https://gobluehose.com/sports/tennis/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/womens-tennis/roster","https://gobluehose.com/sports/mens-tennis/roster","https://gobluehose.com/sports/tennis/roster"],"combined":false},"Volleyball":{"schedule":["https://gobluehose.com/sports/womens-volleyball/schedule","https://gobluehose.com/sports/wvball/schedule","https://gobluehose.com/sports/volleyball/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/womens-volleyball/roster","https://gobluehose.com/sports/wvball/roster","https://gobluehose.com/sports/volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gobluehose.com/sports/wrestling/schedule","https://gobluehose.com/"],"roster":["https://gobluehose.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'presbyterian|"+sport+"':"),`${sport} routes must live in the Presbyterian module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gobluehose.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.presbyterianHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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
console.log("Presbyterian module checks passed");
