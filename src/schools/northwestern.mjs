import {createTfrrsMeetResults} from '../sidearm-school-kit.mjs';

// Northwestern school module. Shared publisher utilities stay in the Worker;
// this file owns nusports.com routes, Northwestern's program combinations, its
// verified Instagram tags and its schedule reader (WMT cards, Auburn's
// reader: src/schools/auburn.mjs; scripts/port-wmt.mjs).
export const northwesternSchool={
  id:'northwestern',
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set(['Baseball','Basketball','Cross Country','Fencing','Field Hockey','Football','Golf','Lacrosse','Soccer','Softball','Swimming & Diving','Tennis','Volleyball','Wrestling']),
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
  combinedSports:new Set(['Basketball','Golf','Soccer','Swimming & Diving','Tennis']),
  teamLabels:{'/sports/mens-basketball/schedule':"Men's",'/sports/womens-basketball/schedule':"Women's",'/sports/womens-golf/schedule':"Women's",'/sports/mens-golf/schedule':"Men's",'/sports/womens-soccer/schedule':"Women's",'/sports/mens-soccer/schedule':"Men's",'/sports/womens-swimming-and-diving/schedule':"Women's",'/sports/mens-swimming-and-diving/schedule':"Men's",'/sports/womens-tennis/schedule':"Women's",'/sports/mens-tennis/schedule':"Men's"},
  // Athlete Instagram from the official profile pages (scripts/athlete-evidence.mjs,
  // Oct 9): pinned where the app's 24-profile read could miss them.
  verifiedInstagrams:{
    'northwestern|Golf|Ashley Yun':'https://www.instagram.com/ashl3yun/',
    'northwestern|Golf|Hsin Tai Lin':'https://www.instagram.com/hsin_tai_lin_/',
    'northwestern|Golf|Megan Meng':'https://www.instagram.com/meganmeng.26/',
    'northwestern|Softball|Kaylie Avvisato':'https://www.instagram.com/kaylieavvisato/',
    'northwestern|Softball|Kylee Jensen':'https://www.instagram.com/kyleejensen_/',
    'northwestern|Softball|Tru Medina':'https://www.instagram.com/tmedina34/',
    'northwestern|Tennis|Ethan Schiffman':'https://www.instagram.com/ethan_schiffman/',
    'northwestern|Volleyball|Hayley Schaaf':'https://www.instagram.com/schaafhayley/',
    'northwestern|Volleyball|Kayla Kauffman':'https://www.instagram.com/kaylakauffman_/',
    'northwestern|Volleyball|Lauren Dignan':'https://www.instagram.com/lauren.dignan/'
  },
  scheduleUrls:{
    'northwestern|Baseball':'https://nusports.com/sports/baseball/schedule',
    'northwestern|Basketball':['https://nusports.com/sports/mens-basketball/schedule','https://nusports.com/sports/womens-basketball/schedule'],
    'northwestern|Cross Country':'https://nusports.com/sports/womens-cross-country/schedule',
    'northwestern|Fencing':'https://nusports.com/sports/womens-fencing/schedule',
    'northwestern|Field Hockey':'https://nusports.com/sports/field-hockey/schedule',
    'northwestern|Football':'https://nusports.com/sports/football/schedule',
    'northwestern|Golf':['https://nusports.com/sports/womens-golf/schedule','https://nusports.com/sports/mens-golf/schedule'],
    'northwestern|Lacrosse':'https://nusports.com/sports/womens-lacrosse/schedule',
    'northwestern|Soccer':['https://nusports.com/sports/womens-soccer/schedule','https://nusports.com/sports/mens-soccer/schedule'],
    'northwestern|Softball':'https://nusports.com/sports/softball/schedule',
    'northwestern|Swimming & Diving':['https://nusports.com/sports/womens-swimming-and-diving/schedule','https://nusports.com/sports/mens-swimming-and-diving/schedule'],
    'northwestern|Tennis':['https://nusports.com/sports/womens-tennis/schedule','https://nusports.com/sports/mens-tennis/schedule'],
    'northwestern|Volleyball':'https://nusports.com/sports/womens-volleyball/schedule',
    'northwestern|Wrestling':'https://nusports.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'northwestern|Baseball':'https://nusports.com/sports/baseball/roster',
    'northwestern|Basketball':['https://nusports.com/sports/mens-basketball/roster','https://nusports.com/sports/womens-basketball/roster'],
    'northwestern|Cross Country':'https://nusports.com/sports/womens-cross-country/roster',
    'northwestern|Fencing':'https://nusports.com/sports/womens-fencing/roster',
    'northwestern|Field Hockey':'https://nusports.com/sports/field-hockey/roster',
    'northwestern|Football':'https://nusports.com/sports/football/roster',
    'northwestern|Golf':['https://nusports.com/sports/womens-golf/roster','https://nusports.com/sports/mens-golf/roster'],
    'northwestern|Lacrosse':'https://nusports.com/sports/womens-lacrosse/roster',
    'northwestern|Soccer':['https://nusports.com/sports/womens-soccer/roster','https://nusports.com/sports/mens-soccer/roster'],
    'northwestern|Softball':'https://nusports.com/sports/softball/roster',
    'northwestern|Swimming & Diving':['https://nusports.com/sports/womens-swimming-and-diving/roster','https://nusports.com/sports/mens-swimming-and-diving/roster'],
    'northwestern|Tennis':['https://nusports.com/sports/womens-tennis/roster','https://nusports.com/sports/mens-tennis/roster'],
    'northwestern|Volleyball':'https://nusports.com/sports/womens-volleyball/roster',
    'northwestern|Wrestling':'https://nusports.com/sports/wrestling/roster'
  }
};

const HOST='nusports.com';
// Northwestern's TFRRS cross country team pages (complete races and team scores; the
// schedule cards publish no place).
export const NORTHWESTERN_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/IL_college_f_Northwestern_IL.html',Men:'https://www.tfrrs.org/teams/xc/IL_college_m_Northwestern_IL.html'};
// Northwestern's tennis: "vs. ITA Central Sectional", "vs. ITA Conference Masters".
const EVENT_NAME=/\b(?:invit\w*|invite|opener|challenge|classic|championships?|open|relays|duals|collegiate|intercollegiate|tournament|festival|cup|futures|sectionals?|masters)\b/i;
// Golf's card result: "5th of 13" (the place in the field) or "1st (842)"
// (the place and team score).
export function northwesternGolfCardPlace(text){
  const value=String(text||'').trim();
  // Auburn's: "1/18", "T3/18", "4th/12" (the place and the field).
  const slashed=value.match(/^(T-?)?(\d+)(?:st|nd|rd|th)?\/(\d+)$/i);
  if(slashed){const n=Number(slashed[2]),suffix=n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';const place=`${slashed[1]?'T':''}${n}${suffix} of ${slashed[3]}`;return{headline:place,results:[{label:'Result',value:place}]};}
  const fielded=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s+of\s+(\d+)$/i);
  if(fielded){const place=`${fielded[1]?'T':''}${fielded[2]}${fielded[3].toLowerCase()} of ${fielded[4]}`;return{headline:place,results:[{label:'Result',value:place}]};}
  const scored=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s*\((\d{3,4})\)$/i);
  if(scored){const place=`${scored[1]?'T':''}${scored[2]}${scored[3].toLowerCase()}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:scored[4]}]};}
  return null;
}
const PRO_EVENT=/^(?:\d{4}\s+)?ITF\b|\bFutures\b|\b[MW]\d{2,3}\b|\bUTR\b|\bPTT\b/i;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Sports whose single-year page title names the fall ("Football 2026"); every
// other single-year title names the spring ("Baseball 2027", whose fall
// exhibitions are in October 2026).
const FALL_SPORTS=new Set(['Football','Soccer','Volleyball','Cross Country']);
// Internal events: intrasquads, scrimmages, "Purple & Gold", softball's
// "Purple/Gold World Series".
const INTERNAL=/\bintrasquad\b|\bscrimmage\b|^purple\s*(?:&|and|-|\/|vs\.?)\s*(?:gold|white)\b/i;
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
const cardBlocks=raw=>divBlocks(raw,/<div\b[^>]*class=["']schedule-event-item(?=[\s"'])[^"']*["'][^>]*>/gi);

// The page title names the season: "Football 2026", "Men's Basketball
// 2026-27", "Baseball 2027". A card shows the day only ("Sep 5"); its year
// follows from the season.
export function northwesternSeasonYear(raw,sport){
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
export function createNorthwesternHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
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
    const links=[...block.matchAll(/<a\b[^>]*>/gi)].map(([tag])=>({tag,href:attribute(tag,'href'),cls:attribute(tag,'class')}))
      .filter(link=>link.href&&/(?:^|\s)schedule-event(?:-item)?-links__link(?:\s|$)/.test(link.cls))
      // "Final Recap - Missouri vs. ...", or a recap-class link whose label is
      // the story's headline ("Tennis Concludes ... - Recap").
      .map(link=>({...link,label:/--(?:recap|postgame)\b/.test(link.cls)?'Recap':decodeHtml(attribute(link.tag,'aria-label')).split(' - ')[0].trim()}))
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
  const roundOf=name=>{const m=name.match(/^(.*?)\s*\(((?:Stroke|Match) Play[^)]*|Day \d+[^)]*)\)$/i);return m?m[1].trim():null;};
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
    if(school?.id!=='northwestern'||!northwesternSchool.cardSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(page.pathname))return null;
    raw=String(raw||'');
    const yearOf=northwesternSeasonYear(raw,sport);if(!yearOf)return null;
    const local=centralDay(now.getTime()),today=Date.parse(`${local}T00:00:00Z`);
    const season=Number(local.slice(5,7))>=7?Number(local.slice(0,4)):Number(local.slice(0,4))-1;
    const wrappers=headings(raw),meet=eventType(sport)!=='GAME',events=[];
    const team=northwesternSchool.teamLabels[page.pathname.replace(/\/$/,'')]?.startsWith('W')?'womens':northwesternSchool.teamLabels[page.pathname.replace(/\/$/,'')]?'mens':null;
    for(const {block,index} of cardBlocks(raw)){
      const heading=wrappers.find(w=>w.start<index&&index<w.end)?.title||'';
      // Texas A&M's date box is the card's top row (schedule-event-item__top),
      // before its content.
      const dateBox=(block.match(/schedule-event-item__(?:date-box|top)[\s\S]*?(?=<div\b[^>]*class=["']schedule-event-item__(?:teams|content))/i)||[])[0]||'';
      // Missouri's day ("Sep 3") sits in schedule-event-date__day (LSU's in
      // __month-day).
      // Auburn's day boxes carry the full date (datetime="2026-09-05T14:30:00.000-05:00").
      const days=[...dateBox.matchAll(/<time\b([^>]*)\bclass=["']schedule-event-date__(?:month-)?day["'][^>]*>([\s\S]*?)<\/time>/gi)].map(m=>{const day=visibleText(m[2]).match(/^([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/);if(!day)return null;day.year=(m[1].match(/datetime=["'](20\d\d)-/)||[])[1];return day;}).filter(Boolean);
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
      const divider=field(block,/schedule-(?:default-event|event-default|event-item)__divider["'][^>]*>([\s\S]*?)<\/strong>/i)||(venue==='away'?'at':venue?'vs':'');
      const nameBox=(block.match(/class=["']schedule-default-event__name["'][^>]*>([\s\S]*?)<\/span>\s*<\/span>/i)||block.match(/class=["']schedule-event-default__name["'][^>]*>([\s\S]*?)<\/strong>/i)||block.match(/class=["']schedule-event-item__opponent-name["'][^>]*>([\s\S]*?)<\/strong>/i)||[])[1]||'';
      // The name box repeats the divider for phones; the opponent is the rest.
      let name=visibleText(nameBox.replace(/<strong\b[^>]*schedule-default-event__divider-mobile[\s\S]*?<\/strong>/i,''));
      // Rankings ("#8 Ole Miss") describe the week, not the opponent.
      // Missouri's give two polls: "#24/#RV Mississippi State".
      // Texas A&M writes them in parentheses: "(#21) Baylor".
      name=name.replace(/^(?:#(?:\d+|RV)(?:\/#?(?:\d+|RV))*\s+)+/i,'').replace(/^\(#?(?:\d+|RV)\)\s*/i,'').trim();
      if(!name||INTERNAL.test(name))continue;
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
      // Northwestern's men's swimming writes whole points with a decimal ("W
      // Win 187.0-130.0", Miami (OH), Oct 3): "187-130".
      const result=slot.match(/^([WLT]),?\s+(?:Win|Loss|Tie)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/i)?.map((part,i)=>i>=2?part.replace(/\.0+$/,''):part);
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
      if(/class=["'][^"']*\bschedule-event-exhibition\b/i.test(block)&&!/\(Exhibition\)$/i.test(opponent))opponent=`${opponent} (Exhibition)`;
      // A game two days past without a published result is neither a final
      // nor upcoming. Yesterday's stays: a night game can run past midnight.
      if(!meet&&!result&&lastDay<today-86400000)continue;
      const over=meet&&!result&&lastDay<today;
      const clock=result||over?'':(slot.match(/^\d{1,2}:\d{2}\s*[AP]M\b/i)||[''])[0];
      // A tournament or meet (no divider, or over several days) is "at"; a
      // dual (tennis, swimming) follows its divider.
      // Missouri's home meets read "vs." ("vs. Gans Creek Classic", "vs. Mizzou
      // Invite"); a meet named after its event is "at" too, while a dual over
      // two days stays "vs" ("vs. Missouri State", swimming).
      // Fencing's events are meets ("vs. Remenyik ROC/RJCC", "vs. October
      // NAC"): "at".
      const relation=!divider||/^at\b/i.test(divider)||eventType(sport)==='MEET'||meet&&(round||xc||EVENT_NAME.test(opponent))?'at':'vs';
      const event=makeEvent({school,sport,status:result||over?'Final':'Upcoming',relation,opponent,date:`${MONTHS[start.month-1]} ${start.day}, ${start.year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||over?null:clock||null,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      if(lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      if(over){event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;}
      const placed=over&&sport==='Golf'?northwesternGolfCardPlace(placeText):null;
      if(placed){event.headline=placed.headline;event.results=placed.results;event.result_count=placed.results.length;}
      const recapUrl=result||over?cardRecap(block,sourceUrl,firstDay,lastDay):null;
      if(recapUrl)event.recap_url=recapUrl;
      if(round){event.round_of=round;}
      // Auburn's golf cards are one per day, named alike ("Inverness
      // Intercollegiate", then "Inverness Collegiate" on the last day) at one
      // course: the days at one course are one tournament.
      else if(sport==='Golf'&&!result){const course=field(block,/schedule-event-item__location[^>]*>([\s\S]*?)<\/div>/i)||opponent;event.round_of=`${course}|golf`;event.merged_name=opponent;event.card_name=opponent;}
      if(xc){event.round_of=`${xc.name}|xc`;event.merged_name=xc.name;event.card_name=opponent;event.xc_team=xc.team;}
      if(team)event.id=`${event.id}-${team}`;
      // A past tennis tournament (no team result) is listed only with its
      // story, as K-State's (the men's page lists its players' pro events).
      if(sport==='Tennis'&&over&&!event.recap_url)continue;
      events.push(event);
    }
    // A past golf tournament with no story is not listed either: its card
    // publishes no place (men's golf's RedHawk Intercollegiate, Sep 14, played
    // by individuals while the team was at Inverness).
    // Texas A&M: such a tournament takes its archive story first (the
    // Fighting Irish Classic, Oct 4-5); the feed drops it only when none is
    // found (see isGolfWithoutStory).
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
  const isNorthwesternGolf=event=>event?.school_id==='northwestern'&&event.sport==='Golf'&&event.status==='Final'&&Boolean(event.recap_url)&&event.headline==='Completed';
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  async function attachGolfPlace(event){
    if(!isNorthwesternGolf(event))return event;
    const raw=await download(event.recap_url);if(!raw)return event;
    const title=decodeHtml((String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'');
    // A headline about a player leaves the team's place to the story: "the
    // 'Cats ... close out the event in 12th place" (OFCC, Sep 20), "the
    // Northwestern women's golf team finished the event in ninth" (Mason
    // Rudolph, Sep 20).
    const place=northwesternGolfPlace(title)||northwesternGolfStoryPlace(visibleText(raw));
    if(place){const value=/^T?\d+$/.test(place)?`${place.startsWith('T')?'T':''}${ordinal(place.replace(/^T/,''))}`:place;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
    return event;
  }

  // Each card's own Recap link is bound to its game, and its story may never
  // name the sport: it is checked for the opponent and date only. Any other
  // candidate must also name the opponent in its headline (Cincinnati's rule).
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='northwestern')return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===HOST&&parsed.pathname.startsWith('/news/');
    // A multi-day event is checked against its last day.
    let identity=event.end_time?{...event,start_time:event.end_time.replace(/T.*$/,'T12:00:00.000Z')}:event;
    // A card's own story can be a roundup posted up to two days after the
    // game ("Cats Split Matches in Allstate Big Ten/SEC Challenge", Sep 5, for
    // Sep 3 and 4): the game is checked as of its story's day.
    const posted=parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//),played=Date.parse(String(identity.start_time||'').slice(0,10));
    if(own&&posted){const day=Date.UTC(+posted[1],posted[2]-1,+posted[3]);if(day-played>86400000&&day-played<=2*86400000)identity={...identity,start_time:new Date(day).toISOString().replace(/T.*$/,'T12:00:00.000Z')};}
    // A tournament named for two sponsors ("OFCC/Fighting Illini
    // Invitational") is named by its last part in its story.
    // Nor by its event word: the "Olympia Fields Fighting Illini Collegiate"
    // (Sep 18-20) is the "OFCC Fighting Illini Invitational" in its story.
    const named=String(event.opponent||'').replace(EVENT_NAME,' ').replace(/\s+/g,' ').trim();
    if(own)return recapMatchesEvent(raw,{...identity,sport:''},url)||/\//.test(event.opponent||'')&&recapMatchesEvent(raw,{...identity,sport:'',opponent:String(event.opponent).split('/').pop().trim()},url)||event.event_type==='MEET'&&named.split(' ').length>=2&&named!==event.opponent&&recapMatchesEvent(raw,{...identity,sport:'',opponent:named},url);
    if(!recapMatchesEvent(raw,event,url))return false;
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    const opponent=headlineKey(event.opponent).trim(),key=headlineKey(title);
    // The name must not run on into a longer school's: the Sep 1 "Missouri Falls
    // to Michigan State 3-0" story is not the Sep 2 Michigan match's.
    // Nor be part of an event's name: the Sep 19 "Volleyball Wins Final Match
    // in Bowling Green/Toledo Invitational" story is not the Sep 18 Toledo
    // match's (Missouri).
    const longer=new RegExp(` ${opponent.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} (?:state|st|tech|a&m|southern|christian|international|invitational|invite|tournament|classic|challenge) `);
    return opponent.length>=2&&key.includes(` ${opponent} `)&&!longer.test(key);
  }
  // A scored final whose card links no story (soccer at Arkansas, Oct 2)
  // takes the sport's archive story dated the game day or the day after
  // whose headline or summary names the opponent and the score (a tie: the
  // score or "draw"): "Soccer Earns First SEC Point in 1-1 Draw at Arkansas".
  // A past golf tournament whose card links no story takes the archive
  // story dated its last day or the two after whose headline names it.
  const isGolfWithoutStory=event=>event?.school_id==='northwestern'&&event.sport==='Golf'&&event.status==='Final'&&!event.recap_url&&event.headline==='Completed';
  const isFinalWithoutStory=event=>isGolfWithoutStory(event)||event?.school_id==='northwestern'&&event.status==='Final'&&!event.recap_url&&!/\(Exhibition\)$/.test(event.opponent||'')&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  async function attachArchiveStory(event){
    if(!isFinalWithoutStory(event))return event;
    const slug=(String(event.source?.url||'').match(/^https:\/\/nusports\.com\/sports\/([a-z-]+)\/schedule/)||[])[1];if(!slug)return event;
    const listing=await download(`https://${HOST}/sports/${slug}/archives`);if(!listing)return event;
    const golf=isGolfWithoutStory(event);
    const first=Date.parse(`${String(golf&&event.end_time?event.end_time:event.start_time).slice(0,10)}T00:00:00Z`);
    const day=path=>{const [y,m,d]=path.split('/').slice(2,5).map(Number);return Date.UTC(y,m-1,d);};
    const paths=[...new Set(String(listing).replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])]
      .filter(path=>day(path)>=first&&day(path)<=first+86400000*(golf?2:1));
    const [a,b]=[String(event.school_score),String(event.opponent_score)],opponent=headlineKey(event.opponent).trim();
    const score=new RegExp(`(?<![\\d-])(?:${a}-${b}|${b}-${a})(?![\\d-])`);
    for(const path of paths.slice(0,4)){
      const url=`https://${HOST}${path}`,raw=await download(url);if(!raw)continue;
      const meta=name=>decodeHtml((String(raw).match(new RegExp(`<meta\\b[^>]*property=["']og:${name}["'][^>]*content=["']([^"']*)`,'i'))||[])[1]||'');
      const text=`${meta('title')} ${meta('description')}`;
      if(golf){if(opponent.length>=4&&headlineKey(meta('title')).includes(` ${opponent} `)){event.recap_url=url;event.archive_story_verified=url;return event;}continue;}
      if(opponent.length>=2&&headlineKey(text).includes(` ${opponent} `)&&(score.test(text)||a===b&&/\b(?:draw|tie|tied|scoreless)\b/i.test(text))){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  const crossCountry=createTfrrsMeetResults({id:'northwestern',schoolName:'Northwestern',teams:NORTHWESTERN_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  return{parseSchedule,isEmptySchedule,matchesRecap,isNorthwesternGolf,isGolfWithoutStory,attachGolfPlace,isFinalWithoutStory,attachArchiveStory,
    isCrossCountry:event=>event?.school_id==='northwestern'&&crossCountry.matches(event),attachMeetResults:crossCountry.attach};
}

// "Missouri Men's Golf Finishes 12th at ...", "Men's Golf Finishes Seventh at the
// Bryan Bros Collegiate", "Missouri Women's Golf Wins ...": the team's place, or
// null when the headline's subject is a player.
const PLACE_WORDS=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'];
export function northwesternGolfPlace(title){
  // Texas A&M: "Men's Golf Earns Runner-Up Finish at ...", "Schartz Leads
  // Aggies to Runner-Up Finish", "... Aggies Finish Second".
  const text=String(title||'').replace(/’/g,"'");
  if(/\b(?:Golf|Wildcats)\b[^,]{0,25}\bRunner-Up\b/i.test(text))return '2';
  // Northwestern's: "Wildcats Take Fourth Place at ...", "Wildcats Wrap Up
  // Windy City Collegiate Classic in Ninth", "Wildcats Conclude Season Opener
  // in Ninth at ...".
  const wildcats=text.match(/^(?:Wildcats|'Cats)\b.*?\b(?:in|Take|Takes|Finish|Finishes)\s+(?:(T-?\d+|\d+)(?:st|nd|rd|th)|(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth))\b/i);
  if(wildcats)return wildcats[1]?wildcats[1].replace(/^T-?/i,'T'):String(PLACE_WORDS.indexOf(wildcats[2].toLowerCase())+1);
  const aggies=text.match(/\b(?:Northwestern|Wildcats)\s+(?:Finish|Finishes|Place|Places|Take|Takes)\s+(?:(T-?\d+|\d+)(?:st|nd|rd|th)\b|(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth)\b)/i);
  if(aggies)return aggies[1]?aggies[1].replace(/^T-?/i,'T'):String(['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'].indexOf(aggies[2].toLowerCase())+1);
  const m=text.match(/\bGolf\s+(?:Finishes|Places|Takes|Ties for)\s+(T-?\d+|\d+)(?:st|nd|rd|th)?\b|\bGolf\s+(?:Finishes|Places|Takes)\s+(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth)\b|\bGolf\s+(Wins)\b/i);
  if(!m)return null;
  if(m[1])return m[1].replace(/^T-?/i,'T');
  if(m[2])return String(['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'].indexOf(m[2].toLowerCase())+1);
  return '1';
}

// The team's place in a golf story's text: the sentence's subject is the team
// ("the 'Cats", "the Northwestern women's golf team"); a player's finish ("in a
// share of 11th") is not.
export function northwesternGolfStoryPlace(text){
  const value=String(text||'').replace(/[’‘]/g,"'").replace(/(\d+)\s+(st|nd|rd|th)\b/g,'$1$2');
  const m=value.match(/\b(?:the\s+'Cats|Northwestern(?:\s+(?:men's|women's))?\s+golf\s+team)\b[^.]{0,120}?\b(?:close out|finish(?:ed)?|place[sd]?|end(?:ed)?)\b[^.]{0,40}?\bin\s+(?:a\s+(?:share|tie)\s+(?:of|for)\s+)?(?:(\d+)(?:st|nd|rd|th)|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth))\b/i);
  if(!m)return null;
  return m[1]||String(PLACE_WORDS.indexOf(m[2].toLowerCase())+1);
}
