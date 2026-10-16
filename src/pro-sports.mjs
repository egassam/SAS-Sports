// Professional sports (user, October 15: "Let's add some professional
// sports. Same three menu style, first menu is sports like football, auto
// racing, golf ... second menu ... leagues and third menu could be teams.
// Let's add football, NFL, Pittsburgh Steelers and Kansas City Chiefs, and
// auto racing, NASCAR and races.").
//
// Menus on the Pro level: Sport (catalog `pro_sport`) → League (`league`) →
// Team, or Races for a racing series. Each pro entry is a catalog "school"
// with level "pro", so the feed, cache, records and expanded views are the
// college ones.
//
// Sources:
// - NFL: ESPN's team schedule (site.api.espn.com, the feed the app already
//   reads for live scores): every game with its kickoff, TV, score and live
//   state; the game summary for an expanded final (line score, team stats,
//   leaders, ESPN recap). The team's own schedule page is linked.
// - NASCAR: NASCAR's own data feeds (cf.nascar.com, read by nascar.com): the
//   season's race list with each winner, laps, cautions and lead changes; the
//   driver standings for the winners' names and car numbers; each race's
//   weekend feed for the full finishing order; the live timing feed while a
//   race runs.
// Pro players are adults, but no featured athletes are shown yet (the
// three-athlete rule is for schools' official rosters).
// No team logos or car-number art (user, October 15: "Leave the logos out":
// they are the leagues' and teams' trademarks, not licensed here).

export const PRO_TEAMS={
  'pittsburgh-steelers':{
    kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'pit'},
    // Division games give the header's "AFC North 2-1" (regular season).
    division:{name:'AFC North',members:['BAL','CIN','CLE']},
    schedule:'https://www.steelers.com/schedule/'
  },
  'kansas-city-chiefs':{
    kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'kc'},
    division:{name:'AFC West',members:['DEN','LV','LAC']},
    schedule:'https://www.chiefs.com/schedule/'
  },
  'nascar-cup-series':{
    kind:'nascar',sport:'Auto Racing',seriesId:1,
    schedule:'https://www.nascar.com/nascar-cup-series/schedule/'
  }
};
export const proTeam=id=>PRO_TEAMS[id]||null;
export const ESPN_SITE='https://site.api.espn.com/apis/site/v2/sports/';
export const NASCAR_FEEDS='https://cf.nascar.com/';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pad=n=>String(n).padStart(2,'0');
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ordinal=n=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th'}`;

// A UTC instant as the team's local wall clock ("2026-09-13T13:00:00.000Z"
// for a 1:00 PM Eastern kickoff): the app stores every start that way.
export function wallClock(value,timeZone){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
  return`${parts.year}-${parts.month}-${parts.day}T${pad(Number(parts.hour)%24)}:${parts.minute}:00.000Z`;
}
// "Oct 18, 12:00 PM" from a wall clock (the page converts it to the viewer's
// zone); date only when the time is not set.
export function displayTime(wall,{timed=true}={}){
  const [date,time]=wall.slice(0,16).split('T'),[,m,d]=date.split('-').map(Number),day=`${MONTHS[m-1]} ${d}`;
  if(!timed)return day;
  const [h,min]=time.split(':').map(Number);
  return`${day}, ${h%12||12}:${pad(min)} ${h>=12?'PM':'AM'}`;
}
// ".029" reads "0.029".
const seconds=v=>String(v).replace(/^\./,'0.');
const dayOf=wall=>Date.parse(wall.slice(0,10)+'T00:00:00Z');

function baseEvent({school,sport,status,title,start,display,opponent,sourceName,sourceUrl,now,key}){
  return{id:'live-'+slug(`${school.id}|${sport}|${key}`).slice(0,180),school_id:school.id,school:school.name,sport,event_type:sport==='Auto Racing'?'RACE':'GAME',status,title,start_time:start,display_time:display,opponent,school_score:null,opponent_score:null,headline:null,team_summaries:[],results:[],result_count:0,source:{name:sourceName,url:sourceUrl,updated_at:now.toISOString()},has_more_results:false,enrichment_warning:null,priority_bucket:{Live:'live',Today:'today',Upcoming:'upcoming',Final:'recent_final'}[status]||'other',recency_label:{Live:'Live now',Today:'Today',Upcoming:'Upcoming',Final:'Final'}[status]||status,last_verified_at:now.toISOString(),freshness_seconds:0,verification_state:'live_source',source_count:1,conflicting_sources:false,pro:true};
}

// ---- NFL (ESPN team schedule) ----

// One team's games from ESPN's team schedule (regular season, and the
// postseason payload when given). A past game without a final score is not
// listed (K-State's rule); postponed and cancelled games are not either.
export function espnTeamGames(payloads,{school,config,timeZone,now}){
  const sport=config.sport,today=dayOf(wallClock(now,timeZone)),events=[],seen=new Set();
  for(const payload of payloads){
    for(const game of payload?.events||[]){
      if(seen.has(game.id))continue;seen.add(game.id);
      const c=game.competitions?.[0];if(!c)continue;
      const sides=c.competitors||[],own=sides.find(t=>t.team?.abbreviation?.toLowerCase()===config.espn.team),opp=sides.find(t=>t!==own);
      if(!own||!opp)continue;
      const state=c.status?.type?.state||game.status?.type?.state,name=c.status?.type?.name||'';
      if(/POSTPONED|CANCELED|CANCELLED|SUSPENDED/i.test(name))continue;
      const timed=c.timeValid!==false&&game.timeValid!==false,start=wallClock(game.date,timeZone),day=dayOf(start);
      const score=t=>t.score?.displayValue??t.score?.value??null;
      const us=score(own),them=score(opp),scored=us!=null&&them!=null&&us!==''&&them!=='';
      let status;
      if(state==='post'&&scored)status='Final';
      else if(state==='in')status='Live';
      else if(state==='pre'&&day>=today)status=day===today?'Today':'Upcoming';
      else continue;
      const tv=(c.broadcasts||[]).map(b=>b.media?.shortName).filter(Boolean);
      const relation=c.neutralSite?'vs':own.homeAway==='away'?'at':'vs';
      const oppName=opp.team.displayName||opp.team.shortDisplayName;
      const week=game.week?.text||null,postseason=game.seasonType?.type===3||/post/i.test(game.seasonType?.name||'');
      const event=baseEvent({school,sport,status,title:`${school.short_name} ${relation} ${oppName}`,start,display:displayTime(start,{timed}),opponent:oppName,sourceName:'ESPN team schedule (NFL)',sourceUrl:config.schedule,now,key:`${game.id}|${status}`});
      event.espn_event_id=game.id;
      if(tv.length)event.broadcast=tv.join(', ');
      event.round=postseason?(game.seasonType?.name||'Postseason'):week;
      if(status==='Final'||status==='Live'){
        event.school_score=String(us);event.opponent_score=String(them);
      }
      if(status==='Final'){
        const a=Number(us),b=Number(them),outcome=a>b?'W':a<b?'L':'T';
        event.headline=`${outcome} ${us}-${them}${/OT/.test(c.status?.type?.shortDetail||'')?' (OT)':''}`;
        event.results=[{label:'Result',value:event.headline}];
      }
      if(status==='Live'){
        event.recency_label=c.status?.type?.shortDetail||'In progress';
        event.headline=`${us}-${them}`;
        event.live_score_source='ESPN';
      }
      if(event.round)event.results.push({label:postseason?'Round':'Week',value:event.round});
      if(tv.length&&status!=='Final')event.results.push({label:'TV',value:tv.join(', ')});
      if(c.venue?.fullName)event.venue=c.venue.fullName;
      event.result_count=event.results.length;
      // Division games count in the header's division record; the playoffs
      // are not part of the season record (NFL records are regular season).
      if(!postseason&&config.division?.members.includes(opp.team.abbreviation)){event.conference_game=true;event.conference_name=config.division.name;}
      if(postseason){event.postseason=true;event.not_in_record=true;}
      const recap=(game.links||[]).find(l=>(l.rel||[]).includes('recap'))||null;
      if(recap?.href&&status==='Final'){event.recap_url=recap.href;event.recap_label='View ESPN recap';}
      events.push(event);
    }
  }
  return events;
}

// The expanded view of a final: plain facts from ESPN's game summary,
// written from the team's side.
export function espnGameHighlights(event,summary,config){
  const header=summary?.header?.competitions?.[0],sides=header?.competitors||[];
  const own=sides.find(t=>t.team?.abbreviation?.toLowerCase()===config.espn.team),opp=sides.find(t=>t!==own);
  if(!own||!opp)return null;
  const us=Number(own.score),them=Number(opp.score),name=event.school.split(' ').pop(),oppName=opp.team.displayName||event.opponent;
  const verb=us>them?'beat':us<them?'lost to':'tied',where=event.title.includes(' at ')?' on the road':' at home';
  const venue=summary.gameInfo?.venue?.fullName;
  const lines=[`The ${name} ${verb} the ${oppName} ${Math.max(us,them)}-${Math.min(us,them)}${where}${venue?` (${venue})`:''}${event.round?`, ${event.round}`:''}.`];
  const oppShort=opp.team.name||opp.team.shortDisplayName||oppName;
  const quarters=(own.linescores||[]).map((l,i)=>({q:i+1,us:Number(l.displayValue??l.value??0),them:Number(opp.linescores?.[i]?.displayValue??opp.linescores?.[i]?.value??0)}));
  const stats=[];
  if(quarters.length>=2){
    const a=quarters[0].us+quarters[1].us,b=quarters[0].them+quarters[1].them;
    lines.push(a===b?`The teams were tied ${a}-${b} at halftime.`:`The ${a>b?name:oppName} led ${Math.max(a,b)}-${Math.min(a,b)} at halftime.`);
    quarters.forEach(({q,us,them})=>stats.push({label:q<=4?`Q${q}`:q===5?'OT':`OT${q-4}`,value:`${name} ${us} · ${oppShort} ${them}`}));
  }
  const ownLeaders=(summary.leaders||[]).find(t=>t.team?.abbreviation?.toLowerCase()===config.espn.team);
  for(const group of (ownLeaders?.leaders||[]).slice(0,3)){
    const top=group.leaders?.[0];if(top?.athlete?.displayName&&top.displayValue)lines.push(`${group.displayName}: ${top.athlete.displayName}, ${top.displayValue}.`);
  }
  const box=summary.boxscore?.teams||[],ownBox=box.find(t=>t.team?.abbreviation?.toLowerCase()===config.espn.team),oppBox=box.find(t=>t!==ownBox);
  const stat=(team,n)=>team?.statistics?.find(s=>s.name===n)?.displayValue;
  if(ownBox&&oppBox)for(const [n,label] of [['totalYards','Total yards'],['turnovers','Turnovers'],['possessionTime','Time of possession'],['firstDowns','First downs']]){
    const a=stat(ownBox,n),b=stat(oppBox,n);if(a!=null&&b!=null)stats.push({label,value:`${name} ${a} · ${oppShort} ${b}`});
  }
  const scoring=(summary.scoringPlays||[]).map(p=>`Q${p.period?.number} ${p.clock?.displayValue||''} · ${p.team?.abbreviation||''}: ${p.text}`.replace(/\s+/g,' ').trim());
  const recap=summary.article?.links?.web?.href?.replace(/^http:/,'https:')||null;
  return{lines,stats,scoring,recap};
}

// ---- NASCAR (cf.nascar.com) ----

// The season's races. A race is Final once NASCAR names its winner; a past
// race without one is not listed. Non-points races (the Clash, the Duels,
// the All-Star Race) are labeled.
// Race finals read like cross country meets (user, October 15: "NASCAR lay
// out should be similar to the cross country layout"): one row per driver,
// "Chase Briscoe (#19)" · "1st · Joe Gibbs Racing"; the card shows the top
// three, the expanded view the whole field.
export function nascarRaces(list,{school,config,timeZone,now,drivers=new Map(),live=null,finishes=new Map()}){
  const sport=config.sport,today=dayOf(wallClock(now,timeZone)),events=[];
  for(const race of Array.isArray(list)?list:[]){
    if(race.series_id!==config.seriesId)continue;
    const scheduled=String(race.date_scheduled||race.race_date||'');if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(scheduled))continue;
    // NASCAR publishes Eastern wall-clock times.
    const start=`${scheduled.slice(0,16)}:00.000Z`,day=dayOf(start);
    const running=live&&live.race_id===race.race_id&&live.run_type===3&&[1,2,3].includes(live.flag_state)&&live.lap_number>0;
    let status;
    if(running)status='Live';
    else if(race.winner_driver_id)status='Final';
    else if(day>=today)status=day===today?'Today':'Upcoming';
    else continue;
    const exhibition=race.race_type_id!==1;
    const event=baseEvent({school,sport,status,title:`${String(race.race_name).trim()}${exhibition?' (non-points)':''}`,start,display:displayTime(start),opponent:race.track_name,sourceName:'NASCAR race results feed',sourceUrl:config.schedule,now,key:`${race.race_id}|${status}`});
    event.race_id=race.race_id;event.track=race.track_name;event.season=race.race_season;
    if(exhibition)event.exhibition=true;
    const laps=race.actual_laps||race.scheduled_laps;
    if(status==='Final'){
      const winner=drivers.get(race.winner_driver_id);
      event.winner=winner||null;
      event.headline=winner?`Winner: ${winner.name}${winner.car?` (#${winner.car})`:''}`:'Final';
      // The race's own results; without them, the winner from the standings.
      const rows=finishes.get(race.race_id)||[];
      event.results=rows.length?rows.slice(0,3):winner?[{participant:`${winner.name}${winner.car?` (#${winner.car})`:''}`,result:'1st'}]:[];
      event.has_more_results=rows.length>3;
      event.result_count=rows.length||event.results.length;
    }else if(status==='Live'){
      const order=(live.vehicles||[]).slice().sort((a,b)=>a.running_position-b.running_position);
      const leader=order[0];
      event.recency_label=`Lap ${live.lap_number} of ${live.laps_in_race}`+(live.flag_state===2?' · Caution':live.flag_state===3?' · Red flag':'');
      event.headline=leader?`Leader: ${leader.driver?.full_name||''} (#${leader.vehicle_number})`:'Under way';
      event.results=order.slice(0,10).map(v=>({participant:`${ordinal(v.running_position)} ${v.driver?.full_name||''}`.trim(),result:`#${v.vehicle_number}`}));
      event.live_score_source='NASCAR live timing';
    }else{
      if(laps)event.results.push({label:'Distance',value:`${race.scheduled_laps} laps · ${race.scheduled_distance} mi`});
      if(race.television_broadcaster)event.broadcast=race.television_broadcaster;
      if(race.television_broadcaster)event.results.push({label:'TV',value:race.television_broadcaster});
    }
    if(status!=='Final')event.result_count=event.results.length;
    events.push(event);
  }
  return events;
}

// Driver names and car numbers by NASCAR driver id: the series standings,
// then any race's own results (a part-time winner is not in the standings).
export function nascarDrivers(points,weekendFeeds=[]){
  const map=new Map();
  for(const row of Array.isArray(points)?points:[])if(row.driver_id)map.set(row.driver_id,{name:String(row.driver_name||`${row.driver_first_name} ${row.driver_last_name}`).trim(),car:row.car_no||null});
  for(const feed of weekendFeeds)for(const r of feed?.weekend_race?.[0]?.results||[])if(r.driver_id&&!map.has(r.driver_id))map.set(r.driver_id,{name:String(r.driver_fullname).replace(/\s*\(i\)\s*$/i,'').replace(/\s*#\s*$/,'').trim(),car:r.car_number||null});
  return map;
}

// The expanded view of a final race: the finishing order, the stage winners
// and the race's numbers, from its weekend feed.
export function nascarRaceDetails(event,feed){
  const race=feed?.weekend_race?.[0];if(!race?.results?.length)return null;
  const name=n=>String(n||'').replace(/\s*\(i\)\s*$/i,'').replace(/\s*#\s*$/,'').trim();
  const order=race.results.slice().sort((a,b)=>a.finishing_position-b.finishing_position);
  const winner=order[0],second=order[1];
  const rows=nascarFinishRows(feed);
  const lines=[`${name(winner.driver_fullname)} (#${winner.car_number}, ${winner.team_name}) won the ${String(race.race_name).trim()} at ${race.track_name}${second?`, ahead of ${name(second.driver_fullname)}`:''}${race.margin_of_victory?` by ${seconds(race.margin_of_victory)} s`:''}.`];
  if(winner.starting_position)lines.push(`${name(winner.driver_fullname)} started ${ordinal(winner.starting_position)}${winner.laps_led?` and led ${winner.laps_led} laps`:''}.`);
  const mostLed=order.reduce((a,b)=>!a||b.laps_led>a.laps_led?b:a,null);
  if(mostLed&&mostLed!==winner&&mostLed.laps_led)lines.push(`${name(mostLed.driver_fullname)} led the most laps (${mostLed.laps_led}).`);
  for(const stage of (race.stage_results||[]).slice().sort((a,b)=>a.stage_number-b.stage_number)){
    const top=(stage.results||[]).slice().sort((a,b)=>a.finishing_position-b.finishing_position)[0];
    if(top)lines.push(`Stage ${stage.stage_number}: won by ${name(top.driver_fullname)}.`);
  }
  if(race.number_of_cautions!=null)lines.push(`${race.number_of_lead_changes} lead changes among ${race.number_of_leaders} drivers; ${race.number_of_cautions} cautions for ${race.number_of_caution_laps} laps.`);
  const stats=[];
  if(race.actual_laps)stats.push({label:'Laps',value:String(race.actual_laps)});
  if(race.average_speed)stats.push({label:'Average speed',value:`${race.average_speed} mph`});
  if(race.total_race_time)stats.push({label:'Race time',value:race.total_race_time});
  if(race.number_of_cars_in_field)stats.push({label:'Cars in the field',value:String(race.number_of_cars_in_field)});
  return{rows,lines,stats};
}

// Every driver's finish from a race's weekend feed, cross-country style,
// with the car's make (user, October 15: "put the type of car manufacturer
// in the results").
export function nascarFinishRows(feed){
  const results=feed?.weekend_race?.[0]?.results||[];
  const name=n=>String(n||'').replace(/\s*\(i\)\s*$/i,'').replace(/\s*#\s*$/,'').trim();
  return results.slice().sort((a,b)=>a.finishing_position-b.finishing_position).map(r=>({participant:`${name(r.driver_fullname)}${r.car_number?` (#${r.car_number})`:''}`,result:[ordinal(r.finishing_position),r.team_name,r.car_make||null,r.finishing_status&&r.finishing_status!=='Running'?r.finishing_status:null,r.laps_led?`${r.laps_led} laps led`:null].filter(Boolean).join(' · ')}));
}
