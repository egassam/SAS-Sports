import {createTfrrsMeetResults} from '../sidearm-school-kit.mjs';

// Virginia school module. Shared publisher utilities stay in the Worker;
// this file owns virginiasports.com routes, Virginia's program combinations, its
// verified Instagram tags and its schedule reader (WMT cards, Purdue's
// reader: src/schools/purdue.mjs; scripts/port-wmt.mjs).
export const virginiaSchool={
  id:'virginia',
  // Rewritten finals (field hockey's shootout vs Louisville, Oct 23) store
  // their expanded views again.
  highlightRevision:1,
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set(['Baseball','Basketball','Cross Country','Field Hockey','Football','Golf','Lacrosse','Rowing','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball','Wrestling']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}],
    'Lacrosse':[{path:'lacrosse/mens-college-lacrosse',team_label:"Men's",sourceName:"Live men's college lacrosse scoreboard"},{path:'lacrosse/womens-college-lacrosse',team_label:"Women's",sourceName:"Live women's college lacrosse scoreboard"}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Golf','Lacrosse','Soccer','Tennis']),
  teamLabels:{'/sports/mbball/schedule':"Men's",'/sports/wbball/schedule':"Women's",'/sports/mgolf/schedule':"Men's",'/sports/wgolf/schedule':"Women's",'/sports/mlax/schedule':"Men's",'/sports/wlax/schedule':"Women's",'/sports/wsoc/schedule':"Women's",'/sports/msoc/schedule':"Men's",'/sports/mten/schedule':"Men's",'/sports/wten/schedule':"Women's"},
  verifiedInstagrams:{},
  scheduleUrls:{
    'virginia|Baseball':'https://virginiasports.com/sports/baseball/schedule',
    'virginia|Basketball':['https://virginiasports.com/sports/mbball/schedule','https://virginiasports.com/sports/wbball/schedule'],
    'virginia|Cross Country':'https://virginiasports.com/sports/xc/schedule',
    'virginia|Field Hockey':'https://virginiasports.com/sports/fhockey/schedule',
    'virginia|Football':'https://virginiasports.com/sports/football/schedule',
    'virginia|Golf':['https://virginiasports.com/sports/mgolf/schedule','https://virginiasports.com/sports/wgolf/schedule'],
    'virginia|Lacrosse':['https://virginiasports.com/sports/mlax/schedule','https://virginiasports.com/sports/wlax/schedule'],
    'virginia|Rowing':'https://virginiasports.com/sports/wrow/schedule',
    'virginia|Soccer':['https://virginiasports.com/sports/wsoc/schedule','https://virginiasports.com/sports/msoc/schedule'],
    'virginia|Softball':'https://virginiasports.com/sports/softball/schedule',
    'virginia|Swimming & Diving':'https://virginiasports.com/sports/swimming/schedule',
    'virginia|Tennis':['https://virginiasports.com/sports/mten/schedule','https://virginiasports.com/sports/wten/schedule'],
    'virginia|Track & Field':'https://virginiasports.com/sports/xctrack/schedule',
    'virginia|Volleyball':'https://virginiasports.com/sports/wvball/schedule',
    'virginia|Wrestling':'https://virginiasports.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'virginia|Baseball':'https://virginiasports.com/sports/baseball/roster',
    'virginia|Basketball':['https://virginiasports.com/sports/mbball/roster','https://virginiasports.com/sports/wbball/roster'],
    'virginia|Cross Country':'https://virginiasports.com/sports/xc/roster',
    'virginia|Field Hockey':'https://virginiasports.com/sports/fhockey/roster',
    'virginia|Football':'https://virginiasports.com/sports/football/roster',
    'virginia|Golf':['https://virginiasports.com/sports/mgolf/roster','https://virginiasports.com/sports/wgolf/roster'],
    'virginia|Lacrosse':['https://virginiasports.com/sports/mlax/roster','https://virginiasports.com/sports/wlax/roster'],
    'virginia|Rowing':'https://virginiasports.com/sports/wrow/roster',
    'virginia|Soccer':['https://virginiasports.com/sports/wsoc/roster','https://virginiasports.com/sports/msoc/roster'],
    'virginia|Softball':'https://virginiasports.com/sports/softball/roster',
    'virginia|Swimming & Diving':'https://virginiasports.com/sports/swimming/roster',
    'virginia|Tennis':['https://virginiasports.com/sports/mten/roster','https://virginiasports.com/sports/wten/roster'],
    'virginia|Track & Field':'https://virginiasports.com/sports/xctrack/roster',
    'virginia|Volleyball':'https://virginiasports.com/sports/wvball/roster',
    'virginia|Wrestling':'https://virginiasports.com/sports/wrestling/roster'
  }
};

const HOST='virginiasports.com';
// Virginia's TFRRS cross country team pages (complete races and team scores; the
// schedule cards publish no place).
export const VIRGINIA_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/VA_college_f_Virginia.html',Men:'https://www.tfrrs.org/teams/xc/VA_college_m_Virginia.html'};
// Iowa's: wrestling's "Soldier Salute", tennis's "ITA Regionals".
const EVENT_NAME=/\b(?:invit\w*|invite|opener|challenge|classic|championships?|open|relays|duals|collegiate|intercollegiate|tournament|festival|cup|futures|salute|regionals?)\b/i;
// A game sport's card named after an event (soccer's "Big Ten Tournament",
// women's basketball's "First & Second Rounds", "Women's Final Four") reads
// "Nebraska at ...", as K-State's tournaments do.
const GAME_EVENT=/\b(?:tournament|championships?|final four|regionals?|rounds?)\b/i;
// Not a competition: "NCAA Selection Show" (golf, basketball), swimming's
// "Holiday Training Trip".
const NO_CONFERENCE=new Set(['Rifle','Bowling','Beach Volleyball']);
const NOT_EVENT=/\bselection show\b|\btraining trip\b/i;
// Golf's card result: "5th of 13" (the place in the field) or "1st (842)"
// (the place and team score).
export function virginiaGolfCardPlace(text){
  const value=String(text||'').trim();
  // Auburn's: "1/18", "T3/18", "4th/12" (the place and the field).
  const slashed=value.match(/^(T-?)?(\d+)(?:st|nd|rd|th)?\/(\d+)$/i);
  if(slashed){const n=Number(slashed[2]),suffix=n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';const place=`${slashed[1]?'T':''}${n}${suffix} of ${slashed[3]}`;return{headline:place,results:[{label:'Result',value:place}]};}
  // Iowa's: "1st/14 teams", "t6th/18 teams" (the place and the field);
  // "4th / 878 Strokes" (the place and the team score).
  const teams=value.match(/^(T-?)?(\d+)(st|nd|rd|th)?\s*\/\s*(\d+)\s+teams$/i);
  if(teams){const n=Number(teams[2]),suffix=n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';const place=`${teams[1]?'T':''}${n}${suffix} of ${teams[4]}`;return{headline:place,results:[{label:'Result',value:place}]};}
  const strokes=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s*\/\s*(\d{3,4})\s+strokes$/i);
  if(strokes){const place=`${strokes[1]?'T':''}${strokes[2]}${strokes[3].toLowerCase()}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:strokes[4]}]};}
  // Nebraska's: "9th/9 (889)", "T4th/11 (852)" (the place, the field and
  // the team score).
  const full=value.match(/^(T-?)?(\d+)(st|nd|rd|th)?\s*\/\s*(\d+)\s*\((\d{3,4})\)$/i);
  if(full){const n=Number(full[2]),suffix=n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';const place=`${full[1]?'T':''}${n}${suffix} of ${full[4]}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:full[5]}]};}
  // Purdue's: "4th/16 (+29; 293-304-296—893 )" (women's: the rounds, then
  // the total), "T-10th / 18 Teams (+24; 876)", "1st / 13 Teams (-4; 1,076)" (men's;
  // a 54-hole total of five players).
  const par=value.match(/^(T-?)?(\d+)(st|nd|rd|th)?\s*\/\s*(\d+)(?:\s+teams)?\s*\((?:[+-]?\d+|E);\s*(?:\d{3}(?:-\d{3})*\s*[—–-]\s*)?(\d{3,4}|\d,\d{3})\s*\)$/i);
  if(par){const n=Number(par[2]),suffix=n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';const place=`${par[1]?'T':''}${n}${suffix} of ${par[4]}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:par[5].replace(',','')}]};}
  const fielded=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s+of\s+(\d+)$/i);
  if(fielded){const place=`${fielded[1]?'T':''}${fielded[2]}${fielded[3].toLowerCase()} of ${fielded[4]}`;return{headline:place,results:[{label:'Result',value:place}]};}
  const scored=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s*\((\d{3,4})\)$/i);
  if(scored){const place=`${scored[1]?'T':''}${scored[2]}${scored[3].toLowerCase()}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:scored[4]}]};}
  return null;
}
const SHORT_NAMES={'California':'Cal','Florida Gulf Coast':'FGCU'};
const PRO_EVENT=/^(?:\d{4}\s+)?(?:ITF|ATP|WTA)\b|\bFutures\b|\b[MW]\d{2,3}\b|\bUTR\b|\bPTT\b|\b\d{2,3}K\s+Challenger\b/i;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Sports whose single-year page title names the fall ("Football 2026"); every
// other single-year title names the spring ("Baseball 2027", whose fall
// exhibitions are in October 2026).
const FALL_SPORTS=new Set(['Football','Soccer','Volleyball','Cross Country']);
// Internal events: intrasquads, scrimmages, "Purple & Gold", softball's
// "Purple/Gold World Series".
// Nebraska's: baseball's "Red-White Series: Game 1", softball's "Scarlet vs.
// Cream".
// Purdue's: baseball's "Black & Gold Series" and its "Halloween Bash",
// wrestling's "Wrestle-Offs".
const INTERNAL=/\bintrasquad\b|\bscrimmages?\b|\bwrestle-?offs?\b|\bhalloween bash\b|^black\s*(?:&|and)\s*gold\b|^purple\s*(?:&|and|-|\/|vs\.?)\s*(?:gold|white)\b|^red\s*(?:&|and|-|\/|vs\.?)\s*white\b|^scarlet\s*(?:&|and|-|\/|vs\.?)\s*cream\b/i;
// Today in Central time (Texas A&M's cards are Central wall clock: "6:00 PM CT").
const centralDay=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));

// One element per opening tag: from it to its matching </div>.
function divBlocks(raw,pattern){
  const blocks=[];
  for(const open of raw.matchAll(pattern)){
    const tags=/<div\b[^>]*>|<\/div>/gi;tags.lastIndex=open.index+open[0].length;
    let depth=1,end=-1,tag;
    while(depth&&(tag=tags.exec(raw)))if((depth+=tag[0][1]==='/'?-1:1)===0)end=tags.lastIndex;
    if(end>0)blocks.push({block:raw.slice(open.index,end),index:open.index,end});
  }
  return blocks;
}
// Vanderbilt's cards are schedule-item-block (Auburn's schedule-event-item).
const cardBlocks=raw=>divBlocks(raw,/<div\b[^>]*class=["']schedule-(?:event-item|item-block)(?=[\s"'])[^"']*["'][^>]*>/gi);

// The page title names the season: "Football 2026", "Men's Basketball
// 2026-27", "Baseball 2027". A card shows the day only ("Sep 5"); its year
// follows from the season.
export function virginiaSeasonYear(raw,sport){
  const title=(String(raw).match(/<title>([^<]*)/i)||[])[1]||'';
  const range=title.match(/\b(20\d\d)-(\d\d)\b/);
  if(range)return month=>month>=7?Number(range[1]):2000+Number(range[2]);
  const single=title.match(/\b(20\d\d)\b/);if(!single)return null;
  const year=Number(single[1]);
  return FALL_SPORTS.has(sport)?month=>month>=7?year:year+1:month=>month>=7?year-1:year;
}

// 12thman.com renders each event as a schedule-event-item card: the day
// ("Sep 5"; a tournament adds its last day) in the date box, a "vs."/"at"
// divider, the opponent, and one result slot holding the result ("W Win
// 51-10"), the published time ("6:00 PM CT", "TBA") or nothing (a meet).
// Cards sit under titled tournament wrappers ("Exhibition"). Golf and
// swimming invitationals publish one card per day ("Inverness Intercollegiate
// (Day 2)"); cross country one per team ("Paul Short Run (W)").
export function createVirginiaHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  // Titled tournament wrappers ("Exhibition", "SEC/ACC Challenge"); a card's
  // heading is the titled wrapper that encloses it.
  function headings(raw){
    return divBlocks(raw,/<div\b[^>]*class=["'][^"']*schedule-events-by-tournament__wrapper--has-title[^"']*["'][^>]*>/gi)
      .map(({block,index,end})=>({start:index,end,title:field(block,/schedule-events-by-tournament__title[^>]*>([\s\S]*?)<\//i)}));
  }
  // The card's own Recap link, dated in its URL (/news/2026/09/6/...) from the
  // event's first day to three days after its last.
  // Golf's links carry no recap class: their labels name them ("Recap",
  // "Final Recap", "Day 1 Recap", "Round 2 Recap"). The final story is
  // taken; the latest day's or round's only when the card links no other.
  function cardRecap(block,sourceUrl,firstDay,lastDay){
    const attribute=(tag,name)=>(tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`,'i'))||[])[1]||'';
    const links=[...block.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(([whole,inner])=>{const tag=whole.match(/^<a\b[^>]*>/i)[0];return{tag,inner,href:attribute(tag,'href'),cls:attribute(tag,'class')};})
      .filter(link=>link.href&&/(?:^|\s)(?:schedule-event(?:-item)?-links__link|schedule-event-bottom__link)(?:\s|$)/.test(link.cls))
      // "Final Recap - Missouri vs. ...", or a recap-class link whose label is
      // the story's headline ("Tennis Concludes ... - Recap").
      // Nebraska's schedule-event-bottom__link anchors are labeled by their
      // text ("Recap"; aria-label "<headline> - Recap").
      .map(link=>({...link,label:/--(?:recap|postgame)\b/.test(link.cls)?'Recap':/schedule-event-bottom__link/.test(link.cls)?visibleText(link.inner):decodeHtml(attribute(link.tag,'aria-label')).split(' - ')[0].trim()}))
      .filter(link=>/\brecap\b/i.test(link.label));
    let latest=null;
    for(const link of links){
      const url=absoluteUrl(link.href,sourceUrl);
      let parsed;try{parsed=new URL(url);}catch{continue;}
      // A slug with "Rec" pasted on its end ("...-virginia-past-yaleRec",
      // Aug 30 soccer; the page is at "...-past-yale").
      parsed.pathname=parsed.pathname.replace(/(?<=\/news\/[^A-Z]*[a-z0-9])Rec(?:ap)?$/,'');
      const dated=parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(parsed.protocol!=='https:'||parsed.hostname!==HOST||!dated)continue;
      const day=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3]));
      if(day<firstDay||day>lastDay+3*86400000)continue;
      if(!/^(?:Day|Round)\s+\d/i.test(link.label))return parsed.href;
      if(!latest||day>=latest.day)latest={url:parsed.href,day};
    }
    return latest?.url||null;
  }
  // "Inverness Intercollegiate (Day 2)", "SEC Championships (Stroke Play,
  // Day 1)", "SEC Championships (Match Play, if nec.)": the tournament's name
  // and whether the card is one of its days.
  // Vanderbilt's: "Visit Knoxville Collegiate • Rounds 1 & 2", "SEC
  // Championships • Match Play • Semifinals".
  const roundOf=name=>{const m=name.match(/^(.*?)\s*\(((?:Stroke|Match) Play[^)]*|Day \d+[^)]*)\)$/i)||name.match(/^(.*?)\s+•\s+(?:Rounds?\b|Match Play\b|Day\b)/i);return m?m[1].trim():null;};
  // Cross country publishes a card per team: "Paul Short Run (W)".
  const teamOf=name=>{const m=name.match(/^(.*?)\s*\((M|W)\)$/);return m?{name:m[1].trim(),team:m[2]==='W'?'Women':'Men'}:null;};

  // The day cards of one tournament (one name, each day at most two days
  // after the one before) become one event from its first to its last day,
  // whatever other tournament is listed between them (men's golf's RedHawk
  // card sits between Inverness's second and third days). A finished
  // tournament takes the last day's story; one under way is today's event.
  function mergeDays(events,today){
    const groups=[];
    for(const event of events){
      const day=Date.parse(event.start_time.slice(0,10));
      const group=event.round_of&&groups.find(g=>g[0].round_of===event.round_of&&day-Date.parse(g.at(-1).start_time.slice(0,10))<=2*86400000);
      if(group)group.push(event);else groups.push([event]);
    }
    return groups.map(days=>{
      const first=days[0],last=days.at(-1);
      for(const event of days)delete event.round_of;
      if(days.length===1&&!first.merged_name)return first;
      const end=String(last.end_time||last.start_time).slice(0,10);
      const finished=Date.parse(end)<today;
      const event={...first,opponent:first.merged_name||first.opponent};
      event.title=event.title.replace(first.card_name,event.opponent);delete event.merged_name;delete event.card_name;
      if(end>first.start_time.slice(0,10))event.end_time=`${end}T23:59:59Z`;else delete event.end_time;
      const story=[...days].reverse().find(day=>day.recap_url)?.recap_url;
      if(finished){
        event.status='Final';event.priority_bucket=last.priority_bucket;event.recency_label=last.recency_label;
        event.display_time=first.display_time;
        if(story)event.recap_url=story;else delete event.recap_url;
        // The last day's card holds the tournament's final place.
        if(last.headline&&last.headline!=='Completed'){event.headline=last.headline;event.results=last.results;event.result_count=last.result_count;}
      }else if(Date.parse(first.start_time.slice(0,10))<=today){
        // Under way: today's event, not a final.
        for(const key of ['headline','results','result_count','recap_url'])delete event[key];
        event.status='Today';event.priority_bucket='today';event.recency_label='In progress';
        event.id=event.id.replace(/-(?:final|upcoming|today)$/,'-today');
      }
      return event;
    });
  }

  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='virginia'||!virginiaSchool.cardSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(page.pathname))return null;
    raw=String(raw||'');
    const yearOf=virginiaSeasonYear(raw,sport);if(!yearOf)return null;
    const local=centralDay(now.getTime()),today=Date.parse(`${local}T00:00:00Z`);
    const season=Number(local.slice(5,7))>=7?Number(local.slice(0,4)):Number(local.slice(0,4))-1;
    // A page still titled last season ("Women's Track and Field 2025-26",
    // lacrosse) shows its summer meets: it is empty until the new season is
    // published.
    const titled=((raw.match(/<title>([^<]*)/i)||[])[1]||'').match(/\b(20\d\d)-\d\d\b/);
    if(titled&&Number(titled[1])<season){const none=[];emptied.add(none);return none;}
    const wrappers=headings(raw),meet=eventType(sport)!=='GAME',events=[];
    const team=virginiaSchool.teamLabels[page.pathname.replace(/\/$/,'')]?.startsWith('W')?'womens':virginiaSchool.teamLabels[page.pathname.replace(/\/$/,'')]?'mens':null;
    const flagged=/schedule-default-event__game-state["'][^>]*>\s*\(ACC\)/i.test(raw);
    for(const {block,index} of cardBlocks(raw)){
      const heading=wrappers.find(w=>w.start<index&&index<w.end)?.title||'';
      // Texas A&M's date box is the card's top row (schedule-event-item__top),
      // before its content.
      // Vanderbilt's is schedule-item-block__date, before __teams.
      // Nebraska's is schedule-event-date, before __teams.
      const dateBox=(block.match(/schedule-(?:event-item__(?:date-box|top|date)|item-block__(?:date-box|top|date)|event-date(?=["'\s]))[\s\S]*?(?=<div\b[^>]*class=["']schedule-(?:event-item|item-block)__(?:teams|content))/i)||[])[0]||'';
      // Missouri's day ("Sep 3") sits in schedule-event-date__day (LSU's in
      // __month-day).
      // Auburn's day boxes carry the full date (datetime="2026-09-05T14:30:00.000-05:00").
      // Nebraska's in schedule-event-date__label (a tournament has two).
      const days=[...dateBox.matchAll(/<time\b([^>]*)\bclass=["']schedule-event-date__(?:(?:month-)?day|label)["'][^>]*>([\s\S]*?)<\/time>/gi)].map(m=>{const day=visibleText(m[2]).match(/^([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/);if(!day)return null;day.year=(m[1].match(/datetime=["'](20\d\d)-/)||[])[1];return day;}).filter(Boolean);
      if(!days.length)continue;
      const toDay=day=>{const [,mon,date]=day;const month=MONTHS.indexOf(mon)+1;if(!month)return null;return{year:day.year?Number(day.year):yearOf(month),month,day:Number(date)};};
      const start=toDay(days[0]),finish=days[1]?toDay(days[1]):start;
      if(!start||!finish)continue;
      // Only the current academic year (July-June, Central) is current: the
      // track page keeps last spring's season until the next is published.
      if((start.month>=7?start.year:start.year-1)!==season)continue;
      // One "XC/Track" page for both sports: cross country runs August to
      // November, track the rest of the year.
      if(/^\/sports\/xctrack\b/.test(page.pathname)&&(sport==='Cross Country')!==(start.month>=8&&start.month<=11))continue;
      const firstDay=Date.UTC(start.year,start.month-1,start.day),lastDay=Date.UTC(finish.year,finish.month-1,finish.day);
      // Texas A&M's cards name their parts schedule-event-default__*: the
      // divider ("at", "vs"), and the opponent's name in a strong of its own
      // (the school's carries __name--current).
      // A home or neutral card has no divider: its date box names the venue
      // (schedule-event-date--venue-home, --venue-neutral).
      const venue=(block.match(/schedule-event-date--venue-(home|away|neutral)\b/i)||[])[1]?.toLowerCase();
      const divider=field(block,/schedule-(?:default-event|event-default|event-item(?:-default)?|item-team)__divider["'][^>]*>([\s\S]*?)<\/strong>/i)||(venue==='away'?'at':venue?'vs':'');
      // Virginia's opponent is a strong schedule-default-event__name, its
      // league in a game-state span ("NC State (ACC)").
      const nameBox=(block.match(/<strong\b[^>]*class=["']schedule-default-event__name["'][^>]*>([\s\S]*?)<\/strong>/i)||block.match(/class=["']schedule-default-event__name["'][^>]*>([\s\S]*?)<\/span>\s*<\/span>/i)||block.match(/class=["']schedule-event-default__name["'][^>]*>([\s\S]*?)<\/strong>/i)||block.match(/class=["']schedule-event-item(?:-default)?__opponent-name["'][^>]*>([\s\S]*?)<\/strong>/i)
        // Purdue's opponent is the card's schedule-default-event__title (its
        // sponsor line follows in a strong of its own).
        ||block.match(/class=["']schedule-default-event__title["'][^>]*>([\s\S]*?)<\/strong>/i)
        // Vanderbilt's heading holds the divider, then the opponent.
        ||block.match(/class=["']schedule-item-team__heading["'][^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'';
      // The name box repeats the divider for phones; the opponent is the rest.
      // Vanderbilt's heading carries the ranking ("##21/20") in a span of its
      // own, and its label ("Exhibition") follows the heading.
      // Iowa's heading is followed by a promotion ("Home Opener", "Pink Out";
      // a link for wrestling's "Dual in the Dome") and an exhibition tag
      // (schedule-event-exhibition), neither part of the opponent's name.
      const promo=visibleText((block.match(/<(strong|a)\b[^>]*class=["']schedule-item-team__promo["'][^>]*>([\s\S]*?)<\/\1>/i)||[])[2]||'');
      const label=field(block,/class=["']schedule-item-team__label["'][^>]*>([\s\S]*?)<\/span>/i);
      let name=visibleText(nameBox.replace(/<(strong|a)\b[^>]*schedule-item-team__promo[\s\S]*?<\/\1>/gi,'').replace(/<span\b[^>]*(?:schedule-item-team__(?:ranking|label)|schedule-event-exhibition)[\s\S]*?<\/span>/gi,'').replace(/<strong\b[^>]*schedule-default-event__divider-mobile[\s\S]*?<\/strong>/i,'').replace(/<span\b[^>]*schedule-default-event__game-state[\s\S]*?<\/span>/gi,'').replace(/<strong\b[^>]*schedule-item-team__divider[\s\S]*?<\/strong>/i,''));
      // Rankings ("#8 Ole Miss") describe the week, not the opponent.
      // Missouri's give two polls: "#24/#RV Mississippi State".
      // Texas A&M writes them in parentheses: "(#21) Baylor".
      name=name.replace(/^(?:#(?:\d+|RV)(?:\/#?(?:\d+|RV))*\s+)+/i,'').replace(/^\(#?(?:\d+|RV)\)\s*/i,'').trim();
      // A home double dual names its opponents in the promotion ("Double Dual"
      // with "vs. Purdue/UCLA", or "Diving Only vs. Illinois/Nebraska").
      const dual=/^(?:double|tri)\s+dual$/i.test(name)&&promo.match(/^(.*?)\s*\bvs\.?\s+(.+)$/i);
      if(dual)name=`${dual[2].trim()}${dual[1].trim()?` (${dual[1].trim()})`:''}`;
      // A bracket round under its tournament's heading ("First Round" under
      // "Big Ten Tournament", men's basketball) is named by the tournament.
      if(!meet&&heading&&GAME_EVENT.test(heading)&&/^(?:(?:First|Second|Third|Fourth)\s+Round|Quarterfinals?|Semifinals?|Championship|Finals?)$/i.test(name))name=`${heading} (${name})`;
      if(!name||INTERNAL.test(name)||NOT_EVENT.test(name))continue;
      // Purdue's swimming meets publish a card per day ("Ohio State Invite
      // Day 1", "Zones Day 2: 1-Meter"): one meet, at its host.
      const swimDay=sport==='Swimming & Diving'&&name.match(/^(.+?)\s+Day\s+\d+(?::\s*.+)?$/i);
      if(swimDay)name=swimDay[1].trim();
      // A golf tournament played by individuals only ("Cullan Brown Collegiate
      // (Individuals)") has no team result.
      if(sport==='Golf'&&/\(Individuals?\)$/i.test(name))continue;
      // The tennis pages list players' pro events ("M15 Columbia Futures",
      // "ITF 15K Futures", "UTR PTT Norfolk"): not team events (Texas's rule).
      if(sport==='Tennis'&&PRO_EVENT.test(name))continue;
      // A tournament's day cards are named by the day only ("Day One" under
      // the "Husker Invitational" heading): the heading names the event.
      if(meet&&heading&&/^Day\s+(?:One|Two|Three|Four|Five|Six|\d+)$/i.test(name)){const day=name.replace(/^Day\s+/i,'');name=`${heading} (Day ${/^\d+$/.test(day)?day:['one','two','three','four','five','six'].indexOf(day.toLowerCase())+1})`;}
      const slot=field(block,/schedule-event-item-result__label[^>]*>([\s\S]*?)<\/div>/i);
      // A meet's result is a line of text: golf's place ("5th of 13", "1st
      // (842)"), cross country's ("M: 2nd, W: 2nd"; TFRRS gives the full
      // places), tennis "NTS" (no team score).
      const placeText=field(block,/schedule-event-item-result__text[^>]*>([\s\S]*?)<\/div>/i);
      // A cancelled event ("Canceled (Weather)") is not listed.
      if(/^(?:cancel+ed|postponed)\b/i.test(slot))continue;
      // "W Win 3-1"; Texas A&M's "W, Win 3-1".
      const result=slot.match(/^([WLT]),?\s+(?:Win|Loss|Tie)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/i);
      // A shootout score is written winner first ("L 1-0" SO, field hockey vs
      // Louisville, Oct 23): the score is the team's after its result letter.
      if(result&&(/^W/i.test(result[1])?Number(result[2])<Number(result[3]):/^L/i.test(result[1])&&Number(result[2])>Number(result[3])))[result[2],result[3]]=[result[3],result[2]];
      let opponent=name;
      const round=meet?roundOf(name):null,xc=sport==='Cross Country'?teamOf(name):null;
      if(round)opponent=round;
      if(xc)opponent=xc.name;
      // Exhibitions are labeled as K-State's are: the "Exhibition" heading
      // (basketball, baseball) or "Fall Exhibition" (softball).
      if(/\bExhibitions?$/i.test(heading)&&!/\(Exhibition\)$/i.test(opponent))opponent=`${opponent} (Exhibition)`;
      opponent=opponent.replace(/\s*\((?:EXH|Exh\.?)\)$/i,' (Exhibition)');
      // Missouri marks an exhibition on its card ("Exhibition" under the
      // opponent: soccer at Lindenwood, Aug 5); the official record leaves it
      // out.
      if((/class=["'][^"']*\bschedule-event-exhibition\b/i.test(block)||/^Exhibition$/i.test(label))&&!/\(Exhibition\)$/i.test(opponent))opponent=`${opponent} (Exhibition)`;
      // A game two days past without a published result is neither a final
      // nor upcoming. Yesterday's stays: a night game can run past midnight.
      if(!meet&&!result&&lastDay<today-86400000)continue;
      const over=meet&&!result&&lastDay<today;
      // Vanderbilt writes "2:30 p.m."
      const clockParts=result||over?null:slot.match(/^(\d{1,2}:\d{2})\s*([ap])\.?\s*m\b\.?/i);
      const clock=clockParts?`${clockParts[1]} ${clockParts[2].toUpperCase()}M`:'';
      // A tournament or meet (no divider, or over several days) is "at"; a
      // dual (tennis, swimming) follows its divider.
      // Missouri's home meets read "vs." ("vs. Gans Creek Classic", "vs. Mizzou
      // Invite"); a meet named after its event is "at" too, while a dual over
      // two days stays "vs" ("vs. Missouri State", swimming).
      // Every golf, cross country, track and bowling event is a meet away
      // from the team's own field ("vs. Mini Mason" on the women's golf page).
      // Nebraska's: a meet over several days is "at" ("vs. Mizzou Last Chance
      // Meet", swimming). Rifle's matches are duals ("vs. Akron" at home), its
      // invitationals meets; a game sport's event-named card is "at".
      // A regatta is a meet: "at Head Of The Charles Regatta" (the card says "vs.").
      const relation=sport==='Rowing'||eventType(sport)==='MEET'&&!(sport==='Rifle'&&!EVENT_NAME.test(opponent))||!divider||/^at\b/i.test(divider)||meet&&(round||xc||EVENT_NAME.test(opponent)||lastDay>firstDay&&!result)||!meet&&GAME_EVENT.test(opponent)||swimDay?'at':'vs';
      const event=makeEvent({school,sport,status:result||over?'Final':'Upcoming',relation,opponent,date:`${MONTHS[start.month-1]} ${start.day}, ${start.year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||over?null:clock||null,
        schoolScore:result?String(Number(result[2])):null,oppScore:result?String(Number(result[3])):null,resultText:result?`${result[1].toUpperCase()}, ${Number(result[2])}-${Number(result[3])}`:null,sourceUrl,now});
      if(lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      // One card for a tournament under way (tennis's ITA Regional, Oct 7-11):
      // today's event.
      if(!result&&!over&&lastDay>firstDay&&firstDay<=today){event.status='Today';event.priority_bucket='today';event.recency_label='In progress';event.id=event.id.replace(/-(?:final|upcoming|today)$/,'-today');}
      if(over){event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;}
      const placed=over&&sport==='Golf'?virginiaGolfCardPlace(placeText):null;
      if(placed){event.headline=placed.headline;event.results=placed.results;event.result_count=placed.results.length;}
      const recapUrl=result||over?cardRecap(block,sourceUrl,firstDay,lastDay):null;
      if(recapUrl)event.recap_url=recapUrl;
      if(round){event.round_of=round;}
      // Auburn's golf cards are one per day, named alike ("Inverness
      // Intercollegiate", then "Inverness Collegiate" on the last day) at one
      // course: the days at one course are one tournament.
      else if(sport==='Golf'&&!result){const course=field(block,/schedule-event-item__location[^>]*>([\s\S]*?)<\/div>/i)||opponent;event.round_of=`${course}|golf`;event.merged_name=opponent;event.card_name=opponent;}
      // A swimming meet over several days publishes a card per day (SEC
      // Championships, Feb 16-20).
      // Nebraska's wrestling: "Cliff Keen Las Vegas Invitational" (Dec 4 and 5).
      // Virginia's sessions ("SCM World Prep Pro Am", three cards over two
      // days) are one meet too.
      if(!result&&(sport==='Swimming & Diving'||sport==='Wrestling'&&(EVENT_NAME.test(opponent)||swimDay)))event.round_of=`${opponent}|swim`;
      if(swimDay)event.swim_meet=opponent;
      if(xc){event.round_of=`${xc.name}|xc`;event.merged_name=xc.name;event.card_name=opponent;event.xc_team=xc.team;}
      if(team)event.id=`${event.id}-${team}`;
      // The Big Ten sponsors no rifle, bowling or beach volleyball: no game
      // in them is a conference game (Ohio State is a rifle opponent, not a
      // Big Ten one).
      if(NO_CONFERENCE.has(sport))event.conference_game=false;
      // Virginia's cards flag a conference game after the opponent
      // (schedule-default-event__game-state "(ACC)"); a page that flags any
      // flags them all.
      if(flagged&&!NO_CONFERENCE.has(sport))event.conference_game=/schedule-default-event__game-state["'][^>]*>\s*\(ACC\)/i.test(block)&&!/\(Exhibition\)$/.test(opponent)&&!GAME_EVENT.test(opponent);
      // A past tennis tournament (no team result) is listed only with its
      // story, as K-State's (the men's page lists its players' pro events).
      // Nebraska's cards rarely link one: the feed looks for it in the
      // sport's archive first (see isTournamentWithoutStory).
      events.push(event);
    }
    // A past golf tournament with no story is not listed either: its card
    // publishes no place (men's golf's RedHawk Intercollegiate, Sep 14, played
    // by individuals while the team was at Inverness).
    // Texas A&M: such a tournament takes its archive story first (the
    // Fighting Irish Classic, Oct 4-5); the feed drops it only when none is
    // found (see isTournamentWithoutStory).
    // A dual over two days (the Seminole Fall Classic at Florida State, Oct
    // 9-10) publishes its score on the last day's card: the other days are
    // that meet.
    const scoredMeets=new Set(events.filter(event=>event.swim_meet&&event.school_score!=null).map(event=>event.swim_meet));
    for(let i=events.length-1;i>=0;i--)if(scoredMeets.has(events[i].swim_meet)&&events[i].school_score==null)events.splice(i,1);
    events.forEach(event=>delete event.swim_meet);
    const merged=meet?mergeDays(events,today):events;
    // A page with cards but nothing current is a valid empty schedule, not a
    // failed source: the shared parsers must not read it again.
    if(!merged.length){if(!cardBlocks(raw).length)return null;emptied.add(merged);}
    return merged;
  }
  const emptied=new WeakSet();
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptied.has(events);

  // Golf: the team's place comes from the final story's headline when the
  // team is its subject ("Missouri Men's Golf Finishes 12th at Inverness
  // Intercollegiate"); a player's finish ("Rocio Tejedo Brings Home T15
  // Finish") is not the team's. The cards publish no place.
  const isVirginiaGolf=event=>event?.school_id==='virginia'&&event.sport==='Golf'&&event.status==='Final'&&Boolean(event.recap_url)&&event.headline==='Completed';
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  async function attachGolfPlace(event){
    if(!isVirginiaGolf(event))return event;
    const raw=await download(event.recap_url);if(!raw)return event;
    const title=decodeHtml((String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'');
    const place=virginiaGolfPlace(title);
    if(place){const value=/^T?\d+$/.test(place)?`${place.startsWith('T')?'T':''}${ordinal(place.replace(/^T/,''))}`:place;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;return event;}
    // Iowa's stories give the team's finish in the text when the headline
    // is a player's ("Gudgel Finishes 5th at Fighting Irish Classic": "As a
    // team, Iowa finished 14th in the tournament with an 888").
    const team=virginiaGolfStoryPlace(visibleText(String(raw).replace(/<script\b[\s\S]*?<\/script>/gi,' ')));
    if(team){event.headline=team.place;event.results=[{label:'Result',value:team.place},...(team.score?[{label:'Team score',value:team.score}]:[])];event.result_count=event.results.length;}
    return event;
  }

  // Each card's own Recap link is bound to its game, and its story may never
  // name the sport: it is checked for the opponent and date only. Any other
  // candidate must also name the opponent in its headline (Cincinnati's rule).
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='virginia')return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===HOST&&parsed.pathname.startsWith('/news/');
    // A multi-day event is checked against its last day, or against the
    // story's own day when that falls while it is played (Nebraska's women's
    // ITA All-American story, Sep 24, of Sep 19-27).
    const storyDay=(parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//)||[]).slice(1).map(Number);
    const during=event.end_time&&storyDay.length&&(day=>day>=Date.parse(String(event.start_time).slice(0,10))&&day<=Date.parse(String(event.end_time).slice(0,10)))(Date.UTC(storyDay[0],storyDay[1]-1,storyDay[2]));
    const identity=event.end_time?{...event,start_time:during?new Date(Date.UTC(storyDay[0],storyDay[1]-1,storyDay[2],12)).toISOString():event.end_time.replace(/T.*$/,'T12:00:00.000Z')}:event;
    // A tournament named for two sponsors ("OFCC/Fighting Illini
    // Invitational") is named by its last part in its story.
    // Iowa's cards name "Miami of Ohio" and "Loyola Chicago"; their stories
    // "Miami (OH)" and "Loyola": the card's own story may name the opponent by
    // its first word.
    const first=String(event.opponent||'').split(/\s+/)[0];
    // Its stories may use the opponent's short name ("Falls in Overtime to No.
    // 20 Cal", field hockey Oct 4; "Late Defeat to FGCU", men's soccer Aug 31).
    const short=SHORT_NAMES[event.opponent];
    if(own&&short&&recapMatchesEvent(raw,{...identity,sport:'',opponent:short},url))return true;
    if(own)return recapMatchesEvent(raw,{...identity,sport:''},url)||/\//.test(event.opponent||'')&&recapMatchesEvent(raw,{...identity,sport:'',opponent:String(event.opponent).split('/').pop().trim()},url)||/\s/.test(event.opponent||'')&&first.length>=4&&recapMatchesEvent(raw,{...identity,sport:'',opponent:first},url);
    if(!recapMatchesEvent(raw,event,url))return false;
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    const opponent=headlineKey(event.opponent).trim(),key=headlineKey(title);
    // The name must not run on into a longer school's: the Sep 1 "Missouri Falls
    // to Michigan State 3-0" story is not the Sep 2 Michigan match's.
    // Nor be part of an event's name: the Sep 19 "Volleyball Wins Final Match
    // in Bowling Green/Toledo Invitational" story is not the Sep 18 Toledo
    // match's (Missouri).
    const longer=new RegExp(` ${opponent.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} (?:state|st|tech|a&m|southern|christian|international|invitational|invite|tournament|classic|challenge) `);
    // A headline's score must be the game's: Iowa played Indiana on Sep 18
    // and Sep 20 (field hockey), and the Sep 19 "No. 2 Hawkeyes Fall to
    // Indiana 3-1" story is not the 2-1 game's.
    const scored=decodeHtml(title).match(/(?<![\d-])(\d{1,3})-(\d{1,3})(?![\d-])/);
    const [a,b]=[String(event.school_score??''),String(event.opponent_score??'')];
    if(scored&&/^\d+$/.test(a)&&/^\d+$/.test(b)&&!(scored[1]===a&&scored[2]===b||scored[1]===b&&scored[2]===a))return false;
    return opponent.length>=2&&key.includes(` ${opponent} `)&&!longer.test(key);
  }
  // A scored final whose card links no story (soccer at Arkansas, Oct 2)
  // takes the sport's archive story dated the game day or the day after
  // whose headline or summary names the opponent and the score (a tie: the
  // score or "draw"): "Soccer Earns First SEC Point in 1-1 Draw at Arkansas".
  // A past golf tournament whose card links no story takes the archive
  // story dated its last day or the two after whose headline names it.
  // Nebraska: a past tennis tournament too ("NU Dominates Husker
  // Invitational", Sep 27, is linked from no card); its story may come
  // while it is played (the women's ITA All-American Championships, Sep
  // 19-27, wrapped up for the team on Sep 24).
  const isTournamentWithoutStory=event=>event?.school_id==='virginia'&&(event.sport==='Golf'||event.sport==='Tennis')&&event.status==='Final'&&!event.recap_url&&(event.headline==='Completed'||!event.headline);
  const isFinalWithoutStory=event=>isTournamentWithoutStory(event)||event?.school_id==='virginia'&&event.status==='Final'&&!event.recap_url&&!/\(Exhibition\)$/.test(event.opponent||'')&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  async function attachArchiveStory(event){
    if(!isFinalWithoutStory(event))return event;
    const slug=(String(event.source?.url||'').match(/^https:\/\/virginiasports\.com\/sports\/([a-z-]+)\/schedule/)||[])[1];if(!slug)return event;
    // Vanderbilt lists a sport's stories at /sports/<slug>/news.
    const listing=await download(`https://${HOST}/sports/${slug}/news`);if(!listing)return event;
    const golf=isTournamentWithoutStory(event),tennis=golf&&event.sport==='Tennis';
    const first=Date.parse(`${String(golf&&!tennis&&event.end_time?event.end_time:event.start_time).slice(0,10)}T00:00:00Z`);
    const last=golf?Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`)+2*86400000:first+86400000;
    const day=path=>{const [y,m,d]=path.split('/').slice(2,5).map(Number);return Date.UTC(y,m-1,d);};
    const paths=[...new Set(String(listing).replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])]
      .filter(path=>day(path)>=first&&day(path)<=last);
    const [a,b]=[String(event.school_score),String(event.opponent_score)],opponent=headlineKey(event.opponent).trim();
    const score=new RegExp(`(?<![\\d-])(?:${a}-${b}|${b}-${a})(?![\\d-])`);
    for(const path of paths.slice(0,4)){
      const url=`https://${HOST}${path}`,raw=await download(url);if(!raw)continue;
      const meta=name=>decodeHtml((String(raw).match(new RegExp(`<meta\\b[^>]*property=["']og:${name}["'][^>]*content=["']([^"']*)`,'i'))||[])[1]||'');
      const text=`${meta('title')} ${meta('description')}`;
      if(golf){if(opponent.length>=4&&headlineKey(meta('title')).includes(` ${opponent} `)){event.recap_url=url;event.archive_story_verified=url;return event;}continue;}
      if(opponent.length>=2&&headlineKey(text).includes(` ${opponent} `)&&(score.test(text)||a===b&&/\b(?:draw|tie|tied|scoreless)\b/i.test(text))){event.recap_url=url;event.archive_story_verified=url;return event;}
      // Vanderbilt's headlines rarely name the game ("Relentless Run") and its
      // pages publish no description: the story's opening names the opponent
      // and the result ("a 3-1 loss to Missouri"; a volleyball sweep "sweeping
      // Lipscomb"). A preview ("SEC Startup") names no result.
      const title=meta('title'),story=String(raw).split(/class=["']article-head__title["']/i)[1]||'';
      const opening=visibleText(story.replace(/<script\b[\s\S]*?<\/script>/gi,' ')).slice(0,900);
      const swept=Math.max(Number(a),Number(b))===3&&Math.min(Number(a),Number(b))===0&&/\bsweep(?:s|ing)?\b|\bswept\b/i.test(opening);
      if(title&&opponent.length>=2&&headlineKey(opening).includes(` ${opponent} `)&&(score.test(opening)||swept)){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  // Each team's page is its own event: its own TFRRS team page (Arkansas's
  // rule).
  const tfrrs=Object.fromEntries(['Women','Men'].map(team=>[team,createTfrrsMeetResults({id:'virginia',schoolName:'Virginia',teams:{[team]:VIRGINIA_TFRRS_TEAMS[team]},decodeHtml,ordinal,fetch,headers})]));
  const tfrrsTeam=event=>/^Men/.test(event?.team_label||'')?'Men':'Women';
  return{parseSchedule,isEmptySchedule,matchesRecap,isVirginiaGolf,isTournamentWithoutStory,attachGolfPlace,isFinalWithoutStory,attachArchiveStory,
    isCrossCountry:event=>event?.school_id==='virginia'&&tfrrs.Women.matches(event),attachMeetResults:async event=>{
      const team=tfrrsTeam(event);await tfrrs[team].attach(event);
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

// "As a team, Iowa finished 14th in the tournament with an 888": the team's
// place and score, or null.
export function virginiaGolfStoryPlace(text){
  const m=String(text||'').replace(/’/g,"'").match(/\bAs a team,\s+(?:Virginia|the Cavaliers|the Hoos)\s+(finished|placed|tied for)\s+(T-?)?(\d+)(st|nd|rd|th)\b([^.]*)/i);
  if(!m)return null;
  const score=(m[5].match(/\bwith\s+an?\s+(\d{3,4})\b/i)||[])[1]||null;
  return{place:`${m[2]||/^tied/i.test(m[1])?'T':''}${m[3]}${m[4].toLowerCase()}`,score};
}

// "Missouri Men's Golf Finishes 12th at ...", "Men's Golf Finishes Seventh at the
// Bryan Bros Collegiate", "Missouri Women's Golf Wins ...": the team's place, or
// null when the headline's subject is a player.
export function virginiaGolfPlace(title){
  // Texas A&M: "Men's Golf Earns Runner-Up Finish at ...", "Schartz Leads
  // Aggies to Runner-Up Finish", "... Aggies Finish Second".
  const text=String(title||'').replace(/’/g,"'");
  if(/\b(?:Golf|Cavaliers|Hoos)\b[^,]{0,25}\bRunner-Up\b/i.test(text))return '2';
  // Virginia's: "Laha Medals, Leads Virginia to Win at Canadian Collegiate
  // Invitational".
  if(/\bLeads\s+(?:Virginia|Cavaliers|Hoos|UVA)\s+to\s+(?:Win|Victory|Team Title)\b/i.test(text))return '1';
  const aggies=text.match(/\b(?:Virginia|Cavaliers|Hoos)\s+(?:Finish|Finishes|Place|Places|Take|Takes)\s+(?:(T-?\d+|\d+)(?:st|nd|rd|th)\b|(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth)\b)/i);
  if(aggies)return aggies[1]?aggies[1].replace(/^T-?/i,'T'):String(['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'].indexOf(aggies[2].toLowerCase())+1);
  const m=text.match(/\bGolf\s+(?:Finishes|Places|Takes|Ties for)\s+(T-?\d+|\d+)(?:st|nd|rd|th)?\b|\bGolf\s+(?:Finishes|Places|Takes)\s+(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth)\b|\bGolf\s+(Wins)\b/i);
  if(!m)return null;
  if(m[1])return m[1].replace(/^T-?/i,'T');
  if(m[2])return String(['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'].indexOf(m[2].toLowerCase())+1);
  return '1';
}
