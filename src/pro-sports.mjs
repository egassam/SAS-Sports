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
// - IMSA: its official results folders (results.imsa.com), below.
// - Formula 1: formula1.com's official results pages, the Jolpica F1
//   database for the calendar's start times, and ESPN's F1 board while a race
//   runs, below.
// Pro players are adults, but no featured athletes are shown yet (the
// three-athlete rule is for schools' official rosters).
// No team logos or car-number art (user, October 15: "Leave the logos out":
// they are the leagues' and teams' trademarks, not licensed here).

export const PRO_TEAMS={
  // The 32 NFL teams by division (user, October 16: "Add the entire NFL.
  // Group them by division"). Division games give the header's "AFC North
  // 2-1" (regular season).
  'buffalo-bills':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'buf'},division:{name:'AFC East',members:['MIA','NE','NYJ']},schedule:'https://www.buffalobills.com/schedule/'},
  'miami-dolphins':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'mia'},division:{name:'AFC East',members:['BUF','NE','NYJ']},schedule:'https://www.miamidolphins.com/schedule/'},
  'new-england-patriots':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'ne'},division:{name:'AFC East',members:['BUF','MIA','NYJ']},schedule:'https://www.patriots.com/schedule/'},
  'new-york-jets':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'nyj'},division:{name:'AFC East',members:['BUF','MIA','NE']},schedule:'https://www.newyorkjets.com/schedule/'},
  'baltimore-ravens':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'bal'},division:{name:'AFC North',members:['CIN','CLE','PIT']},schedule:'https://www.baltimoreravens.com/schedule/'},
  'cincinnati-bengals':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'cin'},division:{name:'AFC North',members:['BAL','CLE','PIT']},schedule:'https://www.bengals.com/schedule/'},
  'cleveland-browns':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'cle'},division:{name:'AFC North',members:['BAL','CIN','PIT']},schedule:'https://www.clevelandbrowns.com/schedule/'},
  'pittsburgh-steelers':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'pit'},division:{name:'AFC North',members:['BAL','CIN','CLE']},schedule:'https://www.steelers.com/schedule/'},
  'houston-texans':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'hou'},division:{name:'AFC South',members:['IND','JAX','TEN']},schedule:'https://www.houstontexans.com/schedule/'},
  'indianapolis-colts':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'ind'},division:{name:'AFC South',members:['HOU','JAX','TEN']},schedule:'https://www.colts.com/schedule/'},
  'jacksonville-jaguars':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'jax'},division:{name:'AFC South',members:['HOU','IND','TEN']},schedule:'https://www.jaguars.com/schedule/'},
  'tennessee-titans':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'ten'},division:{name:'AFC South',members:['HOU','IND','JAX']},schedule:'https://www.tennesseetitans.com/schedule/'},
  'denver-broncos':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'den'},division:{name:'AFC West',members:['KC','LV','LAC']},schedule:'https://www.denverbroncos.com/schedule/'},
  'kansas-city-chiefs':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'kc'},division:{name:'AFC West',members:['DEN','LV','LAC']},schedule:'https://www.chiefs.com/schedule/'},
  'las-vegas-raiders':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'lv'},division:{name:'AFC West',members:['DEN','KC','LAC']},schedule:'https://www.raiders.com/schedule/'},
  'los-angeles-chargers':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'lac'},division:{name:'AFC West',members:['DEN','KC','LV']},schedule:'https://www.chargers.com/schedule/'},
  'dallas-cowboys':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'dal'},division:{name:'NFC East',members:['NYG','PHI','WSH']},schedule:'https://www.dallascowboys.com/schedule/'},
  'new-york-giants':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'nyg'},division:{name:'NFC East',members:['DAL','PHI','WSH']},schedule:'https://www.giants.com/schedule/'},
  'philadelphia-eagles':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'phi'},division:{name:'NFC East',members:['DAL','NYG','WSH']},schedule:'https://www.philadelphiaeagles.com/schedule/'},
  'washington-commanders':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'wsh'},division:{name:'NFC East',members:['DAL','NYG','PHI']},schedule:'https://www.commanders.com/schedule/'},
  'chicago-bears':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'chi'},division:{name:'NFC North',members:['DET','GB','MIN']},schedule:'https://www.chicagobears.com/schedule/'},
  'detroit-lions':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'det'},division:{name:'NFC North',members:['CHI','GB','MIN']},schedule:'https://www.detroitlions.com/schedule/'},
  'green-bay-packers':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'gb'},division:{name:'NFC North',members:['CHI','DET','MIN']},schedule:'https://www.packers.com/schedule/'},
  'minnesota-vikings':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'min'},division:{name:'NFC North',members:['CHI','DET','GB']},schedule:'https://www.vikings.com/schedule/'},
  'atlanta-falcons':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'atl'},division:{name:'NFC South',members:['CAR','NO','TB']},schedule:'https://www.atlantafalcons.com/schedule/'},
  'carolina-panthers':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'car'},division:{name:'NFC South',members:['ATL','NO','TB']},schedule:'https://www.panthers.com/schedule/'},
  'new-orleans-saints':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'no'},division:{name:'NFC South',members:['ATL','CAR','TB']},schedule:'https://www.neworleanssaints.com/schedule/'},
  'tampa-bay-buccaneers':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'tb'},division:{name:'NFC South',members:['ATL','CAR','NO']},schedule:'https://www.buccaneers.com/schedule/'},
  'arizona-cardinals':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'ari'},division:{name:'NFC West',members:['LAR','SF','SEA']},schedule:'https://www.azcardinals.com/schedule/'},
  'los-angeles-rams':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'lar'},division:{name:'NFC West',members:['ARI','SF','SEA']},schedule:'https://www.therams.com/schedule/'},
  'san-francisco-49ers':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'sf'},division:{name:'NFC West',members:['ARI','LAR','SEA']},schedule:'https://www.49ers.com/schedule/'},
  'seattle-seahawks':{kind:'espn-team',sport:'Football',espn:{path:'football/nfl',team:'sea'},division:{name:'NFC West',members:['ARI','LAR','SF']},schedule:'https://www.seahawks.com/schedule/'},
  'nascar-cup-series':{
    kind:'nascar',sport:'Auto Racing',seriesId:1,
    schedule:'https://www.nascar.com/nascar-cup-series/schedule/'
  },
  // IMSA (user, October 16: "Let's add IMSA racing series under auto
  // racing"): its two championships, each a Races entry under IMSA.
  'imsa-weathertech':{
    kind:'imsa',sport:'Auto Racing',championship:'IMSA WeatherTech SportsCar Championship',calendar:'weathertech',
    schedule:'https://www.imsa.com/weathertech/schedule/'
  },
  'imsa-pilot-challenge':{
    kind:'imsa',sport:'Auto Racing',championship:'IMSA Michelin Pilot Challenge',calendar:'pilotChallenge',
    schedule:'https://www.imsa.com/michelinpilotchallenge/schedule/'
  },
  // Formula 1 (user, October 16: "Add formula one under auto racing"): every
  // Grand Prix and Sprint of the World Championship.
  'formula-1':{
    kind:'f1',sport:'Auto Racing',
    schedule:'https://www.formula1.com/en/racing/2026'
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
      event.espn_event_id=game.id;event.espn_date=game.date;
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
  const scoring=(summary.scoringPlays||[]).map(p=>`${periodName(p.period?.number)} ${p.clock?.displayValue||''} · ${p.team?.abbreviation||''}: ${p.text}`.replace(/\s+/g,' ').trim());
  const recap=summary.article?.links?.web?.href?.replace(/^http:/,'https:')||null;
  // The expanded view's own layout (user, October 16: "can we clean up the
  // card please"): a score-by-quarter table, a two-column team stats table
  // and the scoring plays grouped by quarter, instead of label/value rows.
  const ownAbbr=own.team.abbreviation,oppAbbr=opp.team.abbreviation;
  const boxStats=ownBox&&oppBox?LIVE_STATS.map(([n,l])=>({label:l,ours:stat(ownBox,n),theirs:stat(oppBox,n)})).filter(r=>r.ours!=null&&r.theirs!=null):[];
  const box_score={
    teams:{ours:ownAbbr,theirs:oppAbbr},
    line:quarters.map(({q,us,them})=>({label:periodName(q),ours:String(us),theirs:String(them)})),
    totals:{ours:String(us),theirs:String(them)},
    stats:boxStats,
    scoring:(summary.scoringPlays||[]).map(p=>({period:periodName(p.period?.number),clock:p.clock?.displayValue||'',team:p.team?.abbreviation||'',ours:p.team?.abbreviation===ownAbbr,text:String(p.text||'').replace(/\s+/g,' ').trim(),score:p.awayScore!=null&&p.homeScore!=null?(own.homeAway==='home'?`${p.homeScore}-${p.awayScore}`:`${p.awayScore}-${p.homeScore}`):null}))
  };
  return{lines,stats,scoring,recap,box_score};
}

// ---- NASCAR (cf.nascar.com) ----

// The season's races. A race is Final once NASCAR names its winner; a past
// race without one is not listed. Non-points races (the Clash, the Duels,
// the All-Star Race) are labeled.
// Race finals read like cross country meets (user, October 15: "NASCAR lay
// out should be similar to the cross country layout"): one row per driver,
// "Chase Briscoe (#19)" · "1st · Joe Gibbs Racing"; the card shows the top
// three, the expanded view the whole field.
export function nascarRaces(list,{school,config,timeZone,now,drivers=new Map(),live=null,finishes=new Map(),tables=new Map()}){
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
      const table=tables.get(race.race_id);if(table?.length)event.race_table=table.slice(0,3);
      event.result_count=rows.length||event.results.length;
    }else if(status==='Live'){
      const order=(live.vehicles||[]).slice().sort((a,b)=>a.running_position-b.running_position);
      const leader=order[0];
      event.recency_label=`Lap ${live.lap_number} of ${live.laps_in_race}`+(live.flag_state===2?' · Caution':live.flag_state===3?' · Red flag':'');
      event.headline=leader?`Leader: ${leader.driver?.full_name||''} (#${leader.vehicle_number})`:'Under way';
      event.results=order.slice(0,10).map(v=>({participant:`${ordinal(v.running_position)} ${v.driver?.full_name||''}`.trim(),result:`#${v.vehicle_number}`}));
      event.live_details=nascarLiveDetails(live);
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
  return{rows,lines,stats,table:nascarFinishTable(feed)};
}

// Every driver's finish from a race's weekend feed, cross-country style,
// with the car's make (user, October 15: "put the type of car manufacturer
// in the results").
export function nascarFinishRows(feed){
  const results=feed?.weekend_race?.[0]?.results||[];
  const name=n=>String(n||'').replace(/\s*\(i\)\s*$/i,'').replace(/\s*#\s*$/,'').trim();
  return results.slice().sort((a,b)=>a.finishing_position-b.finishing_position).map(r=>({participant:`${name(r.driver_fullname)}${r.car_number?` (#${r.car_number})`:''}`,result:[ordinal(r.finishing_position),r.team_name,r.car_make||null,r.finishing_status&&r.finishing_status!=='Running'?r.finishing_status:null,r.laps_led?`${r.laps_led} laps led`:null].filter(Boolean).join(' · ')}));
}

// ---- Live game details (ESPN scoreboard and game summary) ----
// Everything ESPN publishes about a game under way, for the live card (user,
// October 16: "update all live cards to show all the data"): the score by
// period, who has the ball, down and distance, the last play and the drive,
// timeouts, the win probability, the game leaders, the team stats and every
// scoring play. Shared by the NFL teams and the college live boards (the
// scoreboards have one shape). Each part is left out when ESPN does not
// publish it (between plays, at breaks, in sports without them).
// Football periods: Q1-Q4, then OT (OT2 for a second overtime).
const periodName=n=>n<=4?`Q${n}`:n===5?'OT':`OT${n-4}`;
const LIVE_STATS=[['totalYards','Total yards'],['netPassingYards','Passing yards'],['rushingYards','Rushing yards'],['firstDowns','First downs'],['thirdDownEff','3rd down'],['fourthDownEff','4th down'],['redZoneAttempts','Red zone'],['turnovers','Turnovers'],['sacksYardsLost','Sacks-yards'],['totalPenaltiesYards','Penalties'],['possessionTime','Time of possession']];
const teamIdOf=c=>String(c?.id??c?.team?.id??'');
const shortTeam=c=>c?.team?.abbreviation||c?.team?.shortDisplayName||'';
export function espnLiveDetails(competition,{ours,opponent,sport='Football',summary=null}){
  const out={possession:null,down_distance:null,red_zone:null,live_details:null};
  if(!competition||!ours||!opponent)return out;
  const situation=competition.situation||null,details={};
  const ourId=teamIdOf(ours),theirId=teamIdOf(opponent),side=id=>id===ourId?'ours':id===theirId?'theirs':null;
  const label=n=>sport==='Football'?(n<=4?`Q${n}`:n===5?'OT':`OT${n-4}`):String(n);
  // Score by period ("Q1 3-0"); a period not yet played is not shown.
  const periods=c=>new Map((c?.linescores||[]).map((l,i)=>[Number(l.period??i+1),l.displayValue??(l.value!=null?String(l.value):null)]));
  const a=periods(ours),b=periods(opponent),numbers=[...new Set([...a.keys(),...b.keys()])].filter(Number.isFinite).sort((x,y)=>x-y);
  if(numbers.length)details.line=numbers.map(n=>({label:label(n),ours:a.get(n)??'0',theirs:b.get(n)??'0'}));
  details.teams={ours:shortTeam(ours),theirs:shortTeam(opponent)};
  const record=c=>(c?.records||[]).find(r=>r.type==='total'||r.name==='overall')?.summary||null;
  if(record(ours)||record(opponent))details.records={ours:record(ours),theirs:record(opponent)};
  if(situation){
    const holder=situation.possession!=null?side(String(situation.possession)):null;
    if(holder){
      out.possession=holder==='ours'?'school':'opponent';
      out.down_distance=String(situation.downDistanceText||'').replace(/\s+/g,' ').trim()||null;
      out.red_zone=situation.isRedZone===true;
    }
    const last=situation.lastPlay;
    if(last?.text)details.last_play=String(last.text).replace(/\s+/g,' ').trim();
    if(last?.drive?.description)details.drive=String(last.drive.description).trim();
    if(Number.isFinite(situation.homeTimeouts)&&Number.isFinite(situation.awayTimeouts)){
      const home=ours.homeAway==='home';
      details.timeouts={ours:home?situation.homeTimeouts:situation.awayTimeouts,theirs:home?situation.awayTimeouts:situation.homeTimeouts};
    }
    const p=last?.probability;
    if(p&&Number.isFinite(p.homeWinPercentage)){const home=ours.homeAway==='home',v=home?p.homeWinPercentage:p.awayWinPercentage;if(Number.isFinite(v))details.win_probability=Math.round(v*1000)/10;}
  }
  const current=summary?.drives?.current;
  if(!details.drive&&current?.description)details.drive=String(current.description).trim();
  // Game leaders: the scoreboard's (one per category, either team), or each
  // side's own (college basketball lists them per team).
  const leaders=[];
  const leaderLine=(group,team)=>{const top=group?.leaders?.[0],who=top?.athlete?.displayName||top?.athlete?.fullName;if(!who||!top.displayValue)return;const id=String(top.team?.id??top.athlete?.team?.id??team??''),tag=id===ourId?details.teams.ours:id===theirId?details.teams.theirs:'';leaders.push({label:String(group.displayName||group.name||'').replace(/ Leader$/,''),value:`${who}${tag?` (${tag})`:''}, ${top.displayValue}`});};
  for(const group of competition.leaders||[])leaderLine(group);
  if(!leaders.length)for(const c of [ours,opponent])for(const group of c.leaders||[])leaderLine(group,teamIdOf(c));
  if(leaders.length)details.leaders=leaders;
  // Team stats and scoring plays from the game summary (football).
  const box=summary?.boxscore?.teams||[],ownBox=box.find(t=>String(t.team?.id)===ourId),oppBox=box.find(t=>String(t.team?.id)===theirId);
  const stat=(t,n)=>t?.statistics?.find(s=>s.name===n)?.displayValue;
  if(ownBox&&oppBox){const stats=LIVE_STATS.map(([n,l])=>({label:l,ours:stat(ownBox,n),theirs:stat(oppBox,n)})).filter(s=>s.ours!=null&&s.theirs!=null);if(stats.length)details.stats=stats;}
  const scoring=(summary?.scoringPlays||[]).map(p=>`${label(p.period?.number)} ${p.clock?.displayValue||''} · ${p.team?.abbreviation||''}: ${p.text||''}`.replace(/\s+/g,' ').trim());
  if(scoring.length)details.scoring=scoring;
  const tv=[...new Set((competition.broadcasts||[]).flatMap(b=>b.names||[]))];
  if(tv.length)details.broadcast=tv.join(', ');
  if(competition.venue?.fullName)details.venue=competition.venue.fullName;
  out.live_details=Object.keys(details).length>1?details:null;
  return out;
}

// Lays the league scoreboard (and the game summary) over a team's game that
// is under way, or that ESPN's team schedule still shows before kickoff: the
// scoreboard is read every 15 s, the team schedule every 2 minutes.
export function applyEspnLive(event,scoreboard,summary,config){
  const game=(scoreboard?.events||[]).find(g=>String(g.id)===String(event.espn_event_id)),c=game?.competitions?.[0];
  if(!c)return event;
  const sides=c.competitors||[],own=sides.find(t=>t.team?.abbreviation?.toLowerCase()===config.espn.team),opp=sides.find(t=>t!==own);
  if(!own||!opp)return event;
  const type=c.status?.type||{},state=type.state;
  const us=own.score,them=opp.score;
  if(state==='in'){
    event.status='Live';event.priority_bucket='live';
    event.school_score=String(us??'0');event.opponent_score=String(them??'0');
    event.recency_label=type.shortDetail||'In progress';event.headline=`${event.school_score}-${event.opponent_score}`;
    event.live_score_source='ESPN';
    event.results=event.results.filter(r=>r.label!=='Result');
    Object.assign(event,espnLiveDetails(c,{ours:own,opponent:opp,sport:'Football',summary}));
  }else if(state==='post'&&event.status!=='Final'&&us!=null&&them!=null){
    const a=Number(us),b=Number(them),outcome=a>b?'W':a<b?'L':'T';
    event.status='Final';event.priority_bucket='recent_final';event.recency_label='Final';
    event.school_score=String(us);event.opponent_score=String(them);
    event.headline=`${outcome} ${us}-${them}${/OT/.test(type.shortDetail||'')?' (OT)':''}`;
    event.results=[{label:'Result',value:event.headline},...event.results.filter(r=>r.label!=='TV'&&r.label!=='Result')];
  }
  event.result_count=event.results.length;
  // The id names the status, as the team schedule's own events do.
  event.id=event.id.replace(/-(?:today|upcoming|live|final)$/,`-${event.status.toLowerCase()}`);
  return event;
}

// A race under way, everything the live timing feed publishes: the stage,
// laps to go, cautions, lead changes, and every car's position, gap to the
// leader, laps led, make and last-lap speed.
const MAKES={Chv:'Chevrolet',Frd:'Ford',Tyt:'Toyota'};
export function nascarLiveDetails(live){
  if(!live)return null;
  const details={};
  if(live.stage?.stage_num)details.stage=`Stage ${live.stage.stage_num}${live.stage.finish_at_lap?` · ends lap ${live.stage.finish_at_lap}`:''}`;
  if(Number.isFinite(live.laps_to_go))details.laps_to_go=live.laps_to_go;
  const numbers=[];
  if(Number.isFinite(live.number_of_caution_segments))numbers.push({label:'Cautions',value:`${live.number_of_caution_segments} for ${live.number_of_caution_laps||0} laps`});
  if(Number.isFinite(live.number_of_lead_changes))numbers.push({label:'Lead changes',value:`${live.number_of_lead_changes} among ${live.number_of_leaders||0} drivers`});
  if(numbers.length)details.numbers=numbers;
  const led=v=>Array.isArray(v?.laps_led)?v.laps_led.reduce((n,s)=>n+Math.max(0,(Number(s.end_lap)||0)-(Number(s.start_lap)||0)+1),0):Number(v?.laps_led)||0;
  const gap=v=>{const d=Number(v.delta);if(v.running_position===1)return'Leader';if(!Number.isFinite(d))return null;return d<0?`${Math.abs(Math.round(d))} lap${Math.abs(Math.round(d))===1?'':'s'} down`:`+${d.toFixed(3)} s`;};
  details.order=(live.vehicles||[]).slice().sort((a,b)=>a.running_position-b.running_position).map(v=>({
    position:v.running_position,
    driver:`${v.driver?.full_name||''}`.replace(/\s*\(i\)\s*$/i,'').replace(/\s*#\s*$/,'').trim(),
    car:v.vehicle_number?`#${v.vehicle_number}`:'',
    gap:gap(v),
    make:MAKES[v.vehicle_manufacturer]||v.vehicle_manufacturer||null,
    laps_led:led(v)||null,
    last_lap_speed:Number(v.last_lap_speed)?`${Number(v.last_lap_speed).toFixed(3)} mph`:null,
    pit:v.is_on_track===false?'Pit road':null
  }));
  return details;
}

// The expanded view's results table (user, October 16: "NASCAR full results
// is still not showing car manufacturer and the layout is messy"): one row
// per car with its finish, driver, car number, team, make, laps led, and any
// finishing status other than Running (Accident, Engine).
export function nascarFinishTable(feed){
  const results=feed?.weekend_race?.[0]?.results||[];
  const name=n=>String(n||'').replace(/\s*\(i\)\s*$/i,'').replace(/\s*#\s*$/,'').trim();
  return results.slice().sort((a,b)=>a.finishing_position-b.finishing_position).map(r=>({pos:r.finishing_position,driver:name(r.driver_fullname),car:r.car_number?`#${r.car_number}`:'',team:r.team_name||'',make:r.car_make||'',laps_led:r.laps_led||0,status:r.finishing_status&&r.finishing_status!=='Running'?r.finishing_status:''}));
}

// ---- IMSA (results.imsa.com) ----
// User, October 16: "Let's add IMSA racing series under auto racing". IMSA's
// official results (results.imsa.com, served by its timing provider Al Kamel
// at imsa.results.alkamelcloud.com) are plain folders: season → event →
// championship → session ("202610031210_Race", the track's local start),
// with each race's classification as JSON ("03_Results_Race_Official.JSON";
// an endurance race keeps it in its last "NN_Hour N" folder and posts hourly
// standings in the others). A folder appears only once a race weekend has
// started, so coming races are from IMSA's published calendar (imsa.com
// answers automated reads with a bot challenge; the 2027 schedules were
// announced on March 19, 2026). Sports cars race in classes (GTP, LMP2, GTD
// PRO, GTD; GS and TCR in the Pilot Challenge), so the card shows each
// class winner and the race window the whole field by class.
export const IMSA_RESULTS='https://imsa.results.alkamelcloud.com/Results/';
// Folder names give the track; its zone turns the folder's local start into
// the series' wall clock.
const IMSA_TRACKS=[
  [/Daytona/i,'Daytona International Speedway','America/New_York'],
  [/Sebring/i,'Sebring International Raceway','America/New_York'],
  [/Long Beach/i,'Long Beach Street Circuit','America/Los_Angeles'],
  [/Laguna Seca/i,'WeatherTech Raceway Laguna Seca','America/Los_Angeles'],
  [/Detroit/i,'Detroit Street Circuit','America/Detroit'],
  [/Mid-Ohio/i,'Mid-Ohio Sports Car Course','America/New_York'],
  [/Watkins Glen/i,'Watkins Glen International','America/New_York'],
  [/Canadian Tire|Mosport/i,'Canadian Tire Motorsport Park','America/Toronto'],
  [/Road America/i,'Road America','America/Chicago'],
  [/VIRginia|\bVIR\b/,'VIRginia International Raceway','America/New_York'],
  [/Indianapolis/i,'Indianapolis Motor Speedway','America/Indiana/Indianapolis'],
  [/Road Atlanta/i,'Michelin Raceway Road Atlanta','America/New_York'],
  [/Lime Rock/i,'Lime Rock Park','America/New_York'],
  [/Circuit of the Americas|COTA/i,'Circuit of The Americas','America/Chicago'],
  [/Miami/i,'Miami International Autodrome','America/New_York']
];
export function imsaTrack(name){const t=IMSA_TRACKS.find(([re])=>re.test(String(name||'')));return t?{name:t[1],timeZone:t[2]}:{name:String(name||'').replace(/^\d+_/,'').trim(),timeZone:'America/New_York'}}
// IMSA's 2027 calendars as announced on March 19, 2026 ("2027 schedules
// revealed for IMSA WeatherTech SportsCar Championship, IMSA Michelin Pilot
// Challenge"): race weekends, the race's name where IMSA gave one, its length
// and the classes that race. Start times come with the event's folder.
export const IMSA_CALENDARS={
  weathertech:[
    {from:'2027-01-28',to:'2027-01-31',track:'Daytona',name:'Rolex 24 At Daytona',length:'24 hours',classes:'GTP, LMP2, GTD PRO, GTD'},
    {from:'2027-03-17',to:'2027-03-20',track:'Sebring',name:'Mobil 1 Twelve Hours of Sebring',length:'12 hours',classes:'GTP, LMP2, GTD PRO, GTD'},
    {from:'2027-04-16',to:'2027-04-17',track:'Long Beach',name:'Acura Grand Prix of Long Beach',length:'100 minutes',classes:'GTP, GTD'},
    {from:'2027-04-30',to:'2027-05-02',track:'Laguna Seca',length:'2 hours 40 minutes',classes:'GTP, GTD PRO, GTD'},
    {from:'2027-06-04',to:'2027-06-05',track:'Detroit',name:'Chevrolet Detroit Grand Prix',length:'100 minutes',classes:'GTP, GTD PRO'},
    {from:'2027-06-24',to:'2027-06-27',track:'Watkins Glen',name:"Sahlen's Six Hours of The Glen",length:'6 hours',classes:'GTP, LMP2, GTD PRO, GTD'},
    {from:'2027-07-09',to:'2027-07-11',track:'Canadian Tire',length:'2 hours 40 minutes',classes:'LMP2, GTD PRO, GTD'},
    {from:'2027-07-29',to:'2027-08-01',track:'Road America',length:'6 hours',classes:'GTP, LMP2, GTD PRO, GTD'},
    {from:'2027-08-20',to:'2027-08-22',track:'VIR',name:'Michelin GT Challenge at VIR',length:'2 hours 40 minutes',classes:'GTD PRO, GTD'},
    {from:'2027-09-17',to:'2027-09-19',track:'Indianapolis',name:'TireRack.com Battle on the Bricks',length:'2 hours 40 minutes',classes:'GTP, LMP2, GTD PRO, GTD'},
    {from:'2027-10-06',to:'2027-10-09',track:'Road Atlanta',name:'30th Motul Petit Le Mans',length:'10 hours'}
  ],
  pilotChallenge:[
    {from:'2027-01-28',to:'2027-01-31',track:'Daytona',length:'4 hours',classes:'GS, TCR'},
    {from:'2027-03-17',to:'2027-03-20',track:'Sebring',length:'2 hours',classes:'GS, TCR'},
    {from:'2027-06-11',to:'2027-06-13',track:'Mid-Ohio',length:'4 hours',classes:'GS, TCR'},
    {from:'2027-06-24',to:'2027-06-27',track:'Watkins Glen',length:'2 hours',classes:'GS, TCR'},
    {from:'2027-07-09',to:'2027-07-11',track:'Canadian Tire',length:'2 hours',classes:'GS, TCR'},
    {from:'2027-07-29',to:'2027-08-01',track:'Road America',length:'2 hours',classes:'GS, TCR'},
    {from:'2027-08-20',to:'2027-08-22',track:'VIR',length:'2 hours',classes:'GS, TCR'},
    {from:'2027-09-17',to:'2027-09-19',track:'Indianapolis',length:'2 hours',classes:'GS, TCR'},
    {from:'2027-09-23',to:'2027-09-25',track:'Lime Rock',name:'FCP Euro Northeast Grand Prix',length:'2 hours',classes:'GS, TCR'},
    {from:'2027-10-06',to:'2027-10-09',track:'Road Atlanta',length:'2 hours',classes:'GS, TCR'}
  ]
};

// An Apache folder listing: each entry's name (decoded, no trailing slash),
// whether it is a folder, and its last-modified time.
export function imsaListing(html){
  const out=[];
  for(const m of String(html||'').matchAll(/<a href="([^"?/][^"]*)">[^<]*<\/a>\s*<\/td>\s*<td[^>]*>([^<]*)/g)){
    let name;try{name=decodeURIComponent(m[1])}catch{name=m[1]}
    const dir=name.endsWith('/');
    out.push({href:m[1],name:dir?name.slice(0,-1):name,dir,modified:m[2].trim()});
  }
  return out;
}
// The race sessions in a championship folder ("202610031210_Race", "…_Race 2").
export const imsaRaceSessions=entries=>entries.filter(e=>e.dir&&/^\d{12}_Race\b/i.test(e.name));
// The race's classification file, most final first: Official, then
// Provisional, then Unofficial (an amended copy before its original).
const MARKS=['Official_Amended','Official','Provisional_Amended','Provisional','Unofficial_Amended','Unofficial'];
export function imsaResultsFile(entries){
  for(const mark of MARKS){const f=entries.find(e=>!e.dir&&e.name===`03_Results_Race_${mark}.JSON`);if(f)return f}
  return null;
}
// An endurance race's hour folders, last first ("10_Hour 10").
export const imsaHourFolders=entries=>entries.filter(e=>e.dir&&/^\d+_Hour \d+$/i.test(e.name)).sort((a,b)=>parseInt(b.name)-parseInt(a.name));
// A folder's local start ("202610031210") on the series' wall clock.
export function imsaStart(session,trackZone,timeZone){
  const m=String(session).match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)/);if(!m)return null;
  const local=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00.000Z`,guess=Date.parse(local);
  const offset=Date.parse(wallClock(guess,trackZone))-guess;
  return wallClock(guess-offset,timeZone);
}
const className=c=>String(c||'').replace(/^GTDPRO$/i,'GTD PRO');
const imsaDrivers=car=>(car.drivers||[]).map(d=>`${d.firstname||''} ${d.surname||''}`.trim()).filter(Boolean);
const surnames=car=>(car.drivers||[]).map(d=>String(d.surname||'').trim()).filter(Boolean).join(' / ');
// The cars in finishing order, each with its class position.
function imsaOrder(results){
  const cars=(results?.classification||[]).slice().sort((a,b)=>a.position-b.position),inClass=new Map();
  return cars.map(car=>{const cls=className(car.class),n=(inClass.get(cls)||0)+1;inClass.set(cls,n);return{car,cls,classPos:n}});
}
const outOf=car=>{const done=car.not_finished===true||car.not_finished==='True';if(done)return car.not_finished_cause||'Did not finish';return car.status&&car.status!=='Classified'?car.status:''};
// The card: one row per class winner, in the order the classes finished.
export function imsaClassWinners(results){
  return imsaOrder(results).filter(r=>r.classPos===1).map(({car,cls})=>({pos:1,driver:surnames(car),car:`#${car.number}`,make:cls,team:[car.team,car.vehicle].filter(Boolean).join(' · '),laps_led:0,status:outOf(car),note:car.position===1?'Overall winner':`${ordinal(car.position)} overall`}));
}
// The field by class (the classes in the order their winners finished),
// each class in its finishing order.
function byClass(results){
  const order=imsaOrder(results),rank=new Map();
  for(const r of order)if(!rank.has(r.cls))rank.set(r.cls,rank.size);
  return order.slice().sort((a,b)=>rank.get(a.cls)-rank.get(b.cls)||a.classPos-b.classPos);
}
// The race window: the whole field under its class headings.
export function imsaFinishTable(results){
  return byClass(results).map(({car,cls,classPos})=>({group:cls,pos:classPos,driver:surnames(car),car:`#${car.number}`,make:car.manufacturer||'',team:[car.team,car.vehicle].filter(Boolean).join(' · '),laps_led:0,status:outOf(car),note:`${ordinal(car.position)} overall · ${car.laps} laps`}));
}
// Cross-country rows (shared result contract): each car with its class
// finish, overall finish, team and car.
export function imsaFinishRows(results){
  return byClass(results).map(({car,cls,classPos})=>({group:cls,participant:`#${car.number} ${imsaDrivers(car).join(', ')}`.trim(),result:[`${ordinal(classPos)} ${cls}`,`${ordinal(car.position)} overall`,car.team,car.vehicle,outOf(car)||null].filter(Boolean).join(' · ')}));
}
// The race window's lines and numbers.
export function imsaRaceDetails(results){
  const order=imsaOrder(results);if(!order.length)return null;
  const s=results.session||{},title=String(s.event_name||'').trim(),track=imsaTrack(s.circuit?.name).name;
  const [{car:winner}]=order,second=order[1]?.car;
  const lines=[`#${winner.number} ${winner.team} (${imsaDrivers(winner).join(', ')}; ${winner.vehicle}) won ${title?(/^the\b/i.test(title)?title:`the ${title}`):'the race'} overall at ${track}, ${winner.laps} laps${second&&/^\+/.test(second.gap_first||'')?`, ${second.gap_first.slice(1)} s ahead of #${second.number} ${second.team}`:''}.`];
  for(const {car,cls} of order.filter(r=>r.classPos===1&&r.car!==winner))lines.push(`${cls}: #${car.number} ${car.team} (${imsaDrivers(car).join(', ')}; ${car.vehicle}).`);
  const fast=results.fastest_lap;
  if(fast?.time)lines.push(`Fastest lap: ${fast.time} by ${`${fast.driver_firstname||''} ${fast.driver_surname||''}`.trim()} (#${fast.participant_number}).`);
  if(s.report_mark&&s.report_mark!=='Official')lines.push(`Results are ${s.report_mark.toLowerCase()} until IMSA makes them official.`);
  const stats=[{label:'Laps',value:String(winner.laps)}];
  if(winner.elapsed_time)stats.push({label:'Race time',value:winner.elapsed_time});
  stats.push({label:'Cars in the field',value:String(order.length)});
  const classes=[...new Set(order.map(r=>r.cls))];stats.push({label:'Classes',value:classes.join(', ')});
  if(s.weather?.track_status)stats.push({label:'Track',value:s.weather.track_status});
  return{lines,stats,rows:imsaFinishRows(results),table:imsaFinishTable(results)};
}
const weekend=(from,to)=>{const [,m1,d1]=from.split('-').map(Number),[,m2,d2]=to.split('-').map(Number);return m1===m2?`${MONTHS[m1-1]} ${d1}-${d2}`:`${MONTHS[m1-1]} ${d1}-${MONTHS[m2-1]} ${d2}`};
// The series' races: every race session in the season's folders (Final with
// its classification; Live with hourly standings; Today or Upcoming before
// the start), then the calendar's coming weekends that have no folder yet.
// A past race without a published classification is not listed (K-State's
// rule).
// races: [{session, event, track:{name,timeZone}, results, hour}] read by the Worker.
export function imsaRaces(races,{school,config,timeZone,now,calendar=[]}){
  const sport=config.sport,nowWall=Date.parse(wallClock(now,timeZone)),today=dayOf(wallClock(now,timeZone)),events=[],seen=new Set();
  for(const race of races){
    const start=imsaStart(race.session,race.track.timeZone,timeZone);if(!start)continue;
    const year=start.slice(0,4),began=Date.parse(start),day=dayOf(start);
    seen.add(`${year}|${race.track.name}`);
    const results=race.results?.classification?.length?race.results:null;
    let status;
    if(results)status='Final';
    else if(began<=nowWall&&nowWall-began<=26*3600e3)status='Live';
    else if(began>nowWall)status=day===today?'Today':'Upcoming';
    else continue;
    const title=String(results?.session?.event_name||race.hour?.session?.event_name||race.event||race.track.name).trim();
    const event=baseEvent({school,sport,status,title,start,display:displayTime(start),opponent:race.track.name,sourceName:'IMSA official results (Al Kamel Systems)',sourceUrl:'https://results.imsa.com/',now,key:`${race.session}|${race.track.name}|${status}`});
    event.track=race.track.name;event.season=Number(year);event.imsa_path=race.path||null;
    if(status==='Final'){
      const winners=imsaClassWinners(results),overall=imsaOrder(results)[0].car;
      event.headline=`Overall: #${overall.number} ${overall.team}`;
      event.winner={name:imsaDrivers(overall).join(', '),car:overall.number,team:overall.team};
      event.race_table=winners;event.race_card=winners;
      event.results=winners.map(w=>({participant:`${w.car} ${w.driver}`,result:`${w.make} winner · ${w.team}`}));
      event.result_count=results.classification.length;event.has_more_results=results.classification.length>winners.length;
      if(results.session?.report_mark&&results.session.report_mark!=='Official')event.recency_label=`Final (${results.session.report_mark.toLowerCase()})`;
    }else if(status==='Live'){
      const order=imsaOrder(race.hour);
      event.recency_label=race.hour?.session?.hour_name?`After ${race.hour.session.hour_name}`:'Under way';
      event.headline=order[0]?`Leader: #${order[0].car.number} ${order[0].car.team}`:'Under way';
      event.results=order.slice(0,10).map(({car,cls,classPos})=>({participant:`${ordinal(car.position)} #${car.number} ${car.team}`,result:`${ordinal(classPos)} ${cls}`}));
      event.live_details=order.length?{stage:event.recency_label,order:order.map(({car,cls,classPos})=>({position:car.position,driver:`${surnames(car)} (${car.team})`,car:`#${car.number} · ${ordinal(classPos)} ${cls}`,gap:car.position===1?'Leader':car.gap_first||null,make:car.manufacturer||null,laps_led:null,last_lap_speed:null,pit:null}))}:null;
      event.live_score_source='IMSA hourly standings';
      event.result_count=event.results.length;
    }
    events.push(event);
  }
  // The calendar's weekends still to come with no race folder yet.
  for(const entry of calendar){
    const track=imsaTrack(entry.track),year=entry.from.slice(0,4);
    if(seen.has(`${year}|${track.name}`))continue;
    const first=Date.parse(`${entry.from}T00:00:00Z`),last=Date.parse(`${entry.to}T00:00:00Z`);
    if(last<today)continue;
    const status=first<=today?'Today':'Upcoming',start=`${entry.from}T00:00:00.000Z`;
    const event=baseEvent({school,sport,status,title:entry.name||track.name,start,display:weekend(entry.from,entry.to),opponent:track.name,sourceName:'IMSA 2027 schedule (announced March 19, 2026)',sourceUrl:config.schedule,now,key:`${entry.from}|${track.name}|${status}`});
    event.end_time=`${entry.to}T23:59:00.000Z`;event.track=track.name;event.season=Number(year);
    if(entry.length)event.results.push({label:'Length',value:entry.length});
    if(entry.classes)event.results.push({label:'Classes',value:entry.classes});
    if(entry.name)event.results.push({label:'Track',value:track.name});
    event.result_count=event.results.length;
    events.push(event);
  }
  return events;
}

// ---- Formula 1 (formula1.com, Jolpica F1, ESPN) ----
// User, October 16: "Add formula one under auto racing". Auto Racing →
// Formula 1 → World Championship: every Grand Prix and Sprint.
// - Results: formula1.com's official results pages. The season page lists
//   each Grand Prix with its winner and a link; each race's page holds the
//   classification (position, number, driver, team, laps, time or why the
//   car retired, points), with the sprint, starting grid and fastest laps
//   beside it. robots.txt allows them.
// - Calendar: the Jolpica F1 database (api.jolpi.ca, the open successor of
//   Ergast): each round's race and sprint start in UTC, circuit and place.
//   formula1.com's schedule shows times only in the browser. A race the
//   season page has not listed yet (its first hours, or a sprint before
//   Sunday) takes Jolpica's results until it does.
// - Live: ESPN's F1 board (the feed the app reads for college live scores),
//   read only from a session's start until its result: lap and running order.
export const F1_RESULTS='https://www.formula1.com/en/results/';
export const F1_SITE='https://www.formula1.com';
export const JOLPICA_F1='https://api.jolpi.ca/ergast/f1/';
const textOf=html=>String(html||'').replace(/<svg[\s\S]*?<\/svg>/g,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
// The page's results table: its header names and each row's cells (text, and
// the raw cell for the driver and link).
export function f1Table(html){
  const t=String(html||''),i=t.indexOf('<table'),j=t.indexOf('</table>',i);if(i<0||j<0)return{head:[],rows:[]};
  const rows=[...t.slice(i,j).matchAll(/<tr[\s\S]*?<\/tr>/g)].map(m=>[...m[0].matchAll(/<t([dh])[^>]*>([\s\S]*?)<\/t\1>/g)].map(c=>({kind:c[1],raw:c[2],text:textOf(c[2])})));
  const head=(rows.find(r=>r.every(c=>c.kind==='h'))||[]).map(c=>c.text);
  return{head,rows:rows.filter(r=>r.length&&r.some(c=>c.kind==='d'))};
}
// "<span>Max</span> <span>Verstappen</span><span class="md:hidden">VER</span>"
// reads "Max Verstappen" (the code is the phone's short form).
const f1Driver=raw=>({name:textOf(String(raw).replace(/<span class="md:hidden">[^<]*<\/span>/g,'')),code:(String(raw).match(/<span class="md:hidden">([^<]*)<\/span>/)||[])[1]||''});
const column=(head,re)=>head.findIndex(h=>re.test(h));
// The season page: one row per Grand Prix run, with its winner and link.
export function f1SeasonResults(html,year){
  const {head,rows}=f1Table(html),at=re=>column(head,re);
  const [gp,date,winner,team,laps,time]=[/^Grand Prix$/i,/^Date$/i,/^Winner$/i,/^Team$/i,/^Laps$/i,/^Time$/i].map(at);
  if([gp,date,winner].some(n=>n<0))return[];
  return rows.map(r=>{
    const href=(r[gp].raw.match(/href="([^"]+\/race-result)"/)||(r.map(c=>c.raw).join('').match(/href="([^"]+\/race-result)"/))||[])[1]||null;
    const [d,mon]=r[date].text.split(' '),m=MONTHS.indexOf(mon);
    return{name:r[gp].text,date:m<0?null:`${year}-${pad(m+1)}-${pad(Number(d))}`,winner:f1Driver(r[winner].raw).name,team:team<0?'':r[team].text,laps:laps<0?null:Number(r[laps].text)||null,time:time<0?'':r[time].text,href:href?new URL(href,F1_SITE).href.replace(/\/race-result$/,'/'):null};
  }).filter(r=>r.date);
}
const OUT=/^(DNF|DNS|DSQ|DQ|NC|EXCL|DNQ)$/i;
// A race or sprint classification page: every car in finishing order.
export function f1Classification(html){
  const {head,rows}=f1Table(html),at=re=>column(head,re);
  const [pos,no,driver,team,laps,time,pts]=[/^Pos/i,/^No/i,/^Driver$/i,/^Team$/i,/^Laps$/i,/^Time/i,/^Pts/i].map(at);
  if([pos,driver,team].some(n=>n<0)||time<0)return[];
  return rows.map(r=>{
    const t=r[time].text,{name,code}=f1Driver(r[driver].raw);
    return{pos:r[pos].text,number:no<0?'':r[no].text,driver:name,code,team:r[team].text,laps:laps<0?null:Number(r[laps].text),time:OUT.test(t)?'':t,status:OUT.test(t)?t.toUpperCase():'',points:pts<0?0:Number(r[pts].text)||0};
  }).filter(r=>r.driver);
}
// The starting grid or fastest laps: each driver's place (and lap time).
export function f1DriverTable(html){
  const {head,rows}=f1Table(html),at=re=>column(head,re);
  const [pos,driver,team,lap,time]=[/^Pos/i,/^Driver$/i,/^Team$/i,/^Lap$/i,/^Time$/i].map(at);
  if(pos<0||driver<0)return[];
  return rows.map(r=>({pos:r[pos].text,driver:f1Driver(r[driver].raw).name,team:team<0?'':r[team].text,lap:lap<0?null:Number(r[lap].text)||null,time:time<0?'':r[time].text})).filter(r=>r.driver);
}
// Jolpica's results (the fallback until formula1.com lists a race) in the
// same shape: "R" retired, "D" disqualified, "W" withdrew, "N" not classified.
export function f1JolpicaClassification(payload){
  const race=payload?.MRData?.RaceTable?.Races?.[0],rows=race?.Results||race?.SprintResults||[];
  return rows.map(r=>{
    const mark=String(r.positionText),classified=/^\d+$/.test(mark);
    // A classified car that retired late (90% of the distance) is "DNF" too.
    const running=/^(Finished|Lapped|\+\d+ Laps?)$/i.test(String(r.status||'Finished'));
    const status=classified?(running?'':'DNF'):mark==='D'?'DSQ':mark==='W'?'DNS':'DNF';
    return{pos:classified?mark:mark==='D'?'DQ':'NC',number:String(r.number||''),driver:`${r.Driver?.givenName||''} ${r.Driver?.familyName||''}`.trim(),code:r.Driver?.code||'',team:r.Constructor?.name||'',laps:Number(r.laps)||0,time:r.Time?.time||(classified&&running&&/lap/i.test(r.status)?r.status:''),status,points:Number(r.points)||0};
  });
}
// The calendar: each round's Grand Prix and Sprint with their UTC starts.
export function f1Calendar(payload){
  return(payload?.MRData?.RaceTable?.Races||[]).map(r=>{
    const at=s=>s?.date?`${s.date}T${(s.time||'00:00:00Z').replace(/Z$/,'')}Z`:null;
    return{round:Number(r.round),name:String(r.raceName||'').trim(),start:at(r),timed:!!r.time,sprint:at(r.Sprint),circuit:r.Circuit?.circuitName||'',place:[r.Circuit?.Location?.locality,r.Circuit?.Location?.country].filter(Boolean).join(', ')};
  });
}
// formula1.com's season row for a calendar round: the same day, give or take
// one (a night race's local date can differ from its UTC date).
export function f1SeasonRow(season,round){
  const day=Date.parse(round.start.slice(0,10)+'T00:00:00Z');
  return season.find(r=>Math.abs(Date.parse(r.date+'T00:00:00Z')-day)<=864e5)||null;
}
// The card's rows and the race window's table: finish, driver and number,
// the team as the tag, the time or gap, and points (or why the car is out).
export function f1FinishTable(rows){
  return rows.map(r=>({pos:/^\d+$/.test(r.pos)?Number(r.pos):r.pos,driver:r.driver,car:r.number?`#${r.number}`:'',make:r.team,team:r.time||(r.laps!=null?`${r.laps} laps`:''),laps_led:0,status:r.status,note:r.points?`${r.points} pt${r.points===1?'':'s'}`:''}));
}
// Cross-country rows (shared result contract).
export function f1FinishRows(rows){
  return rows.map(r=>({participant:`${r.driver}${r.number?` (#${r.number})`:''}`,result:[/^\d+$/.test(r.pos)?ordinal(Number(r.pos)):r.pos,r.team,r.time||null,r.status||null,r.points?`${r.points} pt${r.points===1?'':'s'}`:null].filter(Boolean).join(' · ')}));
}
// The race window's lines and numbers: the winner and margin, where the
// winner started and who took pole, the fastest lap, and who did not finish.
export function f1RaceDetails(event,rows,{grid=[],fastest=[]}={}){
  if(!rows?.length)return null;
  const [winner,second]=rows;
  const gap=second?.time&&/^\+[\d.:]+s?$/.test(second.time)?`, ${second.time.replace(/^\+/,'').replace(/s$/,'')} s ahead of ${second.driver} (${second.team})`:second?`, ahead of ${second.driver} (${second.team})`:'';
  const lines=[`${winner.driver} (${winner.team}) won the ${event.title} at ${event.track}${winner.laps?`, ${winner.laps} laps`:''}${winner.time?` in ${winner.time}`:''}${gap}.`];
  const started=grid.find(g=>g.driver===winner.driver);
  if(started)lines.push(`${winner.driver} started ${/^\d+$/.test(started.pos)?ordinal(Number(started.pos)):started.pos}${grid[0]&&grid[0].driver!==winner.driver?`; ${grid[0].driver} (${grid[0].team}) started on pole`:' (pole position)'}.`);
  const best=fastest[0];
  if(best?.time)lines.push(`Fastest lap: ${best.time} by ${best.driver} (${best.team})${best.lap?`, lap ${best.lap}`:''}.`);
  const out=rows.filter(r=>r.status);
  if(out.length)lines.push(`Did not finish: ${out.map(r=>`${r.driver} (${r.status})`).join(', ')}.`);
  const stats=[];
  if(winner.laps)stats.push({label:'Laps',value:String(winner.laps)});
  if(winner.time)stats.push({label:'Race time',value:winner.time});
  stats.push({label:'Cars',value:String(rows.length)});
  stats.push({label:'Classified',value:String(rows.filter(r=>/^\d+$/.test(r.pos)).length)});
  if(best?.time)stats.push({label:'Fastest lap',value:`${best.time} (${best.driver})`});
  return{lines,stats,rows:f1FinishRows(rows),table:f1FinishTable(rows)};
}
// The running order of a session under way on ESPN's F1 board ("Race" or
// the sprint "SR"), named against the latest classification for each
// driver's team and number.
export function f1LiveDetails(board,{sprint=false,start,drivers=new Map()}){
  const comps=(board?.events||[]).flatMap(e=>e.competitions||[]);
  const comp=comps.find(c=>c.type?.abbreviation===(sprint?'SR':'Race')&&Math.abs(Date.parse(c.date)-Date.parse(start))<6*3600e3);
  if(!comp||comp.status?.type?.state!=='in')return null;
  const order=(comp.competitors||[]).slice().sort((a,b)=>a.order-b.order).map(c=>{const name=c.athlete?.displayName||c.athlete?.fullName||'',known=drivers.get(name);return{position:c.order,driver:name,car:known?.number?`#${known.number}`:'',gap:c.order===1?'Leader':null,make:known?.team||null,laps_led:null,last_lap_speed:null,pit:null}});
  return{lap:Number(comp.status.period)||null,order};
}
// The championship's races: each round's Sprint and Grand Prix. Final with a
// classification (formula1.com, or Jolpica until formula1.com lists it); Live
// from its start until then (4 hours at most); Today or Upcoming before. A
// past race without a published result is not listed (K-State's rule).
// results: Map of `${round}|gp` or `${round}|sprint` → classification rows.
export function f1Races(calendar,{school,config,timeZone,now,results=new Map(),live=new Map(),sources=new Map()}){
  const sport=config.sport,nowMs=now.getTime(),today=dayOf(wallClock(now,timeZone)),events=[],total=calendar.length;
  for(const round of calendar){
    for(const sprint of [true,false]){
      const at=sprint?round.sprint:round.start;if(!at)continue;
      const key=`${round.round}|${sprint?'sprint':'gp'}`,rows=results.get(key)||[],began=Date.parse(at),start=wallClock(at,timeZone),day=dayOf(start);
      let status;
      if(rows.length)status='Final';
      else if(began<=nowMs&&nowMs-began<=4*3600e3)status='Live';
      else if(began>nowMs)status=day===today?'Today':'Upcoming';
      else continue;
      const title=sprint?`${round.name} Sprint`:round.name;
      const event=baseEvent({school,sport,status,title,start,display:displayTime(start,{timed:round.timed}),opponent:round.circuit,sourceName:status==='Final'?(sources.get(key)?.name||'Formula 1 official results (formula1.com)'):'Formula 1 calendar (Jolpica F1 database)',sourceUrl:status==='Final'?(sources.get(key)?.url||config.schedule):config.schedule,now,key:`${key}|${status}`});
      event.track=round.circuit;event.season=Number(at.slice(0,4));event.f1_round=round.round;if(sprint)event.sprint=true;
      if(status==='Final'){
        const [winner]=rows;
        event.winner={name:winner.driver,car:winner.number,team:winner.team};
        event.headline=`Winner: ${winner.driver} (${winner.team})`;
        event.race_table=f1FinishTable(rows.slice(0,3));
        event.results=f1FinishRows(rows.slice(0,3));
        event.has_more_results=rows.length>3;event.result_count=rows.length;
      }else if(status==='Live'){
        const details=live.get(key);
        event.recency_label=details?.lap?`Lap ${details.lap}`:'Under way';
        event.headline=details?.order?.[0]?`Leader: ${details.order[0].driver}`:'Under way';
        event.results=(details?.order||[]).slice(0,10).map(o=>({participant:`${ordinal(o.position)} ${o.driver}`,result:[o.make,o.car].filter(Boolean).join(' · ')}));
        if(details?.order?.length){event.live_details={stage:event.recency_label,order:details.order};event.live_score_source='ESPN Formula 1 board';}
        event.result_count=event.results.length;
      }else{
        event.results.push({label:'Circuit',value:round.circuit});
        if(round.place)event.results.push({label:'Location',value:round.place});
        event.results.push({label:'Round',value:`${round.round} of ${total}${round.sprint?' · Sprint weekend':''}`});
        event.result_count=event.results.length;
      }
      events.push(event);
    }
  }
  return events;
}
