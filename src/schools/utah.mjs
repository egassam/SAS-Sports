import {createScheduleDataEnricher,sidearmScheduleGames} from '../sidearm-schedule-data.mjs';
// Utah school module. Shared publisher utilities stay in the Worker; this file
// owns utahutes.com routes and Utah's program combinations. Routes start as the
// exact candidates production used before the module existed (route parity);
// each sport is then corrected and verified one at a time.
export const utahSchool={
  id:'utah',
  // Basketball and Swimming & Diving publish separate men's and women's pages.
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  scheduleUrls:{
    'utah|Baseball':['https://utahutes.com/sports/baseball/schedule','https://utahutes.com/'],
    'utah|Basketball':['https://utahutes.com/sports/mens-basketball/schedule','https://utahutes.com/sports/womens-basketball/schedule','https://utahutes.com/sports/basketball/schedule','https://utahutes.com/'],
    // A missing slug renders SIDEARM's empty "@season @sport" template, whose
    // site-wide ticker lists other sports' events; never fall back to it.
    'utah|Beach Volleyball':'https://utahutes.com/sports/womens-beach-volleyball/schedule',
    'utah|Cross Country':'https://utahutes.com/sports/cross-country/schedule',
    'utah|Football':'https://utahutes.com/sports/football/schedule',
    // Utah sponsors men's golf only; the other slugs render the empty template.
    'utah|Golf':'https://utahutes.com/sports/mens-golf/schedule',
    'utah|Gymnastics':['https://utahutes.com/sports/womens-gymnastics/schedule','https://utahutes.com/sports/mens-gymnastics/schedule','https://utahutes.com/sports/gymnastics/schedule','https://utahutes.com/'],
    // Utah sponsors men's lacrosse only; the other slugs render the empty template.
    'utah|Lacrosse':'https://utahutes.com/sports/mens-lacrosse/schedule',
    'utah|Skiing':'https://utahutes.com/sports/alpine-skiing/schedule',
    'utah|Soccer':'https://utahutes.com/sports/womens-soccer/schedule',
    'utah|Softball':['https://utahutes.com/sports/softball/schedule','https://utahutes.com/'],
    'utah|Swimming & Diving':['https://utahutes.com/sports/womens-swimming-and-diving/schedule','https://utahutes.com/sports/mens-swimming-and-diving/schedule','https://utahutes.com/sports/womens-swimming-diving/schedule','https://utahutes.com/sports/mens-swimming-diving/schedule','https://utahutes.com/sports/swimming-and-diving/schedule','https://utahutes.com/sports/swimming-diving/schedule','https://utahutes.com/sports/swimming/schedule','https://utahutes.com/'],
    'utah|Tennis':['https://utahutes.com/sports/womens-tennis/schedule','https://utahutes.com/sports/mens-tennis/schedule','https://utahutes.com/sports/tennis/schedule','https://utahutes.com/'],
    'utah|Track & Field':['https://utahutes.com/sports/track-and-field/schedule','https://utahutes.com/sports/track-field/schedule','https://utahutes.com/'],
    'utah|Volleyball':'https://utahutes.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'utah|Baseball':'https://utahutes.com/sports/baseball/roster',
    'utah|Basketball':['https://utahutes.com/sports/mens-basketball/roster','https://utahutes.com/sports/womens-basketball/roster','https://utahutes.com/sports/basketball/roster'],
    'utah|Beach Volleyball':'https://utahutes.com/sports/womens-beach-volleyball/roster',
    'utah|Cross Country':'https://utahutes.com/sports/cross-country/roster',
    'utah|Football':'https://utahutes.com/sports/football/roster',
    'utah|Golf':'https://utahutes.com/sports/mens-golf/roster',
    'utah|Gymnastics':['https://utahutes.com/sports/womens-gymnastics/roster','https://utahutes.com/sports/mens-gymnastics/roster','https://utahutes.com/sports/gymnastics/roster'],
    'utah|Lacrosse':'https://utahutes.com/sports/mens-lacrosse/roster',
    'utah|Skiing':'https://utahutes.com/sports/alpine-skiing/roster',
    'utah|Soccer':'https://utahutes.com/sports/womens-soccer/roster',
    'utah|Softball':'https://utahutes.com/sports/softball/roster',
    'utah|Swimming & Diving':['https://utahutes.com/sports/womens-swimming-and-diving/roster','https://utahutes.com/sports/mens-swimming-and-diving/roster','https://utahutes.com/sports/womens-swimming-diving/roster','https://utahutes.com/sports/mens-swimming-diving/roster','https://utahutes.com/sports/swimming-and-diving/roster','https://utahutes.com/sports/swimming-diving/roster','https://utahutes.com/sports/swimming/roster'],
    'utah|Tennis':['https://utahutes.com/sports/womens-tennis/roster','https://utahutes.com/sports/mens-tennis/roster','https://utahutes.com/sports/tennis/roster'],
    'utah|Track & Field':['https://utahutes.com/sports/track-and-field/roster','https://utahutes.com/sports/track-field/roster'],
    'utah|Volleyball':'https://utahutes.com/sports/womens-volleyball/roster'
  }
};

// utahutes.com schedule page data (see src/sidearm-schedule-data.mjs), applied
// only to sports checked against an official Utah page.
// W/L headline, one Result row and exact recap, as K-State shows results.
const PAYLOAD_RESULT_SPORTS=new Set(['Football']);
// Published start times (local wall clock).
const PAYLOAD_TIME_SPORTS=new Set(['Football']);

const decodeHtml=value=>String(value||'').replace(/&nbsp;|&#160;/gi,' ').replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&#x27;|&rsquo;|&lsquo;/gi,"'")
  .replace(/&bull;|&#8226;/gi,'\u2022').replace(/&amp;/gi,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const plainText=html=>decodeHtml(String(html||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t]+/g,' ');
// Official recap results tables -> K-State's result contract. Utah sponsors
// women's cross country only. Each table follows a bold heading naming the
// meet ("... \"OPEN RACE\"" for the open race) and, for a scored race, a team
// line such as "76 Points \u2022 3rd / 8". A table whose heading does not name
// this meet (e.g. an alumna's result elsewhere) is ignored.
export function parseUtahRecapResults(raw,event,{slug,ordinal}){
  const html=String(raw||''),rows=[],meet=slug(event?.opponent||'');
  if(!meet)return rows;
  let previousEnd=0;
  for(const table of html.matchAll(/<table\b[\s\S]*?<\/table>/gi)){
    const before=html.slice(previousEnd,table.index);previousEnd=table.index+table[0].length;
    const strong=[...before.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].at(-1);
    if(!strong)continue;
    const heading=plainText(strong[1]).trim(),info=plainText(before.slice(strong.index+strong[0].length));
    if(!slug(heading).includes(meet)||/\bmen'?s\b/i.test(heading))continue;
    const group=/\bopen\b/i.test(heading)?"Women's Open":"Women's";
    const cells=[...table[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(tr=>[...tr[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(td=>plainText(td[1]).trim()));
    if(!cells.length||!/^pl/i.test(cells[0][0]||'')||!/^name$/i.test(cells[0][1]||''))continue;
    const place=info.match(/\b(\d+)(?:st|nd|rd|th)\s*\/\s*\d+\b/),points=info.match(/\b(\d+)\s*Points\b/i);
    if(place&&points)rows.push({group,participant:'Utah team',result:`${ordinal(place[1])} \u00b7 ${points[1]} pts`});
    for(const [pl,name,time] of cells.slice(1)){
      const p=String(pl||'').match(/^(\d+)(?:st|nd|rd|th)$/i);
      if(!p||!name||!/^\d{1,2}:\d{2}(?:\.\d+)?$/.test(time||''))continue;
      if(rows.some(row=>row.group===group&&row.participant===name))continue;
      rows.push({group,participant:name,result:`${ordinal(p[1])} \u00b7 ${time}`});
    }
  }
  return rows;
}

// Spring sports whose official page keeps showing a past season until the
// next schedule is published. Only the current academic year (July-June) is
// current; a page with none is a valid empty schedule, not a failed source.
const ACADEMIC_SEASON_SPORTS=new Set(['Beach Volleyball','Lacrosse','Skiing']);
function academicYearStart(now){const d=new Date(now);return d.getUTCMonth()+1>=7?d.getUTCFullYear():d.getUTCFullYear()-1;}

export function createUtahHandlers({slug,ordinal,recapMatchesEvent,fetch,headers}={}){
  const enrichFromPageData=createScheduleDataEnricher({schoolId:'utah',host:'utahutes.com',slug,resultSports:PAYLOAD_RESULT_SPORTS,timeSports:PAYLOAD_TIME_SPORTS});
  // Skiing lists each race ("Giant Slalom") as the opponent; the meet it
  // belongs to ("Utah Invitational") is the page data's tournament.
  function labelSkiingRaces(events,raw,school,sport,sourceUrl){
    if(school?.id!=='utah'||sport!=='Skiing')return events;
    try{if(new URL(sourceUrl).hostname!=='utahutes.com')return events;}catch{return events;}
    const games=sidearmScheduleGames(raw);
    for(const event of events){
      const race=event.opponent||'',day=String(event.start_time||'').slice(0,10);
      const matches=games.filter(game=>game.date.slice(0,10)===day&&slug(game.opponent.title||'')===slug(race));
      const meet=String(matches[0]?.tournament?.title||'').trim();
      if(matches.length!==1||!meet||slug(race).includes(slug(meet)))continue;
      event.opponent=`${meet} · ${race}`;
      event.title=event.title.slice(0,event.title.length-race.length)+event.opponent;
    }
    return events;
  }
  // The golf page lists each round day as its own entry. K-State shows one
  // event per tournament: merge consecutive days of the same tournament from
  // the page's schedule data. The tournament is Final only when every round
  // is; a finished one keeps its first day's date and the final round's
  // official recap, an unfinished one shows its next round.
  // Events outside the page's schedule data (site-wide ticker) are dropped.
  const rank={Live:0,Today:1,Upcoming:2,Final:3};
  function mergeGolfRounds(events,raw,school,sport,sourceUrl){
    if(school?.id!=='utah'||sport!=='Golf')return events;
    try{if(new URL(sourceUrl).hostname!=='utahutes.com')return events;}catch{return events;}
    const games=sidearmScheduleGames(raw);
    if(!games.length)return events;
    const day=value=>String(value||'').slice(0,10),dayMs=value=>Date.parse(day(value)+'T00:00:00Z');
    const rounds=events.filter(event=>games.some(game=>day(game.date)===day(event.start_time)&&slug(game.opponent.title||'')===slug(event.opponent||'')))
      .sort((a,b)=>dayMs(a.start_time)-dayMs(b.start_time));
    const tournaments=[];
    for(const round of rounds){
      const last=tournaments.at(-1),previous=last?.rounds.at(-1);
      if(previous&&slug(previous.opponent)===slug(round.opponent)&&dayMs(round.start_time)-dayMs(previous.start_time)<=86400000)last.rounds.push(round);
      else tournaments.push({rounds:[round]});
    }
    return tournaments.map(({rounds})=>{
      const first=rounds[0],final=rounds.at(-1);
      if(rounds.length===1)return first;
      const status=rounds.every(round=>round.status==='Final')?'Final':rounds.map(round=>round.status).sort((a,b)=>(rank[a]??4)-(rank[b]??4))[0];
      const event={...first,status,id:first.id.replace(/-(?:final|today|upcoming|live)$/,'-'+status.toLowerCase())};
      event.priority_bucket={Live:'live',Today:'today',Upcoming:'upcoming',Final:'recent_final'}[status]||'other';
      event.recency_label={Live:'Live now',Today:'Today',Upcoming:'Upcoming',Final:'Final'}[status]||status;
      if(status==='Final'){
        event.headline=final.headline;event.results=final.results;event.result_count=final.result_count;
        if(final.recap_url)event.recap_url=final.recap_url;else delete event.recap_url;
      }else{
        // In progress or ahead: show the next round to be played.
        const next=rounds.find(round=>round.status!=='Final');
        event.start_time=next.start_time;event.display_time=next.display_time;
        event.headline=null;event.results=[];event.result_count=0;delete event.recap_url;
      }
      return event;
    });
  }
  const enrichScheduleEvents=(events,raw,school,sport,sourceUrl)=>mergeGolfRounds(labelSkiingRaces(enrichFromPageData(events,raw,school,sport,sourceUrl),raw,school,sport,sourceUrl),raw,school,sport,sourceUrl);
  function isUtahCrossCountry(event){
    return event?.school_id==='utah'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  }
  // Feed and expanded view both call this; the second call is a no-op. The
  // recap URL comes from the meet's own schedule card and must be the
  // official recap for this exact meet.
  async function attachMeetResults(event){
    if(!isUtahCrossCountry(event))return event;
    if(event.recap_result_count&&event.meet_results_verified)return event;
    const incomplete=()=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';
      event.highlight_status='Official race results could not be loaded. Open the official recap.';
      return event;
    };
    let url;try{url=new URL(event.recap_url);}catch{return incomplete();}
    if(url.protocol!=='https:'||url.hostname!=='utahutes.com'||!url.pathname.startsWith('/news/'))return incomplete();
    let raw;
    try{
      const response=await fetch(url.href,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});
      if(!response.ok)return incomplete();raw=await response.text();
    }catch{return incomplete();}
    if(!recapMatchesEvent(raw,event,url.href))return incomplete();
    const rows=parseUtahRecapResults(raw,event,{slug,ordinal});
    if(!rows.some(row=>row.group==="Women's"&&row.participant!=='Utah team'))return incomplete();
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;
    event.recap_result_count=rows.length;event.recap_url=url.href;
    event.source={...event.source,name:'Official athletics meet recap',url:url.href};
    const teams=rows.filter(row=>row.participant==='Utah team');
    // An unscored meet keeps the schedule's own wording ("No Score").
    if(teams.length)event.headline=teams.map(row=>`${row.group} team: ${row.result}`).join(' / ');
    event.highlights=teams.map(row=>`Utah's ${row.group.toLowerCase()} team finished ${row.result.replace(' \u00b7 ',' with ')}.`);
    for(const group of[...new Set(rows.map(row=>row.group))]){
      const leader=rows.find(row=>row.group===group&&row.participant!=='Utah team');
      if(leader)event.highlights.push(`${leader.participant} led Utah in the ${group==="Women's"?"women's race":"women's open race"}, finishing ${leader.result.replace(' \u00b7 ',' in ')}.`);
    }
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  const emptiedBySeason=new WeakSet();
  // The page's site-wide ticker also lists other sports' events, and the
  // shared sport match accepts indoor "Volleyball" for Beach Volleyball. Keep
  // only events in this page's own schedule data, then only the current season.
  function filterEvents(events,raw,school,sport,sourceUrl,now=new Date()){
    if(school?.id!=='utah'||!ACADEMIC_SEASON_SPORTS.has(sport))return events;
    try{if(new URL(sourceUrl).hostname!=='utahutes.com')return events;}catch{return events;}
    const games=sidearmScheduleGames(raw);
    const scheduled=event=>games.some(game=>game.date.slice(0,10)===String(event.start_time||'').slice(0,10)&&slug(game.opponent.title||'')===slug(event.opponent||''));
    const start=Date.UTC(academicYearStart(now),6,1),end=Date.UTC(academicYearStart(now)+1,6,1);
    const kept=events.filter(event=>{const t=Date.parse(String(event.start_time||'').slice(0,10)+'T00:00:00Z');return scheduled(event)&&Number.isFinite(t)&&t>=start&&t<end;});
    if(events.length&&!kept.length)emptiedBySeason.add(kept);
    return kept;
  }
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptiedBySeason.has(events);
  return{enrichScheduleEvents,isUtahCrossCountry,attachMeetResults,filterEvents,isEmptySchedule};
}
