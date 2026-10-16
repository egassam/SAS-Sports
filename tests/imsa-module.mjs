// IMSA (user, October 16, 2026: "Let's add IMSA racing series under auto
// racing"): Auto Racing → IMSA → WeatherTech SportsCar Championship and
// Michelin Pilot Challenge. Fixtures are IMSA's official results folders and
// classifications of October 16, 2026 (results.imsa.com, Al Kamel Systems):
// the 2026 season listing, the Petit Le Mans event, championship, race and
// hour-10 folders, the Petit Le Mans classification and its hour-3
// standings, and the Pilot Challenge's Fox Factory 120 classification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,IMSA_CALENDARS,imsaListing,imsaRaceSessions,imsaResultsFile,imsaHourFolders,imsaTrack,imsaStart,imsaRaces,imsaRaceDetails,imsaClassWinners,imsaFinishTable,imsaFinishRows} from '../src/pro-sports.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const raw=name=>gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8');
const json=name=>JSON.parse(raw(name).replace(/^﻿/,''));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json'));
const page=read('../public/index.html'),worker=read('../src/index.js');
const EASTERN='America/New_York',now=new Date('2026-10-16T18:00:00Z');

// Catalog: two IMSA championships under Auto Racing → IMSA (Races).
const imsa=schools.filter(s=>s.league==='IMSA');
assert.deepEqual(imsa.map(s=>s.id),['imsa-weathertech','imsa-pilot-challenge']);
for(const s of imsa){
  assert.equal(s.level,'pro');assert.equal(s.pro_sport,'Auto Racing');assert.equal(s.conference,'IMSA');
  assert.deepEqual(sponsored[s.id],['Auto Racing']);
  assert.equal(proTeam(s.id).kind,'imsa');assert.equal(proTeam(s.id).championship,s.name);
  assert.ok(page.includes(`'${s.id}':['Auto Racing']`),s.id);
  assert.ok(page.includes(`'${s.id}':{primary:`),`${s.id} theme`);
  const boot=JSON.parse(page.match(/const BOOTSTRAP_SCHOOLS=(\[.*?\]);\n/)[1]);
  assert.ok(boot.some(b=>b.id===s.id&&b.league==='IMSA'),s.id);
}
assert.ok(worker.includes("if(config.kind==='imsa')return fetchImsa(school,config,now,timeZone,aiTargetId,failed);"));
// Race windows list IMSA's field under class headings; the card shows the class winners.
assert.ok(page.includes('${r.group&&r.group!==lastGroup?`<div class="result-group-head">${esc(lastGroup=r.group)}</div>`:\'\'}'));
assert.ok(page.includes('raceTableHtml({race_table:e.race_card?.length?e.race_card:e.race_table.slice(0,3)})'));
assert.ok(page.includes("esc(r.status||r.note||(r.laps_led?"));

// Folders: the season's events, the championship's race session, and the
// endurance race's classification in its last hour folder.
const season=imsaListing(raw('imsa-season.html'));
assert.equal(season.length,22);
assert.deepEqual(season.at(-1),{href:'21_Road%20Atlanta/',name:'21_Road Atlanta',dir:true,modified:'2026-10-01 16:16'});
const event=imsaListing(raw('imsa-event.html'));
assert.ok(event.some(e=>e.dir&&e.name==='01_IMSA WeatherTech SportsCar Championship'));
assert.ok(event.some(e=>e.dir&&e.name==='02_IMSA Michelin Pilot Challenge'));
const series=imsaListing(raw('imsa-series.html'));
assert.deepEqual(imsaRaceSessions(series).map(e=>e.name),['202610031210_Race']);
const race=imsaListing(raw('imsa-race.html'));
assert.equal(imsaResultsFile(race),null);
assert.equal(imsaHourFolders(race).length,10);assert.equal(imsaHourFolders(race)[0].name,'10_Hour 10');
assert.equal(imsaResultsFile(imsaListing(raw('imsa-hour.html'))).name,'03_Results_Race_Official.JSON');
// Official beats Provisional beats Unofficial; an amended copy first.
const files=names=>names.map(name=>({name,dir:false}));
assert.equal(imsaResultsFile(files(['03_Results_Race_Unofficial.JSON','03_Results_Race_Provisional.JSON'])).name,'03_Results_Race_Provisional.JSON');
assert.equal(imsaResultsFile(files(['03_Results_Race_Unofficial.JSON','03_Results_Race_Unofficial_Amended.JSON'])).name,'03_Results_Race_Unofficial_Amended.JSON');
assert.equal(imsaResultsFile(files(['03_Results_Race_Official.CSV'])),null);

// Tracks and start times: folders carry the track's local start.
assert.deepEqual(imsaTrack('21_Road Atlanta'),{name:'Michelin Raceway Road Atlanta',timeZone:EASTERN});
assert.deepEqual(imsaTrack('18_VIRginia International Raceway'),{name:'VIRginia International Raceway',timeZone:EASTERN});
assert.equal(imsaStart('202610031210_Race',EASTERN,EASTERN),'2026-10-03T12:10:00.000Z');
assert.equal(imsaStart('202604181305_Race','America/Los_Angeles',EASTERN),'2026-04-18T16:05:00.000Z');
assert.equal(imsaStart('202607121405_Race','America/Chicago',EASTERN),'2026-07-12T15:05:00.000Z');

// Petit Le Mans, read against the official classification: Porsche Penske's
// #6 won overall (368 laps), 1.205 s ahead of BMW's #24; class winners #04
// (LMP2), #68 (GTD PRO), #57 (GTD); 54 cars.
const plm=json('imsa-plm.json'),school=imsa[0],config=PRO_TEAMS['imsa-weathertech'];
assert.deepEqual(imsaClassWinners(plm).map(w=>[w.make,w.car,w.note]),[['GTP','#6','Overall winner'],['LMP2','#04','7th overall'],['GTD PRO','#68','17th overall'],['GTD','#57','29th overall']]);
const table=imsaFinishTable(plm);
assert.equal(table.length,54);
assert.deepEqual(table[0],{group:'GTP',pos:1,driver:'Vanthoor / Estre / Campbell',car:'#6',make:'Porsche',team:'Porsche Penske Motorsport · Porsche 963',laps_led:0,status:'',note:'1st overall · 368 laps'});
assert.deepEqual([...new Set(table.map(r=>r.group))],['GTP','LMP2','GTD PRO','GTD']);
assert.deepEqual(table.filter(r=>r.group==='GTD').map(r=>r.pos),Array.from({length:18},(_,i)=>i+1));
assert.equal(table.find(r=>r.car==='#31').status,'Did not finish');
assert.equal(imsaFinishRows(plm)[0].result,'1st GTP · 1st overall · Porsche Penske Motorsport · Porsche 963');
const details=imsaRaceDetails(plm);
assert.equal(details.lines[0],'#6 Porsche Penske Motorsport (Laurens Vanthoor, Kevin Estre, Matt Campbell; Porsche 963) won the 29th Annual Motul Petit Le Mans overall at Michelin Raceway Road Atlanta, 368 laps, 1.205 s ahead of #24 BMW M Team WRT.');
assert.equal(details.lines.at(-1),'Fastest lap: 1:11.897 by Ross Gunn (#23).');
assert.deepEqual(details.stats,[{label:'Laps',value:'368'},{label:'Race time',value:'10:00:50.625'},{label:'Cars in the field',value:'54'},{label:'Classes',value:'GTP, LMP2, GTD PRO, GTD'},{label:'Track',value:'Wet'}]);

// The season: Petit Le Mans Final; a past race with no classification is
// not listed (K-State's rule); the 2027 calendar's weekends follow.
const races=[
  {session:'202610031210_Race',event:'Road Atlanta',track:imsaTrack('21_Road Atlanta'),results:plm,hour:null,path:'p'},
  {session:'202604181305_Race',event:'Long Beach Street Circuit',track:imsaTrack('07_Long Beach Street Circuit'),results:null,hour:null}
];
const events=imsaRaces(races,{school,config,timeZone:EASTERN,now,calendar:IMSA_CALENDARS.weathertech});
assert.equal(events.length,12);
const final=events[0];
assert.equal(final.status,'Final');assert.equal(final.title,'29th Annual Motul Petit Le Mans');assert.equal(final.event_type,'RACE');
assert.equal(final.display_time,'Oct 3, 12:10 PM');assert.equal(final.opponent,'Michelin Raceway Road Atlanta');
assert.equal(final.headline,'Overall: #6 Porsche Penske Motorsport');assert.equal(final.race_card.length,4);assert.equal(final.result_count,54);
assert.ok(!events.some(e=>/Long Beach/.test(e.opponent)&&e.season===2026));
const daytona=events[1];
assert.deepEqual([daytona.status,daytona.title,daytona.display_time,daytona.start_time,daytona.end_time],['Upcoming','Rolex 24 At Daytona','Jan 28-31','2027-01-28T00:00:00.000Z','2027-01-31T23:59:00.000Z']);
assert.deepEqual(daytona.results,[{label:'Length',value:'24 hours'},{label:'Classes',value:'GTP, LMP2, GTD PRO, GTD'},{label:'Weekend',value:'Jan 28-31'}]);
assert.equal(events.at(-1).title,'30th Motul Petit Le Mans');assert.equal(events.find(e=>/Laguna/.test(e.opponent)).display_time,'Apr 30-May 2');
// Once a weekend's folder exists, its race replaces the calendar's entry.
const withFolder=imsaRaces([{session:'202701301340_Race',track:imsaTrack('02_Daytona International Speedway'),results:null,hour:null}],{school,config,timeZone:EASTERN,now:new Date('2027-01-29T15:00:00Z'),calendar:IMSA_CALENDARS.weathertech});
assert.equal(withFolder.filter(e=>/Daytona/.test(e.opponent)).length,1);
assert.deepEqual([withFolder[0].status,withFolder[0].display_time],['Upcoming','Jan 30, 1:40 PM']);
// The calendar's weekend under way without a folder reads Today; a passed one is gone.
const midWeekend=imsaRaces([],{school,config,timeZone:EASTERN,now:new Date('2027-01-29T15:00:00Z'),calendar:IMSA_CALENDARS.weathertech});
assert.equal(midWeekend[0].status,'Today');
assert.equal(imsaRaces([],{school,config,timeZone:EASTERN,now:new Date('2027-02-02T15:00:00Z'),calendar:IMSA_CALENDARS.weathertech})[0].title,'Mobil 1 Twelve Hours of Sebring');

// Under way: an endurance race's hourly standings (Petit Le Mans, hour 3).
const live=imsaRaces([{session:'202610031210_Race',track:imsaTrack('Road Atlanta'),results:null,hour:json('imsa-plm-hour3.json')}],{school,config,timeZone:EASTERN,now:new Date('2026-10-03T19:30:00Z')})[0];
assert.deepEqual([live.status,live.recency_label,live.headline],['Live','After Hour 3','Leader: #93 Acura Meyer Shank Racing w/Curb Agajanian']);
assert.equal(live.results.length,10);assert.equal(live.live_details.order[0].gap,'Leader');assert.equal(live.live_details.order[0].car,'#93 · 1st GTP');
// Past the start with no standings yet: under way; before the start: Today.
assert.equal(imsaRaces([{session:'202610031210_Race',track:imsaTrack('Road Atlanta'),results:null,hour:null}],{school,config,timeZone:EASTERN,now:new Date('2026-10-03T16:30:00Z')})[0].recency_label,'Under way');
assert.equal(imsaRaces([{session:'202610031210_Race',track:imsaTrack('Road Atlanta'),results:null,hour:null}],{school,config,timeZone:EASTERN,now:new Date('2026-10-03T13:00:00Z')})[0].status,'Today');

// The Pilot Challenge: GS and TCR, its own calendar (Lime Rock new for 2027).
const pc=json('imsa-pc-atlanta.json');
assert.deepEqual(imsaClassWinners(pc).map(w=>[w.make,w.car,w.note]),[['GS','#14','Overall winner'],['TCR','#33','3rd overall']]);
const pcEvents=imsaRaces([{session:'202610021140_Race',track:imsaTrack('21_Road Atlanta'),results:pc,hour:null,path:'p'}],{school:imsa[1],config:PRO_TEAMS['imsa-pilot-challenge'],timeZone:EASTERN,now,calendar:IMSA_CALENDARS.pilotChallenge});
assert.equal(pcEvents[0].title,'Fox Factory 120');assert.equal(pcEvents.length,11);
assert.ok(pcEvents.some(e=>e.title==='FCP Euro Northeast Grand Prix'&&e.display_time==='Sep 23-25'));
// The page draws the class headings once each, with each car's overall
// finish beside its class finish (the page's own function).
{
  const fn=name=>{const at=page.indexOf(`function ${name}(`);assert.ok(at>=0,name);return page.slice(at,page.indexOf('\n}\n',at)+2);};
  const line=start=>{const at=page.indexOf(start);assert.ok(at>=0,start);return page.slice(at,page.indexOf('\n',at));};
  const raceTableHtml=Function(`${line('const esc=')}\n${fn('raceTableHtml')};return raceTableHtml;`)();
  const html=raceTableHtml({race_table:table});
  assert.equal(html.match(/result-group-head/g).length,4);
  assert.match(html,/^<div class="race-table"><div class="result-group-head">GTP<\/div><div class="race-row podium"><span class="race-pos">1<\/span><span class="race-driver">Vanthoor \/ Estre \/ Campbell<small>#6<\/small><\/span><span class="race-make">Porsche<\/span><span class="race-team">Porsche Penske Motorsport · Porsche 963<\/span><span class="race-note">1st overall · 368 laps<\/span><\/div>/);
  assert.match(html,/<span class="race-driver">Aitken \/ Bamber \/ Vesti<small>#31<\/small><\/span><span class="race-make">Cadillac<\/span><span class="race-team">Cadillac Whelen · Cadillac V-Series.R<\/span><span class="race-note out">Did not finish<\/span>/);
  const card=raceTableHtml({race_table:final.race_card});
  assert.equal(card.match(/race-row podium/g).length,4);assert.ok(!card.includes('result-group-head'));
  assert.match(card,/<span class="race-make">GTD<\/span><span class="race-team">Winward Racing · Mercedes-AMG GT3<\/span><span class="race-note">29th overall<\/span>/);
}
console.log('IMSA module tests passed');
