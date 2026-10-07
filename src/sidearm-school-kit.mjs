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
//   doubleheaderNumber()              gameNumber setting: Game 1 / Game 2
//   createRecapMatcher({...})         own recap: opponent and date; others must name the opponent in the headline
//   createArchiveStory({...})         a final with no linked story takes one from /sports/<slug>/archives
//   createTfrrsMeetResults({...})     cross country races and team scores from TFRRS
import {sidearmStartTime} from './sidearm-schedule-data.mjs';
import {findTfrrsMeet,parseTfrrsResults} from './tfrrs-results.mjs';
import {withoutRanking} from './sidearm-schedule-reader.mjs';

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
    const name=String(game.tournament?.title||'').trim(),previous=groups.at(-1);
    if(previous&&name&&previous.name===name&&dayGap(previous.at(-1),game)>=0&&dayGap(previous.at(-1),game)<=2){previous.push(game);continue;}
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
export function mergeMeetDays(games,{name=game=>withoutRanking(game.opponent?.title).toLowerCase()}={}){
  const groups=[];
  for(const game of games){
    const key=name(game),previous=groups.find(group=>group.key===key&&dayGap(group.at(-1),game)>=0&&dayGap(group.at(-1),game)<=3);
    if(key&&previous){previous.push(game);continue;}
    const group=[game];group.key=key;groups.push(group);
  }
  return groups.map(days=>{
    if(days.length===1)return days[0];
    const last=days.at(-1),result=last.result||{},story=[...days].reverse().map(day=>day.result?.recap).find(recap=>recap?.url);
    const end=[...days.map(day=>day.date),...days.map(day=>day.enddate).filter(Boolean)].sort().at(-1);
    return{...days[0],enddate:end,result:{...result,recap:result.recap?.url?result.recap:story||null}};
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
  return out;
}

// Team places a meet card publishes as text, either team first: "M- 2nd,
// W- 2nd", "W- 3rd, M - 4th", "M-1st/W-NTS", "M- T-5th (57 points), W-12th
// (22 points)", "Men: 1st Women: 12th". "Did not score" and "NTS" are no
// place.
export function meetTeamPlaces(text,ordinal=value=>String(value)){
  const places={};
  for(const m of String(text||'').matchAll(/\b(M|W|Men|Women)\s*[-:]?\s*(T-?)?(\d{1,3})(?:st|nd|rd|th)\b(?:\s*\((\d+(?:\.\d+)?)\s*points?\))?/gi)){
    const team=/^w/i.test(m[1])?'Women':'Men';
    places[team]??={place:`${m[2]?'T':''}${ordinal(m[3])}`,points:m[4]||null};
  }
  return places;
}
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
  const m=String(text||'').trim().match(/^(T-?)?(\d+)(st|nd|rd|th)\s*(?:\/|of|out of)\s*(\d+)(?:\s+teams)?\.?$/i);
  return m?`${m[1]?'T':''}${m[2]}${m[3].toLowerCase()} of ${m[4]}`:null;
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
export function createRecapMatcher({id,host,recapMatchesEvent,decodeHtml,trustOwnLink=false,ownLinkDays=1}){
  const ownLinkDated=(event,url)=>{
    const dated=String(url).match(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);if(!dated)return false;
    const day=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3])),first=Date.parse(`${String(event.start_time).slice(0,10)}T00:00:00Z`),last=Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`);
    return day>=first&&day<=last+ownLinkDays*86400000;
  };
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  return function matchesRecap(raw,event,url){
    if(event?.school_id!==id)return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===host&&parsed.pathname.startsWith('/news/');
    const identity=event.end_time?{...event,start_time:event.end_time.replace(/T.*$/,'T12:00:00.000Z')}:event;
    if(own&&url===event.final_story)return true;
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
export function createArchiveStory({id,host,decodeHtml,fetch,headers,meetSports=new Set(),volleyballSets=false}){
  const download=downloader(fetch,headers);
  const storyText=raw=>decodeHtml((String(raw).match(/<div\b[^>]*id=["']story-[\s\S]*?(?=<div\b[^>]*class=["'][^"']*related|$)/i)?.[0]||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  const isMeet=event=>event?.school_id===id&&event.event_type==='MEET'&&meetSports.has(event.sport)&&event.status==='Final'&&!event.recap_url;
  const needsStory=event=>isMeet(event)||event?.school_id===id&&event.event_type==='GAME'&&event.status==='Final'&&!event.recap_url&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  const MEET_WORDS=/^(?:the|and|invitational|invite|meet|open|classic|championships?|teams?|only)$/i;
  const schedulePath=new RegExp(`^https://${host.replace(/\./g,'\\.')}/sports/([a-z-]+)/schedule`);
  async function attachArchiveStory(event){
    if(!needsStory(event))return event;
    const slug=(String(event.source?.url||'').match(schedulePath)||[])[1];if(!slug)return event;
    const listing=await download(`https://${host}/sports/${slug}/archives`);if(!listing)return event;
    const first=Date.parse(`${String(event.start_time).slice(0,10)}T00:00:00Z`);
    const span=isMeet(event)?Math.max(0,Math.round((Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`)-first)/86400000)):0;
    const days=Array.from({length:span+2},(_,offset)=>new Date(first+offset*86400000)).map(day=>`/news/${day.getUTCFullYear()}/${day.getUTCMonth()+1}/${day.getUTCDate()}/`);
    const paths=[...new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])].filter(path=>days.some(day=>path.startsWith(day)));
    if(isMeet(event)){
      // Every word that tells the meet apart ("Roy Griak") is in the story.
      const words=String(event.opponent||'').replace(/\s*\(.*?\)\s*/g,' ').toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>=3&&!MEET_WORDS.test(word));
      if(!words.length)return event;
      // The last day's story first: a day-one story names the meet too.
      const day=path=>{const [y,m,d]=path.split('/').slice(2,5).map(Number);return Date.UTC(y,m-1,d);};
      for(const path of [...paths].sort((x,y)=>day(y)-day(x)).slice(0,4)){
        const url=`https://${host}${path}`,raw=await download(url);if(!raw)continue;
        const text=storyText(raw).toLowerCase();
        if(words.every(word=>text.includes(word))){event.recap_url=url;event.archive_story_verified=url;return event;}
      }
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
      if(score.test(text)||tie&&tie.test(text)||sets&&sets.test(text)){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  return{needsStory,attachArchiveStory};
}

// Cross country races from TFRRS: the meet is found on each team's TFRRS page
// by date and name, the school's rows by the TEAM column. Every team place
// the schedule publishes must agree, or the schedule's headline stays.
// Feed and expanded view both call attach; the second call is a no-op.
export function createTfrrsMeetResults({id,schoolName,tfrrsTeam=schoolName,teams,decodeHtml,ordinal,fetch,headers}){
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
    const date=String(event.start_time).slice(0,10),pages=new Set();
    for(const team of ['Women','Men']){
      if(!teams[team])continue;
      const listing=await download(teams[team]);if(!listing)continue;
      const url=findTfrrsMeet(listing,{decodeHtml,date,name:event.opponent});
      if(url)pages.add(url);
    }
    if(!pages.size)return unavailable('No results for this meet are published on TFRRS yet.');
    const races=[];let resultsUrl=null;
    for(const url of pages){
      const page=await download(url);if(!page)return unavailable(failed);
      for(const race of parseTfrrsResults(page,{decodeHtml,ordinal,team:tfrrsTeam}))if(!races.some(other=>other.group===race.group))races.push(race);
      resultsUrl??=url;
    }
    races.sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
    if(!races.length)return unavailable(failed);
    const published=Object.fromEntries([...String(event.headline||'').matchAll(/\b(Men|Women)'s team: (T?\d+)\w\w/g)].map(m=>[m[1],m[2]]));
    for(const [team,place] of Object.entries(published)){
      const race=races.find(race=>race.team===team&&race.result);
      if(!race||String(race.result.place)!==place.replace(/^T/,''))return unavailable(failed);
    }
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
