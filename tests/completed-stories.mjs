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
const story=(title,body='')=>`<html><head><meta property="og:title" content="${title}"><meta property="og:description" content="${body}"></head><body><p>${body}</p></body></html>`;
const final=(sport,opponent,url,extra={})=>({status:'Final',sport,opponent,event_type:sport==='Golf'?'MEET':'DUAL',headline:'Completed',results:[{label:'Result',value:'Completed'}],result_count:1,recap_url:url,...extra});
const asu=w.catalogSchool('arizona-state'),base='https://thesundevils.com/news/2026/10/';
pages.set(base+'golf',story('Champions in Hawaii: Women&#39;s golf captures Nanea Invitational title over Stanford and UCLA - Arizona State University Athletics'));
pages.set(base+'tennis',story('WTEN | Sun Devils Reach Doubles Final at ITA Regionals - Arizona State University Athletics'));
pages.set(base+'swim',story('Sun Devils Top Utah 180-120 in Dual Opener'));
pages.set(base+'men',story('Men&#8217;s Tennis Wraps Up Fall at Battle of the Bay'));
const events=await w.completedFromStories([
  final('Golf','Nanea Invitational',base+'golf',{team_label:"Women's"}),
  final('Tennis','ITA Regionals',base+'tennis',{team_label:"Women's"}),
  final('Swimming & Diving','Utah',base+'swim'),
  final('Tennis','Battle of the Bay',base+'men',{team_label:"Women's"}),
  final('Tennis','Kinlen Invite',undefined),
  final('Tennis','Box score only',undefined,{box_score_url:'https://thesundevils.com/boxscore/1'}),
],asu);
assert.deepEqual(events.map(e=>e.headline),['1st','Sun Devils Reach Doubles Final at ITA Regionals','W, 180-120','Completed']);
assert.deepEqual(events[2].results,[{label:'Result',value:'W, 180-120'}]);
assert.equal(events[2].school_score,'180');
assert.deepEqual(events[1].results,[{label:'Recap',value:'Sun Devils Reach Doubles Final at ITA Regionals'}]);
// The men's story is not the women's event's: with no story it is left out,
// as is one with nothing published; a box score keeps an event.
assert.equal(events.length,4);assert.equal(events[3].opponent,'Box score only');
assert.equal(w.storyHeadline(story('Bulls Show Promise at Penn State Invitational - University at Buffalo'),w.catalogSchool('buffalo')||asu),'Bulls Show Promise at Penn State Invitational');
// Published clocks with a zone.
assert.equal(w.formatSourceDate('October 30, 2026','7 p.m. CT'),'Oct 30, 7:00 PM');
assert.equal(w.formatSourceDate('November 1, 2026','12 p.m. CT'),'Nov 1, 12:00 PM');
assert.equal(w.formatSourceDate('November 1, 2026','Noon'),'Nov 1, 12:00 PM');
assert.equal(w.formatSourceDate('November 1, 2026','TBA'),'Nov 1');
assert.equal(w.formatSourceDate('November 1, 2026','4:30 or 7 p.m. CT'),'Nov 1');
console.log('Completed-from-stories and zoned-time checks passed.');
