import {createTfrrsMeetResults} from '../sidearm-school-kit.mjs';

// Arkansas school module. Shared publisher utilities stay in the Worker;
// this file owns arkansasrazorbacks.com routes, Arkansas's program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const arkansasSchool={
  id:'arkansas',
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set(['Baseball','Basketball','Cross Country','Football','Golf','Gymnastics','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Cross Country','Golf','Tennis','Track & Field']),
  teamLabels:{},
  // The site's team accounts (each sport's pages link its own; athlete
  // profiles for sports without personal links show only the team's).
  blockedInstagramHandles:['arkrazorbacks','razorbackbsb','razorbackfb','razorbackgym','razorbackmbb','razorbackmtennis','razorbacksb','razorbacksoccer','razorbackswimdive','razorbackwten','razorbackxctf'],
  // Exhibitions the cards do not label. Soccer: the published record (4-4-3
  // after Oct 2, "Soccer Draws Missouri, 1-1") leaves out Kansas City (Aug 5,
  // "Hogs top Roos in exhibition opener"; box score "Soccer-Exhibition-vs.-
  // UMKC") and Memphis (Aug 8); Baylor (Aug 12) is the "season opener".
  exhibitions:new Set(['Soccer|Aug 5, 2026|Kansas City','Soccer|Aug 8, 2026|Memphis']),
  verifiedInstagrams:{},
  scheduleUrls:{
    'arkansas|Baseball':'https://arkansasrazorbacks.com/sport/m-basebl/schedule/',
    'arkansas|Basketball':['https://arkansasrazorbacks.com/sport/m-baskbl/schedule/','https://arkansasrazorbacks.com/sport/w-baskbl/schedule/'],
    'arkansas|Cross Country':['https://arkansasrazorbacks.com/sport/m-xc/schedule/','https://arkansasrazorbacks.com/sport/w-xc/schedule/'],
    'arkansas|Football':'https://arkansasrazorbacks.com/sport/m-footbl/schedule/',
    'arkansas|Golf':['https://arkansasrazorbacks.com/sport/m-golf/schedule/','https://arkansasrazorbacks.com/sport/w-golf/schedule/'],
    'arkansas|Gymnastics':'https://arkansasrazorbacks.com/sport/w-gym/schedule/',
    'arkansas|Soccer':'https://arkansasrazorbacks.com/sport/w-soccer/schedule/',
    'arkansas|Softball':'https://arkansasrazorbacks.com/sport/w-softbl/schedule/',
    'arkansas|Swimming & Diving':'https://arkansasrazorbacks.com/sport/w-swim/schedule/',
    'arkansas|Tennis':['https://arkansasrazorbacks.com/sport/m-tennis/schedule/','https://arkansasrazorbacks.com/sport/w-tennis/schedule/'],
    'arkansas|Track & Field':['https://arkansasrazorbacks.com/sport/m-track/schedule/','https://arkansasrazorbacks.com/sport/w-track/schedule/'],
    'arkansas|Volleyball':'https://arkansasrazorbacks.com/sport/w-volley/schedule/'
  },
  rosterUrls:{
    'arkansas|Baseball':'https://arkansasrazorbacks.com/sport/m-basebl/roster/',
    'arkansas|Basketball':['https://arkansasrazorbacks.com/sport/m-baskbl/roster/','https://arkansasrazorbacks.com/sport/w-baskbl/roster/'],
    'arkansas|Cross Country':['https://arkansasrazorbacks.com/sport/m-xc/roster/','https://arkansasrazorbacks.com/sport/w-xc/roster/'],
    'arkansas|Football':'https://arkansasrazorbacks.com/sport/m-footbl/roster/',
    'arkansas|Golf':['https://arkansasrazorbacks.com/sport/m-golf/roster/','https://arkansasrazorbacks.com/sport/w-golf/roster/'],
    'arkansas|Gymnastics':'https://arkansasrazorbacks.com/sport/w-gym/roster/',
    'arkansas|Soccer':'https://arkansasrazorbacks.com/sport/w-soccer/roster/',
    'arkansas|Softball':'https://arkansasrazorbacks.com/sport/w-softbl/roster/',
    'arkansas|Swimming & Diving':'https://arkansasrazorbacks.com/sport/w-swim/roster/',
    'arkansas|Tennis':['https://arkansasrazorbacks.com/sport/m-tennis/roster/','https://arkansasrazorbacks.com/sport/w-tennis/roster/'],
    'arkansas|Track & Field':['https://arkansasrazorbacks.com/sport/m-track/roster/','https://arkansasrazorbacks.com/sport/w-track/roster/'],
    'arkansas|Volleyball':'https://arkansasrazorbacks.com/sport/w-volley/roster/'
  }
};

const HOST='arkansasrazorbacks.com';
// Arkansas's TFRRS cross country team pages (complete races and team scores;
// the schedule cards publish no result).
export const ARKANSAS_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/AR_college_f_Arkansas.html',Men:'https://www.tfrrs.org/teams/xc/AR_college_m_Arkansas.html'};
const EVENT_NAME=/\b(?:invit\w*|invite|opener|challenge|classic|championships?|open|relays|duals|collegiate|intercollegiate|tournament|festival|cup|futures|shootout|region(?:al)?|series)\b/i;
// The site's WordPress categories, one per team page: the archive of each
// team's stories (/wp-json/wp/v2/posts?categories=).
export const ARKANSAS_CATEGORIES={'m-basebl':4,'m-baskbl':5,'w-baskbl':12,'m-xc':6,'w-xc':13,'m-footbl':7,'m-golf':8,'w-golf':14,'w-gym':15,'w-soccer':16,'w-softbl':17,'w-swim':18,'m-tennis':9,'w-tennis':71,'m-track':10,'w-track':70,'w-volley':21};
const PRO_EVENT=/^(?:\d{4}\s+)?ITF\b|\bFutures\b|\b[MW]\d{2,3}\b|\bUTR\b|\bPTT\b/i;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Internal events: Red-White games, home run derbies, basketball's
// "Primetime at the Palace" showcase, intrasquads and scrimmages.
const INTERNAL=/\bintrasquad\b|\bscrimmage\b|\bred[-\s]white\b|\bhome run derby\b|\bprimetime at the palace\b/i;
const centralDay=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
const ordinalSuffix=n=>n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';

// A meet's result as the cards write it: golf's place in the field ("1st of
// 12 (858 / -6)", "T3/18 (567, -1)", "4/18 (851, -1)"; the last day's is the
// tournament's), swimming's ("1st of 5, (552)").
export function arkansasMeetPlace(text){
  const m=String(text||'').trim().match(/^(T-?)?(\d+)(?:st|nd|rd|th)?\s*(?:\/|\bof\b)\s*(\d+)\s*,?\s*(?:\((\d{2,4})\b[^)]*\))?$/i);
  if(!m)return null;
  const n=Number(m[2]),place=`${m[1]?'T':''}${n}${ordinalSuffix(n)} of ${m[3]}`;
  const results=[{label:'Result',value:place}];if(m[4])results.push({label:'Team score',value:m[4]});
  return{headline:place,results};
}

// The season is the page heading's ("<span>2026-27</span>Football
// Schedule"); a card shows the month and day only ("Sat. Sep. 5").
export function arkansasSeasonYear(raw){
  const m=String(raw).match(/<h1\b[^>]*>\s*<span>\s*(20\d\d)-(\d\d)\s*<\/span>/i);
  if(!m)return null;
  return month=>month>=7?Number(m[1]):2000+Number(m[2]);
}

// arkansasrazorbacks.com is a WordPress site ("bordeaux" schedule template):
// each event is a div.item with the venue type (Home/Away/Neutral), the day
// and the published time, the opponent ("at #20 Utah", "No. 9 Texas"), the
// result ("W, 31-14", winner's score first) and a list of links ("Recap",
// "Recap & Highlights"). Stories live at /<slug>/ with no date in the
// address; a final whose card links none takes its story from the team's
// WordPress category.
export function createArkansasHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  const items=raw=>String(raw).split(/<div class="item">/).slice(1).map(part=>part.split(/<div class="item">|<\/section>/)[0]);
  const storyUrl=(href,sourceUrl)=>{
    const url=absoluteUrl(decodeHtml(href),sourceUrl);let parsed;try{parsed=new URL(url);}catch{return null;}
    if(parsed.protocol!=='https:'||parsed.hostname!==HOST||!/^\/[a-z0-9-]+\/?$/.test(parsed.pathname))return null;
    return `https://${HOST}${parsed.pathname.replace(/\/?$/,'/')}`;
  };
  // The card's story: a link labeled Recap ("Recap & Highlights"), or the
  // result itself when it links a story (football).
  function cardRecap(block,sourceUrl){
    for(const [,href,label] of block.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)){
      if(!/\brecap\b/i.test(visibleText(label)))continue;
      const url=storyUrl(href,sourceUrl);if(url)return url;
    }
    const result=block.match(/<a\b[^>]*href="([^"]*)"[^>]*class="results\b/i);
    return result?storyUrl(result[1],sourceUrl):null;
  }

  // Day cards of one meet (one name, each day at most two days after the one
  // before) become one event from its first to its last day. A finished meet
  // takes the last day's place and story; one under way is today's event.
  function mergeDays(events,today){
    const groups=[];
    for(const event of events){
      const day=Date.parse(event.start_time.slice(0,10));
      const group=event.round_of&&groups.find(g=>g[0].round_of===event.round_of&&day-Date.parse(String(g.at(-1).end_time||g.at(-1).start_time).slice(0,10))<=2*86400000);
      if(group)group.push(event);else groups.push([event]);
    }
    return groups.map(days=>{
      const first=days[0],last=days.at(-1);
      for(const event of days)delete event.round_of;
      if(days.length===1)return first;
      const end=String(last.end_time||last.start_time).slice(0,10);
      const finished=Date.parse(end)<today;
      const event={...first};
      if(end>first.start_time.slice(0,10))event.end_time=`${end}T23:59:59Z`;else delete event.end_time;
      const story=[...days].reverse().find(day=>day.recap_url)?.recap_url;
      if(finished){
        event.status='Final';event.priority_bucket=last.priority_bucket;event.recency_label=last.recency_label;
        for(const key of ['headline','results','result_count'])if(last[key]!==undefined)event[key]=last[key];
        if(story)event.recap_url=story;else delete event.recap_url;
      }else if(Date.parse(first.start_time.slice(0,10))<=today){
        for(const key of ['headline','results','result_count','recap_url'])delete event[key];
        event.status='Today';event.priority_bucket='today';event.recency_label='In progress';
        event.id=event.id.replace(/-(?:final|upcoming|today)$/,'-today');
      }
      return event;
    });
  }

  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='arkansas'||!arkansasSchool.cardSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||!/^\/sport\/[a-z-]+\/schedule\/?$/.test(page.pathname))return null;
    raw=String(raw||'');
    const yearOf=arkansasSeasonYear(raw);if(!yearOf)return null;
    const local=centralDay(now.getTime()),today=Date.parse(`${local}T00:00:00Z`);
    const meet=eventType(sport)!=='GAME',events=[];
    for(const block of items(raw)){
      const venue=field(block,/class="type ([a-z]+)"/i).toLowerCase();
      const dateBox=(block.match(/<div class="date">([\s\S]*?)<\/div>/i)||[])[1]||'';
      const day=visibleText((dateBox.match(/<strong>([\s\S]*?)<\/strong>/i)||[])[1]||'').match(/^([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/);
      if(!day)continue;
      const month=MONTHS.indexOf(day[1][0].toUpperCase()+day[1].slice(1,3).toLowerCase())+1;if(!month)continue;
      const start={year:yearOf(month),month,day:Number(day[2])};
      // The time slot holds the time ("3:15 PM"), "TBA", "All Day", a window
      // ("Flex 2:30-7 p.m.") or a multi-day event's span ("Nov. 20-24",
      // "Nov. 8-Nov. 15").
      const slot=field(dateBox,/class="time">([\s\S]*?)<\/span>/i);
      const span=slot.match(/^([A-Za-z]{3})\w*\.?\s+\d{1,2}\s*-\s*(?:([A-Za-z]{3})\w*\.?\s+)?(\d{1,2})$/);
      let finish=start;
      if(span){const m2=MONTHS.indexOf(((span[2]||span[1])[0].toUpperCase()+(span[2]||span[1]).slice(1,3).toLowerCase()))+1;if(m2)finish={year:yearOf(m2),month:m2,day:Number(span[3])};}
      const firstDay=Date.UTC(start.year,start.month-1,start.day),lastDay=Date.UTC(finish.year,finish.month-1,finish.day);
      let name=field(block,/<div class="opponent">([\s\S]*?)<\/div>/i);
      const away=/^at\s+/i.test(name);
      name=name.replace(/^(?:at|vs\.?)\s+/i,'');
      // Rankings ("#20 Utah", "No. 9 Texas") describe the week.
      name=name.replace(/^(?:(?:#|No\.\s*)\d+\s+)+/i,'').trim();
      if(!name||INTERNAL.test(name))continue;
      // The tennis pages list players' pro events ("M15 Columbia Futures",
      // "ITF 15K Futures", "UTR PTT Norfolk"): not team events (Texas's rule).
      if(sport==='Tennis'&&PRO_EVENT.test(name))continue;
      const resultText=field(block,/<div class="results-container">([\s\S]*?)<\/div>/i);
      if(/^(?:cancel+ed|postponed)\b/i.test(resultText))continue;
      // "W, 31-14", "L, 43-10" (the winner's score first), "T, 1-1";
      // doubleheaders "W, 12-0 | W, 3-1" or "W, 10-2 & W, 9-1".
      const games=[...resultText.matchAll(/\b([WLT]),\s*(\d+)\s*-\s*(\d+)/g)];
      const placed=meet&&!games.length?arkansasMeetPlace(resultText):null;
      // A game two days past without a published result is neither a final
      // nor upcoming. Yesterday's stays: a night game can run past midnight.
      if(!meet&&!games.length&&lastDay<today-86400000)continue;
      const over=meet&&!games.length&&lastDay<today;
      const clock=(slot.match(/^\d{1,2}:\d{2}\s*[AP]M$/i)||[''])[0];
      let opponent=name.replace(/\s*\((?:DH|Doubleheader)\)$/i,'');
      if(arkansasSchool.exhibitions.has(`${sport}|${MONTHS[start.month-1]} ${start.day}, ${start.year}|${opponent}`))opponent=`${opponent} (Exhibition)`;
      opponent=opponent.replace(/\s*\((?:EXH|Exh\.?)\)$/i,' (Exhibition)');
      const relation=away||venue==='away'?'at':meet&&(venue==='neutral'||EVENT_NAME.test(opponent))?'at':'vs';
      const recapUrl=games.length||over?cardRecap(block,sourceUrl):null;
      const make=(game,number)=>{
        let result=null,us=null,them=null;
        if(game){const [a,b]=[game[2],game[3]].map(Number);[us,them]=(game[1]==='L'?[Math.min(a,b),Math.max(a,b)]:[Math.max(a,b),Math.min(a,b)]).map(String);result=`${game[1]}, ${us}-${them}`;}
        const event=makeEvent({school,sport,status:game||over?'Final':'Upcoming',relation,opponent:number?`${opponent} (Game ${number})`:opponent,date:`${MONTHS[start.month-1]} ${start.day}, ${start.year}`,
          // K-State's results show the date only; upcoming games show the published time.
          time:game||over?null:clock||null,schoolScore:us,oppScore:them,resultText:result,sourceUrl,now});
        if(lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
        if(over){const value=placed||{headline:'Completed',results:[{label:'Result',value:'Completed'}]};event.headline=value.headline;event.results=value.results;event.result_count=value.results.length;}
        if(recapUrl)event.recap_url=recapUrl;
        if(meet)event.round_of=opponent;
        if(number)event.id=`${event.id}-g${number}`;
        return event;
      };
      if(games.length>1)games.forEach((game,i)=>events.push(make(game,i+1)));
      else events.push(make(games[0]||null,0));
    }
    const merged=meet?mergeDays(events,today):events;
    // A page with no events this season (women's track before it is
    // published) is a valid empty schedule, not a failed source.
    if(!merged.length){emptied.add(merged);}
    return merged;
  }
  const emptied=new WeakSet();
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptied.has(events);

  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  const meta=(raw,name)=>decodeHtml((String(raw).match(new RegExp(`<meta\\b[^>]*property=["']${name}["'][^>]*content=["']([^"']*)`,'i'))||[])[1]||'');
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/<[^>]+>/g,' ').replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  // An event's story was published from its first day to three days after
  // its last (article:published_time; the addresses carry no date).
  const window=event=>{const first=Date.parse(`${event.start_time.slice(0,10)}T00:00:00Z`),last=Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`);return[first-86400000,last+4*86400000];};
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='arkansas')return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    if(parsed.protocol!=='https:'||parsed.hostname!==HOST)return false;
    const published=Date.parse(meta(raw,'article:published_time'));
    const [from,to]=window(event);
    if(!(published>=from&&published<to))return false;
    // Checked as of its publication day; a meet's story names the meet.
    const day=new Date(published-5*3600000).toISOString().slice(0,10);
    const identity={...event,start_time:`${day}T12:00:00.000Z`,end_time:undefined};
    if(url===event.recap_url||url===event.archive_story_verified)return recapMatchesEvent(raw,{...identity,sport:''},url);
    if(!recapMatchesEvent(raw,identity,url))return false;
    const opponent=headlineKey(event.opponent).trim();
    return opponent.length>=2&&headlineKey(meta(raw,'og:title')).includes(` ${opponent} `);
  }
  // A final whose card links no story takes one from the team's category:
  // a game's names the opponent and the score (a tie: the score or "draw");
  // a meet's names the meet (its distinctive words: "Chile Pepper", "Gans
  // Creek"). A tennis tournament or meet with no story is not listed.
  // A meet or tournament (cross country, golf, tennis's individual events): a
  // final with no score.
  const meetLike=event=>event.event_type!=='GAME'&&!/^\d+$/.test(String(event.school_score??''));
  const isMeetWithoutStory=event=>event?.school_id==='arkansas'&&meetLike(event)&&event.status==='Final'&&!event.recap_url;
  const isFinalWithoutStory=event=>isMeetWithoutStory(event)||event?.school_id==='arkansas'&&event.status==='Final'&&!event.recap_url&&!/\(Exhibition\)$/.test(event.opponent||'')&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  const GENERIC=new Set(['invitational','invite','classic','collegiate','intercollegiate','championship','championships','open','festival','tournament','cup','the','at','and','of','sec','ncaa','regional','region','meet','day','game']);
  async function attachArchiveStory(event){
    if(!isFinalWithoutStory(event))return event;
    const slug=(String(event.source?.url||'').match(/^https:\/\/arkansasrazorbacks\.com\/sport\/([a-z-]+)\/schedule/)||[])[1];
    const category=ARKANSAS_CATEGORIES[slug];if(!category)return event;
    const [from,to]=window(event),iso=t=>new Date(t).toISOString().slice(0,19);
    const listing=await download(`https://${HOST}/wp-json/wp/v2/posts?categories=${category}&after=${iso(from)}&before=${iso(to)}&per_page=20&_fields=link,title,excerpt,date`);
    let posts;try{posts=JSON.parse(listing||'[]');}catch{return event;}
    if(!Array.isArray(posts))return event;
    const opponent=headlineKey(event.opponent).trim();
    const words=opponent.split(' ').filter(word=>word.length>=4&&!GENERIC.has(word));
    const [a,b]=[String(event.school_score),String(event.opponent_score)];
    const score=new RegExp(`(?<![\\d-])(?:${a}-${b}|${b}-${a})(?![\\d-])`);
    // Older first: the result story precedes later notes.
    for(const post of [...posts].reverse()){
      const title=headlineKey(post?.title?.rendered),text=`${title} ${headlineKey(post?.excerpt?.rendered)}`;
      const url=storyUrl(post?.link||'',`https://${HOST}/`);if(!url)continue;
      if(/\b(?:preview|next challenge|host|hosts|set to|heads? to|travel|travels)\b/.test(title))continue;
      if(meetLike(event)){
        // A story on two tournaments names them in its summary.
        if(words.length&&words.every(word=>text.includes(` ${word}`))){event.recap_url=url;event.archive_story_verified=url;return event;}
        continue;
      }
      if(opponent.length>=2&&text.includes(` ${opponent} `)&&(score.test(decodeHtml(`${post?.title?.rendered} ${post?.excerpt?.rendered}`))||a===b&&/\b(?:draw|draws|tie|tied|scoreless)\b/.test(text))){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  // Each team's page is its own event: its own TFRRS team page.
  const tfrrs=Object.fromEntries(['Women','Men'].map(team=>[team,createTfrrsMeetResults({id:'arkansas',schoolName:'Arkansas',teams:{[team]:ARKANSAS_TFRRS_TEAMS[team]},decodeHtml,ordinal,fetch,headers})]));
  const teamOf=event=>/^Men/.test(event?.team_label||'')?'Men':'Women';
  // A finished meet with neither a place nor a story (tennis's individual
  // tournaments) is not listed; cross country takes TFRRS's results.
  const isUnlisted=event=>isMeetWithoutStory(event)&&event.sport!=='Cross Country'&&event.headline==='Completed';
  return{parseSchedule,isEmptySchedule,matchesRecap,isMeetWithoutStory,isUnlisted,isFinalWithoutStory,attachArchiveStory,
    isCrossCountry:event=>event?.school_id==='arkansas'&&tfrrs.Women.matches(event),attachMeetResults:async event=>{
      const team=teamOf(event);await tfrrs[team].attach(event);
      // The meet's TFRRS page holds both races: each team's event keeps its own.
      if(event.meet_results_verified&&event.team_label){
        const own=text=>new RegExp(`^${team}'s\\b`,'i').test(String(text||''));
        const other=team==='Men'?/\bwomen(?:'s)?\b/i:/\b(?<!wo)men(?:'s)?\b/i;
        event.results=event.results.filter(row=>own(row.group));event.result_count=event.results.length;event.has_more_results=event.results.length>3;event.recap_result_count=event.results.length;
        event.headline=String(event.headline).split(' / ').filter(own).join(' / ')||event.headline;
        event.highlights=event.highlights.filter(line=>!other.test(line));
      }
      return event;
    }};
}
