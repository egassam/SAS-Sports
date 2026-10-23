// Shared rules found onboarding the ASUN (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfStoryPlace,createArchiveStory} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');
const uca="(?:Bears|Central Arkansas|(?:Men's|Women's) Golf)";

// Golf stories. Mutation: without each rule the final reads "Completed" or
// another place.
// The older story template: its text block is the story, its headline the
// first sentence ("Bears Finish in 4th at the GMAC Invitational"); a dateline
// in lower case ("Conway, Ark.-") left the menus first.
assert.equal(golfStoryPlace(fixture('central-arkansas-module/story-2026-10-13-womens-golf-gaccion-co-champion-at-lady-.html.gz'),{team:uca}),'4th');
// "Going into the Final Round the Bears were tied for 2nd place ... ended the
// tournament in 3rd place" (Sandestin).
assert.equal(golfStoryPlace(fixture('central-arkansas-module/story-2026-9-16-mens-golf-bears-finish-1-stroke-out-of-1.html.gz'),{team:uca}),'3rd');
// "finishing the final round in 17th place" (North Alabama, Diamante).
assert.equal(golfStoryPlace(fixture('north-alabama-module/story-2026-10-20-womens-golf-womens-golf-closes-play-at-d.html.gz'),{team:"(?:Lions|North Alabama|(?:Men's|Women's) Golf)"}),'17th');

// The archive reader (createArchiveStory), served from saved pages: an
// archive the browser fills (ucasports.com) lists no stories, so the sport's
// home page is read; the older template's story text is read; the schedule's
// "Diamante Intercollegiate" is its story's "Diamante Invitational"; a weekly
// award story ("Norman Named UAC Golfer of the Week") is never a meet's story.
const files=new Map([['/sports/womens-golf/archives','womens-golf-archives'],['/sports/womens-golf','womens-golf-home'],['/sports/mens-golf/archives','mens-golf-archives'],['/sports/mens-golf','mens-golf-home']]);
const requests=[];
const fetch=async url=>{
  const {pathname}=new URL(url);requests.push(pathname);
  const news=pathname.match(/^\/news\/(\d+)\/(\d+)\/(\d+)\/([^/?#]+)/);
  const name=news?`story-${news[1]}-${news[2]}-${news[3]}-${news[4].slice(0,40)}`:files.get(pathname);
  const file=name&&new URL(`./fixtures/central-arkansas-module/${name}.html.gz`,import.meta.url);
  if(!file||!existsSync(file))return{ok:false,status:404,text:async()=>''};
  return{ok:true,status:200,text:async()=>gunzipSync(readFileSync(file)).toString('utf8')};
};
const archive=createArchiveStory({id:'central-arkansas',host:'ucasports.com',decodeHtml:value=>String(value||''),fetch,headers:{},meetSports:new Set(['Golf'])});
const meet=(slug,opponent,start,end)=>({school_id:'central-arkansas',sport:'Golf',event_type:'MEET',status:'Final',opponent,start_time:`${start}T14:00:00Z`,end_time:`${end}T23:00:00Z`,source:{url:`https://ucasports.com/sports/${slug}/schedule`}});
const diamante=await archive.attachArchiveStory(meet('womens-golf','Diamante Intercollegiate','2026-10-18','2026-10-20'));
assert.equal(diamante.recap_url,'https://ucasports.com/news/2026/10/20/womens-golf-bears-finish-3rd-at-diamante-invitational');
assert.ok(requests.includes('/sports/womens-golf'));
const sandestin=await archive.attachArchiveStory(meet('mens-golf','Sandestin Collegiate Classic','2026-09-14','2026-09-16'));
assert.equal(sandestin.recap_url,'https://ucasports.com/news/2026/9/16/mens-golf-bears-finish-1-stroke-out-of-1st-place-in-florida');

// North Alabama's track schedule (2027 not published) answers with the
// site's "UNA Game Day" page: an empty schedule, as Belmont's STUNT.
assert.match(read('../src/schools/north-alabama.mjs'),/const unpublished=args\[2\]==='Track & Field'&&!\/<title>\[\^<\]\*\\bSchedule\\b\/i\.test/);

// Onboarding: SIDEARM's "General Schedule" for a generic address is no team's
// page; a port starts with no leagues (the source's are its own); the
// fixtures read the sport's home page when the archive lists none of a past
// meet's days.
const fixtures=read('../scripts/fetch-school-fixtures.mjs');
assert.match(fixtures,/\\bGeneral Schedule\\b/);
assert.match(fixtures,/save\(`\$\{slug\}-home\.html\.gz`,home\.body\)/);
assert.match(read('../scripts/port-handlers.mjs'),/Leagues: none ported/);
assert.match(read('../scripts/survey-school.mjs'),/-home\.html\.gz/);

console.log('ASUN shared checks passed');
