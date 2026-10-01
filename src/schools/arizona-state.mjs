// Arizona State school module. Shared publisher utilities stay in the Worker;
// this file owns thesundevils.com routes, Arizona State's program combinations
// and its schedule-card reader. Routes started as the exact candidates
// production used before the module existed (route parity); each sport is then
// corrected and verified one at a time.
export const arizonaStateSchool={
  id:'arizona-state',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football','Soccer','Volleyball','Baseball','Softball','Basketball','Hockey']),
  // Basketball and Swimming & Diving publish separate men's and women's pages.
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  scheduleUrls:{
    'arizona-state|Baseball':['https://thesundevils.com/sports/baseball/schedule','https://thesundevils.com/'],
    'arizona-state|Basketball':['https://thesundevils.com/sports/mens-basketball/schedule','https://thesundevils.com/sports/womens-basketball/schedule'],
    'arizona-state|Beach Volleyball':['https://thesundevils.com/sports/beach-volleyball/schedule','https://thesundevils.com/'],
    'arizona-state|Cross Country':'https://thesundevils.com/sports/cross-country/schedule',
    'arizona-state|Football':'https://thesundevils.com/sports/football/schedule',
    'arizona-state|Golf':['https://thesundevils.com/sports/womens-golf/schedule','https://thesundevils.com/sports/mens-golf/schedule','https://thesundevils.com/sports/golf/schedule','https://thesundevils.com/'],
    'arizona-state|Gymnastics':['https://thesundevils.com/sports/womens-gymnastics/schedule','https://thesundevils.com/sports/mens-gymnastics/schedule','https://thesundevils.com/sports/gymnastics/schedule','https://thesundevils.com/'],
    'arizona-state|Hockey':'https://thesundevils.com/sports/ice-hockey/schedule',
    'arizona-state|Lacrosse':['https://thesundevils.com/sports/womens-lacrosse/schedule','https://thesundevils.com/sports/mens-lacrosse/schedule','https://thesundevils.com/sports/lacrosse/schedule','https://thesundevils.com/'],
    'arizona-state|Soccer':'https://thesundevils.com/sports/soccer/schedule',
    'arizona-state|Softball':['https://thesundevils.com/sports/softball/schedule','https://thesundevils.com/'],
    'arizona-state|Swimming & Diving':['https://thesundevils.com/sports/mens/swimming-diving/schedule','https://thesundevils.com/sports/womens/swimming-diving/schedule'],
    'arizona-state|Tennis':['https://thesundevils.com/sports/womens-tennis/schedule','https://thesundevils.com/sports/mens-tennis/schedule','https://thesundevils.com/sports/tennis/schedule','https://thesundevils.com/'],
    'arizona-state|Track & Field':['https://thesundevils.com/sports/track-and-field/schedule','https://thesundevils.com/sports/track-field/schedule','https://thesundevils.com/'],
    'arizona-state|Volleyball':'https://thesundevils.com/sports/volleyball/schedule',
    'arizona-state|Water Polo':['https://thesundevils.com/sports/womens-water-polo/schedule','https://thesundevils.com/sports/mens-water-polo/schedule','https://thesundevils.com/sports/water-polo/schedule','https://thesundevils.com/'],
    'arizona-state|Wrestling':['https://thesundevils.com/sports/wrestling/schedule','https://thesundevils.com/']
  },
  rosterUrls:{
    'arizona-state|Baseball':'https://thesundevils.com/sports/baseball/roster',
    'arizona-state|Basketball':['https://thesundevils.com/sports/mens-basketball/roster','https://thesundevils.com/sports/womens-basketball/roster','https://thesundevils.com/sports/basketball/roster'],
    'arizona-state|Beach Volleyball':'https://thesundevils.com/sports/beach-volleyball/roster',
    'arizona-state|Cross Country':'https://thesundevils.com/sports/cross-country/roster',
    'arizona-state|Football':'https://thesundevils.com/sports/football/roster',
    'arizona-state|Golf':['https://thesundevils.com/sports/womens-golf/roster','https://thesundevils.com/sports/mens-golf/roster','https://thesundevils.com/sports/golf/roster'],
    'arizona-state|Gymnastics':['https://thesundevils.com/sports/womens-gymnastics/roster','https://thesundevils.com/sports/mens-gymnastics/roster','https://thesundevils.com/sports/gymnastics/roster'],
    'arizona-state|Hockey':['https://thesundevils.com/sports/mens-ice-hockey/roster','https://thesundevils.com/sports/womens-ice-hockey/roster','https://thesundevils.com/sports/ice-hockey/roster','https://thesundevils.com/sports/hockey/roster'],
    'arizona-state|Lacrosse':['https://thesundevils.com/sports/womens-lacrosse/roster','https://thesundevils.com/sports/mens-lacrosse/roster','https://thesundevils.com/sports/lacrosse/roster'],
    'arizona-state|Soccer':['https://thesundevils.com/sports/womens-soccer/roster','https://thesundevils.com/sports/wsoc/roster','https://thesundevils.com/sports/soccer/roster','https://thesundevils.com/sports/mens-soccer/roster'],
    'arizona-state|Softball':'https://thesundevils.com/sports/softball/roster',
    'arizona-state|Swimming & Diving':['https://thesundevils.com/sports/womens-swimming-and-diving/roster','https://thesundevils.com/sports/mens-swimming-and-diving/roster','https://thesundevils.com/sports/womens-swimming-diving/roster','https://thesundevils.com/sports/mens-swimming-diving/roster','https://thesundevils.com/sports/swimming-and-diving/roster','https://thesundevils.com/sports/swimming-diving/roster','https://thesundevils.com/sports/swimming/roster'],
    'arizona-state|Tennis':['https://thesundevils.com/sports/womens-tennis/roster','https://thesundevils.com/sports/mens-tennis/roster','https://thesundevils.com/sports/tennis/roster'],
    'arizona-state|Track & Field':['https://thesundevils.com/sports/track-and-field/roster','https://thesundevils.com/sports/track-field/roster'],
    'arizona-state|Volleyball':['https://thesundevils.com/sports/womens-volleyball/roster','https://thesundevils.com/sports/wvball/roster','https://thesundevils.com/sports/volleyball/roster'],
    'arizona-state|Water Polo':['https://thesundevils.com/sports/womens-water-polo/roster','https://thesundevils.com/sports/mens-water-polo/roster','https://thesundevils.com/sports/water-polo/roster'],
    'arizona-state|Wrestling':'https://thesundevils.com/sports/wrestling/roster'
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
    if(end>0)blocks.push({opening:open[0],block:raw.slice(open.index,end)});
  }
  return blocks;
}

const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
// The page's JSON-LD lists every event with its full start time (UTC). Cards
// show only month and day, and a page titled "2027 Baseball Schedule" also
// holds fall 2026 games, so each card's year comes from these dates.
// Arizona keeps Mountain Standard Time all year (UTC-7).
function publishedDays(raw){
  const days=new Set();
  for(const script of raw.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    let data;try{data=JSON.parse(script[1]);}catch{continue;}
    for(const item of [].concat(data?.['@graph']||data)){
      const value=String(item?.startDate||'');
      if(/^\d{4}-\d{2}-\d{2}$/.test(value)){days.add(value);continue;}
      const time=Date.parse(value);
      if(Number.isFinite(time))days.add(new Date(time-7*3600000).toISOString().slice(0,10));
    }
  }
  return days;
}
// Spring pages keep showing last season until the next one is published. Only
// the current academic year (July-June, Arizona time) is current; a page with
// none is a valid empty schedule, not a failed source.
function academicYear(now){const local=new Date(now.getTime()-7*3600000);return local.getUTCMonth()>=6?local.getUTCFullYear():local.getUTCFullYear()-1;}

// thesundevils.com renders each event as a schedule-event-item card: the date
// as <time>Sep</time><time>5</time>, the local time ("7:00 p.m. (MST)" or
// "TBA"), a "vs."/"at" divider inside the opponent name, the published result
// ("W Win 70-7") and the game's own Recap link. The shared WMT card reader
// takes the divider for the opponent on this layout, so home games collapse
// into one "ASU vs vs." event and evening games move to the next UTC day.
export function createArizonaStateHandlers({makeEvent,visibleText,scheduleYearForDate,absoluteUrl}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]);
  const emptiedBySeason=new WeakSet();
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='arizona-state'||!arizonaStateSchool.cardSports.has(sport))return null;
    raw=String(raw||'');
    const cards=cardBlocks(raw);
    if(!cards.length)return null;
    const events=[],days=publishedDays(raw),season=academicYear(now);let pastSeason=0;
    const yearFor=(month,day)=>{
      const index=MONTHS.indexOf(month.slice(0,3).toLowerCase()),key=`${String(index+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const years=[season,season+1].filter(year=>days.has(`${year}-${key}`));
      return years.length===1?years[0]:scheduleYearForDate(raw,month,now);
    };
    for(const {opening,block} of cards){
      const dateBox=(block.match(/schedule-event-grid-date-mobile__box[^>]*>([\s\S]*?)<\/strong>/i)||[])[1]||'';
      const [month,day]=[...dateBox.matchAll(/<time\b[^>]*>([\s\S]*?)<\/time>/gi)].map(x=>visibleText(x[1]));
      if(!/^[A-Za-z]{3,9}$/.test(month||'')||!/^\d{1,2}$/.test(day||''))continue;
      // The name holds the divider as a nested <strong>, so skip past it first.
      const nameHtml=(block.match(/<strong\b[^>]*class=["']schedule-default-event__name["'][^>]*>((?:<strong\b[^>]*>[\s\S]*?<\/strong>)?[\s\S]*?)<\/strong>/i)||[])[1]||'';
      const divider=field(nameHtml,/schedule-default-event__divider[^>]*>([\s\S]*?)<\/strong>/i);
      // Rankings ("#10/#9 Texas A&M") describe the week, not the opponent.
      const opponent=visibleText(nameHtml.replace(/<strong\b[^>]*schedule-default-event__divider[\s\S]*?<\/strong>/i,'')).replace(/^(?:#(?:\d+|RV)\s*\/?\s*)+/i,'').trim();
      if(!opponent)continue;
      const completed=/schedule-event-item--completed/i.test(opening);
      const result=field(block,/schedule-event-grid-result__label[^>]*>([\s\S]*?)<\/strong>\s*<!---->/i).match(/^([WLT])\b(?:\s+(?:Win|Loss|Tie))?\s+(\d+)\s*-\s*(\d+)$/i);
      const timeText=field(block,/schedule-event-grid-date__time[^>]*>([\s\S]*?)<\/strong>/i).replace(/\s*\([A-Z]{2,4}\)\s*$/,'');
      const year=yearFor(month,day);
      if(year!==season&&!(year===season+1&&MONTHS.indexOf(month.slice(0,3).toLowerCase())<6)){pastSeason++;continue;}
      const date=`${month} ${day}, ${year}`;
      const event=makeEvent({school,sport,status:completed?'Final':'Upcoming',relation:/^at\b/i.test(divider)?'at':'vs',opponent,date,
        // K-State's results show the date only; upcoming games show the published time.
        time:completed||!/\d/.test(timeText)?null:timeText,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      const recap=(block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*schedule-event-recap-link/i)||[])[1];
      const recapUrl=recap?absoluteUrl(recap,sourceUrl):null;
      if(recapUrl&&new URL(recapUrl).hostname==='thesundevils.com'&&new URL(recapUrl).pathname.startsWith('/news/'))event.recap_url=recapUrl;
      events.push(event);
    }
    if(!events.length){if(!pastSeason)return null;emptiedBySeason.add(events);}
    return events;
  }
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptiedBySeason.has(events);
  return{parseSchedule,isEmptySchedule};
}
