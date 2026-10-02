// UCF school module. Shared publisher utilities stay in the Worker; this file
// owns ucfknights.com routes, UCF's program combinations and its
// schedule-card reader. Routes started as the exact candidates production used
// before the module existed (route parity); each sport is then corrected and
// verified one at a time.
export const ucfSchool={
  id:'ucf',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football','Volleyball','Soccer']),
  // Live game state comes from an independent scoreboard, as for K-State;
  // the official cards stay the schedule and results source of record.
  liveScoreboards:{
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Swimming & Diving','Soccer']),
  scheduleUrls:{
    'ucf|Baseball':['https://ucfknights.com/sports/baseball/schedule','https://ucfknights.com/'],
    'ucf|Basketball':['https://ucfknights.com/sports/mens-basketball/schedule','https://ucfknights.com/sports/womens-basketball/schedule','https://ucfknights.com/sports/basketball/schedule','https://ucfknights.com/'],
    'ucf|Cross Country':'https://ucfknights.com/sports/cross-country/schedule',
    'ucf|Football':'https://ucfknights.com/sports/football/schedule',
    'ucf|Golf':['https://ucfknights.com/sports/womens-golf/schedule','https://ucfknights.com/sports/mens-golf/schedule','https://ucfknights.com/sports/golf/schedule','https://ucfknights.com/'],
    'ucf|Rowing':['https://ucfknights.com/sports/womens-rowing/schedule','https://ucfknights.com/sports/rowing/schedule','https://ucfknights.com/'],
    'ucf|Soccer':['https://ucfknights.com/sports/womens-soccer/schedule','https://ucfknights.com/sports/mens-soccer/schedule'],
    'ucf|Softball':['https://ucfknights.com/sports/softball/schedule','https://ucfknights.com/'],
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

// ucfknights.com renders each event as a schedule-event-item card: the date
// as "Thu, Sep" / "3" (no year), a "vs."/"at" divider, the opponent name, and
// one result slot holding either the result ("W Win 73-6") or the published
// local time ("12:00 PM EDT", "Time TBA"), plus the game's own Recap link. The
// shared parsers read both these cards and the page's schema data, so every
// upcoming game appeared twice and a phantom Nov 28 final reused the Sep 3
// score and recap.
export function createUcfHandlers({makeEvent,visibleText,absoluteUrl}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  // The card's own Recap link. A recap is dated in its URL (/news/2026/09/4/...);
  // it must fall between the event day and three days after it.
  function cardRecap(block,sourceUrl,day){
    for(const link of block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*)<\/a>/gi)){
      if(!/^Recap$/i.test(visibleText(link[2])))continue;
      const url=absoluteUrl(link[1],sourceUrl);
      let parsed;try{parsed=new URL(url);}catch{continue;}
      const dated=parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(parsed.protocol!=='https:'||parsed.hostname!=='ucfknights.com'||!dated)continue;
      const published=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3]));
      if(published>=day&&published<=day+3*86400000)return url;
    }
    return null;
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
      if(PLACEHOLDER.test(opponent)){
        const heading=tournamentTitle(raw,at,visibleText);
        if(heading)opponent=/^TB[AD]$/i.test(opponent)?heading:`${heading} \u00b7 ${opponent}`;
      }
      if(!opponent||!divider)continue;
      const slot=field(block,/class=["']schedule-event-item-result["'][^>]*>([\s\S]*?)<div\b[^>]*schedule-event-item__dashboard-link/i)||field(block,/schedule-event-item-result__label[^>]*>([\s\S]*?)<\/(?:strong|div)>/i);
      const result=slot.match(/^([WLT])\b(?:\s+(?:Win|Loss|Tie))?\s+(\d+)\s*-\s*(\d+)$/i);
      const clock=result?'':(slot.match(/^\d{1,2}:\d{2}\s*[AP]M\b/i)||[''])[0];
      // Preseason exhibitions publish "Completed" with no score, and a
      // postponed game has no result or new date; neither is a K-State-style
      // final or an upcoming game.
      if(!result&&/^(?:Completed|Postponed|Canceled|Cancelled)\b/i.test(slot))continue;
      const event=makeEvent({school,sport,status:result?'Final':'Upcoming',relation:/^at\b/i.test(divider)?'at':'vs',opponent,date:`${MONTHS[index]} ${day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:clock||null,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      const recapUrl=result?cardRecap(block,sourceUrl,Date.UTC(year,index,day)):null;
      if(recapUrl)event.recap_url=recapUrl;
      // Separate men's and women's pages can list the same opponent on the same
      // day; the team keeps their event ids apart.
      const team=ucfSchool.combinedSports.has(sport)?(String(sourceUrl).match(/\/sports\/(mens|womens)-/)||[])[1]:null;
      if(team)event.id=`${event.id}-${team}`;
      events.push(event);
    }
    return events.length?events:null;
  }
  return{parseSchedule};
}
