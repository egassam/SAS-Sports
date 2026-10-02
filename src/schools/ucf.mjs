// UCF school module. Shared publisher utilities stay in the Worker; this file
// owns ucfknights.com routes, UCF's program combinations and its
// schedule-card reader. Routes started as the exact candidates production used
// before the module existed (route parity); each sport is then corrected and
// verified one at a time.
export const ucfSchool={
  id:'ucf',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football','Volleyball','Soccer','Cross Country','Basketball','Baseball','Softball','Golf']),
  // Live game state comes from an independent scoreboard, as for K-State;
  // the official cards stay the schedule and results source of record.
  liveScoreboards:{
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // Both teams, labeled to match the official men's and women's cards.
    Basketball:[
      {path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},
      {path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}
    ]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Swimming & Diving','Soccer','Golf']),
  scheduleUrls:{
    'ucf|Baseball':'https://ucfknights.com/sports/baseball/schedule',
    'ucf|Basketball':['https://ucfknights.com/sports/mens-basketball/schedule','https://ucfknights.com/sports/womens-basketball/schedule'],
    'ucf|Cross Country':'https://ucfknights.com/sports/cross-country/schedule',
    'ucf|Football':'https://ucfknights.com/sports/football/schedule',
    'ucf|Golf':['https://ucfknights.com/sports/mens-golf/schedule','https://ucfknights.com/sports/womens-golf/schedule'],
    'ucf|Rowing':['https://ucfknights.com/sports/womens-rowing/schedule','https://ucfknights.com/sports/rowing/schedule','https://ucfknights.com/'],
    'ucf|Soccer':['https://ucfknights.com/sports/womens-soccer/schedule','https://ucfknights.com/sports/mens-soccer/schedule'],
    'ucf|Softball':'https://ucfknights.com/sports/softball/schedule',
    'ucf|Tennis':['https://ucfknights.com/sports/womens-tennis/schedule','https://ucfknights.com/sports/mens-tennis/schedule','https://ucfknights.com/sports/tennis/schedule','https://ucfknights.com/'],
    'ucf|Track & Field':['https://ucfknights.com/sports/track-and-field/schedule','https://ucfknights.com/sports/track-field/schedule','https://ucfknights.com/'],
    'ucf|Volleyball':'https://ucfknights.com/sports/volleyball/schedule'
  },
  rosterUrls:{
    'ucf|Baseball':'https://ucfknights.com/sports/baseball/roster',
    'ucf|Basketball':['https://ucfknights.com/sports/mens-basketball/roster','https://ucfknights.com/sports/womens-basketball/roster','https://ucfknights.com/sports/basketball/roster'],
    'ucf|Cross Country':'https://ucfknights.com/sports/cross-country/roster',
    'ucf|Football':'https://ucfknights.com/sports/football/roster',
    'ucf|Golf':['https://ucfknights.com/sports/womens-golf/roster','https://ucfknights.com/sports/mens-golf/roster','https://ucfknights.com/sports/golf/roster'],
    'ucf|Rowing':['https://ucfknights.com/sports/womens-rowing/roster','https://ucfknights.com/sports/rowing/roster'],
    'ucf|Soccer':['https://ucfknights.com/sports/womens-soccer/roster','https://ucfknights.com/sports/wsoc/roster','https://ucfknights.com/sports/soccer/roster','https://ucfknights.com/sports/mens-soccer/roster'],
    'ucf|Softball':'https://ucfknights.com/sports/softball/roster',
    'ucf|Tennis':['https://ucfknights.com/sports/womens-tennis/roster','https://ucfknights.com/sports/mens-tennis/roster','https://ucfknights.com/sports/tennis/roster'],
    'ucf|Track & Field':['https://ucfknights.com/sports/track-and-field/roster','https://ucfknights.com/sports/track-field/roster'],
    'ucf|Volleyball':['https://ucfknights.com/sports/womens-volleyball/roster','https://ucfknights.com/sports/wvball/roster','https://ucfknights.com/sports/volleyball/roster']
  }
};

// One card per event: from its opening tag to the matching </div>. The last
// card must not run on into the table view or footer below it.
function cardBlocks(raw){
  const blocks=[];
  for(const open of raw.matchAll(/<div\b[^>]*class=["'][^"']*\bschedule-event-item(?=[\s"'])[^"']*["'][^>]*>/gi)){
    const tags=/<div\b[^>]*>|<\/div>/gi;tags.lastIndex=open.index+open[0].length;
    let depth=1,end=-1,tag;
    while(depth&&(tag=tags.exec(raw)))if((depth+=tag[0][1]==='/'?-1:1)===0)end=tags.lastIndex;
    if(end>0)blocks.push({block:raw.slice(open.index,end),index:open.index});
  }
  return blocks;
}

// Cards are grouped under tournament headings ("Big 12 Soccer Tournament
// Presented by Allstate"). Bracket cards whose opponent is not yet known
// ("TBD", "Quarterfinal Round") are named after their tournament.
function tournamentTitle(raw,index,visibleText){
  const start=raw.lastIndexOf('class="schedule-events-by-tournament"',index);
  if(start<0)return'';
  const title=raw.slice(start,index).match(/schedule-events-by-tournament__title[^>]*>([\s\S]*?)<\//i);
  return visibleText(title?.[1]||'').replace(/\s+Presented by\b.*$/i,'').trim();
}
const PLACEHOLDER=/^(?:TB[AD]|(?:First|Second|Third|Quarterfinal|Semifinal|Championship|Final)s?\b.*\b(?:Round|Match|Game))$/i;

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TIME_ZONE='America/New_York';
const easternDay=time=>new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
// The page's JSON-LD lists every event with its start in UTC. Cards show only
// "Thu, Sep" and "3", so each card's year comes from these dates (Eastern).
function publishedDays(raw){
  const days=new Set();
  for(const script of raw.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    let data;try{data=JSON.parse(script[1]);}catch{continue;}
    for(const item of [].concat(data?.['@graph']||data)){
      const value=String(item?.startDate||''),time=Date.parse(value);
      if(/^\d{4}-\d{2}-\d{2}$/.test(value))days.add(value);
      else if(Number.isFinite(time))days.add(easternDay(time));
    }
  }
  return days;
}

// Cross Country recaps are prose. Each runner's name links to the roster
// ("<a href=.../roster/player/caroline-moon>Caroline Moon</a> ... finishing
// sixth in 17:58.09"); the text up to the next linked name holds that runner's
// place and time. Times that are not this race's ("program record of
// 16:50.19", "previous best of 17:58.09", "debut time of 18:36.02") are
// skipped, so a record holder named in the story never becomes a row.
const PLACE_WORDS=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'];
const PLACE=`(\\d{1,3})(?:st|nd|rd|th)\\b|\\b(${PLACE_WORDS.join('|')})\\b`;
export function parseUcfRecapResults(raw,{decodeHtml,ordinal,group}){
  const article=[...String(raw||'').matchAll(/<div\b[^>]*class=["'][^"']*\bembed-html\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)].map(m=>m[1]).join(' ');
  const text=value=>decodeHtml(String(value).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
  const links=[...article.matchAll(/<a\b[^>]*href=["'][^"']*\/roster\/player\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const rows=[],seen=new Set();
  links.forEach((link,i)=>{
    const participant=text(link[1]);
    if(!participant||seen.has(participant))return;
    const segment=text(article.slice(link.index+link[0].length,i+1<links.length?links[i+1].index:article.length));
    for(const time of segment.matchAll(/\b\d{1,2}:\d{2}\.\d{1,2}\b/g)){
      const before=segment.slice(0,time.index),after=segment.slice(time.index+time[0].length,time.index+time[0].length+25);
      // Earlier marks are written "best of", "record of", "debut time of".
      if(/\b(?:record|best|mark|average(?: time)?|debut time)\s+of\s*$/i.test(before))continue;
      const near=before.slice(-45),places=[...near.matchAll(new RegExp(PLACE,'gi'))],last=places.at(-1);
      const following=after.match(new RegExp(`^\\s*to finish\\s+(?:${PLACE})`,'i'));
      const place=last?(last[1]||PLACE_WORDS.indexOf(last[2].toLowerCase())+1):following?(following[1]||PLACE_WORDS.indexOf(following[2].toLowerCase())+1):null;
      // A time with no place counts only as "with a time of ..." (the
      // runner's own finish); anything else is someone else's mark.
      if(!place&&!/\bwith a time of\s*$/i.test(before))continue;
      seen.add(participant);
      rows.push({group,participant,result:place?`${ordinal(place)} \u00b7 ${time[0]}`:time[0],place:place?Number(place):Infinity});
      break;
    }
  });
  return rows.sort((a,b)=>a.place-b.place).map(({place,...row})=>row);
}

// ucfknights.com renders each event as a schedule-event-item card: the date
// as "Thu, Sep" / "3" (no year), a "vs."/"at" divider, the opponent name, and
// one result slot holding either the result ("W Win 73-6") or the published
// local time ("12:00 PM EDT", "Time TBA"), plus the game's own Recap link. The
// shared parsers read both these cards and the page's schema data, so every
// upcoming game appeared twice and a phantom Nov 28 final reused the Sep 3
// score and recap.
export function createUcfHandlers({makeEvent,visibleText,absoluteUrl,eventType,decodeHtml,ordinal,recapMatchesEvent,recapArticleText,fetch,headers}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  // The card's own Recap link. A recap is dated in its URL (/news/2026/09/4/...);
  // it must fall between the event day and three days after it.
  function cardRecap(block,sourceUrl,day){
    for(const link of block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*)<\/a>/gi)){
      if(!/^Recap\b/i.test(visibleText(link[2])))continue;
      const url=absoluteUrl(link[1],sourceUrl);
      let parsed;try{parsed=new URL(url);}catch{continue;}
      const dated=parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(parsed.protocol!=='https:'||parsed.hostname!=='ucfknights.com'||!dated)continue;
      const published=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3]));
      if(published>=day&&published<=day+3*86400000)return url;
    }
    return null;
  }
  // Golf publishes one card per round ("Mon, Sep 21 FAU Invitational T7, 573
  // (-3)", "Tue, Sep 22 FAU Invitational 5th, 858 (-6)"). Consecutive rounds
  // of the same tournament become one event from its first to its last day;
  // the last round's card carries the final place and total.
  function mergeRounds(events){
    const merged=[];
    for(const event of events){
      const previous=merged.at(-1);
      const days=previous?(Date.parse(event.start_time)-Date.parse(previous.end_time||previous.start_time))/86400000:Infinity;
      if(previous&&previous.opponent===event.opponent&&days>0&&days<=2){
        previous.end_time=event.start_time.slice(0,10)+'T23:59:59Z';
        for(const key of ['status','headline','results','result_count','recency_label','priority_bucket','recap_url'])if(event[key]!==undefined)previous[key]=event[key];
        if(!event.recap_url)delete previous.recap_url;
        if(event.status!=='Final'){previous.status=event.status;}
        continue;
      }
      merged.push(event);
    }
    return merged;
  }
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='ucf'||!ucfSchool.cardSports.has(sport))return null;
    raw=String(raw||'');
    const cards=cardBlocks(raw);
    if(!cards.length)return null;
    const days=publishedDays(raw);
    const local=easternDay(now.getTime()),season=Number(local.slice(5,7))>=7?Number(local.slice(0,4)):Number(local.slice(0,4))-1;
    const events=[];
    for(const {block,index:at} of cards){
      const start=(block.match(/schedule-event-date__wrapper--start[\s\S]*?<\/time>/i)||[])[0]||'';
      const month=field(start,/schedule-event-date__month[^>]*>([\s\S]*?)<\/span>/i).split(/[\s,]+/).pop()||'';
      const day=Number(field(start,/schedule-event-date__day[^>]*>([\s\S]*?)<\/span>/i));
      const index=MONTHS.findIndex(name=>name.toLowerCase()===month.slice(0,3).toLowerCase());
      if(index<0||!(day>=1&&day<=31))continue;
      const key=`${String(index+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const years=[season,season+1].filter(year=>days.has(`${year}-${key}`));
      // Without a schema date, July-December belong to the season's first year.
      const year=years.length===1?years[0]:index>=6?season:season+1;
      const divider=field(block,/schedule-event-item__divider[^>]*>([\s\S]*?)<\/strong>/i);
      // Rankings ("#20/20 Houston", "#19/- Oklahoma St.", "-/#21 LSU") describe
      // the week, not the opponent.
      let opponent=field(block,/schedule-event-item__opponent-name[^>]*>([\s\S]*?)<\/strong>/i).replace(/^(?=\S*#)[#\dRV\/-]+\s+/i,'').trim();
      // A multi-day conference tournament card names the conference ("Big 12
      // Conference"); its heading names the event, with a stale year ("2025
      // Phillips 66 Big 12 Men's Basketball Championship" on the 2026-27 page).
      const multiDay=/schedule-event-date__wrapper--end/i.test(block);
      if(multiDay&&/\bConference$/i.test(opponent)){
        const heading=tournamentTitle(raw,at,visibleText).replace(/^\d{4}\s+/,'');
        if(heading)opponent=heading;
      }
      else if(PLACEHOLDER.test(opponent)){
        const heading=tournamentTitle(raw,at,visibleText);
        if(heading)opponent=/^TB[AD]$/i.test(opponent)?heading:`${heading} \u00b7 ${opponent}`;
      }
      if(!opponent||!divider)continue;
      // Internal events: baseball's "Black & Gold World Series", softball's
      // "Open Scrimmage" and "Knights vs. 'Nauts" (two squads; BYU's "Navy vs.
      // Royal" is read the same way).
      if(/\bscrimmage\b|\bintrasquad\b|\bblack (?:&|and) gold\b|\svs\.?\s/i.test(opponent))continue;
      const slot=field(block,/class=["']schedule-event-item-result["'][^>]*>([\s\S]*?)<div\b[^>]*schedule-event-item__dashboard-link/i)||field(block,/schedule-event-item-result__label[^>]*>([\s\S]*?)<\/(?:strong|div)>/i);
      const result=slot.match(/^([WLT])\b(?:\s+(?:Win|Loss|Tie))?\s+(\d+)\s*-\s*(\d+)$/i);
      const clock=result?'':(slot.match(/^\d{1,2}:\d{2}\s*[AP]M\b/i)||[''])[0];
      // Preseason exhibitions publish "Completed" with no score, and a
      // postponed game has no result or new date; neither is a K-State-style
      // final or an upcoming game.
      // Meets publish the team finish in the result slot ("1st", "6th").
      const meet=eventType(sport)!=='GAME',placing=meet?slot.match(/^(\d{1,3})(?:st|nd|rd|th)$/i):null;
      // Golf rounds: "T4, 852 (-12)" or "11th, 867" is the team place and total
      // after that round; "568 (-8)" (no place) is a round in progress.
      const golf=sport==='Golf'?slot.match(/^(T)?(\d{1,3})(?:st|nd|rd|th)?,\s*(\d{3,4})\b/i):null;
      // A meet whose day has passed is over, published result or not.
      const over=meet&&(placing||golf||Date.UTC(year,index,day)<Date.parse(easternDay(now.getTime())+'T00:00:00Z'));
      if(!meet&&!result&&/^(?:Completed|Postponed|Canceled|Cancelled)\b/i.test(slot))continue;
      // Meets read "UCF at Florida Intercollegiate", as K-State's do.
      const event=makeEvent({school,sport,status:result||over?'Final':'Upcoming',relation:meet||/^at\b/i.test(divider)?'at':'vs',opponent,date:`${MONTHS[index]} ${day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:over?null:clock||null,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      const recapUrl=result||over?cardRecap(block,sourceUrl,Date.UTC(year,index,day)):null;
      // UCF runs only a women's cross country team; the page says so.
      const squad=/<title>[^<]*Women(?:&#x27;|')s\b/i.test(raw)?"Women's":'UCF';
      if(golf){const value=`${golf[1]?'T':''}${ordinal(golf[2])} (${golf[3]})`;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
      else if(placing){const value=ordinal(placing[1]);event.headline=`${squad} team: ${value}`;event.results=[{label:'Result',value}];event.result_count=1;}
      else if(over&&!event.headline){event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;}
      if(recapUrl)event.recap_url=recapUrl;
      // Separate men's and women's pages can list the same opponent on the same
      // day; the team keeps their event ids apart.
      const team=ucfSchool.combinedSports.has(sport)?(String(sourceUrl).match(/\/sports\/(mens|womens)-/)||[])[1]:null;
      if(team)event.id=`${event.id}-${team}`;
      events.push(event);
    }
    return events.length?(sport==='Golf'?mergeRounds(events):events):null;
  }
  const isUcfCrossCountry=event=>event?.school_id==='ucf'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  // Feed and expanded view both call this; the second call is a no-op. Race
  // rows come from the meet's own card-bound recap.
  async function attachMeetResults(event){
    if(!isUcfCrossCountry(event))return event;
    if(event.meet_results_verified)return event;
    const unavailable=status=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';event.highlight_status=status;
      return event;
    };
    const failed='Official race results could not be loaded. Open the official recap.';
    if(!event.recap_url)return unavailable('No official recap is published for this meet on ucfknights.com.');
    let raw;
    try{
      const response=await fetch(event.recap_url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});
      if(!response.ok)return unavailable(failed);raw=await response.text();
    }catch{return unavailable(failed);}
    if(!recapMatchesEvent(raw,event,event.recap_url))return unavailable(failed);
    // Recaps mention earlier meets ("its 17:51 average at the season-opening
    // Florida Intercollegiate"); the story's own title must name this meet.
    const key=value=>decodeHtml(String(value)).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    if(!key(title).includes(key(event.opponent)))return unavailable(failed);
    const squad=String(event.headline||'').match(/^(.+?) team: /)?.[1]||'UCF';
    // The recaps never state the distance of the race, so none is claimed.
    const group=`${squad} race`;
    const runners=parseUcfRecapResults(raw,{decodeHtml,ordinal,group});
    if(!runners.length)return unavailable(failed);
    // The team score is the first "N points" in a sentence about UCF ("The
    // Knights finished with 43 points"); the place stays the card's.
    const place=String(event.headline||'').match(/team: (\d+\w\w)/)?.[1];
    const article=decodeHtml(String(raw).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
    const points=place?(article.split(/(?<=[.!?])\s+/).find(sentence=>/\b(?:UCF|Knights)\b/.test(sentence)&&/\b\d{1,3} points\b/.test(sentence))||'').match(/\b(\d{1,3}) points\b/)?.[1]:null;
    const teamResult=place?`${place}${points?` \u00b7 ${points} pts`:''}`:null;
    if(teamResult){event.headline=`${squad} team: ${teamResult}`;}
    const rows=[...(teamResult?[{group,participant:'UCF team',result:teamResult}]:[]),...runners];
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;
    event.recap_result_count=rows.length;
    event.source={...event.source,name:'Official athletics meet recap',url:event.recap_url};
    const leader=runners[0];
    event.highlights=[
      ...(teamResult?[`UCF placed ${place}${points?` with ${points} points`:''} at ${event.opponent}.`]:[]),
      `${leader.participant} led UCF in the ${group.replace(/^\w+/,word=>word.toLowerCase())}, finishing ${leader.result.includes(' \u00b7 ')?leader.result.replace(' \u00b7 ',' in '):`in ${leader.result}`}.`
    ];
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  // The shared matcher keeps only an opponent's words of four letters or more,
  // so "FAU Invitational" became "invitational" and the women's Schooner
  // Classic story matched the men's FAU Invitational. A UCF recap must name
  // the event in full, and a men's or women's event refuses the other team's
  // story.
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='ucf')return false;
    const key=value=>decodeHtml(String(value||'')).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    const text=` ${key(`${title} ${recapArticleText(raw)}`)} `;
    // The card's own Recap link is already bound to its event (and dated);
    // any other candidate must name the event in full ("Kansas St." as
    // "Kansas State" too).
    const name=key(event.opponent),names=[name,name.replace(/\bst$/,'state')];
    if(url!==event.recap_url&&!names.some(value=>text.includes(` ${value} `)))return false;
    const other=event.team_label==="Men's"?/\bwomen/i:event.team_label==="Women's"?/\bmen(?:s|['’]s)?\b/i:null;
    if(other&&(other.test(title)||other.test(String(url).split('/').pop())))return false;
    // Multi-day events are checked against their last day.
    const identity=event.end_time?{...event,start_time:event.end_time}:event;
    return recapMatchesEvent(raw,identity,url);
  }
  return{parseSchedule,isUcfCrossCountry,attachMeetResults,matchesRecap};
}
