// National rankings for college sports (user, November 7, 2026: "We also need
// to add rankings to the college sports so I can tell where teams are ranked
// nationally"), from ESPN's polls saved on November 7.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const fixture=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/rankings/${name}-2026-11-07.json.gz`,import.meta.url))).toString('utf8'));
const boards={'football/college-football':fixture('football_college-football'),'basketball/mens-college-basketball':fixture('basketball_mens-college-basketball'),
  'basketball/womens-college-basketball':fixture('basketball_womens-college-basketball'),'volleyball/womens-college-volleyball':fixture('volleyball_womens-college-volleyball'),'soccer/usa.ncaa.w.1':fixture('soccer_usa.ncaa.w.1')};
let reads=0;
const fetch=async url=>{const m=String(url).match(/sports\/(.+)\/rankings$/);if(m){reads++;return boards[m[1]]?new Response(JSON.stringify(boards[m[1]]),{status:200}):new Response('{}',{status:404});}throw Error(`Unexpected network request: ${url}`);};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const w=Function(...Object.keys(deps),source+';return {rankingPolls,schoolRanks,opponentRank,attachRankings,catalogSchool,pollLabel};')(...Object.values(deps));
const school=id=>w.catalogSchool(id);

// The Division I polls only, in ESPN's order (the CFP leads football).
assert.deepEqual(w.rankingPolls(boards['football/college-football']).map(p=>p.poll),['CFP','AP','Coaches'],'FCS, Division II and III polls are left out');
assert.deepEqual(w.rankingPolls(boards['volleyball/womens-college-volleyball']).map(p=>p.poll),['AVCA']);
assert.deepEqual(w.rankingPolls(boards['soccer/usa.ncaa.w.1']).map(p=>p.poll),['United Soccer Coaches']);

// A team's ranks: Utah football is 3rd in the CFP and the AP (Nov 7).
{
  const groups=[{school_id:'utah',sport:'Football',records:[],live:[],results:[],upcoming:[{opponent:'BYU',title:'Utah vs BYU',status:'Upcoming'}]}];
  await w.attachRankings(groups,school('utah'),'Football');
  assert.deepEqual(groups[0].rankings.map(r=>[r.poll,r.rank]).slice(0,2),[['CFP',3],['AP',3]]);
  assert.deepEqual(groups[0].upcoming[0].opponent_rank,{rank:9,poll:'CFP'},'an upcoming opponent takes its rank in the first poll');
}
// Kansas State is unranked: no rankings, and K-State is never taken for Kansas or the reverse.
{
  const groups=[{school_id:'kstate',sport:'Football',records:[],live:[],results:[{opponent:'Utah',title:'K-State vs Utah',status:'Final'}],upcoming:[{opponent:'#15 Texas Tech',title:'K-State at Texas Tech',status:'Upcoming'}]}];
  await w.attachRankings(groups,school('kstate'),'Football');
  assert.deepEqual(groups[0].rankings,[],'K-State is not ranked');
  assert.equal(groups[0].results[0].opponent_rank,undefined,'a past result keeps no current rank');
  assert.deepEqual(groups[0].upcoming[0].opponent_rank,{rank:15,poll:'CFP'},'"#15 Texas Tech" is Texas Tech');
}
// "Miami (OH)" is not Miami (No. 1); "(Exhibition)" is a note.
{
  const boardsList=[{team_label:null,polls:w.rankingPolls(boards['football/college-football'])}];
  assert.equal(w.opponentRank(boardsList,{opponent:'Miami (OH)'}),null);
  assert.deepEqual(w.opponentRank(boardsList,{opponent:'Miami (Exhibition)'}),{rank:1,poll:'CFP'});
  assert.deepEqual(w.opponentRank(boardsList,{opponent:'at No. 2 Georgia'}),{rank:2,poll:'CFP'});
}
// Basketball: men's and women's polls are separate boards, each with its team.
{
  const groups=[{school_id:'south-carolina',sport:'Basketball',records:[],live:[],results:[],upcoming:[]}];
  await w.attachRankings(groups,school('south-carolina'),'Basketball');
  assert.ok(groups[0].rankings.some(r=>r.team_label==="Women's"&&r.poll==='AP'&&r.rank===1),'South Carolina women are No. 1 in the AP');
}
// High and middle schools and pro teams read no polls.
{
  const before=reads,groups=[{school_id:'manhattan-ks',sport:'Football',records:[],live:[],results:[],upcoming:[]}];
  await w.attachRankings(groups,school('manhattan-ks'),'Football');
  assert.equal(groups[0].rankings,undefined);assert.equal(reads,before,'no ESPN read for a high school');
}
// A poll is read once for every school (one read per board per isolate hour).
{
  const before=reads;
  for(const id of ['byu','texas','alabama'])await w.attachRankings([{school_id:id,sport:'Football',records:[],live:[],results:[],upcoming:[]}],school(id),'Football');
  assert.equal(reads,before,'the football polls were already read');
}
// The page: a ranked opponent's rank before its name; never twice.
{
  const page=read('../public/index.html'),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rankedTitle=Function('esc',page.match(/function rankedTitle\(e\)\{[\s\S]*?\n\}\n/)[0]+';return rankedTitle;')(esc);
  assert.equal(rankedTitle({title:'Utah vs BYU',opponent:'BYU',opponent_rank:{rank:9,poll:'CFP'}}),'Utah vs <span class="rank-badge" title="No. 9 in the CFP poll">#9</span> BYU');
  assert.equal(rankedTitle({title:'K-State at #15 Texas Tech',opponent:'#15 Texas Tech',opponent_rank:{rank:15,poll:'CFP'}}),'K-State at #15 Texas Tech','the schedule already wrote it');
  assert.equal(rankedTitle({title:'Utah vs BYU',opponent:'BYU'}),'Utah vs BYU');
}
console.log('rankings: ok (CFP, AP, Coaches, AVCA, United Soccer Coaches; team and upcoming opponent ranks; college only; one read per board)');
