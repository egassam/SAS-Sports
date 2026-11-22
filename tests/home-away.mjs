// Home, away or neutral on every game (user, November 22, 2026: "You need to
// make these obvious if it's a home game or away for all sports", with the
// K-State women's basketball spotlight "K-State vs Missouri", a neutral-site
// game in Kansas City that read like a home game).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sidearmScheduleGames} from '../src/sidearm-schedule-data.mjs';
import {PRO_TEAMS,espnTeamGames} from '../src/pro-sports.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const gz=path=>gunzipSync(readFileSync(new URL(path,import.meta.url))).toString('utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const worker=Function(...Object.keys(deps),source+';return {parseHtml,highSchoolEvent};')(...Object.values(deps));

// 1. SIDEARM (college): every game takes the schedule's H/A/N mark, finals
// too. Alabama A&M football: the Aug 29 and Oct 3 neutral-site finals read
// "vs" in the title and must still say neutral. Mutation: without the mark a
// neutral final has no home_away.
{
  const raw=gz('./fixtures/alabama-am-module/football-schedule.html.gz');
  const marks=sidearmScheduleGames(raw).map(g=>({day:g.date.slice(0,10),mark:{H:'home',A:'away',N:'neutral'}[g.location_indicator]}));
  const school=schools.find(s=>s.id==='alabama-am');
  const events=worker.parseHtml(raw,school,'Football','https://aamusports.com/sports/football/schedule',new Date('2026-10-24T15:00:00Z'));
  assert.ok(events.length>=10,'the schedule is read');
  for(const e of events){
    assert.ok(['home','away','neutral'].includes(e.home_away),`${e.title} is marked`);
    if(e.home_away==='away')assert.match(e.title,/ at /,'away reads "at"');
  }
  assert.ok(events.some(e=>e.status==='Final'&&e.home_away==='neutral'),'a neutral final says neutral');
  assert.deepEqual(new Set(events.map(e=>e.home_away)),new Set(marks.map(m=>m.mark)));
}

// 2. ESPN (pro): home and away from ESPN's own side.
{
  const okc=schools.find(s=>s.id==='oklahoma-city-thunder')||{id:'oklahoma-city-thunder',name:'Oklahoma City Thunder',short_name:'Thunder'};
  const games=espnTeamGames([JSON.parse(gz('./fixtures/pro-sports/nba-okc-2027.json.gz'))],{school:okc,config:PRO_TEAMS['oklahoma-city-thunder'],timeZone:'America/Chicago',now:new Date('2026-11-08T18:00:00Z')});
  assert.ok(games.length>50);
  for(const e of games)assert.equal(e.home_away,/ at /.test(e.title)?'away':'home',e.title);
}

// 3. High school: Bound's or MaxPreps' mark, a neutral site included.
{
  const school=schools.find(s=>s.id==='manhattan-ks');
  const base={school,sport:'Basketball',team:'Boys',date:'2027-01-08',time:'19:00',opponent:'Salina Central',named:false,contest:null,sourceUrl:'https://example.test/',now:new Date('2026-11-22T15:00:00Z')};
  assert.equal(worker.highSchoolEvent({...base,relation:'vs',site:'HOME'}).home_away,'home');
  assert.equal(worker.highSchoolEvent({...base,relation:'at',site:'AWAY'}).home_away,'away');
  assert.equal(worker.highSchoolEvent({...base,relation:'vs',site:'NEUTRAL'}).home_away,'neutral');
  assert.equal(worker.highSchoolEvent({...base,relation:'vs',contest:{site:'NEUTRAL'}}).home_away,'neutral','MaxPreps\' mark');
  assert.equal(worker.highSchoolEvent({...base,relation:'at'}).home_away,'away','"at" alone is away');
  assert.equal(worker.highSchoolEvent({...base,relation:'vs'}).home_away,undefined,'"vs" alone is not guessed on the server');
}

// 4. The page: a pill on the spotlight, every card, the live board and the
// expanded view; the schedule's mark wins over the title.
{
  const page=read('../public/index.html');
  const start=page.indexOf('// Home, away or neutral: the schedule\'s own mark'),end=page.indexOf('function liveSides(e){');
  assert.ok(start>0&&end>start,'the helper is found');
  const {homeAway,haPill}=Function(page.slice(start,end)+';return{homeAway,haPill};')();
  assert.equal(homeAway({title:"Women's · K-State vs Missouri",site:{place:'Kansas City, Mo.',indicator:'N'}}),'neutral','the screenshot\'s game');
  assert.equal(homeAway({title:'K-State vs Arizona',home_away:'neutral'}),'neutral');
  assert.equal(homeAway({title:"Men's · K-State at Seton Hall"}),'away');
  assert.equal(homeAway({title:'Girls · Manhattan at Hays Tournament'}),'away');
  assert.equal(homeAway({title:'Steelers vs Cleveland Browns'}),'home');
  assert.equal(homeAway({title:'Manhattan · Manhattan Invite'}),null,'no side named, no pill');
  assert.equal(homeAway({title:'Manhattan · Manhattan Invite',home_away:'home'}),'home');
  assert.match(haPill({title:'K-State vs Missouri',site:{indicator:'N'}}),/class="ha ha-neutral"[^>]*>Neutral</);
  assert.equal(haPill({title:'Manhattan · Invite'}),'');
  for(const where of ['spotlight-where','${badge(e)}${haPill(e)}','away,where}=liveSides(e)','<span>Site</span>'])assert.ok(page.includes(where),`the pill is shown: ${where}`);
}
console.log('home-away tests passed');
