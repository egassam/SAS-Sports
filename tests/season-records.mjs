// Season records (user, October 7): each sport's overall and conference
// record, counted from the official finals, equals the record the school's
// own page publishes. Pages saved unmodified on Oct 7 through the private
// source route.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch:async url=>{throw Error(`Unexpected network request: ${url}`);}};
const worker=Function(...Object.keys(deps),source+';return {parseHtml,groupEvents,markConferenceGames};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/season-records/'+name,import.meta.url))).toString('utf8');
const school=id=>schools.find(s=>s.id===id);
const now=new Date('2026-10-07T18:00:00Z');
// The record the page itself publishes ("<span class='record_wins'>5</span> - ...").
function published(raw){
  const data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
  const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
  return[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference])];
}
const records=(id,sport,file,url)=>{const raw=fixture(file);return{raw,events:worker.parseHtml(raw,school(id),sport,url,now)};};

// Oklahoma State soccer: the Aug 6 Tulsa game is an exhibition in the page
// data (type "S") though its card does not say so; okstate.com publishes
// 5-4-3 (Big 12 1-2-1).
{
  const {raw,events}=records('oklahoma-state','Soccer','oklahoma-state-soccer-2026-10-07.html.gz','https://okstate.com/sports/womens-soccer/schedule');
  assert.deepEqual(published(raw),['5-4-3','1-2-1']);
  assert.equal(events.find(e=>e.opponent==='Tulsa').exhibition,true);
  const [record]=worker.groupEvents(events,now)[0].records;
  assert.deepEqual([record.text,record.conference.name,record.conference.text],['5-4-3','Big 12','1-2-1']);
}

// K-State volleyball (the reference school): 9-3, Big 12 1-3.
{
  const {raw,events}=records('kstate','Volleyball','kstate-volleyball-2026-10-07.html.gz','https://www.kstatesports.com/sports/womens-volleyball/schedule');
  assert.deepEqual(published(raw),['9-3','1-3']);
  const [record]=worker.groupEvents(events,now)[0].records;
  assert.deepEqual([record.text,record.conference.text],['9-3','1-3']);
}

// A site without page-data flags (WMT, custom): regular-season games against
// conference members ("Kansas St.", "Iowa St.", "K-State" included); a
// non-member, the school itself and a conference tournament game are not.
{
  const ucf=school('ucf'),game=(opponent,headline,extra={})=>({id:opponent+headline,school_id:'ucf',school:'UCF',sport:'Volleyball',event_type:'GAME',status:'Final',start_time:'2026-09-27T23:00:00Z',title:`UCF vs ${opponent}`,opponent,headline,...extra});
  const events=worker.markConferenceGames([game('Iowa St.','L, 2-3'),game('Kansas State','W, 3-0'),game('K-State','W, 3-1'),game('#12 Arizona State','L, 1-3'),game('Florida','W, 3-2'),game('Baylor','W, 3-0',{title:'UCF vs Baylor (Big 12 Tournament)'})],'<html>no page data</html>',ucf);
  assert.deepEqual(events.map(e=>e.conference_game),[true,true,true,true,false,false]);
  const [record]=worker.groupEvents(events,now)[0].records;
  assert.deepEqual([record.text,record.conference.text],['4-2','2-2']);
}
// A sport the conference does not sponsor has no conference record under the
// membership conference's name, even where the page data marks a game (Ole
// Miss's page marks the Ohio State rifle dual, Sep 26, a conference match; the
// SEC sponsors no rifle). A module naming the league keeps it.
{
  const {events}=records('ole-miss','Rifle','ole-miss-rifle-2026-10-09.html.gz','https://olemisssports.com/sports/womens-rifle/schedule');
  const finals=events.filter(e=>e.status==='Final');
  assert.deepEqual(finals.map(e=>[e.opponent,e.conference_game]),[['UT Martin',false],['Ohio State',false]]);
  const [record]=worker.groupEvents(finals,new Date('2026-10-09T18:00:00Z'))[0].records;
  assert.deepEqual([record.text,record.conference],['2-0',null]);
  const hockey={id:'h',school_id:'ohio-state',school:'Ohio State',sport:'Hockey',event_type:'GAME',status:'Final',start_time:'2026-10-02T23:00:00Z',opponent:'Mercyhurst',headline:'W, 3-1'};
  assert.equal(worker.markConferenceGames([{...hockey}],'<html>no page data</html>',school('ole-miss'))[0].conference_game,false,'SEC: no hockey');
  assert.equal(worker.markConferenceGames([{...hockey,sport:'Lacrosse',conference_game:true,conference_name:'American'}],'',school('florida'))[0].conference_game,true,'a league the module names stays');
}
console.log('Season record checks passed: Oklahoma State soccer 5-4-3 (1-2-1, exhibition from page data), K-State volleyball 9-3 (1-3), membership fallback');
