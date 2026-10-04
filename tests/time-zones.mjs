import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {arizonaSchool,createArizonaHandlers,parseArizonaRecapResults,parseArizonaGolfRecap} from '../src/schools/arizona.mjs';
import {baylorSchool,createBaylorHandlers} from '../src/schools/baylor.mjs';
import {cincinnatiSchool,createCincinnatiHandlers} from '../src/schools/cincinnati.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,baylorSchool,createBaylorHandlers,cincinnatiSchool,createCincinnatiHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {parseScoreboardPayload,scoreboardTeamMatchesSchool,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));




// Viewer time zones. The catalog gives each school's IANA zone; the page turns
// a published start (the school's wall clock, stored with a Z suffix) into the
// viewer's own zone, with its abbreviation. Date-only events stay as published.
const handlerOf=Function(...Object.keys(deps),source+';return handler;')(...Object.values(deps));
const catalog=await (await handlerOf.fetch(new Request('https://x.test/schools'),{})).json();
const zone=id=>catalog.find(s=>s.id===id).time_zone;
assert.deepEqual(['arizona','kstate','ucf','utah','byu','tennessee','penn-state'].map(zone),['America/Phoenix','America/Chicago','America/New_York','America/Denver','America/Denver','America/New_York','America/New_York']);
assert.ok(catalog.every(s=>typeof s.time_zone==='string'&&s.time_zone.includes('/')),'every school has a time zone');
const page=read('../public/index.html');
const pick=name=>{const at=page.indexOf(name);assert.ok(at>=0,name);return page.slice(at,page.indexOf('\n',at));};
const block=page.slice(page.indexOf('function zonedWallClockToInstant'),page.indexOf('const eventTime='));
const pageCode=[pick('const hasPublishedClock'),block].join('\n');
const make=viewer=>Function('allSchools','viewerTimeZone',`const schoolTimeZoneOf=id=>allSchools.find(s=>s.id===id)?.time_zone||null;${pageCode};return viewerEventTime;`)(catalog,viewer);
const az={school_id:'arizona',start_time:'2026-10-03T20:00:00.000Z',display_time:'Oct 3, 8:00 PM'};
assert.equal(make('America/Chicago')(az),'Oct 3, 10:00 PM CDT');
assert.equal(make('America/New_York')(az),'Oct 3, 11:00 PM EDT');
assert.equal(make('America/Phoenix')(az),'Oct 3, 8:00 PM MST');
assert.equal(make('America/Chicago')({...az,start_time:'2026-11-06T20:15:00.000Z',display_time:'Nov 6, 8:15 PM'}),'Nov 6, 9:15 PM CST','after daylight saving ends');
assert.equal(make('America/Chicago')({school_id:'ucf',start_time:'2026-10-30T19:30:00.000Z',display_time:'Oct 30, 7:30 PM'}),'Oct 30, 6:30 PM CDT');
assert.equal(make('Europe/London')(az),'Oct 4, 4:00 AM GMT+1','the date moves with the zone');
assert.equal(make('America/Chicago')({...az,start_time:'2026-10-24T12:00:00.000Z',display_time:'Oct 24'}),null,'date-only events keep their published date');
assert.equal(make('America/Chicago')({...az,school_id:'unknown'}),null,'no school zone: shown as published');

// The text beside a card's status badge never repeats the badge.
{
  const at=page.indexOf('function statusDetails');const code=page.slice(at,page.indexOf('\n}\n',at)+2);
  const details=Function('eventTime',`${code};return statusDetails;`)(e=>e.display_time);
  assert.equal(details({status:'Upcoming',recency_label:'Upcoming',display_time:'Oct 24'}),'Oct 24');
  assert.equal(details({status:'Final',recency_label:'Final',display_time:'Sep 26'}),'Sep 26');
  assert.equal(details({status:'Today',recency_label:'Today',display_time:'Oct 3, 8:00 PM'}),'Oct 3, 8:00 PM');
  assert.equal(details({status:'Live',recency_label:'Live now'}),'');
  assert.equal(details({status:'Today',recency_label:'In progress',display_time:'Sep 28'}),'In progress · Sep 28','a label that adds something stays');
  assert.equal(details({status:'Final',recency_label:'Saved schedule',display_time:'Sep 26'}),'Saved schedule · Sep 26');
}
console.log('Time zone and status text checks passed');
