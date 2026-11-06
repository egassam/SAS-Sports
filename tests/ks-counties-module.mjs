// Dickinson, Wabaunsee, Morris, Clay and Marshall counties, Kansas
// (November 5, 2026; user: "Add counties of your choosing. Skip any schools
// that will slow down the process"). Every school is a data file
// (src/schools/data/ks-<county>.json) registered in src/schools/ks-counties.mjs.
// Fixtures are the real sources of November 5 (Bound trimmed to the acts tested).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {boundSchedule,boundDedupe,maxprepsContests,meetProResults,meetProFolderFits,BOUND_ACTS} from '../src/high-school.mjs';
import {LETSGORUN_MEETPRO} from '../src/schools/manhattan-ks.mjs';
import {MS_XC_EXCLUDE} from '../src/high-school-builders.mjs';
import {KS_COUNTY_FILES,KS_COUNTY_HIGH_SCHOOLS,KS_COUNTY_MIDDLE_SCHOOLS} from '../src/schools/ks-counties.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>{const b=gunzipSync(readFileSync(new URL('./fixtures/ks-counties/'+name,import.meta.url))).toString('utf8');return name.endsWith('.json.gz')?JSON.parse(b):b;};
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const index=read('../src/index.js');
const TZ='America/Chicago';

// The schools, by county and level.
const modules=[...KS_COUNTY_HIGH_SCHOOLS,...KS_COUNTY_MIDDLE_SCHOOLS];
const BATCH1=['Dickinson','Wabaunsee','Morris','Clay','Marshall'],BATCH2=['Washington','Republic','Cloud','Ottawa','Jackson','Nemaha','Lyon'];
assert.deepEqual(KS_COUNTY_FILES.map(f=>f.counties[0]),[...BATCH1,...BATCH2]);
const idsOf=(counties,level)=>KS_COUNTY_FILES.filter(f=>counties.includes(f.counties[0])).flatMap(f=>f.schools.filter(e=>e.level===level).map(e=>e.id));
const inBatch1=new Set([...idsOf(BATCH1,'high-school'),...idsOf(BATCH1,'middle-school')]);
assert.deepEqual(idsOf(BATCH1,'high-school'),['abilene-ks','chapman-ks','herington-ks','solomon-ks','wabaunsee-ks','mission-valley-ks','council-grove-ks','clay-center-ks','wakefield-ks','marysville-ks','valley-heights-ks','frankfort-ks','axtell-ks']);
assert.deepEqual(idsOf(BATCH1,'middle-school'),['abilene-ms-ks','clay-center-ms-ks','marysville-ms-ks']);
// The second batch (November 5, user: "Let's add the next counties. Your choice. Learn and optimize").
assert.deepEqual(idsOf(BATCH2,'high-school'),['hanover-ks','linn-ks','washington-county-ks','pike-valley-ks','republic-county-ks','clifton-clyde-ks','concordia-ks','bennington-ks','minneapolis-ks','tescott-ks','holton-ks','jackson-heights-ks','royal-valley-ks','centralia-ks','nemaha-central-ks','sabetha-ks','emporia-ks','hartford-ks','northern-heights-ks','olpe-ks']);
assert.deepEqual(idsOf(BATCH2,'middle-school'),['concordia-ms-ks','minneapolis-ms-ks','jackson-heights-ms-ks']);
assert.match(index,/\.\.\.KS_COUNTY_HIGH_SCHOOLS,\.\.\.KS_COUNTY_MIDDLE_SCHOOLS\]/,'the Worker reads them');

// Catalog: in Kansas, in its county, at its level, with a theme and the
// sports its module reads; every team has a schedule source.
for(const file of KS_COUNTY_FILES)for(const entry of file.schools){
  const m=modules.find(x=>x.id===entry.id),s=schools.find(x=>x.id===entry.id);
  assert.ok(m&&s,entry.id);
  assert.equal(s.state,'Kansas');assert.equal(s.county,`${file.counties[0]} County`,entry.id);assert.ok(s.city,entry.id);
  assert.equal(s.level,entry.level,entry.id);
  assert.ok(themes[entry.id],entry.id);
  assert.deepEqual(sponsored[entry.id],Object.keys(m.sports).sort(),entry.id);
  assert.ok(s.providers.some(p=>p.provider==='BOUND'&&p.provider_school_id===entry.bound.school),entry.id);
  for(const teams of Object.values(m.sports))for(const t of teams){
    assert.ok(t.boundSchedule&&m.bound?.school,`${entry.id}: Bound schedule`);
    for(const act of t.boundSchedule.acts)assert.ok(BOUND_ACTS[act],`${entry.id}: ${act} has Bound ids`);
    if(t.maxpreps)assert.ok(m.maxpreps?.schoolId,entry.id);
  }
}

// Schools that enter few of their own games on Bound also read MaxPreps'
// schedule (`maxprepsSchedule`); the others read Bound alone.
const SPARSE=['solomon-ks','wabaunsee-ks','mission-valley-ks','council-grove-ks','wakefield-ks','valley-heights-ks','frankfort-ks','axtell-ks',
  // Second batch: under 85% of MaxPreps' games on Bound (Centralia 6 of 10, Nemaha Central 7 of 10, ...).
  'hanover-ks','linn-ks','pike-valley-ks','clifton-clyde-ks','bennington-ks','tescott-ks','centralia-ks','nemaha-central-ks','sabetha-ks','hartford-ks','northern-heights-ks','olpe-ks',
  // Winter session (November 6): Herington had 4 of its basketball dates per team on Bound, MaxPreps 5 boys' and 8 girls' games.
  'herington-ks'];
for(const m of KS_COUNTY_HIGH_SCHOOLS){
  const flags=Object.values(m.sports).flat().filter(t=>t.maxpreps).map(t=>!!t.maxprepsSchedule);
  assert.ok(flags.length,`${m.id}: MaxPreps teams`);
  assert.ok(flags.every(f=>f===SPARSE.includes(m.id)),`${m.id}: maxprepsSchedule ${SPARSE.includes(m.id)}`);
  assert.ok(Object.values(m.sports).flat().filter(t=>t.meet).every(t=>!t.maxprepsSchedule),`${m.id}: meets stay on Bound`);
}
// Results sources found by the survey.
const by=id=>modules.find(m=>m.id===id);
assert.deepEqual(Object.fromEntries(KS_COUNTY_HIGH_SCHOOLS.filter(m=>m.prepGolf&&inBatch1.has(m.id)).map(m=>[m.id,m.prepGolf.code])),{'abilene-ks':'ABI','chapman-ks':'CHAP','herington-ks':'HER','solomon-ks':'SLM','council-grove-ks':'CG','clay-center-ks':'CC','marysville-ks':'MVL','valley-heights-ks':'VH','frankfort-ks':'FRA'});
assert.deepEqual(Object.fromEntries(KS_COUNTY_HIGH_SCHOOLS.filter(m=>m.sports.Tennis&&inBatch1.has(m.id)).map(m=>[m.id,[...new Set(m.sports.Tennis.map(t=>t.tennisReporting?.school))]])),{'abilene-ks':['Abilene HS'],'chapman-ks':['Chapman HS'],'wabaunsee-ks':['Wabaunsee HS'],'clay-center-ks':['Clay Center Community HS'],'marysville-ks':['Marysville HS']});
// Second batch: codes that spell the school's name (prepGolfCode), TennisReporting names, MileSplit ids.
assert.deepEqual(Object.fromEntries(KS_COUNTY_HIGH_SCHOOLS.filter(m=>m.prepGolf&&!inBatch1.has(m.id)).map(m=>[m.id,m.prepGolf.code])),{'hanover-ks':'HAN','linn-ks':'LINN','washington-county-ks':'WACO','pike-valley-ks':'PV','republic-county-ks':'RPC','clifton-clyde-ks':'CLCL','concordia-ks':'CON','minneapolis-ks':'MNP','holton-ks':'HOLT','royal-valley-ks':'RV','centralia-ks':'CEN','nemaha-central-ks':'NMC','sabetha-ks':'SB','emporia-ks':'EMP','hartford-ks':'HF','olpe-ks':'OLPE'});
assert.deepEqual(Object.fromEntries(KS_COUNTY_HIGH_SCHOOLS.filter(m=>m.sports.Tennis&&!inBatch1.has(m.id)).map(m=>[m.id,[...new Set(m.sports.Tennis.map(t=>t.tennisReporting?.school))]])),{'concordia-ks':['Concordia HS'],'sabetha-ks':['Sabetha HS'],'emporia-ks':['Emporia HS']});
assert.equal(by('linn-ks').sports['Cross Country'][0].milesplit.team,21971,'Linn High School, not Jayhawk Linn (21877)');
assert.deepEqual(Object.keys(by('tescott-ks').sports).sort(),['Basketball','Cross Country','Football','Softball','Track & Field','Volleyball'],'game sports from MaxPreps where Bound has none');
assert.deepEqual(by('emporia-ks').sports.Soccer.map(t=>[t.label,t.maxpreps]),[['Boys','soccer'],['Girls','soccer/girls/spring']]);
assert.equal(by('abilene-ks').sports['Cross Country'][0].milesplit.team,21806);
assert.deepEqual(by('abilene-ms-ks').sports['Cross Country'][0].milesplit,{team:33030,middle:true});
assert.equal(by('marysville-ms-ks').bound.school,by('marysville-ks').bound.school,'Marysville JH reads the high school\'s Bound id at its grade levels');
assert.equal(by('herington-ks').sports.Swimming,undefined);
assert.ok(!by('herington-ks').sports['Swimming & Diving'],'no swimming: Bound answered Herington\'s events with every sport (survey fixed)');

const games=(m,payload,team)=>boundDedupe(boundSchedule([payload],{school:m.bound.school,acts:team.boundSchedule.acts,level:team.boundSchedule.level,timeZone:TZ,noun:team.meet?'Meet':'Tournament'}),{meet:!!team.meet});
const line=g=>`${g.date} ${g.time||'--'} ${g.site||'-'} ${g.name}${g.final?` ${g.final.result} ${g.final.score}-${g.final.opponent_score}`:''}`;

// Abilene HS: varsity football from Bound with the finals entered there
// (the playoff "TBD" rows are placeholders the feed leaves out).
const abilene=by('abilene-ks');
assert.deepEqual(games(abilene,fixture('bound-abilene-2026-11-05.json.gz'),abilene.sports.Football[0]).map(line).slice(0,10),[
  '2026-08-28 18:00 AWAY Jamboree','2026-09-04 19:00 AWAY Concordia L 0-33','2026-09-11 19:00 HOME Wamego L 13-57','2026-09-18 19:00 HOME Chapman L 7-42','2026-09-25 19:00 AWAY Rock Creek',
  '2026-10-02 19:00 HOME Clay Center W 17-14','2026-10-09 19:00 HOME Augusta L 7-19','2026-10-16 19:00 AWAY Circle L 14-33','2026-10-23 19:00 AWAY Marysville','2026-10-29 19:00 AWAY Wamego']);

// Wabaunsee: Bound has one of its football games; MaxPreps has all ten.
const wab=by('wabaunsee-ks'),wabFb=wab.sports.Football[0];
assert.equal(wabFb.maxprepsSchedule,true);assert.equal(wabFb.maxpreps,'football');
assert.deepEqual(games(wab,fixture('bound-wabaunsee-2026-11-05.json.gz'),wabFb).map(line),['2026-10-02 19:00 AWAY Jackson Heights L 14-18']);
const contests=maxprepsContests(fixture('maxpreps-wabaunsee-football-2026-11-05.html.gz'),wab.maxpreps.schoolId);
assert.deepEqual(contests.map(c=>`${c.date} ${c.opponent}${c.result?` ${c.result} ${c.score}-${c.opponent_score}`:''}`),[
  '2026-09-04 West Franklin W 45-3','2026-09-11 Olpe L 14-35','2026-09-18 Onaga L 8-14','2026-09-25 Atchison County W 24-8','2026-10-02 Jackson Heights L 14-18',
  '2026-10-09 Rossville L 0-49','2026-10-16 St. Marys L 14-45','2026-10-23 Mission Valley W 30-14','2026-10-30 Valley Heights W 26-19','2026-11-06 Olpe']);

// The Worker lists MaxPreps' unscored games Bound lacks for such a team (the
// Bound game-sports path returned before them: Wabaunsee's Nov 6 playoff
// game at Olpe was missing on the first preview). Here that is Olpe alone.
assert.ok(index.includes("if(team.maxprepsSchedule){\n        const onBound=c=>games.some("),'Bound game sports read MaxPreps\' coming games');
const wabGames=games(wab,fixture('bound-wabaunsee-2026-11-05.json.gz'),wabFb);
assert.deepEqual(contests.filter(c=>c.opponent&&!(c.result&&c.score!=null)&&!wabGames.some(g=>g.date===c.date)).map(c=>`${c.date} ${c.opponent}`),['2026-11-06 Olpe']);

// Bound names the NCKL championship (October 15, Abilene) for its course:
// the state's alias table gives MileSplit Live's name (Abilene, Chapman, Clay
// Center, Marysville, and Wamego and Rock Creek already in the app).
const ALIASES=JSON.parse(read('../src/schools/data/ks-aliases.json'));
assert.equal(ALIASES.meets['Great Life Golf Course meet'],'NCKL Cross Country Championships');

// LetsGoRun (MeetPro) timed it too (user, November 5: "Did you look on let's
// go run for cross country results?"): the varsity team places for each school.
assert.deepEqual(LETSGORUN_MEETPRO.folders['2026-10-15'],['2026_NCKL_Cross_Country_Championships']);
const nckl=fixture('meetpro-2026_NCKL_Cross_Country_Championships.html.gz');
const varsity=team=>meetProResults(nckl,team).filter(r=>/varsity/i.test(r.race)).map(r=>`${r.race}: ${r.team?`${r.team.place}/${r.teams}`:'-'} ${r.runners.length}`);
assert.deepEqual(varsity('Chapman'),['High School Girls Varsity: 4/5 6','High School Boys Varsity: 2/7 7']);
assert.deepEqual(varsity('Clay Center'),['High School Girls Varsity: 3/5 7','High School Boys Varsity: 3/7 7']);
assert.deepEqual(varsity('Marysville'),['High School Girls Varsity: 5/5 5','High School Boys Varsity: 6/7 7']);

// More LetsGoRun meets, compared card by card with production first (user,
// November 5: "Compare those. Let's go run meats"): Abilene (Sep 3), Bob
// Schmoekel (Oct 3), Centennial League (Oct 17). Shawnee Heights MS (Sep 22)
// and Washburn Rural MS (Sep 25) joined on November 6 with Shawnee County:
// its "Eisenhower" is Topeka's school, and Manhattan's Eisenhower MS does not
// fit the folder (below).
assert.deepEqual(['2026-09-03','2026-10-03','2026-10-17'].map(d=>LETSGORUN_MEETPRO.folders[d]),[['2026_Abilene_XC_Invitational'],['2026_Bob_Schmoekel_Cross_Country_Invitational'],['2026_Centennial_League_XC_Championships']]);
assert.deepEqual(['2026-09-22','2026-09-25'].map(d=>LETSGORUN_MEETPRO.folders[d]),[['2026_Shawnee_Heights_MS_Invitational'],['2026_Washburn_Rural_MS_Invitational']]);
assert.deepEqual(LETSGORUN_MEETPRO.folders['2026-09-19'],['2026_Shufelberger_TopCity_Classic'],'found by the survey\'s LetsGoRun step');
// The Abilene page names its varsity races "High School Boys/Girls": a middle
// school reads the grade races only (Rock Creek MS had gained the high
// school's places on the first comparison).
const abileneMeet=fixture('meetpro-2026_Abilene_XC_Invitational.html.gz');
assert.deepEqual(meetProResults(abileneMeet,'Rock Creek MS').filter(r=>!MS_XC_EXCLUDE.test(r.race)).map(r=>r.race),["7th Grade Men's","7th Grade Women's","8th Grade Men's","8th Grade Women's"]);
assert.ok(MS_XC_EXCLUDE.test('High School Boys')&&MS_XC_EXCLUDE.test('High School Girls'));

// A folder filed only by the day must be the school's meet
// (meetProFolderFits): its name, the page's title or a team in it (the host)
// shares a word with the schedule's name for the meet (or its alias).
const shawnee=fixture('meetpro-2026_Shawnee_Heights_MS_Invitational.html.gz'),schmoekel=fixture('meetpro-2026_Bob_Schmoekel_Cross_Country_Invitational.html.gz');
assert.ok(meetProResults(shawnee,'Eisenhower').length,'Topeka\'s Eisenhower ran it');
assert.equal(meetProFolderFits('Clay Center',{folder:'2026_Shawnee_Heights_MS_Invitational',html:shawnee,aliases:ALIASES.meets}),false,'Manhattan\'s Eisenhower MS was at Clay Center that day');
assert.equal(meetProFolderFits('Junction City',{folder:'2026_Bob_Schmoekel_Cross_Country_Invitational',html:schmoekel,aliases:ALIASES.meets}),true,'named for its host (Flint Hills Christian\'s calendar)');
assert.equal(meetProFolderFits('Blue Jay Invitational Cross Country Meet',{folder:'2026_Bob_Schmoekel_Cross_Country_Invitational',html:schmoekel,aliases:ALIASES.meets}),true,'by the alias table');
assert.equal(meetProFolderFits('MS XC',{folder:'2026_NCKL_Cross_Country_Championships',html:nckl,aliases:ALIASES.meets}),true,'a name with no word of its own takes the day\'s folder');
assert.equal(meetProFolderFits('Great Life Golf Course meet',{folder:'2026_NCKL_Cross_Country_Championships',html:nckl,aliases:ALIASES.meets}),true);

// A meet named for its venue (Bound's address): the page's place block.
const mhsFixture=name=>gunzipSync(readFileSync(new URL('./fixtures/manhattan-ks-module/'+name,import.meta.url))).toString('utf8');
assert.equal(meetProFolderFits('Milford State Park meet',{folder:'2026_Fort_Riley_XC_Invitational',html:mhsFixture('meetpro-2026_Fort_Riley_XC_Invitational.html.gz'),aliases:ALIASES.meets,venue:'Milford State Park'}),true,'Fort Riley MS meet at Milford Lake');
assert.equal(meetProFolderFits('Greg Wilson Classic',{folder:'2026_Manhattan_XC_Invitational',html:mhsFixture('meetpro-2026_Manhattan_XC_Invitational.html.gz'),aliases:ALIASES.meets,venue:'Warner Park'}),true,'Manhattan\'s meet at Warner Park');

assert.equal(meetProFolderFits('MS XC',{folder:'2026_NCKL_Cross_Country_Championships',html:nckl,aliases:ALIASES.meets,venue:'Great Life Golf Course'}),true,'a venue only counts for a folder');
// Junction City's Greg Wilson Classic (Sep 5, Johnson County Community
// College) is not LetsGoRun's Manhattan XC Invitational of the same day,
// where a Junction City squad also ran: production had shown the Manhattan
// places on the Greg Wilson card.
assert.equal(meetProFolderFits('Greg Wilson Classic',{folder:'2026_Manhattan_XC_Invitational',html:mhsFixture('meetpro-2026_Manhattan_XC_Invitational.html.gz'),aliases:ALIASES.meets,venue:'Johnson County Community College'}),false);

// Abilene MS: the grade teams (7th, 8th; their A teams), B teams left out.
const ams=by('abilene-ms-ks');
const [boys7,boys8]=ams.sports.Basketball.filter(t=>/^(?:7th|8th) Boys$/.test(t.label));
const amsPayload=fixture('bound-abilene-ms-2026-11-05.json.gz');
assert.deepEqual(games(ams,amsPayload,boys7).map(line).slice(0,3),['2027-01-07 16:30 AWAY Clay Center Community MS',"2027-01-11 16:30 HOME St. Mary's Academy",'2027-01-14 16:30 AWAY Marysville']);
assert.ok(games(ams,amsPayload,boys8).length>=10,'the 8th grade boys have their season');
for(const t of [boys7,boys8])assert.ok(!t.boundSchedule.level.test('8th Grade B')&&!t.boundSchedule.level.test('7th Grade B'),'B teams are not listed');

console.log(`ks-counties module: ok (${modules.length} schools, ${KS_COUNTY_FILES.length} counties)`);
