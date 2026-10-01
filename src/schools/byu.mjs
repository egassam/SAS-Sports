// BYU school module. Shared publisher utilities stay in the Worker; this file
// owns byucougars.com routes, BYU's program combinations, its verified
// Instagram tags and its schedule-card reader. Routes started as the exact
// candidates production used before the module existed (route parity); each
// sport is then corrected and verified one at a time.
export const byuSchool={
  id:'byu',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football','Volleyball','Soccer','Cross Country','Basketball','Baseball','Softball','Golf']),
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team. Cross Country's teams mostly run different meets.
  combinedSports:new Set(['Basketball','Swimming & Diving','Cross Country','Golf']),
  verifiedInstagrams:{
    'byu|Soccer|Chelsea Peterson':'https://www.instagram.com/chelseapeterson__/',
    'byu|Soccer|Mia Goettsche':'https://www.instagram.com/mia.goettsche/',
    'byu|Soccer|Brynnli Tolbert':'https://www.instagram.com/brynnb09/'
  },
  scheduleUrls:{
    'byu|Baseball':'https://byucougars.com/sports/baseball/schedule',
    'byu|Basketball':['https://byucougars.com/sports/mens-basketball/schedule','https://byucougars.com/sports/womens-basketball/schedule'],
    'byu|Cross Country':['https://byucougars.com/sports/womens-cross-country/schedule','https://byucougars.com/sports/mens-cross-country/schedule'],
    'byu|Football':'https://byucougars.com/sports/football/schedule',
    'byu|Golf':['https://byucougars.com/sports/mens-golf/schedule','https://byucougars.com/sports/womens-golf/schedule'],
    'byu|Gymnastics':['https://byucougars.com/sports/womens-gymnastics/schedule','https://byucougars.com/sports/mens-gymnastics/schedule','https://byucougars.com/sports/gymnastics/schedule','https://byucougars.com/'],
    'byu|Soccer':'https://byucougars.com/sports/womens-soccer/schedule',
    'byu|Softball':'https://byucougars.com/sports/softball/schedule',
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

// Cross Country recaps carry their results as tables in four layouts:
// PLACE/ATHLETE/SCHOOL/TIME (top 10 overall), PLACE/TEAM/SCORE (skipped),
// RUNNER/SCHOOL/TIME (no place column) and Name/Time/Finish (BYU only).
// Only BYU runners are kept; a time without a published place stays a time.
export function parseByuRecapResults(raw,{decodeHtml,ordinal,group}){
  const text=value=>decodeHtml(String(value).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
  const rows=[],seen=new Set();
  for(const table of String(raw||'').matchAll(/<table\b[\s\S]*?<\/table>/gi)){
    const cells=[...table[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(tr=>[...tr[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>text(cell[1])));
    if(!cells.length)continue;
    const head=cells[0].map(value=>value.toLowerCase()),column=names=>head.findIndex(value=>names.includes(value));
    const name=column(['athlete','runner','name']),time=column(['time']),place=column(['place','finish']),team=column(['school']);
    if(name<0||time<0)continue;
    for(const row of cells.slice(1)){
      if(team>=0&&!/^BYU$/i.test(row[team]||''))continue;
      const participant=row[name],clock=(row[time]||'').match(/^\d{1,2}:\d{2}(?:\.\d+)?$/);
      if(!participant||!clock||seen.has(participant))continue;
      const finish=place>=0?(row[place]||'').match(/^(\d{1,3})(?:st|nd|rd|th)?$/i):null;
      seen.add(participant);rows.push({group,participant,result:finish?`${ordinal(finish[1])} \u00b7 ${clock[0]}`:clock[0]});
    }
  }
  return rows;
}

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// byucougars.com renders each event as a schedule-event-item card: the start
// as <time datetime="2026-09-05T18:00:00.000-06:00"> (local time with its
// offset) beside the published clock ("6:00 PM MDT" or "TBA"), a "vs."/"at"
// divider, the opponent name, the result ("W 63-7") and the game's own Recap
// link. The shared parsers read both these cards and the page's schema data,
// so every upcoming game appeared twice and a phantom Nov 28 final reused the
// Sep 5 score and recap.
export function createByuHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,recapArticleText,eventType,decodeHtml,ordinal,fetch,headers}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  // Today in Mountain time (BYU's cards are Mountain wall clock).
  const mountainToday=now=>{const local=new Date(now.getTime()-7*3600000);return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());};
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
      if(/^TB[AD]$/i.test(opponent))opponent=tournamentTitle(raw,index,visibleText);
      if(!opponent)continue;
      // Internal games (the volleyball Blue-White Scrimmage, soccer's "vs. BYU"
      // intrasquad) have no opponent divider or list BYU against itself.
      if(eventType(sport)==='GAME'&&(!divider||isSchoolItself(opponent,school)))continue;
      const result=field(block,/schedule-event-item-result__label[^>]*>([\s\S]*?)<\/div>/i).match(/^([WLT])\s+(\d+)\s*-\s*(\d+)$/i);
      const clock=field(block,/schedule-event-date__clock[^>]*>([\s\S]*?)<\/time>/i).replace(/\s+[A-Z]{2,4}$/,'');
      // Meets publish a team finish as text ("1st - 19 points").
      const meet=eventType(sport)!=='GAME';
      const resultText=meet?field(block,/class=["']schedule-event-item-result__text["'][^>]*>([\s\S]*?)<\//i):'';
      const placing=resultText.match(/^(\d{1,3})(?:st|nd|rd|th)?\s*-\s*(\d+)\s*points?$/i);
      // Golf: "9th (María José Barragán - T-6th)", the team place then the best
      // individual. K-State reads "1st of 12 (864)"; the field and score are
      // not published here, so the team place is shown alone.
      const golfPlace=sport==='Golf'?resultText.match(/^(T-?)?(\d{1,3})(?:st|nd|rd|th)?\b/i):null;
      const last=(block.match(/schedule-event-date__wrapper--end[\s\S]*?<time\b[^>]*datetime=["'](\d{4})-(\d{2})-(\d{2})T/i)||[]).slice(1).map(Number);
      const firstDay=Date.UTC(year,month-1,day),lastDay=last.length===3?Date.UTC(last[0],last[1]-1,last[2]):firstDay;
      // A meet whose last day has passed is over, published result or not.
      const over=meet&&(placing||golfPlace||lastDay<mountainToday(now));
      const event=makeEvent({school,sport,status:result||over?'Final':'Upcoming',relation:/^at\b/i.test(divider)||meet&&!divider?'at':'vs',opponent,date:`${MONTHS[month-1]} ${day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||over||!/\d/.test(clock)?null:clock,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      // Multi-day meets (golf, swimming invitationals) end later; the recap
      // that reports the result is published on or after the last day.
      if(meet&&lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      const recapUrl=cardRecap(block,sourceUrl,firstDay,lastDay);
      // Separate men's and women's pages can list the same meet on the same
      // day; the team keeps their event ids apart.
      const team=byuSchool.combinedSports.has(sport)?(String(sourceUrl).match(/\/sports\/(mens|womens)-/)||[])[1]:null;
      if(team)event.id=`${event.id}-${team}`;
      if(placing){const value=`${ordinal(placing[1])} \u00b7 ${placing[2]} pts`;event.headline=`${team==='mens'?"Men's":team==='womens'?"Women's":'BYU'} team: ${value}`;event.results=[{label:'Result',value}];event.result_count=1;}
      else if(golfPlace){const value=`${golfPlace[1]?'T':''}${ordinal(golfPlace[2])}`;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
      else if(event.status==='Final'&&meet&&!event.headline){event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;}
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
    // A story from the middle of a multi-day meet ("BYU in fourth after day
    // one") is not its result: the recap must be dated on or after the last day.
    if(event.end_time){
      const dated=parsed.pathname.match(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(!dated||Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3]))<Date.parse(event.end_time.slice(0,10)+'T00:00:00Z'))return false;
    }
    // Golf posts in-progress stories under the same date ("Walker, BYU in
    // second after day one of Red Raider Invitational"). The result recap is
    // the one whose title states the final team place ("Cougars finish ninth",
    // "Men's golf takes third", "wins" for first).
    if(event.sport==='Golf'&&event.status==='Final'){
      const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
      if(/\b(?:day|round) (?:one|two|three|1|2|3)\b|\bsuspend/i.test(title))return false;
      const place=Number((String(event.headline||'').match(/\d+/)||[])[0]);
      const words=['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth'];
      if(place&&!(new RegExp(`\\b(?:${words[place]||'-'}|${ordinal(place)})\\b`,'i').test(title)||place===1&&/\bwins?\b|\bchampions?\b/i.test(title)))return false;
    }
    const cardBound=byuSchool.cardSports.has(event.sport)&&url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname==='byucougars.com'&&parsed.pathname.startsWith('/news/');
    return recapMatchesEvent(raw,cardBound?{...event,sport:''}:event,url);
  }
  const isByuCrossCountry=event=>event?.school_id==='byu'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  // Feed and expanded view both call this; the second call is a no-op. Race
  // rows come from the meet's own card-bound recap.
  async function attachMeetResults(event){
    if(!isByuCrossCountry(event))return event;
    if(event.meet_results_verified)return event;
    const unavailable=status=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';event.highlight_status=status;
      return event;
    };
    const failed='Official race results could not be loaded. Open the official recap.';
    if(!event.recap_url)return unavailable('No official recap is published for this meet on byucougars.com.');
    let raw;
    try{
      const response=await fetch(event.recap_url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});
      if(!response.ok)return unavailable(failed);raw=await response.text();
    }catch{return unavailable(failed);}
    if(!matchesRecap(raw,event,event.recap_url))return unavailable(failed);
    const team=/-mens$/.test(event.id)?"Men's":/-womens$/.test(event.id)?"Women's":'BYU';
    // Recaps mention splits and other races ("the first 5,000-meters", an
    // 8,000-meter race elsewhere), so no distance is claimed: "Women's race".
    const group=`${team} race`;
    const runners=parseByuRecapResults(raw,{decodeHtml,ordinal,group});
    if(!runners.length)return unavailable(failed);
    const teamResult=String(event.headline||'').match(/team: (.+)$/);
    const rows=[...(teamResult?[{group,participant:'BYU team',result:teamResult[1]}]:[]),...runners];
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;
    event.recap_result_count=rows.length;
    event.source={...event.source,name:'Official athletics meet recap',url:event.recap_url};
    const leader=runners[0];
    event.highlights=[`${leader.participant} led BYU in the ${group.replace(/^\w+/,word=>word.toLowerCase())}, finishing ${leader.result.includes(' \u00b7 ')?leader.result.replace(' \u00b7 ',' in '):`in ${leader.result}`}.`];
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  return{parseSchedule,matchesRecap,isByuCrossCountry,attachMeetResults};
}
