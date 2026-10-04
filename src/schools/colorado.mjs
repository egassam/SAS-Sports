import {sidearmScheduleGames,sidearmStartTime} from '../sidearm-schedule-data.mjs';
// Colorado school module. Shared publisher utilities stay in the Worker; this
// file owns cubuffs.com routes, Colorado's program combinations, its verified
// Instagram tags and its schedule reader. Routes started as the exact
// candidates production used before the module existed (route parity); each
// sport is then corrected and verified one at a time.
export const coloradoSchool={
  id:'colorado',
  // Sports whose official schedule this module reads itself, from the page
  // data (see parseSchedule). Every other sport keeps the shared parsers.
  pageDataSports:new Set(['Football','Volleyball','Soccer','Cross Country']),
  // Live game state comes from an independent scoreboard; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    // Volleyball scores are sets won; the live detail names the current set.
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // ESPN's women's college soccer scoreboard (Colorado sponsors women's
    // soccer only); it lists every Division I match.
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}]
  },
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  verifiedInstagrams:{
    'colorado|Football|Ben Finneseth':'https://www.instagram.com/ben.finneseth/'
  },
  scheduleUrls:{
    'colorado|Basketball':['https://cubuffs.com/sports/mens-basketball/schedule','https://cubuffs.com/sports/womens-basketball/schedule','https://cubuffs.com/sports/basketball/schedule','https://cubuffs.com/'],
    'colorado|Cross Country':'https://cubuffs.com/sports/cross-country/schedule',
    'colorado|Football':'https://cubuffs.com/sports/football/schedule',
    'colorado|Golf':['https://cubuffs.com/sports/womens-golf/schedule','https://cubuffs.com/sports/mens-golf/schedule','https://cubuffs.com/sports/golf/schedule','https://cubuffs.com/'],
    'colorado|Skiing':['https://cubuffs.com/sports/skiing/schedule','https://cubuffs.com/'],
    'colorado|Soccer':'https://cubuffs.com/sports/womens-soccer/schedule',
    'colorado|Tennis':['https://cubuffs.com/sports/womens-tennis/schedule','https://cubuffs.com/sports/mens-tennis/schedule','https://cubuffs.com/sports/tennis/schedule','https://cubuffs.com/'],
    'colorado|Track & Field':['https://cubuffs.com/sports/track-and-field/schedule','https://cubuffs.com/sports/track-field/schedule','https://cubuffs.com/'],
    'colorado|Volleyball':'https://cubuffs.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'colorado|Basketball':['https://cubuffs.com/sports/mens-basketball/roster','https://cubuffs.com/sports/womens-basketball/roster','https://cubuffs.com/sports/basketball/roster'],
    'colorado|Cross Country':'https://cubuffs.com/sports/cross-country/roster',
    'colorado|Football':'https://cubuffs.com/sports/football/roster',
    'colorado|Golf':['https://cubuffs.com/sports/womens-golf/roster','https://cubuffs.com/sports/mens-golf/roster','https://cubuffs.com/sports/golf/roster'],
    'colorado|Skiing':'https://cubuffs.com/sports/skiing/roster',
    'colorado|Soccer':'https://cubuffs.com/sports/womens-soccer/roster',
    'colorado|Tennis':['https://cubuffs.com/sports/womens-tennis/roster','https://cubuffs.com/sports/mens-tennis/roster','https://cubuffs.com/sports/tennis/roster'],
    'colorado|Track & Field':['https://cubuffs.com/sports/track-and-field/roster','https://cubuffs.com/sports/track-field/roster'],
    'colorado|Volleyball':'https://cubuffs.com/sports/womens-volleyball/roster'
  }
};

const HOST='cubuffs.com';
// Internal events: "Black & Gold Spring Game", scrimmages, intrasquads.
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bblack\s*(?:&|and|vs\.?|-)\s*gold\b/i;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Colorado's calendar day (Boulder, America/Denver).
const coloradoToday=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
// Rankings describe the week, not the opponent: "#21 Baylor", "No. 23 BYU",
// "RV Utah".
export function coloradoOpponent(title){
  return String(title||'').replace(/\s+/g,' ').trim().replace(/^(?:#\d+|No\.\s*\d+|RV)\s+/i,'');
}

// The published start. The page shows the time text ("5:30 p.m."); the page
// data's clock usually agrees, but not always (soccer at Kansas State, Oct 16:
// "5:30 p.m." with 18:00 in the data). The text is what the page shows, so a
// clock in it wins; "TBA" has none.
export function coloradoStartTime(date,time){
  const exact=sidearmStartTime(date,time);if(exact)return exact;
  const d=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/),t=String(time||'').match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?(?=[\s(]|$)/i);
  if(!d||!t||Number(t[1])<1||Number(t[1])>12)return null;
  const hour=String(Number(t[1])%12+(t[3].toLowerCase()==='p'?12:0)).padStart(2,'0'),minute=t[2]||'00';
  return sidearmStartTime(`${d[1]}-${d[2]}-${d[3]}T${hour}:${minute}:00`,time);
}

// TFRRS (the collegiate results database) publishes each meet's complete
// scored results as plain tables ("Men's 8000 Meters Team Results (8k)",
// "Women's 5K Individual Results (5k)"); Colorado's two team pages list every
// meet with its date. The schedule publishes only the team places
// ("M-3rd/W-NTS").
export const COLORADO_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/CO_college_f_Colorado.html',Men:'https://www.tfrrs.org/teams/xc/CO_college_m_Colorado.html'};
const tfrrsText=(decodeHtml,value)=>decodeHtml(String(value).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const tfrrsCells=(decodeHtml,tr)=>[...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>tfrrsText(decodeHtml,cell[1]));
// The team page's row for this meet: the same date and at least one shared
// distinctive word ("Roadrunners Invitational" is TFRRS's "2026 Roadrunners
// Invitational"); a team runs one meet a day.
const GENERIC=new Set(['classic','challenge','invitational','invite','championships','championship','meet','cross','country','open','college','university']);
export function findColoradoTfrrsMeet(raw,{decodeHtml,date,name}){
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
// Colorado's races at one meet, women first: the team result (when Colorado
// scored as a team) and every Colorado runner, by the TEAM column. A team
// without a score is listed with 0 points (the women at Wyoming, "W-NTS"):
// that is no team result.
export function parseColoradoTfrrsResults(raw,{decodeHtml,ordinal}){
  const races=new Map();
  for(const section of String(raw||'').split(/<div\b[^>]*class=["'][^"']*custom-table-title/i).slice(1)){
    const title=tfrrsText(decodeHtml,(section.match(/<h3\b[^>]*>([\s\S]*?)<span\b/i)||section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)||[])[1]||'');
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
      const row=rows.slice(1).find(cells=>cells[at('TEAM')]==='Colorado');
      if(row&&/^\d+$/.test(row[at('PL')])&&/^[1-9]\d*$/.test(row[at('SCORE')]))entry.result={place:Number(row[at('PL')]),score:row[at('SCORE')]};
    }else if(at('NAME')>=0&&at('TIME')>=0){
      entry.runners=rows.slice(1).filter(cells=>cells[at('TEAM')]==='Colorado').map(cells=>{
        const place=cells[at('PL')],time=cells[at('TIME')];
        return{participant:cells[at('NAME')],place,result:/^\d+$/.test(place)?`${ordinal(place)} \u00b7 ${time}`:`${place} \u00b7 ${time}`};
      }).filter(row=>row.participant&&(/\d:\d{2}/.test(row.result)||/^(?:DNF|DNS)\b/i.test(row.result)));
    }
    races.set(group,entry);
  }
  return[...races.values()].filter(race=>race.runners.length).sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
}

// cubuffs.com is a SIDEARM (Nuxt) site. Its schedule pages embed every game
// as page data: the local start ("2026-11-13T20:15:00", "8:15 PM"),
// home/away/neutral, the result (status W/L/T, both scores) and the game's own
// recap link. Production read the rendered cards, which omit the start time,
// so every upcoming game showed its date alone.
export function createColoradoHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='colorado'||!coloradoSchool.pageDataSports.has(sport))return null;
    let url;try{url=new URL(sourceUrl);}catch{return null;}
    if(url.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(url.pathname))return null;
    const games=sidearmScheduleGames(raw);
    if(!games.length)return null;
    const today=coloradoToday(now),events=[];
    for(const game of games){
      const day=String(game.date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if(!day)continue;
      let opponent=coloradoOpponent(game.opponent?.title);
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))continue;
      // Tournament pages also list the other teams' matches ("Denver vs.
      // Central Arkansas" at the Buffs Classic); they are not Colorado's.
      if(/\S\s+vs\.?\s+\S/i.test(opponent))continue;
      // Canceled and postponed games are not on K-State's schedule.
      if(/^(?:Cancel+ed|Postponed)\b/i.test(String(game.noplay_text||'').trim()))continue;
      // An exhibition (page-data type "S" against another school) reads as
      // K-State labels exhibitions: "Utah (Exhibition)".
      if(game.type==='S')opponent=`${opponent} (Exhibition)`;
      const result=game.result||{},outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      const scored=['W','L','T'].includes(outcome)&&/^\d+$/.test(team)&&/^\d+$/.test(other);
      // Meets (cross country) are final once their day has passed; their team
      // places are published as text ("M-1st/W-1st", "M-3rd/W-NTS").
      const meet=eventType(sport)!=='GAME'&&!scored;
      // A game day that has passed with no published score is neither a
      // result nor upcoming; yesterday's stays (a late game in another time
      // zone ends after midnight in Boulder and its score is posted after).
      const firstDay=game.date.slice(0,10);
      const final=scored||meet&&firstDay<today;
      if(!final&&Date.parse(firstDay)<Date.parse(today)-86400000)continue;
      // H: home, A: away; a neutral site keeps the page's own vs./at. Meets
      // read "Colorado at Big 12 Championships", as K-State's do.
      const relation=meet?'at':game.location_indicator==='A'?'at':game.location_indicator==='H'?'vs':String(game.at_vs||'vs').toLowerCase()==='at'?'at':'vs';
      // K-State's results show the date only; upcoming games show the
      // published local time ("TBA" shows the date alone).
      const start=final?null:coloradoStartTime(game.date,game.time);
      const event=makeEvent({school,sport,status:final?'Final':'Upcoming',relation,opponent,
        date:`${MONTHS[Number(day[2])-1]} ${Number(day[3])}, ${day[1]}`,time:start?start.display_time.replace(/^.*, /,''):null,
        schoolScore:scored?team:null,oppScore:scored?other:null,resultText:scored?`${outcome}, ${team}-${other}`:null,sourceUrl,now});
      if(meet&&final){
        // Women first, as K-State's: "Women's team: 1st / Men's team: 1st". A
        // team without a score ("W-NTS") has no place; TFRRS adds the points
        // and races (attachMeetResults).
        const placing=String(result.postscore_info||result.prescore_info||''),places={};
        for(const m of placing.matchAll(/\b(M|W|Men|Women)\s*[-:]?\s*(T-?)?(\d{1,3})(?:st|nd|rd|th)\b/gi))places[/^w/i.test(m[1])?'Women':'Men']??=`${m[2]?'T':''}${ordinal(m[3])}`;
        const teams=['Women','Men'].filter(name=>places[name]);
        event.headline=teams.length?teams.map(name=>`${name}'s team: ${places[name]}`).join(' / '):'Completed';
        event.results=teams.length?teams.map(name=>({group:`${name}'s Team`,participant:'Colorado team',result:places[name]})):[{label:'Result',value:'Completed'}];
        event.result_count=event.results.length;
      }
      if(final){
        // The game's own /news/ recap, dated from the game day to three days
        // after (never the game-book PDF or the notes page).
        try{
          const link=new URL(result.recap?.url,sourceUrl),dated=link.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
          const published=dated?Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3])):NaN;
          if(link.hostname===HOST&&dated&&published>=Date.parse(`${firstDay}T00:00:00Z`)&&published<=Date.parse(`${firstDay}T00:00:00Z`)+3*86400000)event.recap_url=link.href;
        }catch{}
      }
      events.push(event);
    }
    return events;
  }
  // The card's own recap link is already bound to its game: it is checked
  // for opponent and date only (Colorado's stories need not name the sport).
  // Any other candidate must also name the opponent in its headline: a
  // tournament story names the next day's opponent ("... will face Central
  // Arkansas on Saturday"), so the shared matcher took the Aug 28 CSUN story
  // for the Aug 29 Central Arkansas match.
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='colorado')return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===HOST&&parsed.pathname.startsWith('/news/');
    if(own)return recapMatchesEvent(raw,{...event,sport:''},url);
    // A game the schedule links its own recap for takes only that one: the
    // Sep 18 story at Colorado State names the same opponent the day after
    // the Sep 17 match.
    if(event.recap_url)return false;
    if(!recapMatchesEvent(raw,event,url))return false;
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    const opponent=headlineKey(event.opponent).trim();
    return opponent.length>=2&&headlineKey(title).includes(` ${opponent} `);
  }
  // A final the schedule links no story for (soccer at Western Michigan, Aug
  // 27) takes Colorado's story from the sport's archive: dated on the game day
  // or the day after, naming the opponent in the article and stating the
  // result (the score either way round, never part of a record such as
  // "3-0-1"; a tie may be told as a draw). The
  // headline may name neither ("Buffs' First Road Match Ends In A Draw").
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  const storyText=raw=>decodeHtml((String(raw).match(/<div\b[^>]*id=["']story-[\s\S]*?(?=<div\b[^>]*class=["'][^"']*related|$)/i)?.[0]||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  const isColoradoFinalWithoutStory=event=>event?.school_id==='colorado'&&event.event_type==='GAME'&&event.status==='Final'&&!event.recap_url&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  async function attachArchiveStory(event){
    if(!isColoradoFinalWithoutStory(event))return event;
    const slug=(String(event.source?.url||'').match(/^https:\/\/cubuffs\.com\/sports\/([a-z-]+)\/schedule/)||[])[1];if(!slug)return event;
    const listing=await download(`https://${HOST}/sports/${slug}/archives`);if(!listing)return event;
    const first=Date.parse(`${String(event.start_time).slice(0,10)}T00:00:00Z`);
    const days=[0,1].map(offset=>new Date(first+offset*86400000)).map(day=>`/news/${day.getUTCFullYear()}/${day.getUTCMonth()+1}/${day.getUTCDate()}/`);
    const paths=[...new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])].filter(path=>days.some(day=>path.startsWith(day)));
    const a=String(event.school_score),b=String(event.opponent_score),opponent=String(event.opponent||'').replace(/\s*\(.*?\)\s*/g,' ').trim();
    const score=new RegExp(`(?<![\\d-])(?:${a}-${b}|${b}-${a})(?![\\d-])`),tie=a===b?/\b(?:draw|tie|tied|scoreless)\b/i:null;
    for(const path of paths.slice(0,4)){
      const url=`https://${HOST}${path}`,raw=await download(url);if(!raw)continue;
      const text=storyText(raw);
      if(!opponent||!text.toLowerCase().includes(opponent.toLowerCase()))continue;
      if(score.test(text)||tie&&tie.test(text)){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  const isColoradoCrossCountry=event=>event?.school_id==='colorado'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  // Feed and expanded view both call this; the second call is a no-op. The
  // races come from TFRRS: the meet is found on each team's TFRRS page by
  // date and name; every team place the schedule publishes must agree.
  async function attachMeetResults(event){
    if(!isColoradoCrossCountry(event)||event.meet_results_verified)return event;
    const unavailable=status=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';event.highlight_status=status;
      return event;
    };
    const failed='Official race results could not be loaded. Open the official recap.';
    const date=String(event.start_time).slice(0,10);
    const pages=new Set();
    for(const team of ['Women','Men']){
      const listing=await download(COLORADO_TFRRS_TEAMS[team]);if(!listing)continue;
      const url=findColoradoTfrrsMeet(listing,{decodeHtml,date,name:event.opponent});
      if(url)pages.add(url);
    }
    if(!pages.size)return unavailable('No results for this meet are published on TFRRS yet.');
    const races=[];let resultsUrl=null;
    for(const url of pages){
      const page=await download(url);if(!page)return unavailable(failed);
      for(const race of parseColoradoTfrrsResults(page,{decodeHtml,ordinal}))if(!races.some(other=>other.group===race.group))races.push(race);
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
        rows.push({group:race.group,participant:'Colorado team',result:value});
        if(!headline.some(line=>line.startsWith(`${race.team}'s team:`)))headline.push(`${race.team}'s team: ${value}`);
        lines.push(`Colorado's ${race.team.toLowerCase()} placed ${ordinal(race.result.place)} with ${race.result.score} points.`);
      }
      rows.push(...race.runners.map(runner=>({group:race.group,participant:runner.participant,result:runner.result})));
    }
    // Without a team score, the headline names the team's first finisher:
    // "Women's: Ella Hagen 2nd".
    for(const team of ['Women','Men'])if(!headline.some(line=>line.startsWith(`${team}'s`))){
      const race=races.find(race=>race.team===team&&!race.result);const [first]=race?.runners||[];
      if(first)headline.push(`${team}'s: ${first.participant} ${/^\d+$/.test(first.place)?ordinal(first.place):first.place}`);
    }
    headline.sort((a,b)=>(a.startsWith('Women')?0:1)-(b.startsWith('Women')?0:1));
    event.headline=headline.join(' / ');
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.recap_result_count=rows.length;
    // The source link stays on cubuffs.com (the official recap, or the
    // schedule); the TFRRS page is kept beside it. Not result_url: that would
    // start the shared generic TFRRS enrichment.
    event.results_source_url=resultsUrl;
    event.source={...event.source,name:event.recap_url?'Official athletics meet recap; results from TFRRS':'Official athletics schedule; results from TFRRS',url:event.recap_url||event.source?.url};
    // Highlights only from the verified rows: each team finish, then each
    // race's first Colorado finisher, then the next finishers.
    for(const race of races){const [leader]=race.runners;if(leader)lines.push(`${leader.participant} led Colorado in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}, finishing ${leader.result.replace(' \u00b7 ',' in ')}.`);}
    for(let i=1;lines.length<4&&races.some(race=>race.runners[i]);i++)for(const race of races){const runner=race.runners[i];if(runner&&lines.length<4)lines.push(`${runner.participant} finished ${runner.result.replace(' \u00b7 ',' in ')} in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}.`);}
    event.highlights=lines.slice(0,4);
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  return{parseSchedule,matchesRecap,isColoradoFinalWithoutStory,attachArchiveStory,isColoradoCrossCountry,attachMeetResults};
}
