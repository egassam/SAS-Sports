import {createTfrrsMeetResults} from '../sidearm-school-kit.mjs';


// Penn State school module. Shared publisher utilities stay in the Worker;
// this file owns gopsusports.com routes, Penn State's program combinations, its
// verified Instagram tags and its schedule reader (WMT cards, Nebraska's
// reader: src/schools/nebraska.mjs; scripts/port-wmt.mjs).
export const pennStateSchool={
  id:'penn-state',
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set(['Baseball','Basketball','Cross Country','Fencing','Field Hockey','Football','Golf','Gymnastics','Hockey','Lacrosse','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball','Wrestling']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',team_label:"Women's",sourceName:"Live women's college volleyball scoreboard"},{path:'volleyball/mens-college-volleyball',team_label:"Men's",sourceName:"Live men's college volleyball scoreboard"}],
    'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Golf','Gymnastics','Hockey','Lacrosse','Soccer','Swimming & Diving','Tennis','Volleyball']),
  teamLabels:{'/sports/mens-basketball/schedule':"Men's",'/sports/womens-basketball/schedule':"Women's",'/sports/womens-golf/schedule':"Women's",'/sports/mens-golf/schedule':"Men's",'/sports/womens-gymnastics/schedule':"Women's",'/sports/mens-gymnastics/schedule':"Men's",'/sports/mens-ice-hockey/schedule':"Men's",'/sports/womens-ice-hockey/schedule':"Women's",'/sports/womens-lacrosse/schedule':"Women's",'/sports/mens-lacrosse/schedule':"Men's",'/sports/womens-soccer/schedule':"Women's",'/sports/mens-soccer/schedule':"Men's",'/sports/womens-swimming-and-diving/schedule':"Women's",'/sports/mens-swimming-and-diving/schedule':"Men's",'/sports/womens-tennis/schedule':"Women's",'/sports/mens-tennis/schedule':"Men's",'/sports/womens-volleyball/schedule':"Women's",'/sports/mens-volleyball/schedule':"Men's"},
  verifiedInstagrams:{
    'penn-state|Gymnastics|Alyssa Kramer':'https://www.instagram.com/lysskramer9/',
    'penn-state|Gymnastics|Kalea McElligott':'https://www.instagram.com/kaleamcelligott/',
    'penn-state|Gymnastics|Ashley Maul':'https://www.instagram.com/ashleymaul_/',
    'penn-state|Soccer|Lily Boyden':'https://www.instagram.com/lily.boyden/',
    'penn-state|Soccer|Anna Babcock':'https://www.instagram.com/anna.babcockk/',
    'penn-state|Soccer|Lily Selvy':'https://www.instagram.com/lily_thewa11/',
    'penn-state|Volleyball|Ava Falduto':'https://www.instagram.com/ava.falduto/',
    'penn-state|Volleyball|Jocelyn Nathan':'https://www.instagram.com/joce.nathan/',
    'penn-state|Volleyball|Caroline Jurevicius':'https://www.instagram.com/carolinejurevicius/'
  },
  scheduleUrls:{
    'penn-state|Baseball':'https://gopsusports.com/sports/baseball/schedule',
    'penn-state|Basketball':['https://gopsusports.com/sports/mens-basketball/schedule','https://gopsusports.com/sports/womens-basketball/schedule'],
    'penn-state|Cross Country':'https://gopsusports.com/sports/cross-country/schedule',
    'penn-state|Fencing':'https://gopsusports.com/sports/fencing/schedule',
    'penn-state|Field Hockey':'https://gopsusports.com/sports/field-hockey/schedule',
    'penn-state|Football':'https://gopsusports.com/sports/football/schedule',
    'penn-state|Golf':['https://gopsusports.com/sports/womens-golf/schedule','https://gopsusports.com/sports/mens-golf/schedule'],
    'penn-state|Gymnastics':['https://gopsusports.com/sports/womens-gymnastics/schedule','https://gopsusports.com/sports/mens-gymnastics/schedule'],
    'penn-state|Hockey':['https://gopsusports.com/sports/mens-ice-hockey/schedule','https://gopsusports.com/sports/womens-ice-hockey/schedule'],
    'penn-state|Lacrosse':['https://gopsusports.com/sports/womens-lacrosse/schedule','https://gopsusports.com/sports/mens-lacrosse/schedule'],
    'penn-state|Soccer':['https://gopsusports.com/sports/womens-soccer/schedule','https://gopsusports.com/sports/mens-soccer/schedule'],
    'penn-state|Softball':'https://gopsusports.com/sports/softball/schedule',
    'penn-state|Swimming & Diving':['https://gopsusports.com/sports/womens-swimming-and-diving/schedule','https://gopsusports.com/sports/mens-swimming-and-diving/schedule'],
    'penn-state|Tennis':['https://gopsusports.com/sports/womens-tennis/schedule','https://gopsusports.com/sports/mens-tennis/schedule'],
    'penn-state|Track & Field':'https://gopsusports.com/sports/track-field/schedule',
    'penn-state|Volleyball':['https://gopsusports.com/sports/womens-volleyball/schedule','https://gopsusports.com/sports/mens-volleyball/schedule'],
    'penn-state|Wrestling':'https://gopsusports.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'penn-state|Baseball':'https://gopsusports.com/sports/baseball/roster',
    'penn-state|Basketball':['https://gopsusports.com/sports/mens-basketball/roster','https://gopsusports.com/sports/womens-basketball/roster'],
    'penn-state|Cross Country':'https://gopsusports.com/sports/cross-country/roster',
    'penn-state|Fencing':'https://gopsusports.com/sports/fencing/roster',
    'penn-state|Field Hockey':'https://gopsusports.com/sports/field-hockey/roster',
    'penn-state|Football':'https://gopsusports.com/sports/football/roster',
    'penn-state|Golf':['https://gopsusports.com/sports/womens-golf/roster','https://gopsusports.com/sports/mens-golf/roster'],
    'penn-state|Gymnastics':['https://gopsusports.com/sports/womens-gymnastics/roster','https://gopsusports.com/sports/mens-gymnastics/roster'],
    'penn-state|Hockey':['https://gopsusports.com/sports/mens-ice-hockey/roster','https://gopsusports.com/sports/womens-ice-hockey/roster'],
    'penn-state|Lacrosse':['https://gopsusports.com/sports/womens-lacrosse/roster','https://gopsusports.com/sports/mens-lacrosse/roster'],
    'penn-state|Soccer':['https://gopsusports.com/sports/womens-soccer/roster','https://gopsusports.com/sports/mens-soccer/roster'],
    'penn-state|Softball':'https://gopsusports.com/sports/softball/roster',
    'penn-state|Swimming & Diving':['https://gopsusports.com/sports/womens-swimming-and-diving/roster','https://gopsusports.com/sports/mens-swimming-and-diving/roster'],
    'penn-state|Tennis':['https://gopsusports.com/sports/womens-tennis/roster','https://gopsusports.com/sports/mens-tennis/roster'],
    'penn-state|Track & Field':'https://gopsusports.com/sports/track-field/roster',
    'penn-state|Volleyball':['https://gopsusports.com/sports/womens-volleyball/roster','https://gopsusports.com/sports/mens-volleyball/roster'],
    'penn-state|Wrestling':'https://gopsusports.com/sports/wrestling/roster'
  }
};

const HOST='gopsusports.com';
// Penn State's TFRRS cross country team pages (complete races and team scores; the
// schedule cards publish no place).
export const PENN_STATE_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/PA_college_f_Penn_State.html',Men:'https://www.tfrrs.org/teams/xc/PA_college_m_Penn_State.html'};
// Iowa's: wrestling's "Soldier Salute", tennis's "ITA Regionals".
const EVENT_NAME=/\b(?:invit\w*|invite|opener|challenge|classic|championships?|open|relays|duals|collegiate|intercollegiate|tournament|festival|cup|futures|salute|regionals?)\b/i;
// A game sport's card named after an event (soccer's "Big Ten Tournament",
// women's basketball's "First & Second Rounds", "Women's Final Four") reads
// "Nebraska at ...", as K-State's tournaments do.
// Penn State's brackets: "Big Ten Quarterfinals", "Semifinal", "Women's
// College Cup", women's hockey's "Atlantic Hockey America" (its tournament).
const GAME_EVENT=/\b(?:tournament|championships?|final four|regionals?|rounds?|(?:quarter|semi)finals?|college cup|hockey america)\b/i;
// Not a competition: "NCAA Selection Show" (golf, basketball), swimming's
// "Holiday Training Trip".
const NO_CONFERENCE=new Set(['Rifle','Bowling','Beach Volleyball']);
const NOT_EVENT=/\bselection show\b|\btraining trip\b/i;
// Golf's card result: "5th of 13" (the place in the field) or "1st (842)"
// (the place and team score).
export function pennStateGolfCardPlace(text){
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
  // Penn State's: "8th out of 13".
  const fielded=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s+(?:out\s+)?of\s+(\d+)$/i);
  if(fielded){const place=`${fielded[1]?'T':''}${fielded[2]}${fielded[3].toLowerCase()} of ${fielded[4]}`;return{headline:place,results:[{label:'Result',value:place}]};}
  const scored=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s*\((\d{3,4})\)$/i);
  if(scored){const place=`${scored[1]?'T':''}${scored[2]}${scored[3].toLowerCase()}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:scored[4]}]};}
  return null;
}
const PRO_EVENT=/^(?:\d{4}\s+)?(?:ITF|ATP|WTA)\b|\bFutures\b|\b[MW]\d{2,3}\b|\bUTR\b|\bPTT\b/i;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Sports whose single-year page title names the fall ("Football 2026"); every
// other single-year title names the spring ("Baseball 2027", whose fall
// exhibitions are in October 2026).
// Penn State's field hockey page is "2026 Field Hockey"; its fall pages say
// so ("2026 Fall Softball", "2026 Women's Lacrosse Fall Schedule").
const FALL_SPORTS=new Set(['Football','Soccer','Volleyball','Cross Country','Field Hockey']);
// Internal events: intrasquads, scrimmages, "Purple & Gold", softball's
// "Purple/Gold World Series".
// Nebraska's: baseball's "Red-White Series: Game 1", softball's "Scarlet vs.
// Cream". Penn State's swimming "Blue & White Meet".
const INTERNAL=/\bintrasquad\b|\bscrimmage\b|^purple\s*(?:&|and|-|\/|vs\.?)\s*(?:gold|white)\b|^red\s*(?:&|and|-|\/|vs\.?)\s*white\b|^scarlet\s*(?:&|and|-|\/|vs\.?)\s*cream\b|^blue\s*(?:&|and|-|\/|vs\.?)\s*white\b/i;
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
// Penn State's (a newer generation) are schedule-event ("schedule-event item").
const cardBlocks=raw=>divBlocks(raw,/<div\b[^>]*class=["']schedule-(?:event-item|item-block|event)(?=[\s"'])[^"']*["'][^>]*>/gi);

// The page title names the season: "Football 2026", "Men's Basketball
// 2026-27", "Baseball 2027". A card shows the day only ("Sep 5"); its year
// follows from the season.
export function pennStateSeasonYear(raw,sport){
  const title=(String(raw).match(/<title>([^<]*)/i)||[])[1]||'';
  const range=title.match(/\b(20\d\d)-(\d\d)\b/);
  if(range)return month=>month>=7?Number(range[1]):2000+Number(range[2]);
  const single=title.match(/\b(20\d\d)\b/);if(!single)return null;
  const year=Number(single[1]);
  // Men's volleyball plays in the spring ("2026 Men's Volleyball Schedule"
  // is January to May 2026).
  const fall=FALL_SPORTS.has(sport)&&!/\bMen(?:'|&#x27;|&#39;)s Volleyball\b/i.test(title)||/\bFall\b/i.test(title);
  return fall?month=>month>=7?year:year+1:month=>month>=7?year-1:year;
}

// 12thman.com renders each event as a schedule-event-item card: the day
// ("Sep 5"; a tournament adds its last day) in the date box, a "vs."/"at"
// divider, the opponent, and one result slot holding the result ("W Win
// 51-10"), the published time ("6:00 PM CT", "TBA") or nothing (a meet).
// Cards sit under titled tournament wrappers ("Exhibition"). Golf and
// swimming invitationals publish one card per day ("Inverness Intercollegiate
// (Day 2)"); cross country one per team ("Paul Short Run (W)").
export function createPennStateHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
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
      const dated=parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(parsed.protocol!=='https:'||parsed.hostname!==HOST||!dated)continue;
      const day=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3]));
      if(day<firstDay||day>lastDay+3*86400000)continue;
      if(!/^(?:Day|Round)\s+\d/i.test(link.label))return url;
      if(!latest||day>=latest.day)latest={url,day};
    }
    return latest?.url||null;
  }
  // "Inverness Intercollegiate (Day 2)", "SEC Championships (Stroke Play,
  // Day 1)", "SEC Championships (Match Play, if nec.)": the tournament's name
  // and whether the card is one of its days.
  // Vanderbilt's: "Visit Knoxville Collegiate • Rounds 1 & 2", "SEC
  // Championships • Match Play • Semifinals".
  // Penn State's: "2027 NCAA National Fencing Championships - Day 1".
  const roundOf=name=>{const m=name.match(/^(.*?)\s*\(((?:Stroke|Match) Play[^)]*|Day \d+[^)]*)\)$/i)||name.match(/^(.*?)\s+•\s+(?:Rounds?\b|Match Play\b|Day\b)/i)||name.match(/^(.*?)\s+-\s+Day\s+\d+$/i);return m?m[1].trim():null;};
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
    if(school?.id!=='penn-state'||!pennStateSchool.cardSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(page.pathname))return null;
    raw=String(raw||'');
    const yearOf=pennStateSeasonYear(raw,sport);if(!yearOf)return null;
    const local=centralDay(now.getTime()),today=Date.parse(`${local}T00:00:00Z`);
    const season=Number(local.slice(5,7))>=7?Number(local.slice(0,4)):Number(local.slice(0,4))-1;
    // A page still titled last season ("Women's Track and Field 2025-26",
    // lacrosse) shows its summer meets: it is empty until the new season is
    // published.
    const titled=((raw.match(/<title>([^<]*)/i)||[])[1]||'').match(/\b(20\d\d)-\d\d\b/);
    if(titled&&Number(titled[1])<season){const none=[];emptied.add(none);return none;}
    const wrappers=headings(raw),meet=eventType(sport)!=='GAME',events=[];
    // Penn State's fencing championships name their host on the card ("Duke
    // University", "Durham, N.C."); the page's event list names the event
    // ("Penn State at 2027 NCAA National Fencing Championships - Day 1").
    const listed=new Map([...raw.matchAll(/"@type":"Event","description":"[^"]*","eventAttendanceMode":"[^"]*","eventStatus":"[^"]*","name":"((?:[^"\\]|\\.)*)","startDate":"(20\d\d-\d\d-\d\d)/g)].map(([,name,day])=>[day,decodeHtml(name.replace(/\\"/g,'"')).replace(/^Penn State\s+(?:at|vs\.?)\s+/i,'').replace(/^20\d\d\s+/,'')]));
    const team=pennStateSchool.teamLabels[page.pathname.replace(/\/$/,'')]?.startsWith('W')?'womens':pennStateSchool.teamLabels[page.pathname.replace(/\/$/,'')]?'mens':null;
    for(const {block,index} of cardBlocks(raw)){
      const heading=wrappers.find(w=>w.start<index&&index<w.end)?.title||'';
      // Texas A&M's date box is the card's top row (schedule-event-item__top),
      // before its content.
      // Vanderbilt's is schedule-item-block__date, before __teams.
      // Nebraska's is schedule-event-date, before __teams.
      // Penn State's is schedule-event-date, before schedule-event__teams.
      const dateBox=(block.match(/schedule-(?:event-item__(?:date-box|top|date)|item-block__(?:date-box|top|date)|event-date(?=["'\s]))[\s\S]*?(?=<div\b[^>]*class=["']schedule-(?:event-item|item-block|event)__(?:teams|content))/i)||[])[0]||'';
      // Missouri's day ("Sep 3") sits in schedule-event-date__day (LSU's in
      // __month-day).
      // Auburn's day boxes carry the full date (datetime="2026-09-05T14:30:00.000-05:00").
      // Nebraska's in schedule-event-date__label (a tournament has two).
      // Penn State's in a span (schedule-event-date__day; a tournament has two).
      const days=[...dateBox.matchAll(/<(time|span)\b([^>]*)\bclass=["']schedule-event-date__(?:(?:month-)?day|label)["'][^>]*>([\s\S]*?)<\/\1>/gi)].map(([,,attributes,inner])=>[attributes,inner]).map(m=>{const day=visibleText(m[1]).match(/^([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/);if(!day)return null;day.year=(m[0].match(/datetime=["'](20\d\d)-/)||[])[1];return day;}).filter(Boolean);
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
      const divider=field(block,/schedule-(?:default-event|event-default|event-item(?:-default|-team)?|item-team)__divider["'][^>]*>([\s\S]*?)<\/strong>/i)||(venue==='away'?'at':venue?'vs':'');
      const nameBox=(block.match(/class=["']schedule-default-event__name["'][^>]*>([\s\S]*?)<\/span>\s*<\/span>/i)||block.match(/class=["']schedule-event-default__name["'][^>]*>([\s\S]*?)<\/strong>/i)||block.match(/class=["']schedule-event-item(?:-default)?__opponent-name["'][^>]*>([\s\S]*?)<\/strong>/i)||block.match(/class=["']schedule-event-item-team__name["'][^>]*>([\s\S]*?)<\/strong>/i)
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
      let name=visibleText(nameBox.replace(/<(strong|a)\b[^>]*schedule-item-team__promo[\s\S]*?<\/\1>/gi,'').replace(/<span\b[^>]*(?:schedule-item-team__(?:ranking|label)|schedule-event-exhibition)[\s\S]*?<\/span>/gi,'').replace(/<strong\b[^>]*schedule-default-event__divider-mobile[\s\S]*?<\/strong>/i,'').replace(/<strong\b[^>]*schedule-item-team__divider[\s\S]*?<\/strong>/i,''));
      // Rankings ("#8 Ole Miss") describe the week, not the opponent.
      // Missouri's give two polls: "#24/#RV Mississippi State".
      // Texas A&M writes them in parentheses: "(#21) Baylor".
      name=name.replace(/^(?:#(?:\d+|RV)(?:\/#?(?:\d+|RV))*\s+)+/i,'').replace(/^\(#?(?:\d+|RV)\)\s*/i,'').trim();
      // A home double dual names its opponents in the promotion ("Double Dual"
      // with "vs. Purdue/UCLA", or "Diving Only vs. Illinois/Nebraska").
      const dual=/^(?:double|tri)\s+dual$/i.test(name)&&promo.match(/^(.*?)\s*\bvs\.?\s+(.+)$/i);
      if(dual)name=`${dual[2].trim()}${dual[1].trim()?` (${dual[1].trim()})`:''}`;
      if(meet&&/^University of\b|\bUniversity$|,\s+[A-Z][a-z]?\.\s?[A-Z]\.$/.test(name)){const event=listed.get(`${start.year}-${String(start.month).padStart(2,'0')}-${String(start.day).padStart(2,'0')}`);if(event)name=event;}
      if(!name||INTERNAL.test(name)||NOT_EVENT.test(name))continue;
      // A golf tournament played by individuals only ("Cullan Brown Collegiate
      // (Individuals)") has no team result.
      if(sport==='Golf'&&/\(Individuals?\)$/i.test(name))continue;
      // The tennis pages list players' pro events ("M15 Columbia Futures",
      // "ITF 15K Futures", "UTR PTT Norfolk"): not team events (Texas's rule).
      if(sport==='Tennis'&&PRO_EVENT.test(name))continue;
      // A tournament's day cards are named by the day only ("Day One" under
      // the "Husker Invitational" heading): the heading names the event.
      // Penn State's wrestling championships are one card per session
      // ("Session I", "Sessions III & IV" under "Big Ten Championships"): one
      // event over its days.
      const session=Boolean(heading)&&/^Sessions?\s+[IVX]+\b/i.test(name);
      if(session)name=heading;
      if(meet&&heading&&/^Day\s+(?:One|Two|Three|Four|Five|Six|\d+)$/i.test(name)){const day=name.replace(/^Day\s+/i,'');name=`${heading} (Day ${/^\d+$/.test(day)?day:['one','two','three','four','five','six'].indexOf(day.toLowerCase())+1})`;}
      // Penn State's upcoming time is a strong of its own ("5:00 PM EDT").
      const slot=visibleText((block.match(/<(div|strong)\b[^>]*schedule-event-item-result__label[^>]*>([\s\S]*?)<\/\1>/i)||[])[2]||'');
      // A meet's result is a line of text: golf's place ("5th of 13", "1st
      // (842)"), cross country's ("M: 2nd, W: 2nd"; TFRRS gives the full
      // places), tennis "NTS" (no team score).
      const placeText=field(block,/schedule-event-item-result__text[^>]*>([\s\S]*?)<\/div>/i);
      // A cancelled event ("Canceled (Weather)") is not listed.
      if(/^(?:cancel+ed|postponed)\b/i.test(slot))continue;
      // "W Win 3-1"; Texas A&M's "W, Win 3-1".
      const result=slot.match(/^([WLT]),?\s+(?:Win|Loss|Tie)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/i);
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
      const relation=eventType(sport)==='MEET'&&!(sport==='Rifle'&&!EVENT_NAME.test(opponent))||!divider||/^at\b/i.test(divider)||meet&&(round||xc||EVENT_NAME.test(opponent)||lastDay>firstDay&&!result)||!meet&&GAME_EVENT.test(opponent)?'at':'vs';
      const event=makeEvent({school,sport,status:result||over?'Final':'Upcoming',relation,opponent,date:`${MONTHS[start.month-1]} ${start.day}, ${start.year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||over?null:clock||null,
        schoolScore:result?String(Number(result[2])):null,oppScore:result?String(Number(result[3])):null,resultText:result?`${result[1].toUpperCase()}, ${Number(result[2])}-${Number(result[3])}`:null,sourceUrl,now});
      if(lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      // One card for a tournament under way (tennis's ITA Regional, Oct 7-11):
      // today's event.
      if(!result&&!over&&lastDay>firstDay&&firstDay<=today){event.status='Today';event.priority_bucket='today';event.recency_label='In progress';event.id=event.id.replace(/-(?:final|upcoming|today)$/,'-today');}
      if(over){event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;}
      const placed=over&&sport==='Golf'?pennStateGolfCardPlace(placeText):null;
      if(placed){event.headline=placed.headline;event.results=placed.results;event.result_count=placed.results.length;}
      const recapUrl=result||over?cardRecap(block,sourceUrl,firstDay,lastDay):null;
      if(recapUrl)event.recap_url=recapUrl;
      if(round){event.round_of=round;}
      else if(session&&!result){event.round_of=`${name}|session`;}
      // Auburn's golf cards are one per day, named alike ("Inverness
      // Intercollegiate", then "Inverness Collegiate" on the last day) at one
      // course: the days at one course are one tournament.
      else if(sport==='Golf'&&!result){const course=field(block,/schedule-event-item__location[^>]*>([\s\S]*?)<\/div>/i)||opponent;event.round_of=`${course}|golf`;event.merged_name=opponent;event.card_name=opponent;}
      // A swimming meet over several days publishes a card per day (SEC
      // Championships, Feb 16-20).
      // Nebraska's wrestling: "Cliff Keen Las Vegas Invitational" (Dec 4 and 5).
      if((sport==='Swimming & Diving'||sport==='Wrestling')&&!result&&EVENT_NAME.test(opponent))event.round_of=`${opponent}|swim`;
      if(xc){event.round_of=`${xc.name}|xc`;event.merged_name=xc.name;event.card_name=opponent;event.xc_team=xc.team;}
      if(team)event.id=`${event.id}-${team}`;
      // The Big Ten sponsors no rifle, bowling or beach volleyball: no game
      // in them is a conference game (Ohio State is a rifle opponent, not a
      // Big Ten one).
      if(NO_CONFERENCE.has(sport))event.conference_game=false;
      // Penn State's card shows its league's logo on a conference game
      // (schedule-event__conference; "--empty" otherwise): the Big Ten's, or
      // Atlantic Hockey America's for women's hockey (Robert Morris, Oct 2-3;
      // Ohio State, Sep 24-25, is not one). A bracket game is not in the
      // record.
      const league=block.match(/<div\b[^>]*class=["']([^"']*\bschedule-event__conference\b[^"']*)["'][^>]*>([\s\S]{0,400}?)<\/div>/i);
      if(league&&!NO_CONFERENCE.has(sport)){
        const logo=(league[2].match(/\balt=["']([^"']*)["']/i)||[])[1]||'';
        event.conference_game=!/--empty\b/.test(league[1])&&!/\(Exhibition\)$/.test(opponent)&&!GAME_EVENT.test(opponent);
        if(event.conference_game&&/\bAHA\b|_AHA_/i.test(logo))event.conference_name='Atlantic Hockey America';
        else if(event.conference_game&&/EIVA/i.test(logo))event.conference_name='EIVA';
      }
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
    // Big Ten field hockey plays an opponent twice in a weekend; only the
    // first game is a conference game (Indiana's page data: Sep 18 at Iowa
    // conference, Sep 20 not; Iowa's page publishes Conf. 3-1).
    if(sport==='Field Hockey')events.forEach((event,i)=>{const before=events[i-1];if(before&&before.opponent===event.opponent&&Date.parse(event.start_time)-Date.parse(before.start_time)<=3*86400000)event.conference_game=false;});
    const merged=meet||events.some(event=>event.round_of)?mergeDays(events,today):events;
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
  const isPennStateGolf=event=>event?.school_id==='penn-state'&&event.sport==='Golf'&&event.status==='Final'&&Boolean(event.recap_url)&&event.headline==='Completed';
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  async function attachGolfPlace(event){
    if(!isPennStateGolf(event))return event;
    const raw=await download(event.recap_url);if(!raw)return event;
    const title=decodeHtml((String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'');
    const place=pennStateGolfPlace(title);
    if(place){const value=/^T?\d+$/.test(place)?`${place.startsWith('T')?'T':''}${ordinal(place.replace(/^T/,''))}`:place;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;return event;}
    // Iowa's stories give the team's finish in the text when the headline
    // is a player's ("Gudgel Finishes 5th at Fighting Irish Classic": "As a
    // team, Iowa finished 14th in the tournament with an 888").
    const team=pennStateGolfStoryPlace(visibleText(String(raw).replace(/<script\b[\s\S]*?<\/script>/gi,' ')));
    if(team){event.headline=team.place;event.results=[{label:'Result',value:team.place},...(team.score?[{label:'Team score',value:team.score}]:[])];event.result_count=event.results.length;}
    return event;
  }

  // Each card's own Recap link is bound to its game, and its story may never
  // name the sport: it is checked for the opponent and date only. Any other
  // candidate must also name the opponent in its headline (Cincinnati's rule).
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='penn-state')return false;
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
    // A multi-day tournament's own story is dated while it is played or just
    // after (cardRecap) and may shorten its name ("ITA All-Americans" for the
    // ITA All-American Championships, Sep 19-27): its card binds it.
    if(own&&event.end_time&&(during||storyDay.length&&Date.UTC(storyDay[0],storyDay[1]-1,storyDay[2])<=Date.parse(String(event.end_time).slice(0,10))+3*86400000))return true;
    if(own)return recapMatchesEvent(raw,{...identity,sport:''},url)||/\//.test(event.opponent||'')&&recapMatchesEvent(raw,{...identity,sport:'',opponent:String(event.opponent).split('/').pop().trim()},url)||/\s/.test(event.opponent||'')&&first.length>=4&&recapMatchesEvent(raw,{...identity,sport:'',opponent:first},url);
    if(!recapMatchesEvent(raw,event,url))return false;
    // A series against one team (women's hockey and Ohio State, Sep 24 and
    // 25, both 2-1): a story whose opening names another weekday ("opened the
    // season ... Thursday evening") is that day's game's.
    const opening=visibleText(String(String(raw).split(/class=["']article-head__title["']/i)[1]||'').replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi,' ')).slice(0,600);
    const named=(opening.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/)||[])[1];
    const played=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long'}).format(new Date(event.start_time));
    if(named&&!Number.isNaN(Date.parse(event.start_time))&&named!==played)return false;
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
  const isTournamentWithoutStory=event=>event?.school_id==='penn-state'&&(event.sport==='Golf'||event.sport==='Tennis')&&event.status==='Final'&&!event.recap_url&&(event.headline==='Completed'||!event.headline);
  const isFinalWithoutStory=event=>isTournamentWithoutStory(event)||event?.school_id==='penn-state'&&event.status==='Final'&&!event.recap_url&&!/\(Exhibition\)$/.test(event.opponent||'')&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  async function attachArchiveStory(event){
    if(!isFinalWithoutStory(event))return event;
    const slug=(String(event.source?.url||'').match(/^https:\/\/gopsusports\.com\/sports\/([a-z-]+)\/schedule/)||[])[1];if(!slug)return event;
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
  // Penn State publishes one card for both teams: it reads both team pages
  // (the men ran the Paul Short Run alone, Oct 2).
  const tfrrs=Object.fromEntries([['Women',{Women:PENN_STATE_TFRRS_TEAMS.Women}],['Men',{Men:PENN_STATE_TFRRS_TEAMS.Men}],['Both',PENN_STATE_TFRRS_TEAMS]].map(([team,teams])=>[team,createTfrrsMeetResults({id:'penn-state',schoolName:'Penn State',teams,decodeHtml,ordinal,fetch,headers})]));
  const tfrrsTeam=event=>!event?.team_label?'Both':/^Men/.test(event.team_label)?'Men':'Women';
  return{parseSchedule,isEmptySchedule,matchesRecap,isPennStateGolf,isTournamentWithoutStory,attachGolfPlace,isFinalWithoutStory,attachArchiveStory,
    isCrossCountry:event=>event?.school_id==='penn-state'&&tfrrs.Women.matches(event),attachMeetResults:async event=>{
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
export function pennStateGolfStoryPlace(text){
  const m=String(text||'').replace(/’/g,"'").match(/\bAs a team,\s+(?:Penn State|the Nittany Lions)\s+(finished|placed|tied for)\s+(T-?)?(\d+)(st|nd|rd|th)\b([^.]*)/i);
  if(!m)return null;
  const score=(m[5].match(/\bwith\s+an?\s+(\d{3,4})\b/i)||[])[1]||null;
  return{place:`${m[2]||/^tied/i.test(m[1])?'T':''}${m[3]}${m[4].toLowerCase()}`,score};
}

// "Missouri Men's Golf Finishes 12th at ...", "Men's Golf Finishes Seventh at the
// Bryan Bros Collegiate", "Missouri Women's Golf Wins ...": the team's place, or
// null when the headline's subject is a player.
export function pennStateGolfPlace(title){
  // Texas A&M: "Men's Golf Earns Runner-Up Finish at ...", "Schartz Leads
  // Aggies to Runner-Up Finish", "... Aggies Finish Second".
  const text=String(title||'').replace(/’/g,"'");
  if(/\b(?:Golf|Nittany Lions)\b[^,]{0,25}\bRunner-Up\b/i.test(text))return '2';
  const aggies=text.match(/\b(?:Penn State|Nittany Lions)\s+(?:Finish|Finishes|Place|Places|Take|Takes)\s+(?:(T-?\d+|\d+)(?:st|nd|rd|th)\b|(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth)\b)/i);
  if(aggies)return aggies[1]?aggies[1].replace(/^T-?/i,'T'):String(['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'].indexOf(aggies[2].toLowerCase())+1);
  const m=text.match(/\bGolf\s+(?:Finishes|Places|Takes|Ties for)\s+(T-?\d+|\d+)(?:st|nd|rd|th)?\b|\bGolf\s+(?:Finishes|Places|Takes)\s+(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth)\b|\bGolf\s+(Wins)\b/i);
  if(!m)return null;
  if(m[1])return m[1].replace(/^T-?/i,'T');
  if(m[2])return String(['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'].indexOf(m[2].toLowerCase())+1);
  return '1';
}
