// College conference standings (user, November 11, 2026: "Start the college
// conference standings"), from ESPN's conference tables saved on November 11
// (trimmed to the fields read): Big 12 and SWAC football, Big 12 men's and
// women's basketball.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {COLLEGE_STANDINGS_BOARDS,COLLEGE_HOCKEY_PAGES,collegeConferenceStandings,collegeStandingsReads,collegeStandingsUrl,parseChnStandings,collegeHockeyStandings,collegeHockeyReads} from '../src/college-standings.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),groups=JSON.parse(read('../src/college-standings.json'));
const fixture=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/college-standings/${name}-2026-11-11.json.gz`,import.meta.url))).toString('utf8'));
const page=name=>gunzipSync(readFileSync(new URL(`./fixtures/college-standings/${name}-2026-11-12.html.gz`,import.meta.url))).toString('utf8');
const tablesFor=(id,sport,files)=>collegeStandingsReads(id,sport).flatMap(r=>collegeConferenceStandings(fixture(files[r.board]),r));

// Every college school with football or basketball has its conference,
// except football independents and schools without a women's team.
const UNMAPPED={'football/college-football':['chicago-state','merrimack','notre-dame','uconn'],'basketball/mens-college-basketball':[],'basketball/womens-college-basketball':['citadel','vmi']};
for(const [board,spec] of Object.entries(COLLEGE_STANDINGS_BOARDS)){
  const want=schools.filter(s=>(!s.level||s.level==='college')&&!s.pro&&(sponsoredSports[s.id]||[]).includes(spec.sport)).map(s=>s.id);
  const missing=want.filter(id=>!groups.boards[board][id]).sort();
  assert.deepEqual(missing,UNMAPPED[board],`${board}: rerun scripts/make-college-standings.mjs for ${missing.join(', ')}`);
  const teams=Object.values(groups.boards[board]).map(([,team])=>team);
  assert.equal(new Set(teams).size,teams.length,`${board}: one ESPN team is never two schools`);
  for(const id of Object.keys(groups.boards[board]))assert.ok(want.includes(id),`${board}: ${id} is a college school with ${spec.sport}`);
}
assert.ok(Object.keys(groups.boards['football/college-football']).length>=230);

// One read per conference, not the whole division (2.4 to 6 MB).
assert.deepEqual(collegeStandingsReads('kstate','Football').map(r=>r.url),['https://site.api.espn.com/apis/v2/sports/football/college-football/standings?group=4']);
assert.deepEqual(collegeStandingsReads('kansas','Basketball').map(r=>r.url),[collegeStandingsUrl('basketball/mens-college-basketball',8),collegeStandingsUrl('basketball/womens-college-basketball',8)]);
assert.deepEqual(collegeStandingsReads('kstate','Volleyball'),[],'no conference tables for other sports yet');
assert.deepEqual(collegeStandingsReads('notre-dame','Football'),[],'an independent has no table');
assert.deepEqual(collegeStandingsReads('manhattan-ks','Football'),[],'a high school has none');

// K-State football: the Big 12 by ESPN's seed, K-State 15th and marked.
{
  const [t,...rest]=tablesFor('kstate','Football',{'football/college-football':'football-big12'});
  assert.equal(rest.length,0);assert.equal(t.title,'Big 12');
  assert.deepEqual(t.columns.map(c=>c.label),['Conf','Ovr','Strk']);
  assert.equal(t.rows.length,16);
  assert.deepEqual(t.rows[0],{pos:1,name:'Utah',detail:'Home 6-0 · Away 3-0',values:{conf:'6-0',overall:'9-0',streak:'W9'}});
  // ESPN's seed, not its list order: Iowa State (11) above Cincinnati (12).
  assert.deepEqual(t.rows.slice(9,12).map(r=>r.name),['West Virginia','Iowa State','Cincinnati']);
  assert.deepEqual(t.rows.filter(r=>r.own),[{pos:15,name:'Kansas State',detail:'Home 4-2 · Away 0-3',values:{conf:'1-5',overall:'4-5',streak:'L3'},own:true}]);
  assert.deepEqual(t.source,{name:'ESPN standings (2026 season)',url:'https://www.espn.com/college-football/standings/_/group/4'});
}
// SWAC football: the school's division first, then the conference.
{
  const tables=tablesFor('alabama-am','Football',{'football/college-football':'football-swac'});
  assert.deepEqual(tables.map(t=>[t.title,t.rows.length]),[['SWAC - East',6],['SWAC',12]]);
  assert.deepEqual(tables[0].rows.map(r=>r.name),['Jackson State','Alabama A&M','Alabama State','Bethune-Cookman','Mississippi Valley State','Florida A&M']);
  assert.equal(tables[0].rows.find(r=>r.own).pos,2);assert.equal(tables[1].rows.find(r=>r.own).pos,4);
}
// Basketball: the men's and women's Big 12, each with its team marked.
{
  const tables=tablesFor('kansas','Basketball',{'basketball/mens-college-basketball':'mens-basketball-big12','basketball/womens-college-basketball':'womens-basketball-big12'});
  assert.deepEqual(tables.map(t=>t.title),["Men's Big 12","Women's Big 12"]);
  assert.deepEqual(tables[0].rows.find(r=>r.own),{pos:4,name:'Kansas',detail:'Home 2-0 · Away 0-0',values:{conf:'0-0',overall:'3-0',streak:'W3'},own:true});
  assert.equal(tables[1].rows[0].name,'Kansas State');
  assert.equal(tables[0].source.name,'ESPN standings (2026-27 season)');
}
// A school not in the payload (realignment), an independent or no payload: no table.
assert.deepEqual(collegeConferenceStandings(fixture('football-big12'),{board:'football/college-football',team:'99999',group:4}),[]);
assert.deepEqual(collegeConferenceStandings({name:'FBS Independents',standings:{entries:[{team:{id:'87'},stats:[]}]}},{board:'football/college-football',team:'87',group:18}),[]);
assert.deepEqual(collegeConferenceStandings(null,{board:'football/college-football',team:'2306',group:4}),[]);
// Without seeds (not published): conference record, then overall.
{
  const e=(id,location,conf,total)=>({team:{id,location},stats:[{type:'vsconf',displayValue:conf},{type:'total',displayValue:total}]});
  const [t]=collegeConferenceStandings({name:'Test Conference',shortName:'Test',standings:{entries:[e('1','A','1-2','5-4'),e('2','B','3-0','4-5'),e('3','C','1-2','6-3')]}},{board:'football/college-football',team:'3',group:1});
  assert.deepEqual(t.rows.map(r=>[r.pos,r.name,!!r.own]),[[1,'B',false],[2,'C',true],[3,'A',false]]);
}

// College hockey (user, November 12, 2026: "Add the hockey conference
// standings"), from College Hockey News's pages saved on November 12 (trimmed
// to the title and the tables): ESPN's hockey standings have no conference
// record or points. Every college school with hockey maps to its team on the
// men's page, the women's page or both, except independents, schools without
// that team and schools CHN does not list.
{
  const want=schools.filter(s=>(!s.level||s.level==='college')&&!s.pro&&(sponsoredSports[s.id]||[]).includes('Hockey')).map(s=>s.id);
  const men=groups.boards['chn/mens-hockey'],women=groups.boards['chn/womens-hockey'];
  assert.deepEqual(want.filter(id=>!men[id]&&!women[id]).sort(),['jacksonville','njit','tennessee-state'],'rerun scripts/make-college-standings.mjs');
  for(const board of Object.keys(COLLEGE_HOCKEY_PAGES)){
    const teams=Object.values(groups.boards[board]).map(([,team])=>team);
    assert.equal(new Set(teams).size,teams.length,`${board}: one CHN team is never two schools`);
    for(const id of Object.keys(groups.boards[board]))assert.ok(want.includes(id),`${board}: ${id} is a college school with hockey`);
  }
  assert.ok(Object.keys(men).length>=33&&Object.keys(women).length>=26);
  // CHN's spellings: "Miami" is Miami (OH), never Miami (FL); "Massachusetts" and "Mass.-Lowell".
  assert.deepEqual([men['miami-oh'],men.umass,men['umass-lowell'],women.liu],[['NCHC','30'],['Hockey East','27'],['Hockey East','26'],['NEWHA','62']]);

  const pages={'chn/mens-hockey':page('chn-mens-hockey'),'chn/womens-hockey':page('chn-womens-hockey')};
  assert.deepEqual(parseChnStandings(pages['chn/mens-hockey']).map(c=>[c.conference,c.teams.length]),[['Atlantic Hockey',9],['Big Ten',7],['CCHA',8],['ECAC',12],['Hockey East',11],['NCHC',10]],'independents are no conference');
  assert.deepEqual(parseChnStandings(pages['chn/womens-hockey']).map(c=>[c.conference,c.teams.length]),[['ECAC',12],['Hockey East',10],['WCHA',8],['AHA',7],['NEWHA',8]]);
  const hockeyFor=id=>collegeHockeyReads(id,'Hockey').flatMap(r=>collegeHockeyStandings(pages[r.board],r));
  // Boston College: a men's and a women's tab, CHN's order, its row marked.
  const bc=hockeyFor('boston-college');
  assert.deepEqual(bc.map(t=>[t.title,t.rows.length]),[["Men's Hockey East",11],["Women's Hockey East",10]]);
  assert.deepEqual(bc[0].columns.map(c=>c.label),['GP','Pts','Ovr']);
  assert.deepEqual(bc[0].rows.find(r=>r.own),{pos:8,name:'Boston College',detail:'Reg 0-1 · OT 1-2',values:{gp:'4',pts:'4',overall:'2-5-2'},own:true});
  assert.deepEqual(bc[1].rows.find(r=>r.own),{pos:2,name:'Boston College',detail:'Reg 4-2 · OT 0-1',values:{gp:'7',pts:'13',overall:'6-5-0'},own:true});
  assert.deepEqual(bc[0].source,{name:'College Hockey News standings (2026-27 season)',url:'https://www.collegehockeynews.com/reports/standings.php'});
  // A tied team shares the rank above (CHN leaves its cell blank).
  const [aha]=hockeyFor('holy-cross');
  assert.deepEqual(aha.rows.map(r=>`${r.pos} ${r.name}`),['1 Army','2 Bentley','3 Sacred Heart','4 RIT','5 Air Force','5 Holy Cross','7 Niagara','7 Robert Morris','9 Canisius']);
  assert.deepEqual(hockeyFor('bowling-green').map(t=>[t.title,t.rows[0].name,t.rows[0].values.pts]),[["Men's CCHA",'Bowling Green','12']],'no women\'s team: one tab');
  assert.deepEqual(hockeyFor('princeton').map(t=>t.rows.find(r=>r.own).pos),[11,1]);
  // Not on the page (realignment), no page, other sports or levels: nothing.
  assert.deepEqual(collegeHockeyStandings(pages['chn/mens-hockey'],{board:'chn/mens-hockey',team:'99999'}),[]);
  assert.deepEqual(collegeHockeyStandings(null,{board:'chn/mens-hockey',team:'9'}),[]);
  assert.deepEqual(collegeHockeyReads('boston-college','Basketball'),[]);
  assert.deepEqual(collegeHockeyReads('manhattan-ks','Hockey'),[]);
}

// The Worker: a college feed's groups carry the tables; one read per
// conference board, kept 30 minutes; high schools and pro teams read none.
{
  let reads=[];
  const byUrl={[collegeStandingsUrl('football/college-football',4)]:fixture('football-big12'),[collegeStandingsUrl('basketball/mens-college-basketball',8)]:fixture('mens-basketball-big12'),[collegeStandingsUrl('basketball/womens-college-basketball',8)]:fixture('womens-basketball-big12')};
  const htmlByUrl={[COLLEGE_HOCKEY_PAGES['chn/mens-hockey'].url]:page('chn-mens-hockey'),[COLLEGE_HOCKEY_PAGES['chn/womens-hockey'].url]:page('chn-womens-hockey')};
  const fetch=async(url,init)=>{const u=String(url?.url||url);reads.push({url:u,agent:new Headers(init?.headers||url?.headers).get('user-agent')});if(htmlByUrl[u])return new Response(htmlByUrl[u],{status:200,headers:{'content-type':'text/html'}});return byUrl[u]?new Response(JSON.stringify(byUrl[u]),{status:200,headers:{'content-type':'application/json'}}):new Response('{}',{status:404});};
  const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
  const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
  const w=Function(...Object.keys(deps),source+';return {attachCollegeStandings,catalogSchool,SCOREBOARD_USER_AGENT};')(...Object.values(deps));
  const group=(id,sport)=>[{school_id:id,sport,records:[],live:[],results:[],upcoming:[],other:[]}];
  const ks=group('kstate','Football');await w.attachCollegeStandings(ks,w.catalogSchool('kstate'),'Football');
  assert.deepEqual(ks[0].standings.map(t=>t.title),['Big 12']);
  assert.equal(reads.filter(r=>r.url.includes('/standings?group=')).length,1);
  assert.equal(reads.find(r=>r.url.includes('/standings?group=')).agent,w.SCOREBOARD_USER_AGENT,'ESPN is read with the scoreboard identity');
  const ku=group('kansas','Basketball');await w.attachCollegeStandings(ku,w.catalogSchool('kansas'),'Basketball');
  assert.deepEqual(ku[0].standings.map(t=>t.title),["Men's Big 12","Women's Big 12"]);
  reads=[];
  for(const [id,sport] of [['manhattan-ks','Football'],['kansas-city-chiefs','Football'],['kstate','Volleyball']]){const g=group(id,sport);await w.attachCollegeStandings(g,w.catalogSchool(id),sport);assert.equal(g[0].standings,undefined,`${id} ${sport}`);}
  assert.equal(reads.length,0,'no standings read for a high school, a pro team or a sport without tables');
  // Hockey: the College Hockey News page of each gender, the same URL for every school.
  reads=[];
  const bc=group('boston-college','Hockey');await w.attachCollegeStandings(bc,w.catalogSchool('boston-college'),'Hockey');
  assert.deepEqual(bc[0].standings.map(t=>t.title),["Men's Hockey East","Women's Hockey East"]);
  const bu=group('boston-university','Hockey');await w.attachCollegeStandings(bu,w.catalogSchool('boston-university'),'Hockey');
  assert.equal(bu[0].standings.length,2);
  // (The source cache, absent here, keeps each page 30 minutes for every school.)
  assert.deepEqual([...new Set(reads.map(r=>r.url).filter(u=>!u.endsWith('/robots.txt')))].sort(),Object.values(COLLEGE_HOCKEY_PAGES).map(p=>p.url).sort(),'only the two College Hockey News pages');
  // A refused read leaves the feed as it was.
  const ut=group('utah','Football');await w.attachCollegeStandings(ut,w.catalogSchool('utah'),'Football');
  assert.equal(ut[0].standings?.[0]?.title,'Big 12','Utah reads the same Big 12 table (kept)');
  const sec=group('alabama','Football');await w.attachCollegeStandings(sec,w.catalogSchool('alabama'),'Football');
  assert.equal(sec[0].standings,undefined,'a failed read (404) adds no standings');
}
// Wiring: the grouped feed attaches them after the rankings, when no pro standings.
{
  const worker=read('../src/index.js');
  assert.match(worker,/group\.standings=result\.standings;\n\s*else await attachCollegeStandings\(groups,/);
}
console.log('college standings: ok');
