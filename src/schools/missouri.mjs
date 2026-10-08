import {createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
// Missouri school module. Shared publisher utilities stay in the Worker; this
// file owns mutigers.com routes, Missouri's program combinations, its verified
// Instagram tags and its schedule-card reader. mutigers.com is a WMT (Nuxt)
// site, as LSU's: its schedule cards are read here (see parseSchedule), with
// LSU's rules; Missouri's cards also carry each day's full date.
export const missouriSchool={
  id:'missouri',
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set(['Baseball','Basketball','Cross Country','Football','Golf','Gymnastics','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball','Wrestling']),
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
  // by team. Swimming & Diving publishes one page for both teams.
  combinedSports:new Set(['Basketball','Golf']),
  teamLabels:{},
  verifiedInstagrams:{},
  scheduleUrls:{
    'missouri|Baseball':'https://mutigers.com/sports/baseball/schedule',
    'missouri|Basketball':['https://mutigers.com/sports/mens-basketball/schedule','https://mutigers.com/sports/womens-basketball/schedule'],
    'missouri|Cross Country':'https://mutigers.com/sports/cross-country/schedule',
    'missouri|Football':'https://mutigers.com/sports/football/schedule',
    'missouri|Golf':['https://mutigers.com/sports/mens-golf/schedule','https://mutigers.com/sports/womens-golf/schedule'],
    'missouri|Gymnastics':'https://mutigers.com/sports/womens-gymnastics/schedule',
    'missouri|Soccer':'https://mutigers.com/sports/womens-soccer/schedule',
    'missouri|Softball':'https://mutigers.com/sports/softball/schedule',
    'missouri|Swimming & Diving':'https://mutigers.com/sports/swimming-and-diving/schedule',
    'missouri|Tennis':'https://mutigers.com/sports/womens-tennis/schedule',
    'missouri|Track & Field':'https://mutigers.com/sports/track-and-field/schedule',
    'missouri|Volleyball':'https://mutigers.com/sports/womens-volleyball/schedule',
    'missouri|Wrestling':'https://mutigers.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'missouri|Baseball':'https://mutigers.com/sports/baseball/roster',
    'missouri|Basketball':['https://mutigers.com/sports/mens-basketball/roster','https://mutigers.com/sports/womens-basketball/roster'],
    'missouri|Cross Country':'https://mutigers.com/sports/cross-country/roster',
    'missouri|Football':'https://mutigers.com/sports/football/roster',
    'missouri|Golf':['https://mutigers.com/sports/mens-golf/roster','https://mutigers.com/sports/womens-golf/roster'],
    'missouri|Gymnastics':'https://mutigers.com/sports/womens-gymnastics/roster',
    'missouri|Soccer':'https://mutigers.com/sports/womens-soccer/roster',
    'missouri|Softball':'https://mutigers.com/sports/softball/roster',
    'missouri|Swimming & Diving':'https://mutigers.com/sports/swimming-and-diving/roster',
    'missouri|Tennis':'https://mutigers.com/sports/womens-tennis/roster',
    'missouri|Track & Field':'https://mutigers.com/sports/track-and-field/roster',
    'missouri|Volleyball':'https://mutigers.com/sports/womens-volleyball/roster',
    'missouri|Wrestling':'https://mutigers.com/sports/wrestling/roster'
  }
};

const HOST='mutigers.com';
// Missouri's TFRRS cross country team pages (complete races and team scores; the
// schedule cards publish no place).
export const MISSOURI_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/MO_college_f_Missouri.html',Men:'https://www.tfrrs.org/teams/xc/MO_college_m_Missouri.html'};
const EVENT_NAME=/\b(?:invit\w*|invite|classic|championships?|open|relays|duals|collegiate|intercollegiate|tournament|festival|cup)\b/i;
// Golf's card result: "5th of 13" (the place in the field) or "1st (842)"
// (the place and team score).
export function missouriGolfCardPlace(text){
  const value=String(text||'').trim();
  const fielded=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s+of\s+(\d+)$/i);
  if(fielded){const place=`${fielded[1]?'T':''}${fielded[2]}${fielded[3].toLowerCase()} of ${fielded[4]}`;return{headline:place,results:[{label:'Result',value:place}]};}
  const scored=value.match(/^(T-?)?(\d+)(st|nd|rd|th)\s*\((\d{3,4})\)$/i);
  if(scored){const place=`${scored[1]?'T':''}${scored[2]}${scored[3].toLowerCase()}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:scored[4]}]};}
  return null;
}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Sports whose single-year page title names the fall ("Football 2026"); every
// other single-year title names the spring ("Baseball 2027", whose fall
// exhibitions are in October 2026).
const FALL_SPORTS=new Set(['Football','Soccer','Volleyball','Cross Country']);
// Internal events: intrasquads, scrimmages, "Purple & Gold", softball's
// "Purple/Gold World Series".
const INTERNAL=/\bintrasquad\b|\bscrimmage\b|^purple\s*(?:&|and|-|\/|vs\.?)\s*(?:gold|white)\b/i;
// Today in Central time (Missouri's cards are Central wall clock: "6:00 PM CT").
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
export function missouriSeasonYear(raw,sport){
  const title=(String(raw).match(/<title>([^<]*)/i)||[])[1]||'';
  const range=title.match(/\b(20\d\d)-(\d\d)\b/);
  if(range)return month=>month>=7?Number(range[1]):2000+Number(range[2]);
  const single=title.match(/\b(20\d\d)\b/);if(!single)return null;
  const year=Number(single[1]);
  return FALL_SPORTS.has(sport)?month=>month>=7?year:year+1:month=>month>=7?year-1:year;
}

// missourisports.net renders each event as a schedule-event-item card: the day
// ("Sep 5"; a tournament adds its last day) in the date box, a "vs."/"at"
// divider, the opponent, and one result slot holding the result ("W Win
// 51-10"), the published time ("6:00 PM CT", "TBA") or nothing (a meet).
// Cards sit under titled tournament wrappers ("Exhibition"). Golf and
// swimming invitationals publish one card per day ("Inverness Intercollegiate
// (Day 2)"); cross country one per team ("Paul Short Run (W)").
export function createMissouriHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
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
      .filter(link=>link.href&&/(?:^|\s)schedule-event-item-links__link(?:\s|$)/.test(link.cls))
      // "Final Recap - Missouri vs. ...", or a recap-class link whose label is
      // the story's headline ("Tennis Concludes ... - Recap").
      .map(link=>({...link,label:/--recap\b/.test(link.cls)?'Recap':decodeHtml(attribute(link.tag,'aria-label')).split(' - ')[0].trim()}))
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
    if(school?.id!=='missouri'||!missouriSchool.cardSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(page.pathname))return null;
    raw=String(raw||'');
    const yearOf=missouriSeasonYear(raw,sport);if(!yearOf)return null;
    const local=centralDay(now.getTime()),today=Date.parse(`${local}T00:00:00Z`);
    const season=Number(local.slice(5,7))>=7?Number(local.slice(0,4)):Number(local.slice(0,4))-1;
    const wrappers=headings(raw),meet=eventType(sport)!=='GAME',events=[];
    const team=missouriSchool.teamLabels[page.pathname.replace(/\/$/,'')]?.startsWith('W')?'womens':missouriSchool.teamLabels[page.pathname.replace(/\/$/,'')]?'mens':null;
    for(const {block,index} of cardBlocks(raw)){
      const heading=wrappers.find(w=>w.start<index&&index<w.end)?.title||'';
      const dateBox=(block.match(/schedule-event-item__date-box[\s\S]*?(?=<div\b[^>]*class=["']schedule-event-item__teams)/i)||[])[0]||'';
      // Missouri's day ("Sep 3") sits in schedule-event-date__day (LSU's in
      // __month-day).
      const days=[...dateBox.matchAll(/schedule-event-date__(?:month-)?day["'][^>]*>([\s\S]*?)<\/time>/gi)].map(m=>visibleText(m[1]).match(/^([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/)).filter(Boolean);
      if(!days.length)continue;
      const toDay=([,mon,day])=>{const month=MONTHS.indexOf(mon)+1;if(!month)return null;return{year:yearOf(month),month,day:Number(day)};};
      const start=toDay(days[0]),finish=days[1]?toDay(days[1]):start;
      if(!start||!finish)continue;
      // Only the current academic year (July-June, Central) is current: the
      // track page keeps last spring's season until the next is published.
      if((start.month>=7?start.year:start.year-1)!==season)continue;
      const firstDay=Date.UTC(start.year,start.month-1,start.day),lastDay=Date.UTC(finish.year,finish.month-1,finish.day);
      const divider=field(block,/schedule-default-event__divider["'][^>]*>([\s\S]*?)<\/strong>/i);
      const nameBox=(block.match(/class=["']schedule-default-event__name["'][^>]*>([\s\S]*?)<\/span>\s*<\/span>/i)||[])[1]||'';
      // The name box repeats the divider for phones; the opponent is the rest.
      let name=visibleText(nameBox.replace(/<strong\b[^>]*schedule-default-event__divider-mobile[\s\S]*?<\/strong>/i,''));
      // Rankings ("#8 Ole Miss") describe the week, not the opponent.
      // Missouri's give two polls: "#24/#RV Mississippi State".
      name=name.replace(/^(?:#(?:\d+|RV)(?:\/#?(?:\d+|RV))*\s+)+/i,'').trim();
      if(!name||INTERNAL.test(name))continue;
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
      const result=slot.match(/^([WLT])\s+(?:Win|Loss|Tie)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\b/i);
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
      const relation=!divider||/^at\b/i.test(divider)||meet&&(round||xc||EVENT_NAME.test(opponent))?'at':'vs';
      const event=makeEvent({school,sport,status:result||over?'Final':'Upcoming',relation,opponent,date:`${MONTHS[start.month-1]} ${start.day}, ${start.year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||over?null:clock||null,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      if(lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      if(over){event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;}
      const placed=over&&sport==='Golf'?missouriGolfCardPlace(placeText):null;
      if(placed){event.headline=placed.headline;event.results=placed.results;event.result_count=placed.results.length;}
      const recapUrl=result||over?cardRecap(block,sourceUrl,firstDay,lastDay):null;
      if(recapUrl)event.recap_url=recapUrl;
      if(round){event.round_of=round;}
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
    const merged=(meet?mergeDays(events,today):events).filter(event=>!(sport==='Golf'&&event.status==='Final'&&!event.recap_url&&event.headline==='Completed'));
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
  const isMissouriGolf=event=>event?.school_id==='missouri'&&event.sport==='Golf'&&event.status==='Final'&&Boolean(event.recap_url)&&event.headline==='Completed';
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  async function attachGolfPlace(event){
    if(!isMissouriGolf(event))return event;
    const raw=await download(event.recap_url);if(!raw)return event;
    const title=decodeHtml((String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'');
    const place=missouriGolfPlace(title);
    if(place){const value=/^T?\d+$/.test(place)?`${place.startsWith('T')?'T':''}${ordinal(place.replace(/^T/,''))}`:place;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
    return event;
  }

  // Each card's own Recap link is bound to its game, and its story may never
  // name the sport: it is checked for the opponent and date only. Any other
  // candidate must also name the opponent in its headline (Cincinnati's rule).
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='missouri')return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===HOST&&parsed.pathname.startsWith('/news/');
    // A multi-day event is checked against its last day.
    const identity=event.end_time?{...event,start_time:event.end_time.replace(/T.*$/,'T12:00:00.000Z')}:event;
    if(own)return recapMatchesEvent(raw,{...identity,sport:''},url);
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
  const crossCountry=createTfrrsMeetResults({id:'missouri',schoolName:'Missouri',teams:MISSOURI_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  return{parseSchedule,isEmptySchedule,matchesRecap,isMissouriGolf,attachGolfPlace,
    isCrossCountry:event=>event?.school_id==='missouri'&&crossCountry.matches(event),attachMeetResults:crossCountry.attach};
}

// "Missouri Men's Golf Finishes 12th at ...", "Men's Golf Finishes Seventh at the
// Bryan Bros Collegiate", "Missouri Women's Golf Wins ...": the team's place, or
// null when the headline's subject is a player.
export function missouriGolfPlace(title){
  const m=String(title||'').replace(/’/g,"'").match(/\bGolf\s+(?:Finishes|Places|Takes|Ties for)\s+(T-?\d+|\d+)(?:st|nd|rd|th)?\b|\bGolf\s+(?:Finishes|Places|Takes)\s+(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth)\b|\bGolf\s+(Wins)\b/i);
  if(!m)return null;
  if(m[1])return m[1].replace(/^T-?/i,'T');
  if(m[2])return String(['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'].indexOf(m[2].toLowerCase())+1);
  return '1';
}
