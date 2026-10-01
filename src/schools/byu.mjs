// BYU school module. Shared publisher utilities stay in the Worker; this file
// owns byucougars.com routes, BYU's program combinations, its verified
// Instagram tags and its schedule-card reader. Routes started as the exact
// candidates production used before the module existed (route parity); each
// sport is then corrected and verified one at a time.
export const byuSchool={
  id:'byu',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football','Volleyball','Soccer']),
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
    if(end>0)blocks.push({block:raw.slice(open.index,end),index:open.index});
  }
  return blocks;
}

// Cards are grouped under tournament headings ("Exhibition", "Big 12 Soccer
// Tournament Presented by Allstate"). A card whose opponent is still "TBA"
// is named after its tournament.
function tournamentTitle(raw,index,visibleText){
  const start=raw.lastIndexOf('class="schedule-events-by-tournament"',index);
  if(start<0)return'';
  const title=raw.slice(start,index).match(/schedule-events-by-tournament__title[^>]*>([\s\S]*?)<\//i);
  return visibleText(title?.[1]||'').replace(/\s+Presented by\b.*$/i,'').trim();
}

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// byucougars.com renders each event as a schedule-event-item card: the start
// as <time datetime="2026-09-05T18:00:00.000-06:00"> (local time with its
// offset) beside the published clock ("6:00 PM MDT" or "TBA"), a "vs."/"at"
// divider, the opponent name, the result ("W 63-7") and the game's own Recap
// link. The shared parsers read both these cards and the page's schema data,
// so every upcoming game appeared twice and a phantom Nov 28 final reused the
// Sep 5 score and recap.
export function createByuHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,recapArticleText,eventType}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  const isSchoolItself=(name,school)=>[school.short_name,school.name].some(value=>value&&value.toLowerCase()===name.toLowerCase());
  // The card's own Recap link: "<span>Recap</span>" (Football) or a plain
  // relative "/news/..." link reading "Recap" (Volleyball). Preview links never count.
  // A recap is dated in its URL (/news/2026/9/5/...). The page sometimes
  // links another game's recap (the Sep 3 soccer card links the Aug 28
  // Minnesota recap), so the date must fall between the day before the event
  // and three days after it ends.
  function cardRecap(block,sourceUrl,firstDay,lastDay){
    for(const link of block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*)<\/a>/gi)){
      if(!/^Recap\b/i.test(visibleText(link[2])))continue;
      const url=absoluteUrl(link[1],sourceUrl);
      let parsed;try{parsed=new URL(url);}catch{continue;}
      const dated=parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(parsed.protocol!=='https:'||parsed.hostname!=='byucougars.com'||!dated)continue;
      const day=Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3]));
      if(day>=firstDay-86400000&&day<=lastDay+3*86400000)return url;
    }
    return null;
  }
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='byu'||!byuSchool.cardSports.has(sport))return null;
    raw=String(raw||'');
    const events=[];
    for(const {block,index} of cardBlocks(raw)){
      // The datetime attribute is local wall clock; its date is the published day.
      const start=(block.match(/<time\b[^>]*datetime=["'](\d{4})-(\d{2})-(\d{2})T/i)||[]).slice(1).map(Number);
      if(start.length!==3)continue;
      const [year,month,day]=start;
      const divider=field(block,/schedule-event-item__divider[^>]*>([\s\S]*?)<\/strong>/i);
      // Rankings ("#11 Utah", "No. 2 Pittsburgh") describe the week, not the opponent.
      let opponent=field(block,/schedule-event-item__opponent-name[^>]*>([\s\S]*?)<\/strong>/i).replace(/^(?:(?:#|No\.\s*)(?:\d+|RV)\s*\/?\s*)+/i,'').trim();
      if(/^TBA$/i.test(opponent))opponent=tournamentTitle(raw,index,visibleText);
      if(!opponent)continue;
      // Internal games (the volleyball Blue-White Scrimmage, soccer's "vs. BYU"
      // intrasquad) have no opponent divider or list BYU against itself.
      if(eventType(sport)==='GAME'&&(!divider||isSchoolItself(opponent,school)))continue;
      const result=field(block,/schedule-event-item-result__label[^>]*>([\s\S]*?)<\/div>/i).match(/^([WLT])\s+(\d+)\s*-\s*(\d+)$/i);
      const clock=field(block,/schedule-event-date__clock[^>]*>([\s\S]*?)<\/time>/i).replace(/\s+[A-Z]{2,4}$/,'');
      const event=makeEvent({school,sport,status:result?'Final':'Upcoming',relation:/^at\b/i.test(divider)?'at':'vs',opponent,date:`${MONTHS[month-1]} ${day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||!/\d/.test(clock)?null:clock,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      const last=(block.match(/schedule-event-date__wrapper--end[\s\S]*?<time\b[^>]*datetime=["'](\d{4})-(\d{2})-(\d{2})T/i)||[]).slice(1).map(Number);
      const firstDay=Date.UTC(year,month-1,day),lastDay=last.length===3?Date.UTC(last[0],last[1]-1,last[2]):firstDay;
      const recapUrl=cardRecap(block,sourceUrl,firstDay,lastDay);
      if(recapUrl)event.recap_url=recapUrl;
      events.push(event);
    }
    return events.length?events:null;
  }
  // BYU recaps rarely name the sport ("byu-utah-tech", "No. 14 BYU Opens
  // Season with 63-7 Win over Utah Tech"), so the shared matcher rejects every
  // one. A Recap link from the sport's own schedule card is already bound to
  // that sport; the article must still name the opponent and match the date.
  //
  // Any recap for a BYU event must name BYU in its own title or article. The
  // shared opponent-site fallback otherwise accepted a cubuffs.com story about
  // Colorado vs New Mexico for BYU's Sep 3 soccer game with Colorado State.
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='byu')return false;
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    if(!/\b(?:BYU|Brigham Young)\b/i.test(`${title} ${recapArticleText(raw)}`))return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const cardBound=byuSchool.cardSports.has(event.sport)&&url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname==='byucougars.com'&&parsed.pathname.startsWith('/news/');
    return recapMatchesEvent(raw,cardBound?{...event,sport:''}:event,url);
  }
  return{parseSchedule,matchesRecap};
}
