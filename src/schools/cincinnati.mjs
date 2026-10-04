// Cincinnati school module. Shared publisher utilities stay in the Worker;
// this file owns gobearcats.com routes, Cincinnati's program combinations, its
// verified Instagram tags and its schedule-card reader. Routes started as the
// exact candidates production used before the module existed (route parity);
// each sport is then corrected and verified one at a time.
export const cincinnatiSchool={
  id:'cincinnati',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football']),
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  verifiedInstagrams:{
    'cincinnati|Soccer|Tiana Campbell':'https://www.instagram.com/tianagcampbell/'
  },
  scheduleUrls:{
    'cincinnati|Baseball':['https://gobearcats.com/sports/baseball/schedule','https://gobearcats.com/'],
    'cincinnati|Basketball':['https://gobearcats.com/sports/mens-basketball/schedule','https://gobearcats.com/sports/womens-basketball/schedule','https://gobearcats.com/sports/basketball/schedule','https://gobearcats.com/'],
    'cincinnati|Cross Country':'https://gobearcats.com/sports/cross-country/schedule',
    'cincinnati|Football':'https://gobearcats.com/sports/football/schedule',
    'cincinnati|Golf':['https://gobearcats.com/sports/womens-golf/schedule','https://gobearcats.com/sports/mens-golf/schedule','https://gobearcats.com/sports/golf/schedule','https://gobearcats.com/'],
    'cincinnati|Lacrosse':['https://gobearcats.com/sports/womens-lacrosse/schedule','https://gobearcats.com/sports/mens-lacrosse/schedule','https://gobearcats.com/sports/lacrosse/schedule','https://gobearcats.com/'],
    'cincinnati|Soccer':'https://gobearcats.com/sports/womens-soccer/schedule',
    'cincinnati|Swimming & Diving':['https://gobearcats.com/sports/womens-swimming-and-diving/schedule','https://gobearcats.com/sports/mens-swimming-and-diving/schedule','https://gobearcats.com/sports/womens-swimming-diving/schedule','https://gobearcats.com/sports/mens-swimming-diving/schedule','https://gobearcats.com/sports/swimming-and-diving/schedule','https://gobearcats.com/sports/swimming-diving/schedule','https://gobearcats.com/sports/swimming/schedule','https://gobearcats.com/'],
    'cincinnati|Track & Field':['https://gobearcats.com/sports/track-and-field/schedule','https://gobearcats.com/sports/track-field/schedule','https://gobearcats.com/'],
    'cincinnati|Volleyball':'https://gobearcats.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'cincinnati|Baseball':'https://gobearcats.com/sports/baseball/roster',
    'cincinnati|Basketball':['https://gobearcats.com/sports/mens-basketball/roster','https://gobearcats.com/sports/womens-basketball/roster','https://gobearcats.com/sports/basketball/roster'],
    'cincinnati|Cross Country':'https://gobearcats.com/sports/cross-country/roster',
    'cincinnati|Football':'https://gobearcats.com/sports/football/roster',
    'cincinnati|Golf':['https://gobearcats.com/sports/womens-golf/roster','https://gobearcats.com/sports/mens-golf/roster','https://gobearcats.com/sports/golf/roster'],
    'cincinnati|Lacrosse':['https://gobearcats.com/sports/womens-lacrosse/roster','https://gobearcats.com/sports/mens-lacrosse/roster','https://gobearcats.com/sports/lacrosse/roster'],
    'cincinnati|Soccer':['https://gobearcats.com/sports/womens-soccer/roster','https://gobearcats.com/sports/wsoc/roster','https://gobearcats.com/sports/soccer/roster','https://gobearcats.com/sports/mens-soccer/roster'],
    'cincinnati|Swimming & Diving':['https://gobearcats.com/sports/womens-swimming-and-diving/roster','https://gobearcats.com/sports/mens-swimming-and-diving/roster','https://gobearcats.com/sports/womens-swimming-diving/roster','https://gobearcats.com/sports/mens-swimming-diving/roster','https://gobearcats.com/sports/swimming-and-diving/roster','https://gobearcats.com/sports/swimming-diving/roster','https://gobearcats.com/sports/swimming/roster'],
    'cincinnati|Track & Field':['https://gobearcats.com/sports/track-and-field/roster','https://gobearcats.com/sports/track-field/roster'],
    'cincinnati|Volleyball':['https://gobearcats.com/sports/womens-volleyball/roster','https://gobearcats.com/sports/wvball/roster','https://gobearcats.com/sports/volleyball/roster']
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

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Today in Eastern time (Cincinnati's cards are Eastern wall clock).
const easternDay=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));

// gobearcats.com renders each event as a schedule-event-item card: the start
// as <time datetime="2026-10-03T23:00:00.000-04:00"> (Eastern wall clock with
// its offset) beside the visible day ("Oct 3"), a "vs."/"at" divider, the
// opponent, and one result slot holding either the result ("W Win 31-26") or
// the published time ("11:00 PM EDT"); unscheduled games carry the
// "time-tba" date class and an empty slot. The shared parsers read both these
// cards and the page's schema data (UTC): the Oct 3 night game at Arizona
// appeared on Oct 3 and Oct 4, and a phantom Nov 28 game at BYU reused the
// Sep 5 recap.
export function createCincinnatiHandlers({makeEvent,visibleText,absoluteUrl}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  // The card's own Recap link. A recap is dated in its URL
  // (/news/2026/09/27/...); it must fall between the event day and three
  // days after it.
  function cardRecap(block,sourceUrl,firstDay,lastDay){
    for(const link of block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*)<\/a>/gi)){
      if(!/^Recap\b/i.test(visibleText(link[2])))continue;
      const url=absoluteUrl(link[1],sourceUrl);
      let parsed;try{parsed=new URL(url);}catch{continue;}
      const dated=parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(parsed.protocol!=='https:'||parsed.hostname!=='gobearcats.com'||!dated)continue;
      const day=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3]));
      if(day>=firstDay&&day<=lastDay+3*86400000)return url;
    }
    return null;
  }
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='cincinnati'||!cincinnatiSchool.cardSports.has(sport))return null;
    let host;try{host=new URL(sourceUrl);}catch{return null;}
    if(host.hostname!=='gobearcats.com'||!/^\/sports\/[^/]+\/schedule\/?$/.test(host.pathname))return null;
    raw=String(raw||'');
    const events=[];
    for(const {block} of cardBlocks(raw)){
      // The datetime attribute is Eastern wall clock; its date is the published day.
      const start=(block.match(/schedule-event-date__wrapper--start[\s\S]*?<time\b[^>]*datetime=["'](\d{4})-(\d{2})-(\d{2})T/i)||[]).slice(1).map(Number);
      if(start.length!==3)continue;
      const [year,month,day]=start;
      // The visible day must agree with the datetime ("Oct 3").
      const shown=field(block,/schedule-event-date__day[^>]*>([\s\S]*?)<\/time>/i).match(/^([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/);
      if(shown&&(MONTHS.indexOf(shown[1])!==month-1||Number(shown[2])!==day))continue;
      const divider=field(block,/schedule-default-event__divider[^>]*>([\s\S]*?)<\/strong>/i);
      // Rankings ("#11 TCU", "#RV Kansas State") describe the week, not the opponent.
      const opponent=field(block,/class=["']schedule-default-event__name["'][^>]*>([\s\S]*?)<\/strong>/i).replace(/^(?:#(?:\d+|RV)\s+)+/i,'').trim();
      if(!opponent||!divider)continue;
      const slot=field(block,/schedule-event-item__result[^>]*>([\s\S]*?)<div\b[^>]*schedule-event-item__dashboard-link/i);
      const result=slot.match(/^([WLT])\s+(?:Win|Loss|Tie)\s+(\d+)\s*-\s*(\d+)\b/i);
      // "11:00 PM EDT": the published Eastern time; "TBA" or an empty slot
      // with the time-tba date class is the date alone.
      const clock=result||/schedule-event-date--time-tba/i.test(block)?'':(slot.match(/^\d{1,2}:\d{2}\s*[AP]M\b/i)||[''])[0];
      const firstDay=Date.UTC(year,month-1,day);
      const event=makeEvent({school,sport,status:result?'Final':'Upcoming',relation:/^at\b/i.test(divider)?'at':'vs',opponent,date:`${MONTHS[month-1]} ${day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result?null:clock||null,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      const recapUrl=result?cardRecap(block,sourceUrl,firstDay,firstDay):null;
      if(recapUrl)event.recap_url=recapUrl;
      events.push(event);
    }
    return events.length?events:null;
  }
  return{parseSchedule};
}
