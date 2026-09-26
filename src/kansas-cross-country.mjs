// KU-only adapter. Keep the existing K-State and other-school paths unchanged.
import verifiedMeets from './kansas-cross-country-results.json' with {type:'json'};

const tidy=value=>String(value||'').replace(/\s+/g,' ').trim();
const normalized=value=>tidy(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ordinal=n=>`${n}${n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th')}`;
const isTeam=row=>/\bteam$/i.test(row.participant);
export const isKansasCrossCountry=event=>event?.school_id==='kansas'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';

function orderedRows(rows){
  const unique=new Map();
  for(const row of rows)unique.set(`${row.group}|${row.participant}`,row);
  return [...unique.values()].sort((a,b)=>Number(a.group.startsWith("Men's"))-Number(b.group.startsWith("Men's"))||a.group.localeCompare(b.group)||Number(isTeam(b))-Number(isTeam(a))||(parseInt(a.result)||Infinity)-(parseInt(b.result)||Infinity));
}

export function applyKansasRows(event,rows,recapUrl,resultUrls){
  if(!isKansasCrossCountry(event)||!rows.length)return false;
  event.results=orderedRows(rows);
  event.result_count=event.results.length;
  event.has_more_results=event.results.length>3;
  event.meet_results_verified=true;
  event.kansas_results_verified=true;
  event.result_urls=[...new Set(resultUrls)];
  event.result_url=event.result_urls[0]||null;
  event.recap_url=recapUrl;
  event.source={...event.source,name:'Official athletics meet recap',url:recapUrl};
  const teams=event.results.filter(isTeam);
  if(teams.length)event.headline=teams.map(row=>`${row.group.replace(/\s+\d+(?:\.\d+)?K$/,'')} team: ${row.result}`).join(' / ');
  // All highlights are computed from verified rows, never guessed from prose.
  const highlights=[];
  for(const group of [...new Set(event.results.map(row=>row.group))]){
    const members=event.results.filter(row=>row.group===group),team=members.find(isTeam),runners=members.filter(row=>!isTeam(row));
    if(team)highlights.push(`Kansas ${group.toLowerCase()} team finish: ${team.result.replace(' · ', ' with ')}.`);
    const finishers=runners.filter(row=>/^\d+(?:st|nd|rd|th) · /.test(row.result));
    if(finishers.length){
      const leader=finishers[0];
      highlights.push(`${leader.participant} led Kansas in the ${group.toLowerCase()}, finishing ${leader.result.replace(' · ', ' in ')}; ${runners.length} Kansas runners have official results.`);
    }
  }
  event.highlights=highlights;
  event.highlights_verified=true;
  event.highlight_state='verified';
  event.highlight_status=null;
  delete event.highlight_error;
  return true;
}

export function applyVerifiedKansasMeet(event){
  if(!isKansasCrossCountry(event))return false;
  const match=verifiedMeets.find(meet=>meet.date===event.start_time?.slice(0,10)&&normalized(meet.event)===normalized(event.opponent));
  if(!match)return false;
  // The final meet snapshot follows K-State's exact-event verified fast path.
  // It must never leak to a different date, school, sport, or race.
  const applied=applyKansasRows(event,match.rows.map(row=>({...row})),match.recap_url,match.result_urls);
  event.results_verified_at=match.verified_at;
  return applied;
}

export function kansasRaceDocuments(raw,recapUrl){
  const urls=[];
  for(const match of String(raw||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const label=tidy(match[2].replace(/<[^>]+>/g,' ')).replace(/&#39;|&apos;/g,"'");
    if(!/\b(?:women|men)(?:'s|s)?\b/i.test(label)||! /\bresults?\b/i.test(label))continue;
    try{
      const url=new URL(match[1].replace(/&amp;/g,'&'),recapUrl);
      if(url.hostname!=='kuathletics.com'||!/^\/documents\//.test(url.pathname)||!/\.pdf$/i.test(url.pathname))continue;
      if(/season|record|stats|preview|information/i.test(url.pathname))continue;
      url.search='';url.hash='';
      if(!urls.includes(url.href))urls.push(url.href);
    }catch{}
  }
  return urls.slice(0,4);
}

export function parseKansasRacePdf(text,event,documentUrl=null){
  if(!isKansasCrossCountry(event))return[];
  const day=event.start_time?.slice(0,10),parts=day?.split('-').map(Number);
  if(!parts||parts.length!==3)return[];
  const [year,month,date]=parts;
  // Reject older-season and different-meet documents even when linked by a recap.
  const header=String(text||'').slice(0,1000);
  const datedHeader=new RegExp(`\\b0?${month}/0?${date}/(?:${year}|${String(year).slice(-2)})\\b`).test(header);
  // Karmarush prints only month/day in its footer. Require the official
  // document's full date as well; a matching meet name alone is insufficient.
  let datedDocument=false;
  try{
    const url=new URL(documentUrl);
    const monthName=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1];
    datedDocument=url.hostname==='kuathletics.com'&&new RegExp(`^/documents/${year}/0?${month}/0?${date}/`).test(url.pathname)&&new RegExp(`\\bas of [A-Za-z]+, ${monthName} ${date}\\b`).test(text);
  }catch{}
  if(!datedHeader&&!datedDocument)return[];
  const tokens=normalized(event.opponent).split(' ').filter(word=>word.length>=4&&!['classic','invitational','cross','country','championship','championships'].includes(word));
  if(!tokens.length||!tokens.every(token=>normalized(header).includes(token)))return[];
  const lines=String(text).split(/\r?\n/).map(tidy).filter(Boolean),rows=[];
  let group=null,section=null,hasPace=false,karmarush=false;
  for(const line of lines){
    const timingRace=line.match(/^(?:.*?\(College\)\s+)?(Women|Men)'s\s+(\d+(?:\.\d+)?)k\s+(.+?)(?:\s+Official)?$/i);
    if(timingRace){group=`${timingRace[1].toLowerCase()==='women'?"Women's":"Men's"} ${timingRace[2]}K`;section=null;karmarush=true;continue;}
    if(karmarush){
      if(/^PL TEAM PTS\b/.test(line)){section='timing-team';continue;}
      if(/^PL BIB NAME YR TEAM TIME\b/.test(line)){section='timing-individual';continue;}
      if(section==='timing-team'){
        const team=line.match(/^(\d+) Kansas (\d+) \d+\+/);
        if(team)rows.push({group,participant:'Kansas team',result:`${ordinal(Number(team[1]))} · ${team[2]} pts`});
      }
      if(section==='timing-individual'){
        const runner=line.match(/^(\d+|DNF|DNS|DQ) \d+ (.+?) (?:FR|SO|JR|SR|GR|RS|FY) Kansas(?: (.*))?$/);
        if(runner&&(!runner[3]||/^\d{1,2}:\d{2}(?:\.\d+)?(?:\s|$)/.test(runner[3]))){
          const status=/^(DNF|DNS|DQ)$/.test(runner[1]);
          const time=runner[3]?.match(/^(\d{1,2}:\d{2}(?:\.\d+)?)(?:\s|$)/)?.[1];
          if(status||time)rows.push({group,participant:runner[2],result:status?runner[1]:`${ordinal(Number(runner[1]))} · ${time}`});
        }
      }
      continue;
    }
    const race=line.match(/\bEvent\s+\d+\s+(Women|Men)\s+(\d+(?:\.\d+)?)\s*k\b/i);
    if(race){group=`${race[1].toLowerCase()==='women'?"Women's":"Men's"} ${race[2]}K`;section='individual';continue;}
    if(!group)continue;
    if(/\bTeam Scores\b/i.test(line)){section='team';continue;}
    // "Results - Men/Women" also occurs BELOW the team header; do not reset it.
    if(/\bName\s+Year\s+School\b/i.test(line)){section='individual';hasPace=/Avg?\s+(?:Mile|Km)/i.test(line);continue;}
    if(section==='team'){
      const team=line.match(/^(\d+)\s+Kansas\s+(\d+)(?:\s+\d+)*$/);
      if(team)rows.push({group,participant:'Kansas team',result:`${ordinal(Number(team[1]))} · ${team[2]} pts`});
      continue;
    }
    // Match the entire school field. Kansas City and KU Running Club are not KU.
    const athlete=line.match(/^(\d+|--)\s+(.+?,\s*.+?)\s+(?:FR|SO|JR|SR|GR|RS|FY)\s+Kansas\s+(.+)$/i);
    if(!athlete)continue;
    if(!/^(?:\d{1,2}:\d{2}(?:\.\d+)?\b|DNF\b|DNS\b|DQ\b)/i.test(athlete[3]))continue;
    const values=athlete[3].match(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/g)||[];
    const status=athlete[3].match(/\b(DNF|DNS|DQ)\b/i)?.[1]?.toUpperCase();
    const time=values[hasPace?1:0];
    if(!status&&!time)continue;
    if(!status&&athlete[1]==='--')continue;
    const participant=athlete[2].split(',').map(tidy).reverse().join(' ');
    rows.push({group,participant,result:status||`${ordinal(Number(athlete[1]))} · ${time}`});
  }
  return orderedRows(rows);
}

export async function attachKansasRaceDocuments(event,raw,recapUrl,readPdf){
  if(!isKansasCrossCountry(event))return false;
  const urls=kansasRaceDocuments(raw,recapUrl),rows=[],sources=[];
  for(const url of urls){
    try{
      const parsed=parseKansasRacePdf(await readPdf(url),event,url);
      if(parsed.length){rows.push(...parsed);sources.push(url);}
    }catch{}
  }
  // Keep valid published team summaries if a division's document is unavailable.
  for(const row of event.results||[]){
    if(!isTeam(row))continue;
    const division=row.group?.startsWith("Women's")?"Women's":row.group?.startsWith("Men's")?"Men's":null;
    if(division&&!rows.some(value=>isTeam(value)&&value.group.startsWith(division)))rows.push(row);
  }
  if(!rows.some(row=>!isTeam(row)))return false;
  const applied=applyKansasRows(event,rows,recapUrl,sources);
  const expected=new Set(urls.map(url=>/women/i.test(url)?'Women':/men/i.test(url)?'Men':null).filter(Boolean));
  if(sources.length<urls.length||[...expected].some(division=>!rows.some(row=>row.group.startsWith(division)&&!isTeam(row)))){
    event.highlight_status='Some official race results could not be loaded. Open the official recap for the remaining results.';
  }
  return applied;
}
