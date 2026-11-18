// Professional track and field (user, November 18, 2026: "Start with wnba
// and track and field. Track will be hard with most results in other
// countries so you will need to be creative"): Pro → Track & Field → the
// Diamond League, World Athletics (World Championships and the World
// Indoor Tour) and USATF (the USA Championships), every meet read from
// World Athletics' calendar and results pages. Fixtures saved Nov 18, 2026
// (the page's data only): the Diamond League calendar for 2026-27, the
// Brussels final's two days (Sep 4-5), the World Indoor Championships'
// second day (Toruń, Mar 21: a 400 m final run in two sections, a world
// record in the heptathlon) and the Ultimate Championship's first day
// (Budapest, Sep 11: semifinals beside finals).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,worldAthleticsCalendar,worldAthleticsFinals,worldAthleticsMeets,worldAthleticsDetails,worldAthleticsDays,athleteName,eventShortName,meetPlace,WORLD_ATHLETICS} from '../src/pro-sports.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=name=>gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.html.gz`,import.meta.url))).toString('utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js'),html=read('../public/index.html');
const EASTERN='America/New_York',now=new Date('2026-11-18T18:00:00Z');

// Catalog: four entries under Track & Field, each a group of meets.
const track=schools.filter(s=>s.level==='pro'&&s.pro_sport==='Track & Field');
assert.deepEqual(track.map(s=>[s.id,s.league,s.short_name]),[
  ['diamond-league','Diamond League','Diamond League'],
  ['world-athletics-championships','World Athletics','World Championships'],
  ['world-indoor-tour','World Athletics','World Indoor Tour'],
  ['usa-championships','USATF','USA Championships']
]);
for(const s of track){
  assert.deepEqual(sponsoredSports[s.id],['Track & Field']);
  assert.match(teamThemes[s.id]?.primary||'',/^#[0-9A-F]{6}$/,s.id);
  const config=proTeam(s.id);
  assert.equal(config.kind,'world-athletics');assert.equal(config.sport,'Track & Field');assert.ok(config.calendars.length,s.id);
}
assert.ok(html.includes("sport==='Track & Field'?'Meets'"),'the third box reads Meets');

// Names and places as World Athletics prints them, read for the page.
assert.deepEqual(['Oblique SEVILLE','Andy DÍAZ HERNÁNDEZ','Khaleb MCRAE',"Ja'Kobe THARP",'Belgium','Mondo DUPLANTIS'].map(athleteName),['Oblique Seville','Andy Díaz Hernández','Khaleb McRae',"Ja'Kobe Tharp",'Belgium','Mondo Duplantis']);
assert.deepEqual(["Men's 100 Metres","Women's 3000 Metres Steeplechase","Men's 35 Kilometres Race Walk","Mixed 4x400 Metres Relay Short Track","Men's High Jump"].map(eventShortName),["Men's 100m","Women's 3000m Steeplechase","Men's 35km Race Walk","Mixed 4x400m Relay Short Track","Men's High Jump"]);
assert.deepEqual(['Letzigrund, Zürich (SUI)','Hayward Field, Eugene, OR (USA)','Hefei (CHN)'].map(meetPlace),['Zürich (SUI)','Eugene, OR (USA)','Hefei (CHN)']);

// The calendar: 15 meetings of 2026 (all with results) and 15 of 2027.
const meets=worldAthleticsCalendar([page('wa-calendar-diamond-league-2026-11-18')]);
assert.equal(meets.length,30);
assert.equal(meets.filter(m=>m.from.startsWith('2026')&&m.hasResults).length,15);
const brussels=meets.find(m=>m.id===7214029);
assert.deepEqual([brussels.name,brussels.venue,brussels.from,brussels.to,worldAthleticsDays(brussels)],['Allianz Memorial van Damme','Boudewijnstadion, Bruxelles (BEL)','2026-09-04','2026-09-05',2]);
// An entry's name and place filter (the USA Championships' loose search).
assert.deepEqual(worldAthleticsCalendar([page('wa-calendar-diamond-league-2026-11-18')],{match:{name:/^Prefontaine/,venue:/\(USA\)$/}}).map(m=>m.from),['2026-07-03','2027-07-03']);

// Brussels: every final of both days; the season winners' second
// "Diamond Discipline" list is the same event; the meeting's promotional
// races reuse the main events' ids and stay their own; U18 races are left out.
const day1=worldAthleticsFinals(page('wa-results-7214029-day1')),day2=worldAthleticsFinals(page('wa-results-7214029-day2'));
assert.equal(day1.events.length,18);assert.equal(day2.events.length,18);
const m400=day1.events.filter(e=>/^Men's 400m/.test(e.short));
assert.deepEqual(m400.map(e=>[e.short,e.results[0].name,e.results[0].mark,e.results.length]),[["Men's 400m",'Busang Collen Kebinatshipi','43.40',7],["Men's 400m · Promotional",'Lee Eppie','44.50',8]]);
assert.ok(!day1.events.some(e=>/1000m|U18/.test(e.short)),'no U18 races');
const m100=day1.events[0];
assert.deepEqual(m100.results[0],{place:1,name:'Oblique Seville',country:'JAM',mark:'9.90',records:[],wind:'+0.1'});
assert.deepEqual(day2.events.find(e=>e.short==="Men's 5000m").results[0].records,['AR']);
// The Indoor Championships: a final in two sections is one order by time;
// a relay names its team; the heptathlon's world record is tagged.
const toruń=worldAthleticsFinals(page('wa-results-7199326-day2'));
const s400=toruń.events.find(e=>e.short==="Men's 400m Short Track");
assert.deepEqual(s400.results.slice(0,4).map(r=>[r.place,r.name,r.country,r.mark]),[[1,'Christopher Morales Williams','CAN','44.76'],[2,'Khaleb McRae','USA','45.03'],[3,'Jereem Richards','TTO','45.39'],[4,'Chris Robinson','USA','45.55']]);
assert.deepEqual(toruń.events.find(e=>/Heptathlon/.test(e.short)).results[0],{place:1,name:'Simon Ehammer',country:'SUI',mark:'6670',records:['WR','AR'],wind:null});
const relay=toruń.events.find(e=>e.relay);
assert.deepEqual([relay.short,relay.results[0].name,relay.results[0].country,relay.results[0].mark],['Mixed 4x400m Relay Short Track','Belgium','BEL','3:15.60']);
assert.ok(!toruń.events.some(e=>/^Men's 800m/.test(e.short)),'semifinals only that day: not a final');
// Budapest, day one: finals only (the 400 m semifinals are not listed).
const budapest=worldAthleticsFinals(page('wa-results-7212925-day1'));
assert.deepEqual(budapest.events.map(e=>e.short),["Men's 5000m","Men's 110m Hurdles","Men's Pole Vault","Men's Hammer Throw","Women's 100m Hurdles","Women's High Jump","Women's Long Jump","Mixed 4x100m Relay"]);

// The entry's meets on Nov 18: Brussels Final (its results are read), the
// other 2026 meetings unread here (not listed), 2027's 15 coming.
const school=track[0],config=PRO_TEAMS['diamond-league'];
const finals=new Map([[7214029,[...day1.events,...day2.events]]]);
const events=worldAthleticsMeets(meets,{school,config,timeZone:EASTERN,now,finals});
assert.deepEqual(events.map(e=>e.status).join(','),['Final',...Array(15).fill('Upcoming')].join(','));
const final=events[0];
assert.deepEqual([final.title,final.display_time,final.opponent,final.event_type,final.headline,final.end_time,final.source.url],['Allianz Memorial van Damme','Sep 4-5','Bruxelles (BEL)','MEET','36 finals','2026-09-05T23:59:00.000Z',`${WORLD_ATHLETICS}/competition/calendar-results/results/7214029`]);
// The card: six winners, records first, then the main events in order.
assert.deepEqual(final.race_card.map(r=>[r.make,r.driver,r.car,r.note,r.team]),[
  ["Women's Shot Put",'Chase Jackson','USA','21.14','AR'],["Men's 5000m",'Birhanu Balew','BRN','12:45.70','AR'],
  ["Men's 100m",'Oblique Seville','JAM','9.90 (+0.1)',''],["Men's 400m",'Busang Collen Kebinatshipi','BOT','43.40',''],
  ["Men's 800m",'Emmanuel Wanyonyi','KEN','1:41.80',''],["Men's 1500m",'Cameron Myers','AUS','3:30.14','']
]);
assert.equal(final.race_table.length,36);assert.ok(final.has_more_results);
assert.deepEqual(final.results[0],{participant:'Chase Jackson (USA)',result:"Women's Shot Put · 21.14 · AR"});
const doha=events[1];
assert.deepEqual([doha.title,doha.display_time,doha.start_time,doha.results],['Doha Meeting','May 7','2027-05-07T00:00:00.000Z',[{label:'Venue',value:'Suhaim bin Hamad Stadium, Doha (QAT)'},{label:'Dates',value:'May 7'},{label:'Meeting',value:'1 of 15'}]]);
// Brussels on its first day: Today with the finals so far.
const live=worldAthleticsMeets(meets,{school,config,timeZone:EASTERN,now:new Date('2026-09-04T21:00:00Z'),finals:new Map([[7214029,day1.events]])}).find(e=>e.world_athletics_id===7214029);
assert.deepEqual([live.status,live.recency_label,live.race_table.length],['Today','Results so far: 18 finals',18]);
// A past meet with no results is not listed.
assert.ok(!events.some(e=>e.world_athletics_id===7214028),'Zürich unread: not listed');

// The meet window: every final under its event, the records and the U.S. winners.
const details=worldAthleticsDetails(brussels,finals.get(7214029));
assert.deepEqual(details.lines,[
  'Allianz Memorial van Damme, Boudewijnstadion, Bruxelles (BEL): 36 finals.',
  "Area records: Chase Jackson (USA), Women's Shot Put, 21.14; Birhanu Balew (BRN), Men's 5000m, 12:45.70.",
  "Winners from the United States: Ja'Kobe Tharp (USA), Men's 110m Hurdles, 13.03 (-0.2); Anna Cockrell (USA), Women's 400m Hurdles, 53.01; Chase Jackson (USA), Women's Shot Put, 21.14; Kenneth Bednarek (USA), Men's 200m, 19.62 (+0.8); Masai Russell (USA), Women's 100m Hurdles, 12.20 (+1.0); Hana Moll (USA), Women's Pole Vault, 4.91; Monae' Nichols (USA), Women's Long Jump, 6.91 (+0.1)."
]);
assert.deepEqual(details.stats,[{label:'Finals',value:'36'},{label:'Venue',value:'Boudewijnstadion, Bruxelles (BEL)'},{label:'Countries with a winner',value:'20'},{label:'U.S. winners',value:'7'}]);
assert.deepEqual(details.table[0],{group:"Men's 100m",pos:1,driver:'Oblique Seville',car:'JAM',make:'',team:'',laps_led:0,status:'',note:'9.90 (+0.1)'});
assert.deepEqual(details.rows[1],{group:"Men's 100m",participant:'Emmanuel Eseme (CMR)',result:'2nd · 9.93 (+0.1)'});
const tor=worldAthleticsDetails({name:'World Athletics Indoor Championships',venue:'Kujawsko-Pomorska Arena, Toruń (POL)'},toruń.events);
assert.equal(tor.lines[1],"World record: Simon Ehammer (SUI), Men's Heptathlon Short Track, 6670.");
assert.equal(tor.table.find(r=>r.group==='Mixed 4x400m Relay Short Track').team.split(', ')[0],'Jonathan Sacoor');

// The Worker: the calendar, then each day of a meet with results (here
// only Brussels answers), and the expanded window for a final.
const served=[];
const fakeFetch=async input=>{
  const url=String(input?.url||input);served.push(url);
  if(url.startsWith(`${WORLD_ATHLETICS}/competition/calendar-results?competitionGroupId=627&`))return new Response(page('wa-calendar-diamond-league-2026-11-18'),{status:200,headers:{'content-type':'text/html'}});
  if(url===`${WORLD_ATHLETICS}/competition/calendar-results/results/7214029`)return new Response(page('wa-results-7214029-day1'),{status:200,headers:{'content-type':'text/html'}});
  if(url===`${WORLD_ATHLETICS}/competition/calendar-results/results/7214029?day=2`)return new Response(page('wa-results-7214029-day2'),{status:200,headers:{'content-type':'text/html'}});
  return new Response('<html></html>',{status:404});
};
const source=worker.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:fakeFetch};
const w=Function(...Object.keys(deps),source+';return {fetchPro,groupEvents,inSeason};')(...Object.values(deps));
const feed=await w.fetchPro(school,'Track & Field',now);
assert.equal(feed.error,null);
assert.deepEqual(feed.events.map(e=>e.status).join(','),['Final',...Array(15).fill('Upcoming')].join(','));
assert.equal(feed.events[0].race_card.length,6);
assert.ok(served.some(u=>/calendar-results\?competitionGroupId=3520&startDate=\d{4}-\d{2}-\d{2}&endDate=/.test(u)),'the Diamond League final group is read too');
// Every 2026 meeting with results is asked for (each day), Brussels twice.
assert.equal(served.filter(u=>u.includes('/results/7214029')).length,2);
assert.equal(new Set(served.filter(u=>u.includes('/calendar-results/results/')).map(u=>u.replace(/\?day=\d+$/,''))).size,15);
const expanded=await w.fetchPro(school,'Track & Field',now,feed.events[0].id);
const target=expanded.events[0];
assert.equal(target.race_table.length,268,'every finisher of every final');
assert.equal(target.highlights[0],'Allianz Memorial van Damme, Boudewijnstadion, Bruxelles (BEL): 36 finals.');
assert.equal(target.game_stats.find(s=>s.label==='U.S. winners').value,'7');
// In season January (the indoor tour) to September (the Diamond League final).
const [group]=w.groupEvents(feed.events,now);
assert.equal(group.in_season,false);
assert.ok(w.inSeason('Track & Field',2,true)&&w.inSeason('Track & Field',9,true)&&!w.inSeason('Track & Field',11,true));
console.log('Track & Field (pro): World Athletics calendar, finals, meets, meet window and Worker run OK');
