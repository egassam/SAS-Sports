import {createTfrrsMeetResults} from './sidearm-school-kit.mjs';

// Shared reader for WMT (Nuxt) sites' own JSON schedule API
// (/website-api/schedule-events): the same official data the schedule page
// shows, one address per team (the site's sport id, from /website-api/sports).
// Notre Dame's reader (src/schools/notre-dame.mjs, Oct 15) made general for
// Stanford (Oct 15): a school module gives its host, time zone, sport ids and
// team labels; a card generation the page renders (Stanford's is new) does not
// matter. Each event's date, venue, opponent, conference flag, result
// (win/loss/tie with both scores, or a meet's text such as "4th of 13") and
// story (post-event article, or a "Recap" link) come from the API.

export const wmtApiUrl=(host,sportId)=>`https://${host}/website-api/schedule-events?filter%5Bschedule.sport_id%5D=${sportId}&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament`;

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// A game sport's event named after a tournament ("ACC Championship") is
// "<School> at ...", as K-State's tournaments are.
const GAME_EVENT=/\b(?:tournament|championships?|final four|regionals?|rounds?|(?:quarter|semi)?finals?|bowl)\b/i;
// An event, not a team: a dual is "vs"/"at" its opponent, a meet "at".
const EVENT_NAME=/\bhead of\b|\b(?:invit\w*|invite|classic|championships?|open|relays|duals|collegiate|intercollegiate|tournament|festival|cup|regionals?|nationals?|trials|NAC|olympics|series|fest|meet|league|match(?: \d+)?|wild card)\b/i;
// The tennis pages list players' pro events ("M15 Ann Arbor", "Sumter W15",
// San Diego State's "San Diego Challenger").
const PRO_EVENT=/^(?:\d{4}\s+)?(?:ITF|ATP|WTA)\b|\bFutures\b|\bChallenger\b|\b[MW]\d{2,3}\b|\bUTR\b/i;
// Internal events: intrasquads, scrimmages, "Blue-Gold".
const INTERNAL=/\bintrasquad\b|\bscrimmages?\b|^blue\s*(?:&|and|-|\/|vs\.?)\s*gold\b/i;

// The event's wall clock in the school's time zone: "Oct 3, 2026" and "12:00
// PM". Midnight is a day without a time, as is an event the site marks all
// day or TBA.
export function wmtLocalTime(iso,timeZone,{untimed=false}={}){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
  const year=Number(parts.year),month=Number(parts.month),day=Number(parts.day),hour=Number(parts.hour)%24,minute=Number(parts.minute);
  const timed=!untimed&&(hour||minute);
  return{year,month,day,day_ms:Date.UTC(year,month-1,day),date:`${MONTHS[month-1]} ${day}, ${year}`,time:timed?`${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`:null};
}
// A score as the site stores it ("41.0000").
const points=value=>{const n=Number(value);return value!=null&&value!==''&&Number.isFinite(n)?String(n):null;};
// The team's score first: the site stores the winner's and the loser's.
export function wmtScore(result){
  const won=points(result?.winning_score),lost=points(result?.losing_score);
  if(!result||won==null||lost==null)return null;
  const outcome={win:'W',loss:'L',tie:'T'}[result.result];if(!outcome)return null;
  const [mine,theirs]=outcome==='L'?[lost,won]:[won,lost];
  // Extra time ("OT", "(OT)", "2OT") or a shootout after the score.
  const note=String(result.text||'').trim().replace(/^\((.*)\)$/,'$1');
  return{outcome,mine,theirs,text:`${outcome}, ${mine}-${theirs}${/^(?:\d?OT|SO|\d+ inn(?:ings)?)$/i.test(note)?` (${note})`:''}`};
}
const place=(tie,n,suffix)=>`${tie?'T':''}${n}${suffix.toLowerCase()}`;
// A meet's result text.
// Golf: "T-2nd, 839 (-13)" (Notre Dame: place, team score, to par); "4th of
// 13", "T9th of 15" (Stanford: place in the field). Swimming: "1st of 4 (550
// pts)". Cross country: "W - 1st | M - 1st" (Notre Dame); "W: 6th (145); M:
// 5th (150)", "W: 1st (18 Open)" (Stanford: team points, the race when not the
// main one). Fencing's "Ind. results" and swimming's "No Team Score" name no
// team place.
export function wmtMeetResult(text,sport){
  const value=String(text||'').replace(/\s+/g,' ').trim();if(!value)return null;
  // San Diego State's: "4th - 890 (+26)", "T-10th of 12; 906 (+42)".
  const golf=sport==='Golf'&&value.match(/^(T-?)?(\d+)(st|nd|rd|th)(?: of (\d+))?(?:,|;|\s+-)?\s*(\d{3,4})\s*\(([+-]?\d+|E)\)$/i);
  if(golf){const at=`${place(golf[1],golf[2],golf[3])}${golf[4]?` of ${golf[4]}`:''}`;return{headline:at,results:[{label:'Result',value:at},{label:'Team score',value:`${golf[5]} (${golf[6]})`}]};}
  // Washington State's golf: the score to par, the total, then the place:
  // "+29 (893), 9th", "-1 (863), T-4th".
  const parFirst=sport==='Golf'&&value.match(/^([+-]\d+|E)\s*\((\d{3,4})\),\s*(T-?)?(\d+)(st|nd|rd|th)$/i);
  if(parFirst){const at=place(parFirst[3],parFirst[4],parFirst[5]);return{headline:at,results:[{label:'Result',value:at},{label:'Team score',value:`${parFirst[2]} (${parFirst[1]})`}]};}
  // Virginia Tech's golf: "1st/18 (286-278-280)", "T2nd/17 (272-274-280)":
  // the place in the field, then each round's team score.
  const rounds=sport==='Golf'&&value.match(/^(T-?)?(\d+)(st|nd|rd|th)\/(\d+)\s*\((\d{3}(?:-\d{3})*)\)$/i);
  if(rounds){const at=`${place(rounds[1],rounds[2],rounds[3])} of ${rounds[4]}`,scores=rounds[5].split('-').map(Number);return{headline:at,results:[{label:'Result',value:at},{label:'Team score',value:`${scores.reduce((a,b)=>a+b,0)} (${rounds[5]})`}]};}
  // San Diego State's: "1st of 5 teams (1,090.50 pts)"; cross country "6th
  // (157 pts)", the field not given.
  const fielded=value.match(/^(T-?)?(\d+)(st|nd|rd|th)(?: of (\d+)(?: teams)?)?(?:\s*\((\d[\d,]*(?:\.\d+)?)(?:\s*pts)?\))?$/i);
  if(fielded&&(fielded[4]||fielded[5])){const at=`${place(fielded[1],fielded[2],fielded[3])}${fielded[4]?` of ${fielded[4]}`:''}`;return{headline:at,results:[{label:'Result',value:at},...(fielded[5]?[{label:'Team score',value:`${fielded[5]} pts`}]:[])]};}
  const teams=[...value.matchAll(/\b([MW])\s*[-:]\s*(T-?)?(\d+)(st|nd|rd|th)\b(?:\s*\((\d+)(?:\s+([A-Za-z]+))?\))?/gi)].map(m=>{
    const race=m[6]&&!/^championship$/i.test(m[6])?` (${m[6]} race)`:'';
    return{label:`${m[1].toUpperCase()==='W'?"Women's":"Men's"} team`,value:`${place(m[2],m[3],m[4])}${m[5]?` · ${m[5]} pts`:''}${race}`};
  });
  if(teams.length)return{headline:teams.map(row=>`${row.label}: ${row.value}`).join(' / '),results:teams};
  // Washington State's cross country: "3rd (W), 5th (M)".
  const bracketed=[...value.matchAll(/(T-?)?(\d+)(st|nd|rd|th)\s*\(([WM])\)/gi)].map(m=>({label:`${m[4].toUpperCase()==='W'?"Women's":"Men's"} team`,value:place(m[1],m[2],m[3])}));
  if(bracketed.length&&value.replace(/(T-?)?\d+(st|nd|rd|th)\s*\([WM]\)|[,;\s]/gi,'')==='')return{headline:bracketed.map(row=>`${row.label}: ${row.value}`).join(' / '),results:bracketed};
  if(/^ind(?:\.|ividual)? results$/i.test(value))return{headline:'Individual results',results:[{label:'Result',value:'Individual results'}]};
  if(/^(?:no team scores?|NTS)$/i.test(value))return{headline:'No team score (individuals only)',results:[{label:'Result',value:'No team score (individuals only)'}]};
  return{headline:value,results:[{label:'Result',value}]};
}

// A meet against several teams scored dual by dual, each by its code:
// "DU: L,150-144; AF: W, 157-137" (Washington State's swimming at Air Force
// and Denver). Each code names the opponent whose words' initials, or first
// letter, it starts with; the school's score first.
export function wmtDualsByCode(text,opponent){
  const rows=[...String(text||'').matchAll(/\b([A-Z]{2,5}):\s*([WLT]),\s*(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/g)];
  if(rows.length<2||String(text).replace(/\b[A-Z]{2,5}:\s*[WLT],\s*[\d.]+-[\d.]+/g,'').replace(/[;,\s]/g,''))return null;
  const names=String(opponent||'').split(/\s+and\s+|\//).map(n=>n.trim()).filter(Boolean);
  const nameOf=code=>names.find(n=>n.split(/\s+/).map(w=>w[0]).join('').toUpperCase()===code)||(names.filter(n=>n[0].toUpperCase()===code[0]).length===1?names.find(n=>n[0].toUpperCase()===code[0]):code);
  const results=rows.map(([,code,outcome,a,b])=>{const [hi,lo]=Number(a)>=Number(b)?[a,b]:[b,a],[mine,theirs]=outcome==='L'?[lo,hi]:[hi,lo];return{label:nameOf(code),value:`${outcome}, ${mine}-${theirs}`};});
  return{headline:results.map(r=>`${r.label}: ${r.value}`).join(' · '),results};
}

// A meet over several entries is one event: golf's rounds ("Rounds 1-2",
// "Round 3" of the Windy City Collegiate; men's golf names each round after
// the tournament) and a swimming meet entered once per opponent (the College
// Swimming League, Oct 2: Auburn, Ohio State, California). Entries without a
// score that share a tournament and follow each other within two days are
// merged under its name (the League meets again Oct 16: another meet); the
// last entry's result and story are the meet's.
export function mergeWmtMeetEntries(games){
  const open=new Map(),out=[];
  const time=game=>Date.parse(game.datetime);
  for(const game of [...games].sort((a,b)=>time(a)-time(b))){
    // San Diego State's golf rounds carry no tournament: one entry a day,
    // each named after the tournament.
    const name=String(game?.tournament?.name||game?.opponent_name||'').trim(),scored=game?.schedule_event_result?.winning_score!=null;
    if(!name||scored){out.push(game);continue;}
    const group=open.get(name);
    if(group&&time(game)-time(group.at(-1))<=2*86400000){group.push(game);continue;}
    const fresh=[game];open.set(name,fresh);out.push(fresh);
  }
  return out.map(item=>{
    if(!Array.isArray(item))return item;
    if(item.length===1)return item[0];
    const sorted=[...item].sort((a,b)=>String(a.datetime).localeCompare(String(b.datetime))||Number(a.id)-Number(b.id));
    const first=sorted[0],last=sorted.at(-1),ends=sorted.map(g=>g.datetime_end||g.datetime).sort();
    // The meet's story is one dated within its days (or three days after):
    // Virginia Tech's Oct 2 tri-meet entry for Penn State carried last
    // season's story. Each entry's result is kept, by opponent ("Penn State:
    // Women: W, 312-41 | Men: W, 265.50-87.50 · Liberty: Women: W, 240-113").
    const dayOf=g=>(String(g.post_event_article?.permalink||'').match(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//)||[]).slice(1).map(Number);
    const firstDay=Date.parse(String(first.datetime).slice(0,10)),lastDayMs=Date.parse(String(ends.at(-1)).slice(0,10));
    const inWindow=g=>{const d=dayOf(g);if(d.length!==3)return true;const t=Date.UTC(d[0],d[1]-1,d[2]);return t>=firstDay-86400000&&t<=lastDayMs+3*86400000;};
    const story=[...sorted].reverse().find(g=>g.post_event_article&&inWindow(g))?.post_event_article||null;
    // Golf's rounds ("Rounds 1-2", "Round 3"; men's golf names each round
    // after the tournament) and a meet's days carry the running place: the
    // last is the meet's. Only distinct opponents' results are joined.
    const texts=sorted.filter(g=>String(g.schedule_event_result?.text||'').trim()&&!/\b(?:rounds?|day)\b/i.test(String(g.opponent_name||'')));
    // Stanford's College Swimming League repeats the meet's place on each.
    const distinct=new Set(texts.map(g=>String(g.opponent_name||'').trim())).size===texts.length&&new Set(texts.map(g=>String(g.schedule_event_result.text).trim())).size>1;
    const result=texts.length>1&&distinct?{...last.schedule_event_result,text:texts.map(g=>`${String(g.opponent_name||'').trim()}: ${String(g.schedule_event_result.text).trim()}`).join(' · ')}:texts.length===1?texts[0].schedule_event_result:last.schedule_event_result;
    const lastDay=String(ends.at(-1)).slice(0,10)>String(first.datetime).slice(0,10)?ends.at(-1):null;
    return{...last,datetime:first.datetime,datetime_end:lastDay,opponent_name:String(first.tournament?.name||first.opponent_name).trim(),second_opponent_name:null,
      status:sorted.every(g=>g.status==='completed')?'completed':last.status,post_event_article:story,schedule_event_result:result,
      opponent_results:texts.length>1&&distinct?texts.map(g=>({label:String(g.opponent_name||'').trim(),value:String(g.schedule_event_result.text).trim()})):null,
      schedule_event_links:sorted.flatMap(g=>g.schedule_event_links||[])};
  });
}

// config: {id, schoolName, host, timeZone, sportIds: {slug: id}, slugs:
// {Sport: [slug, ...]}, teams: {slug: label} (combined sports), tfrrsTeams,
// conferenceNames: {conference_id: league} (a league other than the school's)}.
export function createWmtApiHandlers(config,{makeEvent,recapMatchesEvent,decodeHtml=value=>String(value||''),eventType=()=>'GAME',ordinal=value=>String(value),fetch,headers}){
  const {id,schoolName,host,timeZone,sportIds,slugs,teams={},tfrrsTeams,conferenceNames={},internal=null}=config;
  const apiSports=new Set(Object.keys(slugs));
  const converted=event=>event?.school_id===id&&apiSports.has(event.sport);
  const schedulePage=slug=>`https://${host}/sports/${slug}/schedule`;
  const emptied=new WeakSet();
  // The event's own story: its post-event article, else a "Recap" link on
  // the site's news pages.
  function storyOf(game){
    const own=game.post_event_article?.permalink;
    const linked=(game.schedule_event_links||[]).find(link=>/\brecap\b/i.test(link?.title||'')&&String(link?.link||'').startsWith(`https://${host}/news/`))?.link;
    const url=[own,linked].find(href=>{try{const u=new URL(href);return u.protocol==='https:'&&u.hostname===host&&u.pathname.startsWith('/news/');}catch{return false;}});
    return url?{url,title:own===url?String(game.post_event_article.title||'').trim():''}:null;
  }
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!==id||!apiSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==host||page.pathname!=='/website-api/schedule-events')return null;
    let games;try{games=JSON.parse(String(raw||'')).data;}catch{return null;}
    if(!Array.isArray(games))return null;
    const slug=Object.keys(sportIds).find(key=>String(sportIds[key])===page.searchParams.get('filter[schedule.sport_id]'));
    const label=teams[slug],team=label?label.toLowerCase().replace(/[^a-z]+/g,''):null;
    const today=wmtLocalTime(now.toISOString(),timeZone).day_ms;
    const local=new Date(today),season=local.getUTCMonth()+1>=7?local.getUTCFullYear():local.getUTCFullYear()-1;
    const meet=eventType(sport)!=='GAME',events=[];
    const listed=games.filter(game=>game?.datetime&&!game.hide_from_specific_sport_schedule&&['completed','as_scheduled'].includes(game.status));
    for(const game of meet?mergeWmtMeetEntries(listed):listed){
      const start=wmtLocalTime(game.datetime,timeZone,{untimed:Boolean(game.is_all_day||game.tba)});
      // Only the current academic year (July-June) is current.
      if((start.month>=7?start.year:start.year-1)!==season)continue;
      const finish=game.datetime_end?wmtLocalTime(game.datetime_end,timeZone):start;
      const lastDay=Math.max(start.day_ms,finish.day_ms);
      let name=decodeHtml(String(game.opponent_name||'')).replace(/\s+/g,' ').trim();
      // A school's own intrasquad by name (config.internal: Virginia Tech's
      // "Hokie Belt Challenge", Maroon vs Orange).
      if(!name||INTERNAL.test(name)||internal?.test(name))continue;
      if(sport==='Tennis'&&PRO_EVENT.test(name))continue;
      // A second opponent is a second team ("Wisconsin and Iowa"); fencing's
      // "Women's Team Meet" says which team competes.
      const second=decodeHtml(String(game.second_opponent_name||'')).trim();
      // A neutral game between two other teams is not the school's: the
      // tournament it hosts lists every match (Virginia Tech's Hokie
      // Invitational, Aug 28-29: "Kent State vs Coppin State", the winner as
      // the result text).
      if(!meet&&second&&game.neutral_event)continue;
      // Washington State's swimming names both in the first ("Air Force/Denver")
      // and one again as the second ("Denver").
      const parts=name.split('/').map(part=>part.trim()).filter(Boolean);
      if(second&&parts.length>1&&parts.includes(second))name=parts.join(' and ');
      else if(second&&!/\bteam (?:meet|event)\b/i.test(second))name=`${name} and ${second}`;
      // Exhibitions read as K-State labels them ("Dayton (Exhibition)").
      const exhibition=Boolean(game.is_exhibition)||/\((?:exh\.?|exhibition)\)$/i.test(name);
      // A ranking written into the name (San Diego State's "#9 San Diego",
      // "No. 10 Washington", "(rv) Cal Poly") is not part of it.
      let opponent=name.replace(/\s*\((?:exh\.?|exhibition)\)$/i,'').replace(/^(?:#\d+|No\.\s*\d+|\((?:rv|\d+)\))\s+/i,'').trim();
      // A cross country meet named by its host ("Oregon", "UC Riverside"):
      // its story names the meet ("... at Bill Dellinger Invitational").
      const storyMeet=sport==='Cross Country'&&!EVENT_NAME.test(opponent)&&String(game.post_event_article?.title||'').match(/\bat (?:the )?((?:[A-Z0-9][\w'’.&-]*\s+){0,5}(?:Invitational|Invite|Classic|Championships?|Open|Challenge|Festival))\b/);
      if(storyMeet)opponent=decodeHtml(storyMeet[1]).replace(/’/g,"'").trim();
      if(exhibition)opponent=`${opponent} (Exhibition)`;
      const score=game.status==='completed'?wmtScore(game.schedule_event_result):null;
      const text=String(game.schedule_event_result?.text||'').trim();
      const story=storyOf(game);
      // A merged meet's opponents each keep their own row (Virginia Tech's
      // tri-meet: West Virginia, Liberty, Penn State).
      const placed=!score&&meet&&game.status==='completed'?(game.opponent_results?{headline:text,results:game.opponent_results}:wmtDualsByCode(text,opponent)||wmtMeetResult(text,sport)):null;
      // A past meet is final with its result (a place, or its story); a past
      // game without a score is not listed. Yesterday's game stays: a night
      // game can end after midnight.
      const over=!score&&meet&&lastDay<today;
      if(over&&!placed&&!story)continue;
      if(!score&&!meet&&lastDay<today-86400000)continue;
      const final=Boolean(score)||over;
      // A cross country or golf entry is a meet, never a dual (San Diego
      // State's "Pac-12", Oct 30, read "vs Pac-12").
      const dual=meet&&!['Cross Country','Golf'].includes(sport)&&!game.datetime_end&&!EVENT_NAME.test(opponent);
      const tournament=decodeHtml(String(game.tournament?.name||'')).trim();
      const relation=meet?(dual&&game.venue_type!=='away'?'vs':'at'):game.venue_type==='away'||GAME_EVENT.test(opponent)||Boolean(tournament)&&name===tournament?'at':'vs';
      const event=makeEvent({school,sport,status:final?'Final':'Upcoming',relation,opponent,date:start.date,
        // K-State's results show the date only; upcoming games show the published time.
        time:final?null:start.time,
        schoolScore:score?score.mine:null,oppScore:score?score.theirs:null,resultText:score?score.text:null,sourceUrl:schedulePage(slug),now});
      if(lastDay>start.day_ms)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      // A tournament under way (tennis's ITA Regional): today's event.
      if(!final&&lastDay>start.day_ms&&start.day_ms<=today){event.status='Today';event.priority_bucket='today';event.recency_label='In progress';event.id=event.id.replace(/-(?:final|upcoming|today)$/,'-today');}
      if(over){
        event.event_type='MEET';
        const result=placed||{headline:'Completed',results:[{label:'Result',value:'Completed'}]};
        event.headline=result.headline;event.results=result.results;event.result_count=result.results.length;
      }
      if(final&&story){event.recap_url=story.url;if(story.title)event.recap_title=story.title;}
      if(team)event.id=`${event.id}-${team}`;
      // The site marks each conference game, with its league: a league other
      // than the school's is named (Stanford's water polo plays in the MPSF).
      event.conference_game=Boolean(game.is_conference);
      if(game.is_conference&&conferenceNames[game.conference_id])event.conference_name=conferenceNames[game.conference_id];
      events.push(event);
    }
    events.sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)));
    // A team with nothing this season yet (spring sports publish later) is a
    // valid empty schedule.
    if(!events.length)emptied.add(events);
    return events;
  }
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptied.has(events);

  // The event's own story is bound to it by the site (its post-event article
  // or its "Recap" link): it is checked for the date only. A tournament is
  // checked against its days; the story comes the day it is played or within
  // three days after.
  function matchesRecap(raw,event,url){
    if(!converted(event))return recapMatchesEvent(raw,event,url);
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===host&&parsed.pathname.startsWith('/news/');
    if(!own)return false;
    const storyDay=(parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//)||[]).slice(1).map(Number);
    if(!storyDay.length)return false;
    const day=Date.UTC(storyDay[0],storyDay[1]-1,storyDay[2]),first=Date.parse(String(event.start_time).slice(0,10)),last=Date.parse(String(event.end_time||event.start_time).slice(0,10));
    return day>=first&&day<=last+3*86400000;
  }
  const crossCountry=tfrrsTeams?createTfrrsMeetResults({id,schoolName,teams:tfrrsTeams,decodeHtml,ordinal,fetch,headers}):null;
  return{parseSchedule,isEmptySchedule,matchesRecap,
    isCrossCountry:event=>Boolean(crossCountry)&&converted(event)&&crossCountry.matches(event),
    attachMeetResults:event=>crossCountry?crossCountry.attach(event):event};
}

// The school module's settings from its sport ids: schedule addresses (one
// API address per team), roster pages, team labels by address.
export function wmtApiSchoolRoutes({id,host,sportIds,slugs,teams={}}){
  const scheduleUrls={},rosterUrls={};
  for(const [sport,list] of Object.entries(slugs)){
    const schedules=list.map(slug=>wmtApiUrl(host,sportIds[slug])),rosters=list.map(slug=>`https://${host}/sports/${slug}/roster`);
    scheduleUrls[`${id}|${sport}`]=schedules.length===1?schedules[0]:schedules;
    rosterUrls[`${id}|${sport}`]=rosters.length===1?rosters[0]:rosters;
  }
  const teamLabels=Object.fromEntries(Object.entries(teams).map(([slug,label])=>[wmtApiUrl(host,sportIds[slug]),label]));
  return{scheduleUrls,rosterUrls,teamLabels};
}
