// Pros from a school (user, November 18, 2026: "What should we add in pro
// that's unique?", then "Start 1-4"): a college Football, Basketball,
// Baseball or Hockey page lists the school's former players on NFL, NBA, WNBA,
// MLB and NHL rosters with their latest game line, and its picks in the
// latest draft.
// Fixtures, saved Nov 18, 2026: ESPN's NFL, NBA, WNBA and MLB rosters (each
// team's K-State, Kansas and Cincinnati players and its first player), the
// 2026 NFL, NBA and WNBA drafts (the first picks and those from Kansas,
// Cincinnati and Miami schools), MLB's 2026 draft (Kansas, Wichita, Miami and
// Cincinnati schools and Kansas high schools), an MLB game summary, and the
// NFL's week 10 scoreboard; with the earlier NFL, NBA and NHL summaries.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as A from '../src/pro-alumni.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const gz=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}`,import.meta.url))).toString('utf8'));
const fix=name=>gz(`${name}-2026-11-18.json.gz`);
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const rosters=fix('alumni-rosters'),drafts=fix('alumni-espn-drafts'),mlbDraft=fix('alumni-mlb-draft');
const NFL=A.ALUMNI_LEAGUES.find(l=>l.id==='nfl'),NBA=A.ALUMNI_LEAGUES.find(l=>l.id==='nba'),NHL=A.ALUMNI_LEAGUES.find(l=>l.id==='nhl'),MLB=A.ALUMNI_LEAGUES.find(l=>l.id==='mlb');

// 1. The sports and leagues; each school's ESPN id from the standings map.
assert.deepEqual(A.alumniLeaguesFor('Football').map(l=>l.league),['NFL']);
assert.deepEqual(A.alumniLeaguesFor('Basketball').map(l=>[l.league,l.gender]),[['NBA','men'],['WNBA','women']]);
assert.deepEqual(A.alumniLeaguesFor('Baseball').map(l=>l.league),['MLB']);
assert.deepEqual(A.alumniLeaguesFor('Hockey').map(l=>l.league),['NHL']);
assert.deepEqual(A.alumniLeaguesFor('Volleyball'),[]);
assert.deepEqual(['kstate','kansas','cincinnati','boston-college'].map(A.collegeEspnId),['2306','2305','2132','103']);
assert.equal(A.collegeEspnId('manhattan-ks'),null,'a high school has none');
assert.equal(A.collegeEspnId('kansas-city-chiefs'),null);

// 2. Rosters: grouped (NFL) and flat (NBA) lists, with the college id.
{
  const chiefs=schools.find(s=>s.id==='kansas-city-chiefs');
  const players=A.rosterPlayers(rosters['football/nfl/12'],chiefs);
  assert.ok(players.length>=2);
  const fau=players.find(p=>p.n==='Felix Anudike-Uzomah');
  assert.deepEqual([fau.c,fau.p,fau.t],['2306','DE','kansas-city-chiefs'],'a K-State Chief');
  const jazz=schools.find(s=>s.id==='utah-jazz');
  const peterson=A.rosterPlayers(rosters[`basketball/nba/${jazz.providers[0].provider_school_id}`],jazz).find(p=>p.n==='Darryn Peterson');
  assert.equal(peterson.c,'2305','flat NBA roster: Kansas');
}

// 3. Box score lines, as a fan reads them.
{
  const nfl=A.summaryLines(gz('sum.json.gz'),NFL);
  assert.equal(nfl['4430807'].s,'21 carries, 83 yds · 8 rec, 90 yds, 1 TD','Bijan Robinson: rushing then receiving');
  assert.equal(nfl['2972515'].s,'12/22, 143 yds, 1 TD, 2 INT','Cooper Rush passing');
  assert.equal(nfl['4360386'].s,'7 tackles','Sydney Brown');
  assert.match(nfl['4430807'].r,/^[WL] \d+-\d+$/);assert.match(nfl['4430807'].o,/^(vs|at) [A-Z]+$/);
  const nba=A.summaryLines(gz('nba-sum-401909090.json.gz'),NBA);
  assert.equal(nba['4222252'].s,'4 pts, 3 reb, 3 ast, 17 min','Isaiah Hartenstein');
  const nhl=A.summaryLines(gz('nhl-sum-401892629.json.gz'),NHL);
  assert.equal(nhl['4064582'].s,'25 saves on 27 shots','Carter Hart in goal');
  assert.equal(nhl['3114985'].s,'1 SOG, -1, 15:16 TOI','Ivan Barbashev');
  const mlb=A.summaryLines(fix('alumni-mlb-summary'),MLB);
  assert.equal(mlb['33481'].s,'2-5, 1 HR, 2 RBI, 2 R');
  assert.equal(mlb['33372'].s,'5.1 IP, 2 H, 1 ER, 3 K');
}

// 4. Lines merge: the latest per player, three weeks kept, a final read once.
{
  const old={d:'2026-10-20T00:00Z',g:'1',o:'vs DEN',r:'W 1-0',s:'old'},mid={d:'2026-11-10T00:00Z',g:'2',o:'at DEN',r:'L 0-1',s:'mid'},late={d:'2026-11-17T00:00Z',g:'3',o:'vs LAC',r:'W 2-1',s:'late'};
  const doc=A.mergeLines({read:['1'],lines:{a:old,b:mid}},[{id:'3',lines:{b:late,c:mid}}],{now:new Date('2026-11-18T12:00:00Z')});
  assert.deepEqual(Object.keys(doc.lines).sort(),['b','c'],'older than 21 days dropped');
  assert.equal(doc.lines.b.s,'late');assert.deepEqual(doc.read,['1','3']);
  assert.deepEqual(A.finishedGames([fix('alumni-nfl-week10')]).length,14,'week 10: 14 finals');
  const week11={week:{number:11},season:{type:2}};
  assert.deepEqual(A.scoreboardUrls(NFL,{now:new Date(),board:week11}),['https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=10']);
  assert.deepEqual(A.scoreboardUrls(NBA,{now:new Date('2026-11-18T03:00:00Z')}).map(u=>u.split('dates=')[1]),['20261117&limit=100','20261116&limit=100','20261115&limit=100','20261114&limit=100'],'Eastern days, the last four');
  assert.equal(A.scoreboardUrls(NBA,{now:new Date(),first:true}).length,4);
}

// 5. Drafts: the year held, ESPN's picks by roster id, MLB's by name and state.
{
  assert.deepEqual(A.draftYears(new Date('2026-11-18T12:00:00Z'),NFL),[2026,2025]);
  assert.deepEqual(A.draftYears(new Date('2027-03-01T12:00:00Z'),NFL),[2026],'before April: last year\'s');
  assert.deepEqual(A.draftYears(new Date('2027-06-30T12:00:00Z'),MLB),[2026],'MLB drafts in July');
  const teams=schools.filter(s=>s.league==='NFL'),byId=new Map(teams.map(t=>[t.providers[0].provider_school_id,t]));
  const picks=A.espnDraftPicks(drafts['football/nfl'],{teamsByEspnId:byId});
  assert.equal(picks[0].n,'Fernando Mendoza');assert.equal(picks[0].pos,'QB');assert.equal(picks[0].tn,'Las Vegas Raiders');
  const mlb=A.mlbDraftPicks(mlbDraft,{teamsByName:new Map(schools.filter(s=>s.league==='MLB').map(t=>[t.name.toLowerCase(),t]))});
  const kennedy=mlb.find(p=>p.n==='Dee Kennedy');
  assert.deepEqual([kennedy.o,kennedy.r,kennedy.p,kennedy.t,kennedy.sch.location,kennedy.sch.state],[114,'4',11,'st-louis-cardinals','Kansas State','KS']);
  assert.ok(mlb.find(p=>p.n==='Beau Peterson').hs,'Mill Valley HS: a high school pick');
}

// 6. The worker: /live/pros builds each league's index once (KV), answers
// the school's pros and draft, and a second location reads KV only.
{
  const cache=new Map(),kv=new Map();let reads=[];
  globalThis.caches={default:{async match(r){return cache.get(typeof r==='string'?r:r.url)?.clone()||undefined},async put(r,res){cache.set(typeof r==='string'?r:r.url,res)},async delete(r){cache.delete(typeof r==='string'?r:r.url)}}};
  const HIGHLIGHTS={async get(k,type){const v=kv.get(k);return v==null?null:type==='json'?JSON.parse(v):v},async getWithMetadata(k){return{value:kv.get(k)??null,metadata:null}},async put(k,v){kv.set(k,v)},async delete(k){kv.delete(k)}};
  const body=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
  const fetch=async input=>{
    const url=String(input?.url||input);reads.push(url);
    if(url.endsWith('/robots.txt'))return new Response('',{status:404});
    let m=url.match(/sports\/(.+?)\/teams\/(\d+)\/roster/);if(m)return rosters[`${m[1]}/${m[2]}`]?body(rosters[`${m[1]}/${m[2]}`]):new Response('',{status:404});
    m=url.match(/sports\/(.+?)\/draft\?season=(\d+)/);if(m)return body(m[2]==='2026'?drafts[m[1]]:{picks:[]});
    if(url.includes('statsapi.mlb.com/api/v1/draft/2026'))return body(mlbDraft);
    if(url.includes('/scoreboard'))return body({events:[],week:{number:11},season:{type:2}});
    return new Response('',{status:404});
  };
  const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
  const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
  const worker=Function(...Object.keys(deps),source+';return {handler,alumniSchoolMatches}')(...Object.values(deps));
  const origin='https://sas-sports.lovetogivepain.workers.dev';
  const ask=async(school,sport)=>{const r=await worker.handler.fetch(new Request(`${origin}/live/pros?school=${school}&sport=${encodeURIComponent(sport)}`),{HIGHLIGHTS},{waitUntil(){}});return{status:r.status,body:await r.json()}};

  const {status,body:ks}=await ask('kstate','Football');
  assert.equal(status,200);assert.equal(ks.read,true);assert.equal(ks.college_id,'2306');
  const nfl=ks.leagues[0];
  assert.equal(nfl.league,'NFL');
  const names=nfl.pros.map(p=>p.name);
  assert.ok(names.includes('Felix Anudike-Uzomah')&&names.includes('Ben Sinnott'),names.join(', '));
  assert.ok(!names.includes('Travis Kelce'),'only K-State players');
  const fau=nfl.pros.find(p=>p.name==='Felix Anudike-Uzomah');
  assert.deepEqual([fau.team_id,fau.team,fau.position],['kansas-city-chiefs','Kansas City Chiefs','DE']);
  assert.deepEqual(nfl.draft,{year:2026,picks:[
    {overall:144,round:'5',pick:4,name:'Sam Hecht',position:'C',team_id:'carolina-panthers',team:'Carolina Panthers'},
    {overall:228,round:'7',pick:12,name:'VJ Payne',position:'S',team_id:'new-york-jets',team:'New York Jets'}]});
  assert.ok(kv.has(A.alumniRosterKey('nfl'))&&kv.has(A.alumniLinesKey('nfl')),'the league index is kept in KV');
  const rosterReads=reads.filter(u=>u.includes('/roster')).length;
  assert.equal(rosterReads,32,'one read per NFL team');

  // Another school, the same league: no second roster read.
  reads=[];
  const cin=await ask('cincinnati','Football');
  assert.ok(cin.body.leagues[0].pros.some(p=>p.name==='Travis Kelce'&&p.team_id==='kansas-city-chiefs'));
  assert.equal(reads.filter(u=>u.includes('/roster')).length,0,'served from the index');

  // Basketball: the men's and women's leagues, each with its own list.
  const ku=await ask('kansas','Basketball');
  assert.deepEqual(ku.body.leagues.map(l=>[l.league,l.gender]),[['NBA','men'],['WNBA','women']]);
  const nba=ku.body.leagues[0];
  assert.ok(nba.pros.some(p=>p.name==='Joel Embiid'&&p.team_id==='philadelphia-76ers'),'Embiid, Kansas');
  assert.deepEqual(nba.draft.picks.map(p=>[p.name,p.overall,p.team_id]),[['Darryn Peterson',2,'utah-jazz']]);

  // MLB: picks matched by school name and state.
  const kb=await ask('kstate','Baseball');
  assert.deepEqual(kb.body.leagues[0].draft.picks.map(p=>p.name),['Dee Kennedy','James Guyette','Tazwell Butler','Bear Madliak']);
  const kub=await ask('kansas','Baseball');
  assert.ok(kub.body.leagues[0].draft.picks.every(p=>!['Dee Kennedy','Jayson Jones'].includes(p.name)),'Kansas is not Kansas State or Wichita State');
  assert.equal(worker.alumniSchoolMatches({location:'Miami',displayName:'Miami',shortDisplayName:'Miami',state:'OH'},schools.find(s=>s.id==='miami')),false,'Miami of Ohio is not Miami (FL)');
  assert.equal(worker.alumniSchoolMatches({location:'Miami',displayName:'Miami',shortDisplayName:'Miami',state:'FL'},schools.find(s=>s.id==='miami')),true);

  // A pro team's page: its own roster, each player's college linked to the
  // app's college page (user, November 18: "I'm not seeing the pro roster on
  // the pro pages").
  {
    const chiefs=(await ask('kansas-city-chiefs','Football')).body;
    assert.equal(chiefs.read,true);
    const [nfl]=chiefs.leagues;
    assert.equal(nfl.team_roster,true);assert.equal(nfl.draft,null);
    const kelce=nfl.pros.find(p=>p.name==='Travis Kelce');
    assert.deepEqual([kelce.college,kelce.college_id,kelce.position],['Cincinnati','cincinnati','TE']);
    assert.equal(nfl.pros.find(p=>p.name==='Felix Anudike-Uzomah').college_id,'kstate');
    assert.ok(nfl.pros.every(p=>!p.team_id),'the team itself is not repeated');
    assert.equal((await ask('kansas-city-chiefs','Basketball')).status,422,'a sport the team does not play');
  }
  // A sport with no pro league, a high school and a pro team: no list.
  assert.deepEqual((await ask('kstate','Volleyball')).body.leagues,[]);
  assert.deepEqual((await ask('manhattan-ks','Football')).body.leagues,[]);
  assert.equal((await ask('kstate','')).status,400);
}

// 7. The page asks only when the feed says so, and draws the section.
{
  const page=read('../public/index.html');
  assert.match(page,/function prosBlock\(g,\{full=false\}=\{\}\)\{\n  if\(!g\?\.pros\)return'';/);
  // The Roster (Pros) tab and the pill at the top of the sport (user,
  // November 18: "I'm not seeing the roster anywhere. Can you make it more
  // obvious?").
  assert.match(page,/<button class="tab" data-view="roster" aria-pressed="false" hidden>Roster<\/button>/);
  assert.match(page,/if\(currentView==='roster'&&!homeMode\(\)\)return renderRoster\(groups\);/);
  assert.match(page,/\$\{recordLine\(g\)\}\$\{rosterPill\(g\)\}/);
  assert.match(page,/\$\{prosBlock\(g\)\}\$\{section\('Other'/);
  assert.match(page,/loadPros\(generation,feedController\.signal\)/);
  const worker=read('../src/index.js');
  assert.match(worker,/alumniLeaguesFor\(sport\)\.length\)for\(const group of groups\)group\.pros=true/);
  assert.match(worker,/ownLeague\?\.sport===sport/,'a pro team page asks for its roster');
  assert.match(page,/l\.team_roster\?`\$\{l\.pros\.length\} players`/);
}
console.log('pro alumni module: rosters, lines, drafts, /live/pros and the page OK');

// 8. Kansas & Kansas City (the hub): players from Kansas, K-State and Wichita
// State, and those born in Kansas; draft picks from those schools, and MLB's
// from any school in Kansas.
{
  const ks={players:[
    {i:'1',n:'A',p:'QB',j:'1',c:'2305',cn:'Kansas',bc:'Dallas',bs:'TX',x:3,t:'kansas-city-chiefs'},
    {i:'2',n:'B',p:'WR',j:'2',c:'99',cn:'Nebraska',bc:'Wichita',bs:'KS',x:1,t:'kansas-city-chiefs'},
    {i:'3',n:'C',p:'DE',j:'3',c:'99',cn:'Nebraska',bc:'Omaha',bs:'NE',x:5,t:'kansas-city-chiefs'}],
    draft:{year:2026,picks:[
      {o:10,r:'1',p:10,n:'D',pos:'P',ai:'',t:'',tn:'X',sch:{location:'Kansas State',displayName:'Kansas State',shortDisplayName:'Kansas State',state:'KS'}},
      {o:20,r:'1',p:20,n:'E',pos:'SS',ai:'',t:'',tn:'X',sch:{location:'Mill Valley HS',displayName:'Mill Valley HS',shortDisplayName:'Mill Valley HS',state:'KS'}},
      {o:30,r:'1',p:30,n:'F',pos:'C',ai:'',t:'',tn:'X',sch:{location:'Texas',displayName:'Texas',shortDisplayName:'Texas',state:'TX'}}]}};
  const pros=A.hubPros(ks,null,{collegeIds:['2305','2306'],birthState:'KS',collegeNames:new Map([['2305','Kansas']])});
  assert.deepEqual(pros.map(p=>[p.name,p.college,p.born||'']),[['A','Kansas',''],['B','Nebraska','Wichita, KS']]);
  const colleges=[{id:'kstate',name:'Kansas State',short_name:'K-State',state:'Kansas',aliases:[],espn_id:'2306'}];
  const matches=(sch,c)=>sch.location===c.name;
  assert.deepEqual(A.hubDraft(ks,colleges,{collegeIds:['2306'],state:'KS',matches}).picks.map(p=>[p.name,p.school]),[['D','K-State'],['E','Mill Valley HS']]);
}
{
  const page=read('../src/pro-sports.mjs');
  assert.match(page,/'kansas-pros':\{kind:'hub'/);
  const hub=schools.find(s=>s.id==='kansas-pros');
  assert.deepEqual([hub.level,hub.pro_sport,hub.league],['pro','Kansas','Kansas & KC']);
  assert.deepEqual(sponsoredSports['kansas-pros'],['Football','Baseball','Basketball','Soccer','Auto Racing']);
}
console.log('pro alumni module: Kansas & Kansas City hub OK');
