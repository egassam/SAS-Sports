// Cincinnati school module. Shared publisher utilities stay in the Worker;
// this file owns gobearcats.com routes, Cincinnati's program combinations, its
// verified Instagram tags and its schedule-card reader. Routes started as the
// exact candidates production used before the module existed (route parity);
// each sport is then corrected and verified one at a time.
export const cincinnatiSchool={
  id:'cincinnati',
  // Sports whose official schedule cards this module reads itself (see
  // parseSchedule). Every other sport keeps the shared parsers.
  cardSports:new Set(['Football','Volleyball','Soccer','Cross Country','Basketball','Baseball','Golf']),
  // Live game state comes from an independent scoreboard, as for K-State;
  // the official cards stay the schedule and results source of record.
  liveScoreboards:{
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    Baseball:[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    // Both teams, labeled to match the official men's and women's cards.
    Basketball:[
      {path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},
      {path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}
    ]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Swimming & Diving','Golf']),
  verifiedInstagrams:{
    'cincinnati|Soccer|Tiana Campbell':'https://www.instagram.com/tianagcampbell/'
  },
  scheduleUrls:{
    'cincinnati|Baseball':'https://gobearcats.com/sports/baseball/schedule',
    'cincinnati|Basketball':['https://gobearcats.com/sports/mens-basketball/schedule','https://gobearcats.com/sports/womens-basketball/schedule'],
    'cincinnati|Cross Country':'https://gobearcats.com/sports/cross-country/schedule',
    'cincinnati|Football':'https://gobearcats.com/sports/football/schedule',
    'cincinnati|Golf':['https://gobearcats.com/sports/mens-golf/schedule','https://gobearcats.com/sports/womens-golf/schedule'],
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

// TFRRS (the collegiate results database) publishes each meet's complete
// scored results as plain tables ("Women's Gold Invite 6k Team Results (6k)",
// "2026 Redhawk Rumble - Men's Race Individual Results (6k)"). Cincinnati's
// recaps list only its top runners (7 of the 8 women at Gans Creek, 10 of 12
// at the RedHawk Rumble); its two TFRRS team pages list every meet with its
// date.
export const CINCINNATI_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/OH_college_f_Cincinnati.html',Men:'https://www.tfrrs.org/teams/xc/OH_college_m_Cincinnati.html'};
const tfrrsText=(decodeHtml,value)=>decodeHtml(String(value).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const tfrrsCells=(decodeHtml,tr)=>[...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>tfrrsText(decodeHtml,cell[1]));
// The team page's row for this meet: the same date and at least one shared
// distinctive word. Names differ between the two sites ("All-Ohio
// Intercollegiate Classic" on the schedule, "All-Ohio InterCollegiate
// Challenge" on TFRRS); a team runs one meet a day.
const GENERIC=new Set(['classic','challenge','invitational','invite','championships','championship','meet','cross','country','open','college','university']);
export function findCincinnatiTfrrsMeet(raw,{decodeHtml,date,name}){
  const words=value=>tfrrsText(decodeHtml,value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(word=>word.length>=4&&!GENERIC.has(word)&&!/^\d+$/.test(word));
  const wanted=new Set(words(name));
  for(const tr of String(raw||'').matchAll(/<tr\b[\s\S]*?<\/tr>/gi)){
    const link=tr[0].match(/href=["']((?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/\d+\/[^"']*)["']/i);
    if(!link)continue;
    const [day,meet]=tfrrsCells(decodeHtml,tr[0]);
    if(Date.parse(`${day} 12:00 UTC`)!==Date.parse(`${date} 12:00 UTC`))continue;
    if(words(meet).some(word=>wanted.has(word)))return new URL(link[1],'https://www.tfrrs.org').href;
  }
  return null;
}
// Cincinnati's races at one meet, women first: the team result (when
// Cincinnati scored as a team) and every Cincinnati runner, by the TEAM
// column. A race Cincinnati did not run (Gans Creek's Black Open) is left out.
export function parseCincinnatiTfrrsResults(raw,{decodeHtml,ordinal}){
  const races=new Map();
  for(const section of String(raw||'').split(/<div\b[^>]*class=["'][^"']*custom-table-title/i).slice(1)){
    const title=tfrrsText(decodeHtml,(section.match(/<h3\b[^>]*>([\s\S]*?)<span\b/i)||section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)||section.match(/^[^>]*>([\s\S]*?)<\/div>/)||[])[1]||'');
    const race=title.match(/\b(Women|Men)(?:['\u2019]?s)?\b(.*?)\b(Team|Individual) Results\s*\(([^)]+)\)/i);
    if(!race)continue;
    const team=race[1][0].toUpperCase()+race[1].slice(1).toLowerCase();
    const distance=race[4].trim().replace(/^(\d+(?:\.\d+)?)\s*k$/i,'$1K');
    const open=/\bOpen\b/i.test(race[2]);
    const group=`${team}'s ${distance}${open?' Open':''}`;
    const table=(section.match(/<table\b[\s\S]*?<\/table>/i)||[])[0]||'';
    const rows=[...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(tr=>tfrrsCells(decodeHtml,tr[0]));
    const head=(rows[0]||[]).map(value=>value.toUpperCase());
    const at=name=>head.indexOf(name);
    const entry=races.get(group)||{team,group,result:null,runners:[]};
    if(/team/i.test(race[3])&&at('SCORE')>=0){
      const row=rows.slice(1).find(cells=>cells[at('TEAM')]==='Cincinnati');
      if(row&&/^\d+$/.test(row[at('PL')])&&/^\d+$/.test(row[at('SCORE')]))entry.result={place:Number(row[at('PL')]),score:row[at('SCORE')]};
    }else if(at('NAME')>=0&&at('TIME')>=0){
      entry.runners=rows.slice(1).filter(cells=>cells[at('TEAM')]==='Cincinnati').map(cells=>{
        const place=cells[at('PL')],time=cells[at('TIME')];
        return{participant:cells[at('NAME')],place,result:/^\d+$/.test(place)?`${ordinal(place)} \u00b7 ${time}`:`${place} \u00b7 ${time}`};
      }).filter(row=>row.participant&&(/\d:\d{2}/.test(row.result)||/^(?:DNF|DNS)\b/i.test(row.result)));
    }
    races.set(group,entry);
  }
  return[...races.values()].filter(race=>race.runners.length).sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
}

// Cards are grouped under titled tournament wrappers ("Exhibition", "Cancun
// Challenge"); each card's heading is the titled wrapper that encloses it.
function tournamentWrappers(raw,visibleText){
  const wrappers=[];
  for(const open of raw.matchAll(/<div\b[^>]*class=["'][^"']*schedule-events-by-tournament__wrapper--has-title[^"']*["'][^>]*>/gi)){
    const tags=/<div\b[^>]*>|<\/div>/gi;tags.lastIndex=open.index+open[0].length;
    let depth=1,end=-1,tag;
    while(depth&&(tag=tags.exec(raw)))if((depth+=tag[0][1]==='/'?-1:1)===0)end=tags.lastIndex;
    const title=(raw.slice(open.index,end).match(/schedule-events-by-tournament__title[^>]*>([\s\S]*?)<\//i)||[])[1]||'';
    if(end>0)wrappers.push({start:open.index,end,title:visibleText(title)});
  }
  return wrappers;
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
export function createCincinnatiHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
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
  // Consecutive round cards of one tournament (the same name, at most two
  // days apart) become one event from its first to its last day. A finished
  // tournament takes the last round's place and story (the earlier stories
  // are "after 18 holes"); one in progress is shown on its current round,
  // with no result yet.
  function mergeRounds(events,today){
    const groups=[];
    for(const event of events){
      const previous=groups.at(-1),last=previous?.at(-1);
      const gap=last?(Date.parse(event.start_time.slice(0,10))-Date.parse(last.start_time.slice(0,10)))/86400000:Infinity;
      if(last&&last.opponent===event.opponent&&gap>0&&gap<=2){previous.push(event);continue;}
      groups.push([event]);
    }
    return groups.map(rounds=>{
      const first=rounds[0],last=rounds.at(-1);
      const end=String(last.end_time||last.start_time).slice(0,10);
      const finished=last.status==='Final';
      const current=finished?first:rounds.find(round=>Date.parse(round.start_time.slice(0,10))>=today)||last;
      const event={...current};
      if(rounds.length>1||event.end_time)event.end_time=`${end}T23:59:59Z`;
      if(finished){
        for(const key of ['status','headline','results','result_count','recency_label','priority_bucket'])event[key]=last[key];
        if(last.recap_url)event.recap_url=last.recap_url;else delete event.recap_url;
      }else{
        for(const key of ['headline','results','result_count','recap_url'])delete event[key];
        // Under way (the Blessings Collegiate, Oct 3-5, after its first
        // round): today's event, not a final.
        if(Date.parse(first.start_time.slice(0,10))<=today&&Date.parse(end)>=today){
          event.status='Today';event.priority_bucket='today';event.recency_label='In progress';
          event.id=event.id.replace(/-(?:final|upcoming|today)(-(?:mens|womens))?$/,'-today$1');
          event.start_time=`${new Date(today).toISOString().slice(0,10)}T12:00:00.000Z`;
        }else{event.status='Upcoming';}
      }
      return event;
    });
  }
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='cincinnati'||!cincinnatiSchool.cardSports.has(sport))return null;
    let host;try{host=new URL(sourceUrl);}catch{return null;}
    if(host.hostname!=='gobearcats.com'||!/^\/sports\/[^/]+\/schedule\/?$/.test(host.pathname))return null;
    raw=String(raw||'');
    const events=[],wrappers=tournamentWrappers(raw,visibleText);
    // Separate men's and women's pages can list the same opponent on the same
    // day; the team keeps their event ids apart.
    const team=cincinnatiSchool.combinedSports.has(sport)?(host.pathname.match(/^\/sports\/(mens|womens)-/)||[])[1]:null;
    for(const {block,index} of cardBlocks(raw)){
      const heading=wrappers.find(wrapper=>wrapper.start<index&&index<wrapper.end)?.title||'';
      // The datetime attribute is Eastern wall clock; its date is the published day.
      const start=(block.match(/schedule-event-date__wrapper--start[\s\S]*?<time\b[^>]*datetime=["'](\d{4})-(\d{2})-(\d{2})T/i)||[]).slice(1).map(Number);
      if(start.length!==3)continue;
      const [year,month,day]=start;
      // The visible day must agree with the datetime ("Oct 3").
      const shown=field(block,/schedule-event-date__day[^>]*>([\s\S]*?)<\/time>/i).match(/^([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/);
      if(shown&&(MONTHS.indexOf(shown[1])!==month-1||Number(shown[2])!==day))continue;
      const divider=field(block,/schedule-default-event__divider[^>]*>([\s\S]*?)<\/strong>/i);
      // Rankings ("#11 TCU", "#RV Kansas State") describe the week, not the opponent.
      let opponent=field(block,/class=["']schedule-default-event__name["'][^>]*>([\s\S]*?)<\/strong>/i).replace(/^(?:#(?:\d+|RV)\s+)+/i,'').trim();
      // Exhibitions are labeled as K-State's are: "(EXH)" on soccer's card,
      // the "Exhibition" heading on women's basketball.
      if(/^Exhibitions?$/i.test(heading)&&!/\((?:EXH|Exhibition)\)/i.test(opponent))opponent=`${opponent} (Exhibition)`;
      opponent=opponent.replace(/\(EXH\)/i,'(Exhibition)');
      const meet=eventType(sport)!=='GAME';
      // Golf cards have no divider; games always do.
      if(!opponent||!divider&&!meet)continue;
      const slot=field(block,/schedule-event-item__result[^>]*>([\s\S]*?)<div\b[^>]*schedule-event-item__dashboard-link/i);
      const result=meet?null:slot.match(/^([WLT])\s+(?:Win|Loss|Tie)\s+(\d+)\s*-\s*(\d+)\b/i);
      // "11:00 PM EDT": the published Eastern time; "TBA", "All Day" or an
      // empty slot with the time-tba date class is the date alone.
      const clock=result||meet||/schedule-event-date--time-tba/i.test(block)?'':(slot.match(/^\d{1,2}:\d{2}\s*[AP]M\b/i)||[''])[0];
      const firstDay=Date.UTC(year,month-1,day);
      const end=(block.match(/schedule-event-date__wrapper--end[\s\S]*?<time\b[^>]*datetime=["'](\d{4})-(\d{2})-(\d{2})T/i)||[]).slice(1).map(Number);
      const lastDay=end.length===3?Date.UTC(end[0],end[1]-1,end[2]):firstDay;
      const today=Date.parse(easternDay(now.getTime())+'T00:00:00Z');
      // Meets publish each team's place: "2nd (M), 2nd (W)", "1st (W)".
      const places=meet?[...slot.matchAll(/\b(T?\d{1,3})(?:st|nd|rd|th)\s*\((M|W)\)/gi)].map(m=>({team:m[2].toUpperCase()==='W'?'Women':'Men',place:m[1]})):[];
      // Golf tournaments read "Cincinnati at ...", as K-State's do (the women's
      // cards say "vs." for every tournament).
      // Golf publishes the team's place after each round: "8th of 14",
      // "T4th of 15", "5th out of 13".
      const golf=sport==='Golf'?slot.match(/^(T)?(\d{1,3})(?:st|nd|rd|th)\s+(?:of|out of)\s+(\d{1,3})$/i):null;
      // A meet whose last day has passed is over, published place or not.
      const over=meet&&(places.length>0||Boolean(golf)||lastDay<today);
      // A game two days past without a published result (the Aug 8 soccer
      // exhibition, "Evansville (EXH)") is neither a K-State-style final nor
      // upcoming. Yesterday's stays: a night game can run past midnight, and
      // the result is posted after it ends. A multi-day event (the Big 12
      // baseball tournament, May 25-29) counts from its last day.
      if(!meet&&!result&&lastDay<today-86400000)continue;
      const event=makeEvent({school,sport,status:result||over?'Final':'Upcoming',relation:/^at\b/i.test(divider)||!divider||sport==='Golf'?'at':'vs',opponent,date:`${MONTHS[month-1]} ${day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:result||over?null:clock||null,
        schoolScore:result?.[2]??null,oppScore:result?.[3]??null,resultText:result?`${result[1].toUpperCase()}, ${result[2]}-${result[3]}`:null,sourceUrl,now});
      if(lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      // K-State's meet headline, women first: "Women's team: 2nd / Men's
      // team: 2nd" (TFRRS adds the points: attachMeetResults).
      if(places.length){
        const value=places.sort((x,y)=>(x.team==='Women'?0:1)-(y.team==='Women'?0:1)).map(({team,place})=>`${team}'s team: ${place.replace(/^(T?)(\d+)$/,(m,t,n)=>t+ordinal(n))}`).join(' / ');
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
      }else if(golf){
        // K-State's golf headline: "4th of 14" (no team total is published).
        const value=`${golf[1]?'T':''}${ordinal(golf[2])} of ${golf[3]}`;
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
      }else if(over){event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;}
      const recapUrl=result||over?cardRecap(block,sourceUrl,firstDay,lastDay):null;
      if(recapUrl)event.recap_url=recapUrl;
      if(team)event.id=`${event.id}-${team}`;
      events.push(event);
    }
    // Golf publishes one card per round; K-State shows one event per
    // tournament.
    if(sport==='Golf'){const merged=mergeRounds(events,Date.parse(easternDay(now.getTime())+'T00:00:00Z'));events.length=0;events.push(...merged);}
    // A page with cards but nothing current is a valid empty schedule, not a
    // failed source: the shared parsers must not read it again (they made
    // events out of the page's schema data).
    if(!events.length){if(!cardBlocks(raw).length)return null;emptied.add(events);}
    return events;
  }
  const emptied=new WeakSet();
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptied.has(events);
  const isCincinnatiCrossCountry=event=>event?.school_id==='cincinnati'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  // Feed and expanded view both call this; the second call is a no-op. The
  // races come from TFRRS: the meet is found on each team's TFRRS page by
  // date and name; every team place the schedule publishes must agree.
  async function attachMeetResults(event){
    if(!isCincinnatiCrossCountry(event)||event.meet_results_verified)return event;
    const unavailable=status=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';event.highlight_status=status;
      return event;
    };
    const failed='Official race results could not be loaded. Open the official recap.';
    const date=String(event.start_time).slice(0,10);
    const pages=new Set();
    for(const team of ['Women','Men']){
      const listing=await download(CINCINNATI_TFRRS_TEAMS[team]);if(!listing)continue;
      const url=findCincinnatiTfrrsMeet(listing,{decodeHtml,date,name:event.opponent});
      if(url)pages.add(url);
    }
    if(!pages.size)return unavailable('No results for this meet are published on TFRRS yet.');
    const races=[];let resultsUrl=null;
    for(const url of pages){
      const page=await download(url);if(!page)return unavailable(failed);
      for(const race of parseCincinnatiTfrrsResults(page,{decodeHtml,ordinal}))if(!races.some(other=>other.group===race.group))races.push(race);
      resultsUrl??=url;
    }
    races.sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
    if(!races.length)return unavailable(failed);
    const published=Object.fromEntries([...String(event.headline||'').matchAll(/\b(Men|Women)'s team: (T?\d+)\w\w/g)].map(m=>[m[1],m[2]]));
    for(const [team,place] of Object.entries(published)){
      const race=races.find(race=>race.team===team&&race.result);
      if(!race||String(race.result.place)!==place.replace(/^T/,''))return unavailable(failed);
    }
    const rows=[],headline=[],lines=[];
    for(const race of races){
      if(race.result){
        const value=`${ordinal(race.result.place)} \u00b7 ${race.result.score} pts`;
        rows.push({group:race.group,participant:'Cincinnati team',result:value});
        if(!headline.some(line=>line.startsWith(`${race.team}'s team:`)))headline.push(`${race.team}'s team: ${value}`);
        lines.push(`Cincinnati's ${race.team.toLowerCase()} placed ${ordinal(race.result.place)} with ${race.result.score} points.`);
      }
      rows.push(...race.runners.map(runner=>({group:race.group,participant:runner.participant,result:runner.result})));
    }
    // Without a team score (too few runners), the headline names the team's
    // first finisher.
    for(const team of ['Women','Men'])if(!headline.some(line=>line.startsWith(`${team}'s`))){
      const race=races.find(race=>race.team===team&&!race.result);const [first]=race?.runners||[];
      if(first)headline.push(`${team}'s: ${first.participant} ${/^\d+$/.test(first.place)?ordinal(first.place):first.place}`);
    }
    headline.sort((a,b)=>(a.startsWith('Women')?0:1)-(b.startsWith('Women')?0:1));
    event.headline=headline.join(' / ');
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.recap_result_count=rows.length;
    // The source link stays on gobearcats.com (the official recap, or the
    // schedule); the TFRRS page is kept beside it. Not result_url: that would
    // start the shared generic TFRRS enrichment.
    event.results_source_url=resultsUrl;
    event.source={...event.source,name:event.recap_url?'Official athletics meet recap; results from TFRRS':'Official athletics schedule; results from TFRRS',url:event.recap_url||event.source?.url};
    // Highlights only from the verified rows: each team finish, then each
    // race's first Cincinnati finisher, then the next finishers.
    for(const race of races){const [leader]=race.runners;if(leader)lines.push(`${leader.participant} led Cincinnati in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}, finishing ${leader.result.replace(' \u00b7 ',' in ')}.`);}
    for(let i=1;lines.length<4&&races.some(race=>race.runners[i]);i++)for(const race of races){const runner=race.runners[i];if(runner&&lines.length<4)lines.push(`${runner.participant} finished ${runner.result.replace(' \u00b7 ',' in ')} in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}.`);}
    event.highlights=lines.slice(0,4);
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  // The card's own Recap link is already bound to its game, and its story may
  // never name the sport ("Cincinnati Falls on Road Against Houston"): it is
  // checked for the opponent and date only. Any other candidate must also
  // name the opponent in its headline: the shared matcher accepted stories of
  // neighboring days for each other (the Sep 4 Valparaiso story for Michigan
  // and Oakland, the Sep 10 Morehead State story for Michigan State).
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='cincinnati')return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname==='gobearcats.com'&&parsed.pathname.startsWith('/news/');
    if(own)return recapMatchesEvent(raw,{...event,sport:''},url);
    if(!recapMatchesEvent(raw,event,url))return false;
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    const opponent=headlineKey(event.opponent).trim();
    return opponent.length>=2&&headlineKey(title).includes(` ${opponent} `);
  }
  return{parseSchedule,isEmptySchedule,matchesRecap,isCincinnatiCrossCountry,attachMeetResults};
}
