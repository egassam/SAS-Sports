import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
// A college final that reads only "Completed" takes its result from its
// official story, or is not listed (user, Oct 29: "fix the ones that just say
// completed or TBA"). Times written with a zone ("7 p.m. CT") keep the clock.
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const pages=new Map();
const fetch=async url=>{url=String(url?.url||url);return pages.has(url)?new Response(pages.get(url),{headers:{'content-type':'text/html'}}):new Response('',{status:404});};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const w=Function(...Object.keys(deps),source+';return {completedFromStories,storyHeadline,parsedSourceDate,formatSourceDate,catalogSchool};')(...Object.values(deps));
const story=(title,body='')=>`<html><head><meta property="og:title" content="${title}"><meta property="og:description" content="${body}"></head><body><section><div><div id="storyPageContentBody"><p>${body}</p></div></div></section></body></html>`;
const final=(sport,opponent,url,extra={})=>({status:'Final',sport,opponent,event_type:sport==='Golf'?'MEET':'DUAL',headline:'Completed',results:[{label:'Result',value:'Completed'}],result_count:1,recap_url:url,...extra});
const asu=w.catalogSchool('arizona-state'),base='https://thesundevils.com/news/2026/10/';
pages.set(base+'golf',story('Champions in Hawaii: Women&#39;s golf captures Nanea Invitational title over Stanford and UCLA - Arizona State University Athletics'));
pages.set(base+'tennis',story('WTEN | Sun Devils Reach Doubles Final at ITA Regionals - Arizona State University Athletics'));
pages.set(base+'swim',story('Sun Devils Top Utah 180-120 in Dual Opener','ASU Swimming & Diving opened its season against Utah.'));
pages.set(base+'other',story('Sun Devils Sweep Weekend at Kinlen Invite','ASU tennis went 9-1 at the Kinlen.'));
pages.set(base+'men',story('Men&#8217;s Tennis Wraps Up Fall at Battle of the Bay'));
const events=await w.completedFromStories([
  final('Golf','Nanea Invitational',base+'golf',{team_label:"Women's"}),
  final('Tennis','ITA Regionals',base+'tennis',{team_label:"Women's"}),
  final('Swimming & Diving','Utah',base+'swim'),
  final('Tennis','Battle of the Bay',base+'men',{team_label:"Women's"}),
  final('Tennis','Kinlen Invite',undefined),
  final('Tennis','Bedford Cup',base+'other',{team_label:"Women's"}),
  final('Tennis','Box score only',undefined,{box_score_url:'https://thesundevils.com/boxscore/1'}),
],asu);
assert.deepEqual(events.map(e=>e.headline),['1st','Sun Devils Reach Doubles Final at ITA Regionals','W, 180-120','Completed']);
assert.deepEqual(events[2].results,[{label:'Result',value:'W, 180-120'}]);
assert.equal(events[2].school_score,'180');
assert.deepEqual(events[1].results,[{label:'Recap',value:'Sun Devils Reach Doubles Final at ITA Regionals'}]);
// The men's story is not the women's event's, nor is a story of another
// tournament (the expanded view's own check): with no story it is left out,
// as is one with nothing published; a box score keeps an event.
assert.equal(events.length,4);assert.equal(events[3].opponent,'Box score only');
assert.equal(w.storyHeadline(story('Bulls Show Promise at Penn State Invitational - University at Buffalo'),w.catalogSchool('buffalo')||asu),'Bulls Show Promise at Penn State Invitational');
// A swimming dual's scores in its story's text, each tied to the opponent
// named beside it (user, Oct 29: "it doesn't show a score").
const article=(title,body)=>`<html><head><meta property="og:title" content="${title}"></head><body><script type="application/ld+json">${JSON.stringify({articleBody:`Swimming & Diving. ${body}`})}</script></body></html>`;
const swim=(id,opponent,url,body,extra={})=>{pages.set(url,article(`${id} swimming meet against ${opponent}`,body));return final('Swimming & Diving',opponent,url,{school_id:id,...extra});};
const cin=w.catalogSchool('cincinnati'),vmi=w.catalogSchool('vmi'),mizzou=w.catalogSchool('missouri'),uwf=w.catalogSchool('west-florida')||w.catalogSchool('cincinnati');
const [split]=await w.completedFromStories([swim('cincinnati','Miami (OH)','https://gobearcats.com/news/2026/10/10/swim',"The women's team earned a 188-112 victory over the RedHawks, while the men's team fell 135-165. The Bearcats return Nov. 14-15.")],cin);
assert.equal(split.headline,"Women's team: W, 188-112 / Men's team: L, 135-165");
assert.deepEqual(split.results.map(r=>[r.group,r.result]),[["Women's Team",'W, 188-112'],["Men's Team",'L, 135-165']]);
const vmiBody="The VMI men earned a split on the afternoon, defeating American 215-83 while falling to host UMBC 187.5-112.5. On the women's side, the Keydets fell 238-59 to UMBC and 184-103 to American.";
const [umbc,american]=await w.completedFromStories([
  swim('vmi','UMBC','https://vmikeydets.com/news/2026/10/3/umbc',vmiBody,{team_label:"Women's"}),
  swim('vmi','American','https://vmikeydets.com/news/2026/10/3/american',vmiBody,{team_label:"Men's"}),
],vmi);
assert.deepEqual([umbc.headline,american.headline],['L, 59-238','W, 215-83']);
assert.deepEqual([american.school_score,american.opponent_score],['215','83']);
const mizzouBody="The women’s team beat Indiana State 259-94 and Missouri State 270-83 while the men’s team won 249-104 against Missouri State.";
const [indiana,missouriState]=await w.completedFromStories([
  swim('missouri','Indiana State','https://mutigers.com/news/2026/10/17/a',mizzouBody),
  swim('missouri','Missouri State','https://mutigers.com/news/2026/10/17/b',mizzouBody),
],mizzou);
assert.equal(indiana.headline,"Women's team: W, 259-94");
assert.equal(missouriState.headline,"Women's team: W, 270-83 / Men's team: W, 249-104");
// Another school's score beside a like name is not this opponent's, and an
// invitational's total is not a dual.
const [fsu,invite]=await w.completedFromStories([
  swim('cincinnati','Florida State','https://gobearcats.com/news/2026/10/23/fsu','The Bearcats beat Florida Gulf Coast (242-19) but lost to North Florida (153-123) and FSU (206-72).',{team_label:"Women's"}),
  swim('cincinnati','Hannah Gibbons Invitational','https://gobearcats.com/news/2026/10/23/invite','The Bearcats won the Hannah Gibbons Invitational with 1,135.5 points, a 1,135.5-382 win.',{team_label:"Women's"}),
],cin);
assert.equal(fsu.headline,'L, 72-206');
assert.equal(invite.results[0].label,'Recap');
// A diving meet with no team score: its story's results table.
const table=`<p><strong>Men's Results</strong></p><table><tr><td><strong>Event</strong></td><td><strong>Diver</strong></td><td><strong>Score</strong></td><td><strong>Place</strong></td></tr><tr><td>3-Meter</td><td>Miguel Tovar<br>Conor Gesing</td><td>390.30<br>366.60</td><td>1<br>3</td></tr></table><p><strong>Women's Results</strong></p><table><tr><td>Event</td><td>Diver</td><td>Score</td><td>Place</td></tr><tr><td>3-Meter (EXH)</td><td>Camyla Monroy</td><td>361.80</td><td>EXH</td></tr></table>`;
pages.set('https://floridagators.com/news/2026/10/16/dive',`<html><head><meta property="og:title" content="Miguel Tovar Leads Gators to 3-Meter Victory Over Miami"></head><body><section><div><div id="storyPageContentBody"><p>Florida Swimming & Diving hosted Miami.</p>${table}</div></div></section></body></html>`);
const uf=w.catalogSchool('florida'),dive=(label)=>final('Swimming & Diving','Miami (Diving)','https://floridagators.com/news/2026/10/16/dive',{school_id:'florida',team_label:label});
const [men,women]=await w.completedFromStories([dive("Men's"),dive("Women's")],uf);
assert.equal(men.headline,'1st · Miguel Tovar (3-Meter)');
assert.deepEqual(men.results,[{group:'3-Meter',participant:'Miguel Tovar',result:'390.30 · 1st'},{group:'3-Meter',participant:'Conor Gesing',result:'366.60 · 3rd'}]);
assert.equal(women.headline,'Exhibition');assert.deepEqual(women.results,[{group:'3-Meter (EXH)',participant:'Camyla Monroy',result:'361.80 · Exhibition'}]);
// Published clocks with a zone.
assert.equal(w.formatSourceDate('October 30, 2026','7 p.m. CT'),'Oct 30, 7:00 PM');
assert.equal(w.formatSourceDate('November 1, 2026','12 p.m. CT'),'Nov 1, 12:00 PM');
assert.equal(w.formatSourceDate('November 1, 2026','Noon'),'Nov 1, 12:00 PM');
assert.equal(w.formatSourceDate('November 1, 2026','TBA'),'Nov 1');
assert.equal(w.formatSourceDate('November 1, 2026','4:30 or 7 p.m. CT'),'Nov 1');
console.log('Completed-from-stories and zoned-time checks passed.');
