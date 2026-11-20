// High school to college (user, November 18, 2026: item 1 of "What unique
// things should we add now?"). Fixtures of November 18, 2026: K-State
// football (SIDEARM cards), Nebraska soccer (table) and Missouri softball
// (a list that shows no hometown; the roster is in __NUXT_DATA__).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {rosterHometowns,alumniMatcher,hometownParts,highSchoolKey,collegeAlumniIndex,ALUMNI_COLLEGES,collegeAlumniKey} from '../src/college-alumni.mjs';

const dir=new URL('./fixtures/college-alumni/',import.meta.url);
const page=name=>gunzipSync(readFileSync(new URL(name,dir))).toString('utf8');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const noNuxt=html=>html.replace(/<script[^>]*id="__NUXT_DATA__"[\s\S]*?<\/script>/,'');

// The three layouts, from the page's data and from its markup.
const kstate=page('kstate-football-roster-2026-11-18.html.gz'),nebraska=page('nebraska-soccer-roster-2026-11-18.html.gz'),missouri=page('missouri-softball-roster-2026-11-18.html.gz');
const ks=rosterHometowns(kstate,'https://www.kstatesports.com/sports/football/roster');
assert.equal(ks.length,111);
assert.deepEqual(ks.find(p=>p.name==='Jackson Hollie'),{name:'Jackson Hollie',hometown:'Junction City, Kan.',high_school:'Junction City',previous_school:null,position:ks.find(p=>p.name==='Jackson Hollie').position,year:ks.find(p=>p.name==='Jackson Hollie').year,url:ks.find(p=>p.name==='Jackson Hollie').url});
assert.match(ks.find(p=>p.name==='Jackson Hollie').url,/^https:\/\/www\.kstatesports\.com\/sports\/football\/roster\/jackson-hollie\/\d+$/);
assert.equal(rosterHometowns(noNuxt(kstate),'https://www.kstatesports.com/sports/football/roster').length,111,'the cards read alike');
assert.equal(rosterHometowns(noNuxt(kstate)).find(p=>p.name==='Koy Beasley').previous_school,'Miami (Ohio)','"Previous School:" label dropped');
const ne=rosterHometowns(nebraska,'https://huskers.com/sports/soccer/roster');
assert.equal(ne.length,24);
assert.deepEqual([ne.find(p=>p.name==='Reese Snowden')].map(p=>[p.hometown,p.high_school,p.url]),[['Manhattan, Kan.','Manhattan','https://huskers.com/sports/soccer/roster/player/reese-snowden']]);
assert.equal(rosterHometowns(noNuxt(nebraska)).length,24,'the table reads alike');
assert.equal(rosterHometowns(missouri).length,25,'a list with no hometown shown: the page data');
assert.equal(rosterHometowns(noNuxt(missouri)).length,0);
assert.deepEqual(rosterHometowns(''),[]);

// Hometowns and names.
assert.deepEqual(hometownParts('Seneca, Kan.'),{city:'Seneca',state:'KS'});
assert.deepEqual(hometownParts('Wamego,Kan.'),{city:'Wamego',state:'KS'});
assert.deepEqual(hometownParts('Hillsboro, Kansas'),{city:'Hillsboro',state:'KS'});
assert.equal(hometownParts('Kansas City, Mo.').state,'Mo');
assert.equal(highSchoolKey('Junction City HS'),highSchoolKey('Junction City High School'));
assert.equal(highSchoolKey('Hesston High'),'hesston');

// The app's high school: its name and its city, both.
const match=alumniMatcher(schools.filter(s=>s.level==='high-school'&&s.state==='Kansas'));
const who=(high_school,hometown)=>match({high_school,hometown})?.id||null;
assert.equal(who('Junction City','Junction City, Kan.'),'junction-city-ks');
assert.equal(who('Free State','Lawrence, Kan.'),'lawrence-free-state-ks');
assert.equal(who('Lawrence Free State HS','Lawrence, Kan.'),'lawrence-free-state-ks');
assert.equal(who('Washburn Rural','Topeka, Kan.'),'washburn-rural-ks');
assert.equal(who('Mill Valley/Coffeyville CC','Shawnee, Kan.'),null,'not an app school');
assert.equal(who('Eudora, High School','Eudora, Kan.'),'eudora-ks');
// "Blue Valley" of Leawood or Stilwell is Blue Valley High (Overland Park),
// not the app's Blue Valley (Randolph).
assert.equal(who('Blue Valley','Leawood, Kan.'),null);
assert.equal(who('Blue Valley','Stilwell, Kan.'),null);
assert.equal(who('Manhattan','Manhattan, Kan.'),'manhattan-ks');
assert.equal(who('Manhattan','Manhattan, Mont.'),null,'another state');
assert.equal(who('Junction City','Kansas City, Mo.'),null);

// A college's index: K-State football's players from the app's schools.
const index=collegeAlumniIndex({id:'kstate'},[{sport:'Football',team:null,players:ks}],match);
assert.deepEqual(index.map(p=>`${p.name} ${p.school_id}`).sort(),['Ashton Moore louisburg-ks','Holden Bass nemaha-central-ks','Jackson Hollie junction-city-ks','Jet Dineen lawrence-free-state-ks','Nash Morrison basehor-linwood-ks']);
// Nash Morrison (WR, Basehor, Kan.; last school Basehor-Linwood) since Leavenworth County joined (November 20).
// Ashton Moore (LB, Louisburg, Kan.; last school Louisburg) since Louisburg joined (November 19).
assert.ok(ALUMNI_COLLEGES.includes('kstate')&&ALUMNI_COLLEGES.includes('kansas')&&ALUMNI_COLLEGES.length===17);
assert.equal(collegeAlumniKey('kstate'),'alumni:v1:college:kstate');

// Through the Worker: K-State's index is built from its roster pages (only
// football answers here), kept in KV, and Junction City's Football asks it.
const answers={'https://www.kstatesports.com/sports/football/roster':kstate};
let reads=0;
const fetch=async url=>{reads++;const body=answers[String(url?.url||url)];return body?new Response(body,{status:200,headers:{'content-type':'text/html'}}):new Response('',{status:404});};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {buildCollegeAlumni,highSchoolCollegeAnswer,schoolProsAnswer,catalogSchool}')(...Object.values(deps));
const built=await worker.buildCollegeAlumni(worker.catalogSchool('kstate'),new Date('2026-11-18T20:00:00Z'));
assert.equal(built.college_id,'kstate');
assert.deepEqual(built.pages.map(p=>`${p.sport} ${p.players}`),['Football 111']);
assert.deepEqual(built.players.map(p=>p.name).sort(),['Ashton Moore','Holden Bass','Jackson Hollie','Jet Dineen','Nash Morrison']);
assert.ok(built.reads<40,`a sport's alternative paths stop at the first found (${built.reads} reads)`);
const kv=new Map([[collegeAlumniKey('kstate'),JSON.stringify(built)]]),waits=[];
const env={HIGHLIGHTS:{get:async(k,type)=>kv.has(k)?(type==='json'?JSON.parse(kv.get(k)):kv.get(k)):null,put:async(k,v)=>{kv.set(k,v)}}};
const ctx={waitUntil:p=>waits.push(p)};
const answer=await worker.schoolProsAnswer(env,ctx,'junction-city-ks','Football');
assert.equal(answer.read,true);
const college=answer.leagues[0];
assert.deepEqual([college.league,college.college,college.colleges_read,college.colleges],['College',true,1,17]);
assert.deepEqual(college.pros.map(p=>[p.name,p.team,p.team_id]),[['Jackson Hollie','K-State','kstate']]);
// Two of the 16 missing colleges are started in the background, not awaited.
assert.equal(waits.length,2);await Promise.all(waits);
assert.equal(kv.size,3);
// Another sport, another school: none.
assert.deepEqual((await worker.schoolProsAnswer(env,ctx,'junction-city-ks','Volleyball')).leagues[0].pros,[]);
assert.deepEqual((await worker.schoolProsAnswer(env,ctx,'manhattan-ks','Football')).leagues[0].pros,[]);

// The page: a high school's list is "In College", its tab "College".
const html=read('../public/index.html');
assert.match(html,/const isCollegeList=g=>catalogEntry\(g\?\.school_id\)\?\.level==='high-school';/);
assert.match(html,/<div class="section-label">In College<\/div>/);
console.log(`college-alumni: ok (K-State football ${ks.length} players, ${index.length} from the app's high schools)`);
