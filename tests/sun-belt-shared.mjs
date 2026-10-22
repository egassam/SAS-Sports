// Shared rules found onboarding the Sun Belt (Oct 22), checked on the
// schools' saved pages.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfPlacing,golfStoryPlace,writeMeetPlaces} from '../src/sidearm-school-kit.mjs';
import {oneTournamentPerStory} from '../src/sidearm-schedule-reader.mjs';

const story=(school,start)=>{const dir=new URL(`./fixtures/${school}-module/`,import.meta.url);const name=readdirSync(dir).find(n=>/^(?:recap|story)-/.test(n)&&n.includes(start));return gunzipSync(readFileSync(new URL(name,dir))).toString();};
const decode=s=>String(s).replace(/&#39;|&rsquo;|&#x27;/g,"'").replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"');
const ordinal=n=>{n=Number(n);const m=n%100;return`${n}${m>=11&&m<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th')}`};

// Card places with the rounds or total in brackets (Coastal Carolina, ULM).
// Mutation: without the bracket rule each is null (Coastal's Myrtle Beach
// title read "44th" from its story).
assert.equal(golfPlacing('1st of 16 (280-277-204=835)'),'1st of 16');
assert.equal(golfPlacing('T5th of 12 (283-301-290=874)'),'T5th of 12');
assert.equal(golfPlacing('T-3rd (844) / 15'),'T3rd of 15');
assert.equal(golfPlacing('4th (9 Teams)'),'4th of 9');

// Golf places only the story gives. Mutation: each new form removed reads null.
assert.equal(golfStoryPlace(story('louisiana','2026-9-29-golf'),{team:"(?:Ragin' Cajuns|Cajuns|Louisiana(?! Tech))",decode}),'T11th','"Cajuns Finish Tied For 11th"');
assert.equal(golfStoryPlace(story('louisiana','2026-10-20-golf'),{team:"(?:Ragin' Cajuns|Cajuns|Louisiana(?! Tech))",decode}),'T7th','"finished in a tie for seventh place as a team"');
assert.equal(golfStoryPlace(story('louisiana-tech','2026-10-20-mens-golf'),{team:'(?:Bulldogs|Lady Techsters|La\\. Tech|Louisiana Tech)',decode}),'T7th','"Bulldogs Close 2026 at The Clerico Tie for Seventh"');
assert.equal(golfStoryPlace(story('ulm','2026-9-15-untitled'),{team:'(?:Warhawks|ULM|Louisiana-Monroe)',decode}),'15th','"The team finished 15th out of 17"');
assert.equal(golfStoryPlace(story('ulm','2026-9-23-ulm'),{team:'(?:Warhawks|ULM|Louisiana-Monroe)',decode}),'19th','"The team recorded an 887 ..., finishing 19th of 20 teams"');
// "Rounding out the team scoring, Ing Iadpluem ... tied for 45th" is a
// player's; "The Tar Heels ... to place 10th" the team's (North Carolina).
assert.equal(golfStoryPlace(story('north-carolina','2026-10-18-womens-golf-yeung'),{team:"(?:Tar Heels|North Carolina(?!['’]s)|UNC)",decode}),'10th');
assert.equal(golfStoryPlace(story('marshall','2026-8-30-mens-golf'),{team:'(?:Thundering Herd|Herd|Marshall)',decode}),'T5th','"which tied them for 5th place"');

// "Women (9th); Men (2nd)" (Coastal Carolina's cross country cards).
{
  const event={};writeMeetPlaces(event,{text:'Women (9th); Men (2nd)',schoolName:'Coastal Carolina',ordinal});
  assert.equal(event.headline,"Women's team: 9th / Men's team: 2nd");
}

// One story, one tennis tournament: the story stays with the tournament its
// address names (Arkansas State's Memphis Invite, not the ITA All-Americans;
// Rutgers's Bulldog Invitational). Mutation: without it both keep the story.
{
  const tennis=(opponent,start,end,url)=>({sport:'Tennis',event_type:'MEET',status:'Final',opponent,start_time:`${start}T12:00:00Z`,end_time:`${end}T12:00:00Z`,recap_url:url});
  const memphis='https://astateredwolves.com/news/2026/9/20/womens-tennis-red-wolves-finish-memphis-invite-with-21-wins.aspx';
  const events=[tennis('Memphis Invite','2026-09-18','2026-09-20',memphis),tennis('ITA All-Americans','2026-09-19','2026-09-27',memphis)];
  oneTournamentPerStory(events);
  assert.deepEqual(events.map(e=>e.recap_url||null),[memphis,null]);
  // A weekend's story naming neither, or "split weekend", covers them all
  // (Marshall's opening weekend; Louisville's split weekend at the ITA
  // All-Americans and the Rocky Top Invitational).
  const weekend='https://herdzone.com/news/2026/9/20/womens-tennis-marshall-tennis-closes-out-opening-weekend-of-fall';
  const herd=[tennis('ITA All-American Championships','2026-09-19','2026-09-27',weekend),tennis('Thunder in the Mountains','2026-09-18','2026-09-20',weekend)];
  oneTournamentPerStory(herd);
  assert.deepEqual(herd.map(e=>e.recap_url||null),[weekend,weekend]);
  const split='https://gocards.com/news/2026/9/22/mens-tennis-louisville-mens-tennis-concludes-split-weekend-at-ita-all-americans-';
  const cards=[tennis('ITA All American Championships','2026-09-19','2026-09-27',split),tennis('Rocky Top Invitational','2026-09-19','2026-09-21',split)];
  oneTournamentPerStory(cards);
  assert.deepEqual(cards.map(e=>e.recap_url||null),[split,split]);
  // The sport's word names no tournament ("mens-tennis-opens-fall-campaign":
  // Marquette's Milwaukee Tennis Classic and Youngstown State Invitational).
  const campaign='https://gomarquette.com/news/2026/9/14/mens-tennis-opens-fall-campaign';
  const mu=[tennis('Milwaukee Tennis Classic','2026-09-11','2026-09-13',campaign),tennis('Youngstown State Invitational','2026-09-12','2026-09-14',campaign)];
  oneTournamentPerStory(mu);
  assert.deepEqual(mu.map(e=>e.recap_url||null),[campaign,campaign]);
  // A story naming both keeps both (Illinois, Sep 11).
  const both='https://fightingillini.com/news/2026/9/11/womens-tennis-results-milwaukee-tennis-classic-furman-fall-classic';
  const illini=[tennis('Milwaukee Tennis Classic','2026-09-11','2026-09-13',both),tennis('Debbie Southern Furman Fall Classic','2026-09-11','2026-09-13',both)];
  oneTournamentPerStory(illini);
  assert.deepEqual(illini.map(e=>e.recap_url||null),[both,both]);
}

console.log('Sun Belt shared checks passed (golf card brackets, golf story places, "Women (9th)" meets, one story per tennis tournament)');
