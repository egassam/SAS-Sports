// Ready-made settings and hooks for SIDEARM school modules: the pieces
// Colorado, Baylor and Arizona each wrote for themselves, made generic so a
// new school passes options instead of copying code. Houston was the first
// school built from them. Each one is opt-in; a school still changes only
// what its site does differently.
//
//   sidearmStartTimeText(date,time)   published start, from the time text when the clock disagrees; "Noon"
//   mergeTournamentRounds(games)      golf/tennis/swim rounds of one tournament -> one event
//   mergeMeetDays(games,{name})       track meet days of one meet -> one event
//   mergeTbaBracket(games)            bracket rounds without an opponent -> one event per tournament
//   meetTeamPlaces(text)              "M- 2nd, W- 2nd", "M- T-5th (57 points)" -> {Women,Men}
//   writeMeetPlaces(event,{...})      the K-State meet headline and rows from those places
//   golfPlacing(text)                 "t-10th of 12" -> "T10th of 12"
//   golfMatchPlay(text)               "defeated X, 3-2; lost to Y, 3.5-1.5" -> "Match play: 1-1" and one row per match
//   golfStoryMatchPlay(raw,{team})    a golf dual's story ("X defeated the Purple Aces 9 ½ - 4 ½") -> "Match play: 0-1", "L, 4.5-9.5"
//   doubleheaderNumber()              gameNumber setting: Game 1 / Game 2
//   createRecapMatcher({...})         own recap: opponent and date; others must name the opponent in the headline
//   createArchiveStory({...})         a final with no linked story takes one from /sports/<slug>/archives
//   createTfrrsMeetResults({...})     cross country races and team scores from TFRRS
//   createTeamTfrrsMeetResults({...}) the same for separate men's and women's pages
import {sidearmStartTime} from './sidearm-schedule-data.mjs';
import {findTfrrsMeet,onlyTfrrsMeetOn,parseTfrrsResults,tfrrsTeamName,orderTfrrsRaces} from './tfrrs-results.mjs';
import {withoutRanking,otherSportStory} from './sidearm-schedule-reader.mjs';

const dayGap=(a,b)=>(Date.parse(String(b.date).slice(0,10))-Date.parse(String(a.date).slice(0,10)))/86400000;

// The page shows the time text ("5:30 p.m.", "Noon CT"); the page data's
// clock usually agrees, but not always. The text is what the page shows, so
// a clock in it wins; "TBA" has none. "1 p.m./8 p.m." starts at the first.
export function sidearmStartTimeText(date,time){
  const exact=sidearmStartTime(date,time);if(exact)return exact;
  const text=String(time||'').replace(/^\s*noon\b/i,'12 p.m.');
  const d=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/),t=text.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?(?=[\s(/,]|$)/i);
  if(!d||!t||Number(t[1])<1||Number(t[1])>12)return null;
  const hour=String(Number(t[1])%12+(t[3].toLowerCase()==='p'?12:0)).padStart(2,'0'),minute=t[2]||'00';
  return sidearmStartTime(`${d[1]}-${d[2]}-${d[3]}T${hour}:${minute}:00`,text);
}

// Golf (and tennis or swimming invitationals) publish one entry per round,
// with the tournament beside it. A tournament's rounds (the same tournament,
// at most two days apart) become one event named after it, from its first to
// its last day; only the last round's result and story are the final ones.
export function mergeTournamentRounds(games){
  const groups=[];
  for(const game of games){
    // Two tournaments played the same days (Xavier's Moraine Intercollegiate
    // and Raider Individual, Oct 12-13) alternate on the page: a round joins
    // its own tournament's rounds, not only the entry before it.
    const name=String(game.tournament?.title||'').trim(),previous=groups.findLast(group=>group.name===name&&dayGap(group.at(-1),game)>=0&&dayGap(group.at(-1),game)<=2);
    if(previous&&name){previous.push(game);continue;}
    const group=[game];group.name=name;groups.push(group);
  }
  return groups.map(rounds=>{
    if(!rounds.name)return rounds[0];
    const first=rounds[0],last=rounds.at(-1);
    return{...first,opponent:{...first.opponent,title:rounds.name},enddate:rounds.length>1?last.date:first.enddate,result:last.result||null,round_count:rounds.length};
  });
}

// Track publishes one entry per meet day: days of the same meet at most three
// days apart become one event from its first to its last day, with the last
// day's place and the latest story a day links.
// A meet may name its days instead ("Day One", "Day Two" of the SMU Classic,
// SMU swimming): the days are one event under the meet's name.
const DAY_LABEL=/^day\s+(?:\d+|one|two|three|four|five|six|seven)$/i;
const dayLabelled=game=>DAY_LABEL.test(String(game.opponent?.title||'').trim())&&Boolean(String(game.tournament?.title||'').trim());
// Or it suffixes them: "BIG EAST Swimming and Diving Championships - Day 1"
// (Xavier, Feb 17-20), or without a dash: "Colorado Mesa Intermountain
// Shootout Day #1" (Utah Tech, Oct 2-3).
const DAY_SUFFIX=/\s+(?:[-–]\s+day\s+(?:\d+|one|two|three|four|five|six|seven)|day\s+#\d+)$/i;
const meetDayName=game=>dayLabelled(game)?String(game.tournament.title).trim():withoutRanking(game.opponent?.title).replace(DAY_SUFFIX,'');
export function mergeMeetDays(games,{name=game=>meetDayName(game).toLowerCase()}={}){
  const groups=[];
  for(const game of games){
    const key=name(game),previous=groups.find(group=>group.key===key&&dayGap(group.at(-1),game)>=0&&dayGap(group.at(-1),game)<=3);
    if(key&&previous){previous.push(game);continue;}
    const group=[game];group.key=key;groups.push(group);
  }
  return groups.map(days=>{
    const first=dayLabelled(days[0])||DAY_SUFFIX.test(String(days[0].opponent?.title||''))?{...days[0],opponent:{...days[0].opponent,title:meetDayName(days[0])}}:days[0];
    if(days.length===1)return first;
    const last=days.at(-1),result=last.result||{},story=[...days].reverse().map(day=>day.result?.recap).find(recap=>recap?.url);
    const end=[...days.map(day=>day.date),...days.map(day=>day.enddate).filter(Boolean)].sort().at(-1);
    return{...first,enddate:end,result:{...result,recap:result.recap?.url?result.recap:story||null}};
  });
}

// Bracket rounds whose opponent is not known yet ("TBA – First Round", "TBA")
// are one event per tournament, named after it, from its first to its last
// round: "Phillips 66 Big 12 Tournament". Rounds of one tournament published
// under round names ("NCAA Tournament First Round", "... Sweet 16") are one
// tournament.
const ROUND_WORDS=/\s+(?:Opening Round|First Round|Second Round|Third Round|Sweet 16|Elite Eight|Final Four|National Championship|Quarterfinals?|Semifinals?|Championship Game)$/i;
export function mergeTbaBracket(games){
  const out=[],byName=new Map();
  for(const game of games){
    const opponent=String(game.opponent?.title||'').trim(),tournament=String(game.tournament?.title||'').trim();
    if(!tournament||!/^TB[AD]\b/i.test(opponent)||game.result?.status){out.push(game);continue;}
    const name=tournament.replace(ROUND_WORDS,'').trim(),group=byName.get(name);
    if(group){group.enddate=game.date;continue;}
    const event={...game,opponent:{...game.opponent,title:name},tournament:{...game.tournament,title:name},enddate:null,tbd_bracket:true};
    byName.set(name,event);out.push(event);
  }
  // An event published once per day without a result ("Big Ten Tournament"
  // Mar 3-7 at Michigan, "NCAA Final Four" Apr 3-5 at Michigan State) is one event from
  // its first to its last day.
  const day=game=>String(game.date||'').slice(0,10),next=date=>new Date(Date.parse(`${date}T00:00:00Z`)+86400000).toISOString().slice(0,10);
  const named=game=>{const opponent=String(game.opponent?.title||'').trim();return!game.result?.status&&!game.tbd_bracket&&Boolean(opponent)&&(opponent===String(game.tournament?.title||'').trim()||/\b(?:tournament|rounds?|regionals?|championships?)\b/i.test(opponent)||ROUND_WORDS.test(` ${opponent}`))&&/^(?:all day|tba)?$/i.test(String(game.time||'').trim());};
  return out.reduce((kept,game)=>{
    const last=kept[kept.length-1];
    if(last&&named(game)&&named(last)&&last.opponent.title.trim()===String(game.opponent?.title||'').trim()&&next(String(last.enddate||last.date||'').slice(0,10))===day(game)){kept[kept.length-1]={...last,enddate:game.date};return kept;}
    kept.push(game);return kept;
  },[]);
}

// Team places a meet card publishes as text, either team first: "M- 2nd,
// W- 2nd", "W- 3rd, M - 4th", "M-1st/W-NTS", "M- T-5th (57 points), W-12th
// (22 points)", "Men: 1st Women: 12th", "Women: 1st place (21 points) | Men:
// 2nd place (66 points)" (NC State). "Did not score" and "NTS" are no
// place. The American (Oct 22): "Women's 11th; Men's DNF" (East Carolina),
// "Men's 4th / Women's 4th" (UTSA).
export function meetTeamPlaces(text,ordinal=value=>String(value)){
  const places={};
  for(const m of String(text||'').matchAll(/\b(M|W|Men|Women)(?:'s)?\s*[-:]?\s*\(?(T-?)?(\d{1,3})(?:st|nd|rd|th)\b\)?(?:\s+place)?(?:\s*\((\d+(?:\.\d+)?)\s*points?\))?/gi)){
    const team=/^w/i.test(m[1])?'Women':'Men';
    places[team]??={place:`${m[2]?'T':''}${ordinal(m[3])}`,points:m[4]||null};
  }
  return places;
}
// Coastal Carolina writes "Women (9th); Men (2nd)".
// K-State's meet result: women first, "Women's team: 12th · 22 pts / Men's
// team: T5th · 57 pts"; with no team place, "Completed".
export function writeMeetPlaces(event,{text,schoolName,ordinal}){
  const places=meetTeamPlaces(text,ordinal),teams=['Women','Men'].filter(team=>places[team]);
  const value=team=>`${places[team].place}${places[team].points?` \u00b7 ${places[team].points} pts`:''}`;
  event.headline=teams.length?teams.map(team=>`${team}'s team: ${value(team)}`).join(' / '):'Completed';
  event.results=teams.length?teams.map(team=>({group:`${team}'s Team`,participant:`${schoolName} team`,result:value(team)})):[{label:'Result',value:'Completed'}];
  event.result_count=event.results.length;
}

// "6th of 6", "t-10th of 12", "13th/20" -> "T10th of 12".
export function golfPlacing(text){
  // Providence writes the place without its suffix: "T9 of 10"; St. John's
  // the field in brackets: "4th (9 Teams)"; Coastal Carolina adds the rounds:
  // "1st of 16 (280-277-204=835)"; ULM the total inside: "T-3rd (844) / 15";
  // UC Davis the score to par too: "7th Of 17 (286-299-296 - 881, +17)".
  // A cross country place with its points: "2nd, 52 points" (UAlbany), "1st
  // place, 36 points" (New Hampshire), "4th - 115 points" (Chicago State) ->
  // "2nd · 52 pts" (a bare "12th, 323" may be a golf total);
  // two teams: "Gold (6th place, 177 points) • Navy (3rd place, 96 points)"
  // -> "Gold team: 6th · 177 pts / Navy team: 3rd · 96 pts" (Oct 23).
  const pointsPlace=value=>{const m=String(value).trim().match(/^(T-?)?(\d+)(?:st|nd|rd|th)(?:(\s+place),\s*(\d+(?:\.\d+)?)(?:\s*(?:points|pts))?|(?:,|\s+-)\s*(\d+(?:\.\d+)?)\s*(?:points|pts))$/i);if(!m)return null;const n=Number(m[2]),suffix=n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';return`${m[1]?'T':''}${n}${suffix} · ${m[4]||m[5]} pts`;};
  if(pointsPlace(text))return pointsPlace(text);
  // Le Moyne writes the points first and the place in its field: "261
  // Points | 9th of 16" -> "9th of 16 · 261 pts".
  const pointsFirst=String(text||'').trim().match(/^(\d+(?:\.\d+)?)\s*points?\s*\|\s*(T-?)?(\d+)(st|nd|rd|th)\s+of\s+(\d+)$/i);
  if(pointsFirst)return`${pointsFirst[2]?'T':''}${pointsFirst[3]}${pointsFirst[4].toLowerCase()} of ${pointsFirst[5]} \u00b7 ${pointsFirst[1]} pts`;
  const squads=[...String(text||'').matchAll(/([A-Z][A-Za-z]+)\s*\(([^()]+)\)/g)];
  if(squads.length&&squads.every(([,,inner])=>pointsPlace(inner))&&String(text).replace(/([A-Z][A-Za-z]+)\s*\(([^()]+)\)/g,'').replace(/[\s•·,/]+/g,'')==='')return squads.map(([,name,inner])=>`${name} team: ${pointsPlace(inner)}`).join(' / ');
  // Valparaiso's bowling adds its match record: "9th/18 (2-3)" -> "9th of 18
  // (2-3)".
  // Youngstown State writes the record first: "1-2 / 4th of 18 Teams" ->
  // "4th of 18 (1-2)".
  const leading=String(text||'').match(/^\s*(\d{1,2}-\d{1,2}(?:-\d{1,2})?)\s*\/\s*(?=T?-?\d+(?:st|nd|rd|th)\b)/i);
  if(leading)text=String(text).slice(leading[0].length);
  const record=leading?`(${leading[1]})`:(String(text||'').match(/\s*(\(\d{1,2}-\d{1,2}(?:-\d{1,2})?\))\s*$/)||[])[1]||'';
  if(record&&!leading)text=String(text).replace(/\s*\(\d{1,2}-\d{1,2}(?:-\d{1,2})?\)\s*$/,'');
  text=String(text||'').trim().replace(/\s*\(\d{2,4}(?:\s*[-=]\s*\d{2,4})*(?:,\s*(?:[+-]\d+|E|even))?\)(?=\s*(?:\/|of\b|$))/gi,'').trim();
  const m=String(text||'').trim().match(/^(T-?)?(\d+)(st|nd|rd|th)?\s*(?:\/|of|out of)\s*(\d+)(?:\s+teams)?\.?$/i)||String(text||'').trim().match(/^(T-?)?(\d+)(st|nd|rd|th)\s*\((\d+)\s+teams\)$/i);
  if(!m)return null;
  const n=Number(m[2]),suffix=m[3]?m[3].toLowerCase():n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';
  return`${m[1]?'T':''}${m[2]}${suffix} of ${m[4]}${record?` ${record}`:''}`;
}

// A golf card's own place when it carries the team's scores beside it (MAC,
// Oct 22): Ball State "14th of 16 Teams / 928 (+64)", Central Michigan
// "12th of 14, 289-291 -- 580 (+12)" and "T9 of 16, 292 -- 867 (+27)",
// Eastern Michigan "T-5th (830/-34)" and "1st (863, -1)", Kent State
// "T-12th / 13 teams (+61, 913)", Miami "2nd, 842", Toledo the score first
// "864/T-2nd". Big West (Oct 22): UC Irvine names the round first ("Final -
// 15th (905)"), Long Beach State adds its best player ("2nd/14; Phi, T3rd"),
// Cal Poly spells the place ("Ninth"). The place reads "T5th of 12" (field
// known) or "T5th"; null when the card is anything else (match play "CMU 10,
// Alabama State 2", "No Team Score", a round's standing "Two Rounds - T15").
const GOLF_WORD_PLACES=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth'];
export function golfCardPlace(text){
  const card=String(text||'').replace(/\s+/g,' ').trim().replace(/^final(?: round)?\s*[-\u2013\u2014:]\s*/i,'');
  const scores=/^[\s,()\/+\-\u2013\u2014=:.E\d]*$/i;
  const place=(tied,n,field)=>{const v=Number(n),suffix=v%100>=11&&v%100<=13?'th':['th','st','nd','rd'][v%10]||'th';return`${tied?'T':''}${v}${suffix}${field?` of ${field}`:''}`;};
  const word=card.match(/^(T-?|tied\s+)?([a-z]+)(?:\s+place)?$/i),spelled=word?GOLF_WORD_PLACES.indexOf(word[2].toLowerCase()):-1;
  if(spelled>=0)return place(word[1],spelled+1);
  const player=card.match(/^(T-?)?(\d{1,2})(?:st|nd|rd|th)?\s*\/\s*(\d{1,2})\s*;\s*[^;]+,\s*T?-?\d{1,3}(?:st|nd|rd|th)?$/i);
  if(player&&Number(player[2])<=Number(player[3]))return place(player[1],player[2],player[3]);
  const first=card.match(/^\d{3,4}\s*\/\s*(T-?)?(\d{1,2})(?:st|nd|rd|th)?$/i);
  if(first)return place(first[1],first[2]);
  const m=card.match(/^(T-?)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:\/|of|out of)\s*(\d{1,2})(?:\s*teams)?)?(?=[\s,(\/\-\u2013\u2014]|$)(.*)$/i);
  if(!m||!scores.test(m[4])||!/\d{3,4}/.test(m[4])&&!m[3])return null;
  if(m[3]&&Number(m[2])>Number(m[3]))return null;
  return place(m[1],m[2],m[3]);
}

// Golf match play, as the card publishes it: "defeated New Mexico State, 3-2;
// lost to New Mexico, 3.5-1.5" -> headline "Match play: 1-1", one row per
// match ("vs New Mexico" / "L, 1.5-3.5", the school's points first). Null
// when the text is not a list of finished matches.
export function golfMatchPlay(text){
  const matches=String(text||'').split(/\s*;\s*/).filter(Boolean).map(part=>part.match(/^(defeated|lost to|tied|halved with)\s+(.+?),\s*(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/i));
  if(!matches.length||matches.some(m=>!m))return null;
  const rows=matches.map(([,verb,opponent,a,b])=>{
    const outcome=/^defeated/i.test(verb)?'W':/^lost/i.test(verb)?'L':'T',[mine,theirs]=outcome==='L'?[Math.min(a,b),Math.max(a,b)]:[Math.max(a,b),Math.min(a,b)];
    return{label:`vs ${opponent}`,value:`${outcome}, ${mine}-${theirs}`,outcome};
  });
  const count=letter=>rows.filter(row=>row.outcome===letter).length,ties=count('T');
  return{headline:`Match play: ${count('W')}-${count('L')}${ties?`-${ties}`:''}`,results:rows.map(({label,value})=>({label,value}))};
}

// gameNumber setting: the same opponent twice on one day is Game 1 and Game 2.
export const doubleheaderNumber=()=>(game,games,{parse})=>{
  const key=game=>`${String(game.date).slice(0,10)}|${withoutRanking(game.opponent?.title).toLowerCase()}`;
  if(games.filter(other=>key(other)===key(game)).length<2)return 0;
  parse.played??=new Map();const number=(parse.played.get(key(game))||0)+1;parse.played.set(key(game),number);return number;
};

// The card's own recap link is bound to its game: checked for opponent and
// date only (stories need not name the sport). Any other candidate must also
// name the opponent in its headline: a tournament story names the next day's
// opponent. A multi-day event is checked against its last day.
//
// trustOwnLink: the schedule's own link is enough when dated from the event's
// first day to the day after its last. Stories may name the opponent only by
// its nickname ("Cougars Sweep Huskies" for Houston Christian).
// ownLinkDays: how many days after an event's last day the page's own story
// link may be dated (a weekend tournament's story can come on Tuesday).
// ownLinkDaysBefore: per sport, how many days before the first day an own
// story may be dated (Michigan's tennis tournament pages, as the archive's
// meetDaysBefore).
export function createRecapMatcher({id,host,recapMatchesEvent,decodeHtml,trustOwnLink=false,ownLinkDays=1,ownLinkDaysBefore={}}){
  const ownLinkDated=(event,url)=>{
    const dated=String(url).match(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);if(!dated)return false;
    const day=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3])),first=Date.parse(`${String(event.start_time).slice(0,10)}T00:00:00Z`),last=Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`);
    return day>=first-(ownLinkDaysBefore[event.sport]||0)*86400000&&day<=last+ownLinkDays*86400000;
  };
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  return function matchesRecap(raw,event,url){
    if(event?.school_id!==id)return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===host&&parsed.pathname.startsWith('/news/');
    const identity=event.end_time?{...event,start_time:event.end_time.replace(/T.*$/,'T12:00:00.000Z')}:event;
    if(own&&url===event.final_story)return true;
    if(own&&otherSportStory(parsed.pathname,event.sport))return false;
    if(own)return recapMatchesEvent(raw,{...identity,sport:''},url)||trustOwnLink&&ownLinkDated(event,url);
    if(event.recap_url)return false;
    if(!recapMatchesEvent(raw,event,url))return false;
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    const opponent=headlineKey(event.opponent).trim();
    return opponent.length>=2&&headlineKey(title).includes(` ${opponent} `);
  };
}

const downloader=(fetch,headers)=>async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};

// A scored final the schedule links no story for takes the school's story
// from the sport's archive: dated on the game day or the day after, naming
// the opponent in the article and stating the result (the score either way
// round, never part of a record such as "3-0-1"; a tie may be a draw).
// meetSports: sports whose finished meets also take their story from the
// archive (a story dated from the meet's first day to the day after its last
// that names the meet, the last day's first: Iowa State's cross country
// schedule links none, and a golf tournament's story can be missing from it).
// meetDaysAfter: how many days after a meet's last day its story may be
// dated (1 by default; Michigan State's men's tennis posted the ITA
// All-American Championships, Sep 19-25, on Sep 28). meetDaysBefore: per
// sport, how many days before a meet's first day (Michigan's men's tennis
// posts each tournament's page the day before and fills it in afterward:
// the Fighting Irish Invitational, Sep 25-26, on Sep 24).
// skipStory(path): stories that are never an event's own (Boston College's
// "#ForBoston Files" video series names the opponent and score a day later).
export function createArchiveStory({id,host,decodeHtml,fetch,headers,meetSports=new Set(),volleyballSets=false,volleyballSetScores=false,meetDaysAfter=1,meetDaysBefore={},skipStory=()=>false}){
  const download=downloader(fetch,headers);
  // The older story template has no id="story-..." block: its text is
  // "sidearm-story-template-text" (ucasports.com, Oct 23).
  const storyText=raw=>decodeHtml((String(raw).match(/<div\b[^>]*id=["']story-[\s\S]*?(?=<div\b[^>]*class=["'][^"']*related|$)/i)?.[0]||String(raw).match(/<div\b[^>]*class=["']sidearm-story-template-text\b[\s\S]*?(?=<div\b[^>]*class=["'][^"']*related|$)/i)?.[0]||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  const isMeet=event=>event?.school_id===id&&event.event_type==='MEET'&&meetSports.has(event.sport)&&event.status==='Final'&&!event.recap_url;
  const needsStory=event=>isMeet(event)||event?.school_id===id&&(event.event_type==='GAME'||event.event_type==='DUAL')&&event.status==='Final'&&!event.recap_url&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  // "Intercollegiate" is a meet word too: the schedule's "Diamante
  // Intercollegiate" is its story's "Diamante Invitational" (Central Arkansas,
  // Oct 20).
  const MEET_WORDS=/^(?:the|and|invitational|intercollegiate|invite|meet|open|classic|championships?|teams?|only)$/i;
  const schedulePath=new RegExp(`^https://${host.replace(/\./g,'\\.')}/sports/([a-z-]+)/schedule`);
  async function attachArchiveStory(event){
    if(!needsStory(event))return event;
    const slug=(String(event.source?.url||'').match(schedulePath)||[])[1];if(!slug)return event;
    const listing=await download(`https://${host}/sports/${slug}/archives`);if(!listing)return event;
    const first=Date.parse(`${String(event.start_time).slice(0,10)}T00:00:00Z`);
    const span=isMeet(event)?Math.max(0,Math.round((Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`)-first)/86400000)):0;
    const before=isMeet(event)?meetDaysBefore[event.sport]||0:0;
    const days=Array.from({length:before+span+1+(isMeet(event)?meetDaysAfter:1)},(_,offset)=>new Date(first+(offset-before)*86400000)).map(day=>`/news/${day.getUTCFullYear()}/${day.getUTCMonth()+1}/${day.getUTCDate()}/`);
    const dated=text=>[...new Set(String(text||'').replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])].filter(path=>days.some(day=>path.startsWith(day))&&!skipStory(path));
    // An archive the browser fills from a service (ucasports.com, Oct 23:
    // `services/archives.ashx`, which refuses the app; Eastern Kentucky's links
    // only the ticket page) holds none of the event's days: the sport's home
    // page lists its recent stories.
    let paths=dated(listing);
    if(!paths.length)paths=dated(await download(`https://${host}/sports/${slug}`));
    if(isMeet(event)){
      // Every word that tells the meet apart ("Roy Griak") is in the story.
      const words=String(event.opponent||'').replace(/\s*\(.*?\)\s*/g,' ').toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>=3&&!MEET_WORDS.test(word));
      if(!words.length)return event;
      // The last day's story first: a day-one story names the meet too.
      // A story from the last day on whose headline names the meet comes
      // before one that names it only in its text (Maryland, Sep 9: "Terps
      // Trio Named to Big Ten Golfers to Watch List" mentions the Nittany Lion
      // Invitational; the Sep 8 "Terps Finish Second at Nittany Lion
      // Invitational" is its story). An earlier preview's headline does not
      // count (Mississippi State's Cullan Brown).
      const day=path=>{const [y,m,d]=path.split('/').slice(2,5).map(Number);return Date.UTC(y,m-1,d);};
      const lastDay=Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`);
      // Of those, the earliest: two days' matches against one opponent each
      // have a story naming it (Air Force rifle at Ole Miss, Oct 17 and 18:
      // the first match had taken the second day's story).
      let named=null,titled=null,titledDay=0;
      for(const path of [...paths].sort((x,y)=>day(y)-day(x)).slice(0,4)){
        // A weekly award story names the meet too ("Norman Named UAC Golfer of
        // the Week" for the Sandestin, Central Arkansas, Sep 17): never its story.
        if(/-of-the-(?:week|month)$|-weekly-honors?$/i.test(path))continue;
        const url=`https://${host}${path}`,raw=await download(url);if(!raw)continue;
        const text=storyText(raw).toLowerCase();
        if(!words.every(word=>text.includes(word)))continue;
        const title=decodeHtml((String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=(["'])(.*?)\1/i)||[])[2]||(String(raw).match(/<title>([^<]*)/i)||[])[1]||'').toLowerCase();
        if(day(path)>=lastDay&&words.every(word=>title.includes(word))){if(!titled||day(path)<titledDay)[titled,titledDay]=[url,day(path)];continue;}
        named??=url;
      }
      named=titled||named;
      if(named){event.recap_url=named;event.archive_story_verified=named;}
      return event;
    }
    const a=String(event.school_score),b=String(event.opponent_score),opponent=String(event.opponent||'').replace(/\s*\(.*?\)\s*/g,' ').trim();
    const score=new RegExp(`(?<![\\d-])(?:${a}-${b}|${b}-${a})(?![\\d-])`),tie=a===b?/\b(?:draw|tie|tied|scoreless)\b/i:null;
    // volleyballSets: a match story may give only the number of sets ("in four
    // sets" for 3-1, Texas Tech's Central Arkansas story).
    const setCount={3:'three',4:'four',5:'five'}[Number(a)+Number(b)],sets=volleyballSets&&event.sport==='Volleyball'&&Math.max(Number(a),Number(b))===3&&setCount?new RegExp(`\\bin ${setCount} sets\\b${setCount==='three'?'|\\bsweep':''}`,'i'):null;
    for(const path of paths.slice(0,4)){
      const url=`https://${host}${path}`,raw=await download(url);if(!raw)continue;
      const text=storyText(raw);
      if(!opponent||!text.toLowerCase().includes(opponent.toLowerCase()))continue;
      // volleyballSetScores: a story may give only each set's score ("25-22",
      // "25-20", "28-26" for 0-3, Mississippi State at Texas A&M): as many set
      // scores as the match had sets.
      const setScores=volleyballSetScores&&sets?(text.match(/(?<![\d-]|\d\.)(?:2[5-9]|[3-9]\d|1[5-9])-\d{1,2}(?!\d|-|\.\d)/g)||[]).length:0;
      if(score.test(text)||tie&&tie.test(text)||sets&&sets.test(text)||setScores&&setScores===Number(a)+Number(b)){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  return{needsStory,attachArchiveStory};
}

// Cross country races from TFRRS: the meet is found on each team's TFRRS page
// by date and name, the school's rows by the TEAM column. Every team place
// the schedule publishes must agree, or the schedule's headline stays.
// Feed and expanded view both call attach; the second call is a no-op.
// A meet the schedule names past recognition (by its host: Virginia Tech's
// "Virginia" is TFRRS's "Panorama Farms Invitational") is the team's only
// meet that day when the schedule's team places confirm it (the check
// below); onlyMeetThatDay:true takes it without places too.
// The words that make a name an event's, not a school's.
const HOST_EVENT_WORD=/\b(?:invitational|invite|classic|open|opener|championships?|meet|run|race|challenge|festival|showcase|jamboree|xc|cross country|throwdown|shootout|preview|gold|twilight|dual|tri|relays?|series|cup|fling|stampede|chase|derby)\b/i;
export function createTfrrsMeetResults({id,schoolName,tfrrsTeam=schoolName,teams,meetName=event=>event.opponent,onlyMeetThatDay='checked',hostMeetName=false,decodeHtml,ordinal,fetch,headers}){
  const download=downloader(fetch,headers);
  const matches=event=>event?.school_id===id&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  async function attach(event){
    if(!matches(event)||event.meet_results_verified)return event;
    const unavailable=status=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';event.highlight_status=status;
      return event;
    };
    const failed='Official race results could not be loaded. Open the official recap.';
    const date=String(event.start_time).slice(0,10),pages=new Set(),names=new Set([tfrrsTeam]);
    for(const team of ['Women','Men']){
      if(!teams[team])continue;
      const listing=await download(teams[team]);if(!listing)continue;
      // TFRRS's own name for the school ("Pittsburgh", "Xavier (Ohio)",
      // "Connecticut": Pitt's, Xavier's and UConn's runners never matched).
      const listed=tfrrsTeamName(listing,decodeHtml);if(listed)names.add(listed);
      // onlyMeetThatDay: a name TFRRS shortens past recognition (USC's "UC
      // Riverside Invitational" is the "UCR XC Invite") is the team's only
      // meet that day.
      const checked=/\b(?:Men|Women)'s team: T?\d/.test(String(event.headline||''));
      const url=findTfrrsMeet(listing,{decodeHtml,date,name:meetName(event)})||(onlyMeetThatDay===true||onlyMeetThatDay==='checked'&&checked?onlyTfrrsMeetOn(listing,{decodeHtml,date}):null);
      if(url)pages.add(url);
    }
    if(!pages.size){
      // No TFRRS meet (Montana's LC State Invite, Oct 17, an NAIA host): the
      // official story's own results lists, when it publishes them.
      const story=event.recap_url&&await download(event.recap_url);
      const races=story?storyMeetResults(story,{decodeHtml,ordinal}):[];
      if(!races.length)return unavailable('No results for this meet are published on TFRRS yet.');
      const rows=[],headline=[],lines=[];
      for(const race of races){
        const team=race.result?`${ordinal(race.result.place)} \u00b7 ${race.result.score} pts`:null;
        if(team){rows.push({group:race.group,participant:`${schoolName} team`,result:team});headline.push(`${race.team}'s team: ${team}`);lines.push(`${schoolName}'s ${race.team.toLowerCase()} placed ${ordinal(race.result.place)} with ${race.result.score} points.`);}
        else headline.push(`${race.team}'s: ${race.runners[0].participant} ${race.runners[0].result.split(' \u00b7 ')[0]}`);
        rows.push(...race.runners.map(runner=>({group:race.group,participant:runner.participant,result:runner.result})));
        lines.push(`${race.runners[0].participant} led ${schoolName}'s ${race.team.toLowerCase()}, finishing ${race.runners[0].result.replace(' \u00b7 ',' in ')}.`);
      }
      event.headline=headline.join(' / ');
      event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.recap_result_count=rows.length;
      event.source={...event.source,name:'Official athletics meet recap',url:event.recap_url};
      event.highlights=lines.slice(0,4);event.highlights_verified=true;event.meet_results_verified=true;
      event.highlight_state='official_recap_results';event.highlight_status=null;
      return event;
    }
    const races=[];let resultsUrl=null,resultsPage=null;
    for(const url of pages){
      const page=await download(url);if(!page)return unavailable(failed);
      for(const name of names){
        const found=parseTfrrsResults(page,{decodeHtml,ordinal,team:name});
        for(const race of found)if(!races.some(other=>other.group===race.group))races.push(race);
        if(found.length)break;
      }
      resultsUrl??=url;resultsPage??=page;
    }
    if(!races.length||!orderTfrrsRaces(races,event.headline))return unavailable(failed);
    const rows=[],headline=[],lines=[];
    for(const race of races){
      if(race.result){
        const value=`${ordinal(race.result.place)} \u00b7 ${race.result.score} pts`;
        rows.push({group:race.group,participant:`${schoolName} team`,result:value});
        if(!headline.some(line=>line.startsWith(`${race.team}'s team:`)))headline.push(`${race.team}'s team: ${value}`);
        lines.push(`${schoolName}'s ${race.team.toLowerCase()} placed ${ordinal(race.result.place)} with ${race.result.score} points.`);
      }
      rows.push(...race.runners.map(runner=>({group:race.group,participant:runner.participant,result:runner.result})));
    }
    // Without a team score, the headline names the team's first finisher.
    for(const team of ['Women','Men'])if(!headline.some(line=>line.startsWith(`${team}'s`))){
      const race=races.find(race=>race.team===team&&!race.result);const [first]=race?.runners||[];
      if(first)headline.push(`${team}'s: ${first.participant} ${/^\d+$/.test(first.place)?ordinal(first.place):first.place}`);
    }
    headline.sort((a,b)=>(a.startsWith('Women')?0:1)-(b.startsWith('Women')?0:1));
    event.headline=headline.join(' / ');
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.recap_result_count=rows.length;
    // The source link stays on the school's site; the TFRRS page is kept
    // beside it (not result_url: that starts the generic TFRRS enrichment).
    event.results_source_url=resultsUrl;
    // hostMeetName (a module whose schedule names meets only by their host:
    // NC A&T's "Elon", "Catawba College", Sep 4-26): such a meet takes TFRRS's
    // name for it ("Friday Night Lights Elon XC Opener"); a name with an event
    // word keeps the school's. Off by default: other schools' own names
    // ("Battle for New Orleans", "Pre Nationals") are kept.
    const tfrrsName=decodeHtml((String(resultsPage||'').match(/<title>\s*TFRRS\s*\|\s*([^<]+?)\s*-\s*Meet Results/i)||[])[1]||'').trim();
    if(hostMeetName&&tfrrsName&&event.opponent&&!HOST_EVENT_WORD.test(event.opponent)&&HOST_EVENT_WORD.test(tfrrsName)){const old=event.opponent;event.opponent=tfrrsName;if(event.title)event.title=event.title.replace(` at ${old}`,` at ${tfrrsName}`).replace(` vs ${old}`,` at ${tfrrsName}`);}
    event.source={...event.source,name:event.recap_url?'Official athletics meet recap; results from TFRRS':'Official athletics schedule; results from TFRRS',url:event.recap_url||event.source?.url};
    for(const race of races){const [leader]=race.runners;if(leader)lines.push(`${leader.participant} led ${schoolName} in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}, finishing ${leader.result.replace(' \u00b7 ',' in ')}.`);}
    for(let i=1;lines.length<4&&races.some(race=>race.runners[i]);i++)for(const race of races){const runner=race.runners[i];if(runner&&lines.length<4)lines.push(`${runner.participant} finished ${runner.result.replace(' \u00b7 ',' in ')} in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}.`);}
    event.highlights=lines.slice(0,4);
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  return{matches,attach};
}

// A cross country story's own results lists (gogriz.com, Oct 17):
// "MONTANA MEN'S RESULTS" then "1. Luke Mest (24:06, 1st)" per runner ("*"
// marks a personal best). A team's place and score only when a sentence says
// both ("The Grizzly women finished in 6th place with a score of 149").
export function storyMeetResults(raw,{decodeHtml,ordinal}){
  const text=decodeHtml(String(raw||'').replace(/<sup>(\w+)<\/sup>/gi,'$1').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'')).replace(/[ \t]+/g,' ');
  const races=[];
  for(const block of text.split(/\n\s*(?=[A-Z .'\u2019-]*\b(?:WOMEN|MEN)['\u2019]?S RESULTS\b)/).slice(1)){
    const team=/^[^\n]*\bWOMEN/.test(block)?'Women':'Men';
    const runners=[];
    for(const line of block.split('\n').slice(1)){
      const m=line.match(/^\s*\d+\.\s*(.+?)\s*\((\d{1,2}:\d{2}(?:\.\d)?)\*?,\s*(\d+)(?:st|nd|rd|th)\)\s*$/);
      if(m)runners.push({participant:m[1].trim(),result:`${ordinal(m[3])} \u00b7 ${m[2]}`});
      else if(runners.length&&line.trim())break;
    }
    if(!runners.length||races.some(race=>race.team===team))continue;
    const said=text.match(new RegExp(`\\b${team==='Women'?'women':'(?<!wo)men'}(?:'s team)? finished (?:in )?(\\d+)(?:st|nd|rd|th)(?: place)?,? with (?:a score of )?(\\d+)(?: points)?`,'i'));
    races.push({team,group:`${team}'s race`,result:said?{place:Number(said[1]),score:said[2]}:null,runners});
  }
  return races.sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
}

// A school whose men's and women's cross country teams publish separate
// schedule pages (Florida State's, Creighton's): each page is its own event,
// read from its own team's TFRRS page, and keeps only its own team's race
// (the meet's TFRRS page holds both). Options as createTfrrsMeetResults's.
export function createTeamTfrrsMeetResults({teams,...options}){
  const byTeam=Object.fromEntries(['Women','Men'].map(team=>[team,createTfrrsMeetResults({...options,teams:{[team]:teams[team]}})]));
  const teamOf=event=>/^Men/.test(event?.team_label||'')?'Men':'Women';
  async function attach(event){
    const team=teamOf(event);await byTeam[team].attach(event);
    if(event.meet_results_verified&&event.team_label){
      const own=text=>new RegExp(`^${team}'s\\b`,'i').test(String(text||''));
      const other=team==='Men'?/\bwomen(?:'s)?\b/i:/\b(?<!wo)men(?:'s)?\b/i;
      event.results=event.results.filter(row=>own(row.group));event.result_count=event.results.length;event.has_more_results=event.results.length>3;event.recap_result_count=event.results.length;
      event.headline=String(event.headline).split(' / ').filter(own).join(' / ')||event.headline;
      event.highlights=(event.highlights||[]).filter(line=>!other.test(line));
    }
    return event;
  }
  return{matches:byTeam.Women.matches,attach};
}

// Opponents a page writes as institutions ("University of Kentucky",
// "Southern Methodist University", "Spalding University (Ky.)", "Stony Brook
// University") read by the short name, as the stories write them (Ohio
// State's rule, shared since Louisville and NC State, Oct 15). Miami, Boston
// and Washington University keep theirs: the short name is another school.
const INSTITUTION_NAMES={'Texas Christian':'TCU','Southern Methodist':'SMU','Mississippi':'Ole Miss','Texas at El Paso':'UTEP','Massachusetts Institute of Technology':'MIT','North Carolina State':'NC State','Brigham Young':'BYU'};
export function institutionShortName(name){
  const text=String(name||'').trim();
  if(/^(?:Miami|Boston|Washington) University\b/i.test(text))return text;
  // Idaho State's classic pages write "California State University at
  // Fullerton" and "the Pacific" (University of the Pacific).
  const calState=text.match(/^California State University(?:,|\s+at)?\s+(.+)$/i);
  if(calState)return`Cal State ${calState[1].trim()}`;
  const short=text.replace(/^University of\s+/i,'').replace(/\s+University(?=\s*(?:\([^)]*\))?$)/i,'').replace(/^the\s+(?=[A-Z])/,'').trim();
  return INSTITUTION_NAMES[short]||short||text;
}

const PLACE_NAMES=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'];
// The team's golf place in a final story, or null (Florida State's rule,
// shared since NC State): the headline ("Pack Win ...", "Women's Golf
// Finishes Second at ..."), else
// the summary or the story's first paragraphs ("The Seminoles finished the
// tournament 16-over, 880, placing fourth."; NC State's NB3 Matchplay story). `team` is a pattern naming the
// team; a player's finish names no team in its sentence and gives none.
export function golfStoryPlace(raw,{team,decode=s=>s}){
  // The content runs to its own closing quote ("North Carolina's ..." keeps its apostrophe).
  const meta=name=>decode((String(raw).match(new RegExp(`<meta\\b[^>]*property=["']og:${name}["'][^>]*content=(["'])([\\s\\S]*?)\\1`,'i'))||[])[2]||'');
  // The older story template's text block is the story (ucasports.com, Oct
  // 23: a dateline "Conway, Ark.-" in lower case, the menus first).
  const block=String(raw).match(/<div\b[^>]*class=["']sidearm-story-template-text\b[\s\S]*?(?=<div\b[^>]*class=["'][^"']*related|$)/i)?.[0];
  // Its headline ("Bears Finish in 4th at the GMAC Invitational") stays the
  // story's first sentence.
  const body=decode(String(block?`<h1>${meta('title')}.</h1> ${block}`:raw).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ')
    // A place's suffix in superscript reads "12 th" (Montana State, Oct 20).
    .replace(/\b(\d+) (st|nd|rd|th)\b/g,'$1$2');
  // The story starts at its dateline after the byline; a story without one
  // (North Carolina's) starts at the byline (a page title such as "... In The
  // ANNIKA - University of North Carolina Athletics" is not a dateline).
  const story=body.slice(Math.max(0,body.search(/\bBy:\s/)));
  // A dateline may name the state as written and the day ("VAIL, Colo.
  // (September 23, 2026) -", Northern Arizona; its summary is cut short).
  // The team's place can come late (Portland State's Sun Mountain story
  // tells the medalist first: "The Vikings finished third" at 2,100
  // characters).
  // A dateline may end in a double hyphen ("Fairfax, Va. --", George Mason).
  const lead=story.slice(Math.max(0,story.search(/\b[A-Z][A-Z .,']{3,}(?:,\s*[A-Z][a-z]+\.?)?(?:\s*\([^)]{3,30}\))?\s+(?:[-–—]|--)\s/))).slice(0,3000);
  const placeOf=token=>{const tied=/^T-?\d/i.test(token),word=PLACE_NAMES.indexOf(token.toLowerCase())+1,digits=(token.match(/^(?:T-?)?(\d+)(?:st|nd|rd|th)$/i)||[])[1],n=word||Number(digits);if(!n)return null;const suffix=n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';return`${tied?'T':''}${n}${suffix}`;};
  const word='((?:T-?)?\\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth)';
  const title=meta('title').replace(/[‘’]/g,"'");
  // A headline may name the team as just "Golf" ("Golf Finishes 11th in
  // Season Opener", "Golf Reigns Supreme at The Goat, Claims Team Title":
  // George Washington, Sep 13 and 20).
  const head=`(?:${team}|(?:Men's |Women's )?Golf)`;
  // "Broncos Capture Bomb Darts Birds Collegiate ..." (Santa Clara, Sep 8);
  // "Golf Claims Commander-In-Chief's Cup at Oakmont" (Army, Oct 14).
  if(new RegExp(`\\b${head}\\s+(?:Wins?|Captures?|Claims?)\\b(?!\\s+(?:\\w+[- ]){0,2}(?:place|spot|individual|medal))`,'i').test(title))return'1st';
  // "Demon Deacons Open Season with Team Title at ANNIKA Intercollegiate";
  // "Wake Forest Finishes Runner-Up at Stephens Cup" (Wake Forest, Oct 15).
  if(new RegExp(`\\b${head}\\b[^|]*?\\bTeam Title\\b`,'i').test(title))return'1st';
  if(new RegExp(`\\b${head}\\b[^|]*?\\bRunner-?Up\\b`,'i').test(title))return'2nd';
  // "Bobcats Repeat as Yellowstone Intercollegiate Team Champions" (Montana
  // State, Sep 22).
  if(new RegExp(`\\b${head}\\b[^|]*?\\bTeam Champions?\\b`,'i').test(title))return'1st';
  const heading=title.match(new RegExp(`\\b${head}\\b[^|]*?\\b(?:Finish(?:es)?|Place[sd]?)\\s+${word}\\b`,'i'));
  if(heading&&placeOf(heading[1]))return placeOf(heading[1]);
  // A results block: "Place (Winthrop): 16th (896/+44)", "T-8th of 15", the
  // headline's "Eagles 4th at UNCG Collegiate" too (Winthrop, Sep 29-Oct 20).
  const results=lead.match(new RegExp(`\\bPlace\\s*\\((?:${team})\\):\\s*${word}`,'i'));
  if(results&&placeOf(results[1]))return placeOf(results[1]);
  // "Cajuns Finish Tied For 11th at Argent Financial Classic", "Bulldogs
  // Close 2026 at The Clerico Tie for Seventh" (Louisiana, Louisiana Tech);
  // "Ohio Women's Golf Ties For Fourth at Butler Invitational" (Oct 6).
  const tiedHeading=title.match(new RegExp(`\\b${head}\\b[^|]*?\\b(?:Finish(?:es)?\\s+)?Tie[sd]?\\s+For\\s+${word}\\b`,'i'));
  if(tiedHeading&&placeOf(tiedHeading[1]))return`T${placeOf(tiedHeading[1]).replace(/^T/,'')}`;
  // "Women's Golf Opens Season with Fourth-Place Finish at ..." (St. John's),
  // "Golden Eagles Close Fall With Fifth-Place Finish" (Marquette, Oct 19).
  const placeFinish=title.match(new RegExp(`\\b${head}\\b[^|]*?\\b${word}[- ]Place\\s+Finish\\b`,'i'));
  if(placeFinish&&placeOf(placeFinish[1]))return placeOf(placeFinish[1]);
  // The summary ends before the story starts, whatever its last character.
  for(const sentence of `${meta('description')}. ${lead}`.split(/(?<=\.)\s+/)){
    // A player who "paced the Musketeers" places herself, not the team
    // (Xavier's Flyer Invitational, Oct 20: "... paced the Musketeers at the
    // Flyer Invitational on Tuesday, placing 10th").
    // ... unless it led them to the team's place: "Powell led the Patriots to
    // a fifth-place finish in the 13-team field" (George Mason, Sep 22).
    // "... to lead the Monmouth University men's golf team to a seventh-place
    // finish" (Monmouth, Oct 21): a few words may follow the team's name.
    const ledTo=sentence.match(new RegExp(`\\b(?:paced|led|leads?|leading)\\s+(?:the\\s+)?${team}(?:\\s+[A-Za-z'’]+){0,4}?\\s+to\\s+an?\\s+(?:(tie for)\\s+)?${word}[- ]place\\s+finish`,'i'));
    if(ledTo&&placeOf(ledTo[2]))return`${ledTo[1]?'T':''}${placeOf(ledTo[2])}`;
    if(new RegExp(`\\b(?:paced|led)\\s+(?:the\\s+)?${team}\\b`,'i').test(sentence))continue;
    // A standing after an earlier round is not the final place (Northern
    // Arizona's McGuire story: "NAU was +9 after the first round, which was
    // good for a tie for seventh"; they finished seventh).
    // So is one going into the last round ("Going into the Final Round the
    // Bears were tied for 2nd place"; Central Arkansas finished 3rd, Sep 16).
    if(/\bafter\s+(?:the\s+)?(?:first|second|opening|1st|2nd)\s+round\b|\bafter\s+(?:day|round)\s+(?:one|two|1|2)\b|\b(?:going|heading)\s+into\s+(?:the\s+)?(?:final|last)\s+(?:round|day)\b|\bentering\s+(?:the\s+)?(?:final|last)\s+(?:round|day)\b/i.test(sentence))continue;
    // A statistic's rank is no place ("its 153 pars were tied for 10th").
    if(/\b(?:pars|birdies|eagles|bogeys|par-[345]s)\b/i.test(sentence))continue;
    // "to place eighth", "climb two spots into a tie for third" (North Carolina);
    // "The Lumberjacks' three-day total ... placed them 12th" (Northern Arizona).
    // "The team finished 15th out of 17" (ULM) and "UL's golf team ...
    // finished in a tie for seventh place" (Louisiana) name the team without
    // its name; "Rounding out the team scoring, Ing Iadpluem ... tied for
    // 45th" (North Carolina, Oct 18) is a player's place.
    // "the UNT Men's Golf Team competed ..., taking 11th in the field of 13"
    // (North Texas, The Clerico, Oct 21).
    // A move on the final day: "As a team, Cal Poly slipped from fifth to
    // eighth during the final round" (Saint Mary's Invitational, Oct 21).
    // "As a team, the Broncos tied for the low round of the day ... to
    // secure a third-place finish" (Santa Clara, Canadian Collegiate, Sep 15);
    // "The Davidson men's golf team concluded ... with a fifth-place finish".
    const secured=sentence.match(new RegExp(`\\b${team}\\b[^.]*?\\b(?:(?:secure|earn|claim|post|record|notch)(?:s|ed|ing)?|with)\\s+an?\\s+(?:(tie[d]? for|share of)\\s+)?${word}[- ]place\\s+finish`,'i'));
    if(secured&&placeOf(secured[2]))return`${secured[1]?'T':''}${placeOf(secured[2])}`;
    // The team winning the tournament: "the Argos won their first tournament
    // by winning The Velvet Classic" (West Florida, Sep 15). "She won the
    // event" is a player's.
    if(new RegExp(`\\b${team}\\s+(?:won|captured|claimed)\\s+(?:the|their)(?:\\s+first)?\\s+(?:team\\s+title|tournament|event)\\b`,'i').test(sentence))return'1st';
    const moved=sentence.match(new RegExp(`\\b${team}\\b[^.]*?\\b(?:slipped|slid|fell|dropped|moved|climbed|jumped|rose|surged)\\s+(?:back\\s+|up\\s+)?from\\s+${word}\\s+to\\s+${word}\\b`,'i'));
    if(moved&&placeOf(moved[2]))return placeOf(moved[2]);
    // "the Bears ended the tournament in 3rd place" (Central Arkansas, Sep 16);
    // "concluded play ... finishing the final round in 17th place" (North
    // Alabama, Diamante, Oct 20).
    // The team's possessive before a best score names a player's ("Olivia
    // Kury delivered the Hawks' lowest score ... to finish tied for 81st",
    // Saint Joseph's; "Luebbers was Ohio's top finisher, finishing ... tied for
    // 6th", Ohio); "The Lumberjacks' three-day total" is the team's.
    const m=sentence.match(new RegExp(`(?:\\b${team}\\b(?!['’]s?\\s+(?:lowest|best|top|low|leading)\\b)|\\b(?:[Tt]he|golf) team\\b(?!\\s*(?:scor|lead|best|['’]s|-)))[^.]*?\\b(placing|placed|to place|taking|took|finish(?:ed|ing)?(?:\\s+in)?|ended(?:\\s+in)?|tied (?:them\\s+)?for|a tie for)\\s+(?:the\\s+(?:tournament|event|final\\s+round)\\s+in\\s+|them\\s+)?${word}\\b`,'i'));
    if(m&&placeOf(m[2]))return`${/\btie/i.test(m[1])&&!/^T-?\d/i.test(m[2])?'T':''}${placeOf(m[2])}`;
  }
  // A headline crediting players: "Round Of The Day Leads UNC To 4th-Place Finish".
  const led=title.match(new RegExp(`\\bLeads?\\s+${team}\\s+To\\s+${word}\\b`,'i'));
  if(led&&placeOf(led[1]))return placeOf(led[1]);
  // A tournament the team played as individuals has no team place (Xavier's
  // Golfweek Put Me In Coach, "individuals only"; the Flyer Invitational,
  // "five golfers compete as individuals").
  // "The Panthers had three individuals compete at the UNCG Collegiate" (High
  // Point, Oct 20).
  return/\bindividuals?[- ]only\b|\bcompete[sd]?\s+as\s+individuals\b|\b(?:had|sent|entered)\s+(?:\w+\s+)?individuals\s+compet/i.test(`${title} ${lead}`)?'No team score (individuals only)':null;
}
// A golf dual told by its story ("The Screaming Eagles defeated the Purple
// Aces 9 ½ - 4 ½", Evansville's Battle of the Expressway, Oct 22): the
// match play headline golfMatchPlay writes and one "Result" row (the event
// names no opponent), the school's points first. USI's story of the same
// dual names its opponent at length ("topped the University of Evansville in
// the head-to-head Battle of the Expressway Thursday, winning 9.5-4.5").
// `team` is the module's golf story pattern; null when the story tells
// no such score.
export function golfStoryMatchPlay(raw,{team,decode=value=>String(value||'')}){
  const text=decode(String(raw||'').replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  const points='(\\d+(?:\\s*½|\\.5)?|½)',number=value=>Number(String(value).replace(/\s*½/,'.5').replace(/^\.5$/,'0.5'));
  const won=text.match(new RegExp(`\\b(?:the )?${team} (?:defeated|beat|topped|edged) (?:the )?[A-Z][^.]{0,100}? ${points}\\s*[-–]\\s*${points}`));
  const lost=!won&&text.match(new RegExp(`\\b(?:defeated|beat|topped|edged) (?:the )?${team},? ${points}\\s*[-–]\\s*${points}`));
  const hit=won||lost;if(!hit)return null;
  const [a,b]=hit.slice(-2).map(number),outcome=a===b?'T':won?'W':'L',[mine,theirs]=outcome==='L'?[Math.min(a,b),Math.max(a,b)]:[Math.max(a,b),Math.min(a,b)];
  return{headline:`Match play: ${outcome==='W'?1:0}-${outcome==='L'?1:0}${outcome==='T'?'-1':''}`,results:[{label:'Result',value:`${outcome}, ${mine}-${theirs}`}]};
}
// A golf final whose card publishes no place takes it from its final story;
// a story dated before the last round is not final (the tournament then has
// no published result and is not listed: isGolfWithoutStory).
export function createGolfStoryPlace({host,team,converted,decodeHtml,fetch,headers}){
  const isGolfAwaitingPlace=event=>converted(event)&&event.sport==='Golf'&&event.status==='Final'&&Boolean(event.recap_url)&&event.headline==='Completed';
  async function attachGolfPlace(event){
    if(!isGolfAwaitingPlace(event))return event;
    const day=new URL(event.recap_url,`https://${host}`).pathname.match(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
    if(day&&`${day[1]}-${day[2].padStart(2,'0')}-${day[3].padStart(2,'0')}`<String(event.end_time||event.start_time).slice(0,10)){delete event.recap_url;delete event.recap_title;return event;}
    let raw=null;try{const response=await fetch(event.recap_url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});raw=response.ok?await response.text():null;}catch{}
    // A tournament named for individuals (Xavier's "Raider Individual", Oct
    // 12-13) has no team place either.
    // It comes first: a story covering two events names the other's team
    // place (Eastern Michigan's Shepherd's Rock Individual beside the
    // Nemacolin, Oct 5).
    const place=raw&&(/\bIndividuals?\b/.test(event.opponent||'')?'No team score (individuals only)':golfStoryPlace(raw,{team,decode:decodeHtml}));
    if(place){event.headline=place;event.results=[{label:'Result',value:place}];event.result_count=1;}
    else{const dual=raw&&golfStoryMatchPlay(raw,{team,decode:decodeHtml});if(dual){event.headline=dual.headline;event.results=dual.results;event.result_count=dual.results.length;}}
    return event;
  }
  return{isGolfAwaitingPlace,attachGolfPlace,isGolfWithoutStory:event=>converted(event)&&event.sport==='Golf'&&event.status==='Final'&&!event.recap_url&&event.headline==='Completed'};
}

// A swimming dual per team, written on one line: "Women: W, 253-33 | Men:
// M, 248-41" (the result letter is optional and may be wrong: the page has
// written "M" for a win), or with team letters, "M: 149-108 | W: 156-101"
// (North Carolina). The scores decide the outcome. Shared since Oct 15: the
// ported copies read "Women: 253-33" as 53-33 (the optional letter took the
// first digit). A written W or L decides when the page puts the winner's
// score first: UNLV's "Women: L, 231-68" at Arizona State (Oct 2) is a
// 68-231 loss.
export function swimDualScores(text){
  // Missouri State writes the team word without its colon: "Men: W 196-157;
  // Women L 152-199" (Oct 2).
  return[...String(text||'').matchAll(/\b(?:(Women|Men):?|(W|M):)\s*(?:([A-Z]),?\s*)?(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/gi)].map(([,word,code,letter,mine,theirs])=>{const team=word||code;
    if(/^[WL]$/i.test(letter||'')&&(letter.toUpperCase()==='W')!==(Number(mine)>Number(theirs))&&Number(mine)!==Number(theirs))[mine,theirs]=[theirs,mine];
    return{team:{W:'Women',M:'Men'}[team.toUpperCase()]||team[0].toUpperCase()+team.slice(1).toLowerCase(),value:`${Number(mine)>Number(theirs)?'W':Number(mine)<Number(theirs)?'L':'T'}, ${mine}-${theirs}`};
  });
}

