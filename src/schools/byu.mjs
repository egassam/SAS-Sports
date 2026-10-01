// BYU school module. Shared publisher utilities stay in the Worker; this file
// owns byucougars.com routes, BYU's program combinations, its verified
// Instagram tags and its schedule-card reader. Routes started as the exact
// candidates production used before the module existed (route parity); each
// sport is then corrected and verified one at a time.
export const byuSchool={
  id:'byu',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football']),
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  verifiedInstagrams:{
    'byu|Soccer|Chelsea Peterson':'https://www.instagram.com/chelseapeterson__/',
    'byu|Soccer|Mia Goettsche':'https://www.instagram.com/mia.goettsche/',
    'byu|Soccer|Brynnli Tolbert':'https://www.instagram.com/brynnb09/'
  },
  scheduleUrls:{
    'byu|Baseball':['https://byucougars.com/sports/baseball/schedule','https://byucougars.com/'],
    'byu|Basketball':['https://byucougars.com/sports/mens-basketball/schedule','https://byucougars.com/sports/womens-basketball/schedule','https://byucougars.com/sports/basketball/schedule','https://byucougars.com/'],
    'byu|Cross Country':'https://byucougars.com/sports/womens-cross-country/schedule',
    'byu|Football':'https://byucougars.com/sports/football/schedule',
    'byu|Golf':['https://byucougars.com/sports/womens-golf/schedule','https://byucougars.com/sports/mens-golf/schedule','https://byucougars.com/sports/golf/schedule','https://byucougars.com/'],
    'byu|Gymnastics':['https://byucougars.com/sports/womens-gymnastics/schedule','https://byucougars.com/sports/mens-gymnastics/schedule','https://byucougars.com/sports/gymnastics/schedule','https://byucougars.com/'],
    'byu|Soccer':'https://byucougars.com/sports/womens-soccer/schedule',
    'byu|Softball':['https://byucougars.com/sports/softball/schedule','https://byucougars.com/'],
    'byu|Swimming & Diving':['https://byucougars.com/sports/womens-swimming-and-diving/schedule','https://byucougars.com/sports/mens-swimming-and-diving/schedule','https://byucougars.com/sports/womens-swimming-diving/schedule','https://byucougars.com/sports/mens-swimming-diving/schedule','https://byucougars.com/sports/swimming-and-diving/schedule','https://byucougars.com/sports/swimming-diving/schedule','https://byucougars.com/sports/swimming/schedule','https://byucougars.com/'],
    'byu|Tennis':['https://byucougars.com/sports/womens-tennis/schedule','https://byucougars.com/sports/mens-tennis/schedule','https://byucougars.com/sports/tennis/schedule','https://byucougars.com/'],
    'byu|Track & Field':['https://byucougars.com/sports/track-and-field/schedule','https://byucougars.com/sports/track-field/schedule','https://byucougars.com/'],
    'byu|Volleyball':'https://byucougars.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'byu|Baseball':'https://byucougars.com/sports/baseball/roster',
    'byu|Basketball':['https://byucougars.com/sports/mens-basketball/roster','https://byucougars.com/sports/womens-basketball/roster','https://byucougars.com/sports/basketball/roster'],
    'byu|Cross Country':['https://byucougars.com/sports/mens-cross-country/roster','https://byucougars.com/sports/womens-cross-country/roster'],
    'byu|Football':'https://byucougars.com/sports/football/roster',
    'byu|Golf':['https://byucougars.com/sports/womens-golf/roster','https://byucougars.com/sports/mens-golf/roster','https://byucougars.com/sports/golf/roster'],
    'byu|Gymnastics':['https://byucougars.com/sports/womens-gymnastics/roster','https://byucougars.com/sports/mens-gymnastics/roster','https://byucougars.com/sports/gymnastics/roster'],
    'byu|Soccer':'https://byucougars.com/sports/womens-soccer/roster',
    'byu|Softball':'https://byucougars.com/sports/softball/roster',
    'byu|Swimming & Diving':['https://byucougars.com/sports/womens-swimming-and-diving/roster','https://byucougars.com/sports/mens-swimming-and-diving/roster','https://byucougars.com/sports/womens-swimming-diving/roster','https://byucougars.com/sports/mens-swimming-diving/roster','https://byucougars.com/sports/swimming-and-diving/roster','https://byucougars.com/sports/swimming-diving/roster','https://byucougars.com/sports/swimming/roster'],
    'byu|Tennis':['https://byucougars.com/sports/womens-tennis/roster','https://byucougars.com/sports/mens-tennis/roster','https://byucougars.com/sports/tennis/roster'],
    'byu|Track & Field':['https://byucougars.com/sports/track-and-field/roster','https://byucougars.com/sports/track-field/roster'],
    'byu|Volleyball':'https://byucougars.com/sports/womens-volleyball/roster'
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
    if(end>0)blocks.push(raw.slice(open.index,end));
  }
  return blocks;
}

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// byucougars.com renders each event as a schedule-event-item card: the start
// as <time datetime="2026-09-05T18:00:00.000-06:00"> (local time with its
// offset) beside the published clock ("6:00 PM MDT" or "TBA"), a "vs."/"at"
// divider, the opponent name, the result ("W 63-7") and the game's own Recap
// link. The shared parsers read both these cards and the page's schema data,
// so every upcoming game appeared twice and a phantom Nov 28 final reused the
// Sep 5 score and recap.
export function createByuHandlers({makeEvent,visibleText,absoluteUrl}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='byu'||!byuSchool.cardSports.has(sport))return null;
    raw=String(raw||'');
    const events=[];
    for(const block of cardBlocks(raw)){
      // The datetime attribute is local wall clock; its date is the published day.
      const start=(block.match(/<time\b[^>]*datetime=["'](\d{4})-(\d{2})-(\d{2})T/i)||[]).slice(1).map(Number);
      if(start.length!==3)continue;
      const [year,month,day]=start;
      const divider=field(block,/schedule-event-item__divider[^>]*>([\s\S]*?)<\/strong>/i);
      // Rankings ("#11 Utah") describe the week, not the opponent.
      const opponent=field(block,/schedule-event-item__opponent-name[^>]*>([\s\S]*?)<\/strong>/i).replace(/^(?:#(?:\d+|RV)\s*\/?\s*)+/i,'').trim();
      if(!opponent)continue;
      const result=field(block,/schedule-event-item-result__label[^>]*>([\s\S]*?)<\/div>/i).match(/^([WLT])\s+(\d+)\s*-\s*(\d+)$/i);
      const clock=field(block,/schedule-event-date__clock[^>]*>([\s\S]*?)<\/time>/i).replace(/\s+[A-Z]{2,4}$/,'');
      const event=makeEvent({school,sport,status:result?'Final':'Upcoming',relation:/^at\b/i.test(divider)?'at':'vs',opponent,date:`${MONTHS[month-1]} ${day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||!/\d/.test(clock)?null:clock,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      const recap=(block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*<span\b[^>]*schedule-event-item-links__title[^>]*>\s*Recap\s*<\/span>/i)||[])[1];
      const recapUrl=recap?absoluteUrl(recap,sourceUrl):null;
      if(recapUrl&&new URL(recapUrl).hostname==='byucougars.com'&&new URL(recapUrl).pathname.startsWith('/news/'))event.recap_url=recapUrl;
      events.push(event);
    }
    return events.length?events:null;
  }
  return{parseSchedule};
}
