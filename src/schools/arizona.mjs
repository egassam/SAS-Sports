import {sidearmScheduleGames,sidearmStartTime} from '../sidearm-schedule-data.mjs';
// Arizona school module. Shared publisher utilities stay in the Worker; this
// file owns arizonawildcats.com routes, Arizona's program combinations and its
// schedule reader. Routes started as the exact candidates production used
// before the module existed (route parity); each sport is then corrected and
// verified one at a time.
export const arizonaSchool={
  id:'arizona',
  // Sports whose official schedule this module reads itself, from the page
  // data (see parseSchedule). Every other sport keeps the shared parsers.
  pageDataSports:new Set(['Football','Volleyball','Soccer','Cross Country','Basketball','Baseball','Softball','Beach Volleyball','Golf','Gymnastics']),
  // Live game state comes from an independent scoreboard, as for K-State;
  // the official schedule stays the results source of record. ESPN's college
  // football scoreboard lists only ~25 featured games for "limit=1000" (Arizona
  // at Washington State was missing on Sep 26); the FBS group (80) lists all.
  liveScoreboards:{
    Football:[{path:'football/college-football',query:'groups=80&limit=300',sourceName:'Live college football scoreboard'}],
    // Volleyball scores are sets won; the live detail names the current set.
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // ESPN's women's college soccer scoreboard (Arizona sponsors women's
    // soccer only); it lists every Division I match.
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    // Both teams, labeled to match the official men's and women's pages.
    // Without the Division I group (50) ESPN lists only featured games (2 of
    // 23 men's games on Mar 1, 2026).
    Basketball:[
      {path:'basketball/mens-college-basketball',query:'groups=50&limit=300',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},
      {path:'basketball/womens-college-basketball',query:'groups=50&limit=300',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}
    ],
    Baseball:[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    Softball:[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Both teams' pages are shown, labeled by team.
  combinedSports:new Set(['Basketball','Swimming & Diving','Golf']),
  scheduleUrls:{
    // The official page only: the homepage added other sports' ticker events.
    'arizona|Baseball':'https://arizonawildcats.com/sports/baseball/schedule',
    // The two official pages only: the generic page and the homepage added
    // nothing but other sports' ticker events.
    'arizona|Basketball':['https://arizonawildcats.com/sports/mens-basketball/schedule','https://arizonawildcats.com/sports/womens-basketball/schedule'],
    // /sports/beach-volleyball/ renders SIDEARM's empty "@season @sport"
    // template (production answered 502); the sport's page is
    // womens-beach-volleyball.
    'arizona|Beach Volleyball':'https://arizonawildcats.com/sports/womens-beach-volleyball/schedule',
    'arizona|Cross Country':'https://arizonawildcats.com/sports/cross-country/schedule',
    'arizona|Football':'https://arizonawildcats.com/sports/football/schedule',
    // Both teams (production showed the women's page only, the first that
    // loaded); /sports/golf/ and the homepage are not golf schedules.
    'arizona|Golf':['https://arizonawildcats.com/sports/mens-golf/schedule','https://arizonawildcats.com/sports/womens-golf/schedule'],
    // Arizona sponsors women's gymnastics only; the other slugs render the
    // empty "@season @sport" template.
    'arizona|Gymnastics':'https://arizonawildcats.com/sports/womens-gymnastics/schedule',
    'arizona|Soccer':'https://arizonawildcats.com/sports/womens-soccer/schedule',
    'arizona|Softball':'https://arizonawildcats.com/sports/softball/schedule',
    'arizona|Swimming & Diving':['https://arizonawildcats.com/sports/mens-swimming-and-diving/schedule','https://arizonawildcats.com/sports/womens-swimming-and-diving/schedule'],
    'arizona|Tennis':['https://arizonawildcats.com/sports/womens-tennis/schedule','https://arizonawildcats.com/sports/mens-tennis/schedule','https://arizonawildcats.com/sports/tennis/schedule','https://arizonawildcats.com/'],
    'arizona|Track & Field':['https://arizonawildcats.com/sports/track-and-field/schedule','https://arizonawildcats.com/sports/track-field/schedule','https://arizonawildcats.com/'],
    'arizona|Volleyball':'https://arizonawildcats.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'arizona|Baseball':'https://arizonawildcats.com/sports/baseball/roster',
    'arizona|Basketball':['https://arizonawildcats.com/sports/mens-basketball/roster','https://arizonawildcats.com/sports/womens-basketball/roster','https://arizonawildcats.com/sports/basketball/roster'],
    'arizona|Beach Volleyball':'https://arizonawildcats.com/sports/womens-beach-volleyball/roster',
    'arizona|Cross Country':'https://arizonawildcats.com/sports/cross-country/roster',
    'arizona|Football':'https://arizonawildcats.com/sports/football/roster',
    'arizona|Golf':['https://arizonawildcats.com/sports/womens-golf/roster','https://arizonawildcats.com/sports/mens-golf/roster','https://arizonawildcats.com/sports/golf/roster'],
    'arizona|Gymnastics':'https://arizonawildcats.com/sports/womens-gymnastics/roster',
    'arizona|Soccer':['https://arizonawildcats.com/sports/womens-soccer/roster','https://arizonawildcats.com/sports/wsoc/roster','https://arizonawildcats.com/sports/soccer/roster','https://arizonawildcats.com/sports/mens-soccer/roster'],
    'arizona|Softball':'https://arizonawildcats.com/sports/softball/roster',
    'arizona|Swimming & Diving':['https://arizonawildcats.com/sports/womens-swimming-and-diving/roster','https://arizonawildcats.com/sports/mens-swimming-and-diving/roster','https://arizonawildcats.com/sports/womens-swimming-diving/roster','https://arizonawildcats.com/sports/mens-swimming-diving/roster','https://arizonawildcats.com/sports/swimming-and-diving/roster','https://arizonawildcats.com/sports/swimming-diving/roster','https://arizonawildcats.com/sports/swimming/roster'],
    'arizona|Tennis':['https://arizonawildcats.com/sports/womens-tennis/roster','https://arizonawildcats.com/sports/mens-tennis/roster','https://arizonawildcats.com/sports/tennis/roster'],
    'arizona|Track & Field':['https://arizonawildcats.com/sports/track-and-field/roster','https://arizonawildcats.com/sports/track-field/roster'],
    'arizona|Volleyball':['https://arizonawildcats.com/sports/womens-volleyball/roster','https://arizonawildcats.com/sports/wvball/roster','https://arizonawildcats.com/sports/volleyball/roster']
  }
};

const HOST='arizonawildcats.com';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Rankings describe the week, not the opponent: "#21 Colorado", "No. 23 BYU".
// Exhibitions are written "Grand Canyon (Exh.)", "San Francisco (Exhib.)" or
// "Exhibition Embry-Riddle (Ariz.)"; they read "Grand Canyon (Exhibition)".
export function arizonaOpponent(title){
  let name=String(title||'').replace(/\s+/g,' ').trim().replace(/^(?:#\d+|No\.\s*\d+|RV)\s+/i,'');
  const exhibition=/^Exhibition\s+|\s*\((?:Exh|Exhib|Exhibition)\.?\)$/i;
  if(exhibition.test(name))name=`${name.replace(exhibition,'').trim()} (Exhibition)`;
  return name;
}
// Internal events: "Red-Blue Scrimmage", "Red vs. Blue Intrasquad",
// "Red-Blue Showcase".
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bred\s*(?:-|vs\.?|&|and)\s*blue\b/i;

// arizonawildcats.com is a SIDEARM (Nuxt) site. Its schedule pages embed every
// game as page data: the local start ("2026-09-05T18:30:00", "6:30 PM MST"),
// home/away/neutral, the result (status W/L/T, both scores) and the game's own
// recap link. The shared parsers read only the rendered cards, which omit the
// start time, so every upcoming game showed its date alone.
// Cross country recaps end with Arizona's own results, one list per race:
// "Arizona Men's Results (6K)" then "1. Vincent Gwachi - 17:32.6" lines, and
// state the team points in prose ("The men earned 85 points (1st), while the
// women earned 280 points (12th)." or "... while the women earned 28.").
// Women's race first, as K-State's.
export function parseArizonaRecapResults(raw,{decodeHtml,ordinal}){
  const html=String(raw||''),races=new Map();
  const heading=/Arizona\s+(Men|Women)(?:'|&#x27;|&#39;|\u2019|&rsquo;)s\s+Results\s*\((\d+(?:\.\d+)?)\s*K\)\s*<\/strong>/gi;
  for(const m of html.matchAll(heading)){
    const team=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();
    if(races.has(team))continue;
    const rest=html.slice(m.index+m[0].length),stop=rest.search(/<strong\b|<\/p>|<\/div>/i);
    const runners=[];
    for(const line of (stop<0?rest:rest.slice(0,stop)).split(/<br\b[^>]*>/i)){
      const text=decodeHtml(line.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
      const row=text.match(/^(\d{1,3})\.\s*(.+?)\s+[-\u2013\u2014]\s+(\d{1,2}:\d{2}(?:\.\d{1,2})?)$/);
      if(row)runners.push({participant:row[2],place:Number(row[1]),time:row[3]});
    }
    if(runners.length)races.set(team,{group:`${team}'s ${m[2]}K`,runners});
  }
  const article=decodeHtml(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  const points={};
  for(const m of article.matchAll(/\b(men|women)\s+(?:earned|scored|finished with)\s+(\d{1,4})(?=\s*(?:points?\b|\(|[.,;]))/gi)){const team=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();points[team]??=m[2];}
  return['Women','Men'].filter(team=>races.has(team)).map(team=>({team,...races.get(team),points:points[team]||null,rows:races.get(team).runners.map(r=>({group:races.get(team).group,participant:r.participant,result:`${ordinal(r.place)} \u00b7 ${r.time}`}))}));
}

// Golf publishes one entry per round ("Sahalee Players Championship" on Sep
// 12 and Sep 13). K-State shows one event per tournament: consecutive days of
// the same tournament become one event from its first to its last day. The
// last round's entry carries the final place, total and recap (a day-one
// story is not the result); an unfinished tournament shows its next round.
const ROUND_SPORTS=new Set(['Golf']);
function mergeRounds(games,today){
  const groups=[];
  for(const game of games){
    const key=String(game.tournament?.title||game.opponent?.title||'').trim().toLowerCase(),previous=groups.at(-1);
    const gap=previous?(Date.parse(game.date.slice(0,10))-Date.parse(previous.at(-1).date.slice(0,10)))/86400000:Infinity;
    if(previous&&key&&String(previous[0].tournament?.title||previous[0].opponent?.title||'').trim().toLowerCase()===key&&gap>=0&&gap<=2){previous.push(game);continue;}
    groups.push([game]);
  }
  return groups.map(rounds=>{
    if(rounds.length===1)return rounds[0];
    const first=rounds[0],last=rounds.at(-1),next=rounds.find(round=>round.date.slice(0,10)>=today);
    const shown=next&&first.date.slice(0,10)<today?next:first;
    return{...shown,first_date:first.date,enddate:last.enddate||last.date,result:last.result||null};
  });
}

// Golf recaps end with Arizona's individual scores and the team standings,
// both as tables: "Place | Team (Nat'l Rank) | Score | To Par" rows such as
// "12 | Arizona | 301+307+301=909 | +45". A "Team Standings (Top 10)" table
// does not give the field size.
export function parseArizonaGolfRecap(raw,{decodeHtml}){
  const html=String(raw||'');
  const text=value=>decodeHtml(String(value).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
  const tableAfter=label=>{
    const at=html.search(label);if(at<0)return null;
    const heading=text(html.slice(at,html.indexOf('<table',at)));
    const table=(html.slice(at).match(/<table\b[\s\S]*?<\/table>/i)||[])[0];
    return table?{heading,rows:[...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(tr=>[...tr[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>text(cell[1].replace(/<\/?(?:span|dfn|a|strong|b|em|i)\b[^>]*>/gi,''))))}:null;
  };
  const standings=tableAfter(/Team Standings/i),individuals=tableAfter(/Individual Scores/i);
  let team=null;
  if(standings&&/^place/i.test(standings.rows[0]?.[0]||'')){
    const rows=standings.rows.slice(1).filter(cells=>/^T?\d+$/i.test(cells[0]||''));
    // Arizona, not Arizona State ("Arizona", "Arizona, U. of", "#29 Arizona").
    const ours=rows.find(cells=>/^(?:#\d+\s+)?Arizona(?:,\s*U\.?\s*of)?(?:\s*\(\d+\))?$/i.test(cells[1]||''));
    const total=ours&&String(ours[2]||'').match(/=\s*(\d{3,4})\s*$/);
    if(ours&&total)team={place:ours[0].toUpperCase(),total:total[1],field:/\(Top \d+\)/i.test(standings.heading)?null:rows.length};
  }
  const players=[];
  if(individuals&&/^place/i.test(individuals.rows[0]?.[0]||''))for(const cells of individuals.rows.slice(1)){
    const [place,name,score,par]=cells,total=String(score||'').match(/=\s*(\d{2,3})\s*$/);
    if(name&&/^(?:T-?)?\d+$/i.test(place||'')&&total)players.push({participant:name,place:place.toUpperCase().replace('-',''),total:total[1],par:String(par||'').replace(/\s+/g,'')});
  }
  return{team,players};
}

export function createArizonaHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const fullNames=new Map();
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='arizona'||!arizonaSchool.pageDataSports.has(sport))return null;
    let url;try{url=new URL(sourceUrl);}catch{return null;}
    if(url.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(url.pathname))return null;
    const today=new Date(now.getTime()-7*3600000).toISOString().slice(0,10);
    const pageGames=sidearmScheduleGames(raw);
    if(!pageGames.length)return null;
    const games=ROUND_SPORTS.has(sport)?mergeRounds(pageGames,today):pageGames;
    const events=[],played=new Map();
    // Spring pages keep showing last season until the next is published
    // ("2025-26 Gymnastics Schedule"). Only the current academic year
    // (July-June, Arizona time) is current; a page with none is a valid
    // empty schedule.
    const seasonStart=`${Number(today.slice(5,7))>=7?today.slice(0,4):Number(today.slice(0,4))-1}-07-01`;
    let pastSeason=0;
    for(const game of games){
      const day=String(game.date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if(!day)continue;
      if(String(game.first_date||game.date).slice(0,10)<seasonStart){pastSeason++;continue;}
      let opponent=arizonaOpponent(game.opponent?.title);
      // Baseball and softball fall games ("Fall Schedule", type S) are
      // exhibitions; they are labeled as the other exhibitions are.
      if((sport==='Baseball'||sport==='Softball')&&game.type==='S'&&!/\(Exhibition\)$/.test(opponent))opponent=`${opponent} (Exhibition)`;
      // A bracket game whose opponent is not yet known ("TBA") is named after
      // its tournament ("Big 12 Soccer Championship").
      const tournament=String(game.tournament?.title||'').replace(/\s+Presented by\b.*$/i,'').trim();
      if(/^TB[AD]$/i.test(opponent)&&tournament)opponent=tournament;
      // Golf cards shorten the tournament ("Folds of Honor" for "Folds of
      // Honor Collegiate"); the recaps use its full name.
      else if(sport==='Golf'&&tournament&&tournament.toLowerCase().startsWith(opponent.toLowerCase().replace(/\.$/,'')))opponent=tournament.replace(/\.$/,'').length>=opponent.length?tournament:opponent;
      // A multi-day conference tournament names the conference ("Big 12
      // Conference"); its tournament names the event.
      else if(/\bConference$/i.test(opponent)&&game.enddate&&tournament)opponent=tournament;
      if(!opponent||INTERNAL.test(opponent))continue;
      // Canceled and postponed games are not on K-State's schedule.
      if(/^(?:Cancel+ed|Postponed)\b/i.test(String(game.noplay_text||'').trim()))continue;
      const result=game.result||{},outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      const scored=['W','L','T'].includes(outcome)&&/^\d+$/.test(team)&&/^\d+$/.test(other);
      // Meets (cross country, golf) and duals without a score (tennis
      // tournaments, beach volleyball events) read as meets; a dual with a
      // score reads as a game.
      const meet=eventType(sport)!=='GAME'&&!scored;
      // Meets publish the team finishes as text: "Men: 1st Women: 12th".
      const placing=meet?String(result.prescore_info||result.postscore_info||'').replace(/\s+/g,' ').trim():'';
      // Arizona time (no daylight saving). A multi-day event is over only
      // after its last day; NCAA golf rounds publish the last day in the time
      // field ("05/19/2027").
      const endText=String(game.time||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/),enddate=game.enddate||(endText?`${endText[3]}-${endText[1]}-${endText[2]}T00:00:00`:'');
      const firstDay=(game.first_date||game.date).slice(0,10);
      const lastDay=String(enddate).slice(0,10)>firstDay?String(enddate).slice(0,10):game.date.slice(0,10)>firstDay?game.date.slice(0,10):firstDay;
      const final=scored||meet&&(Boolean(placing)||lastDay<today);
      // A game day that has passed with no published score (an exhibition
      // played as "best two of three") is neither a result nor upcoming.
      if(!final&&lastDay<today)continue;
      // H: home, A: away; a neutral site keeps the page's own vs./at.
      // Meets read "Arizona at Dave Murray Invitational", as K-State's do.
      const relation=eventType(sport)==='MEET'?'at':game.location_indicator==='A'?'at':game.location_indicator==='H'?'vs':String(game.at_vs||'vs').toLowerCase()==='at'?'at':'vs';
      // K-State's results show the date only; upcoming games show the
      // published local time ("TBA" shows the date alone).
      const start=final?null:sidearmStartTime(game.date,game.time);
      const event=makeEvent({school,sport,status:final?'Final':'Upcoming',relation,opponent,
        date:`${MONTHS[Number(day[2])-1]} ${Number(day[3])}, ${day[1]}`,time:start?start.display_time.replace(/^.*, /,''):null,
        schoolScore:scored?team:null,oppScore:scored?other:null,resultText:scored?`${outcome}, ${team}-${other}`:null,sourceUrl,now});
      // Multi-day events (conference tournaments, tennis tournaments) end on
      // their last day.
      if(lastDay>game.date.slice(0,10))event.end_time=`${lastDay}T23:59:59Z`;
      // A doubleheader lists the same opponent twice on one day: Game 1 and
      // Game 2 stay two games.
      const pair=`${game.date.slice(0,10)}|${opponent}`,sameDay=games.filter(other=>other.date.slice(0,10)===game.date.slice(0,10)&&arizonaOpponent(other.opponent?.title)===arizonaOpponent(game.opponent?.title)).length;
      if(sameDay>1){const number=(played.get(pair)||0)+1;played.set(pair,number);event.game_number=number;event.id=`${event.id}-game-${number}`;event.title=`${event.title} (Game ${number})`;}
      // Separate men's and women's pages can list the same opponent on the
      // same day; the team keeps their event ids apart.
      const squad=arizonaSchool.combinedSports.has(sport)?(url.pathname.match(/^\/sports\/(mens|womens)-/)||[])[1]:null;
      if(squad)event.id=`${event.id}-${squad}`;
      // Golf: "7th; 844 (-20)" or "T4th; 292 (+4)" after the last round.
      const golf=sport==='Golf'?placing.match(/^(T)?(\d{1,3})(?:st|nd|rd|th)?\s*[;,]\s*(\d{3,4})\b/i):null;
      // Gymnastics: "W; 195.425" (a dual) or "3rd; 193.350".
      const gym=sport==='Gymnastics'?placing.match(/^(W|L|T|T?\d{1,2}(?:st|nd|rd|th))\s*[;,]\s*(\d{3}\.\d{1,3})$/i):null;
      if(gym&&final){const value=`${gym[1].toUpperCase().replace(/(\d)(ST|ND|RD|TH)$/,(m,d,s)=>d+s.toLowerCase())} \u00b7 ${gym[2]}`;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
      else if(golf&&final){const value=`${golf[1]?'T':''}${ordinal(golf[2])} (${golf[3]})`;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
      else if(meet&&final){
        // Women first, as K-State's: "Women's team: 12th / Men's team: 1st".
        const places=Object.fromEntries([...placing.matchAll(/\b(Men|Women)\s*:\s*(T?\d{1,3}(?:st|nd|rd|th))/gi)].map(m=>[m[1][0].toUpperCase()+m[1].slice(1).toLowerCase(),m[2]]));
        const teams=['Women','Men'].filter(name=>places[name]);
        event.headline=teams.length?teams.map(name=>`${name}'s team: ${places[name]}`).join(' / '):'Completed';
        event.results=teams.length?teams.map(name=>({group:`${name}'s Team`,participant:'Arizona team',result:places[name]})):[{label:'Result',value:'Completed'}];
        event.result_count=event.results.length;
      }
      if(final){
        const recap=result?.recap?.url;
        if(typeof recap==='string'){
          try{const link=new URL(recap,sourceUrl);if(link.hostname===HOST&&link.pathname.startsWith('/news/'))event.recap_url=link.href;}catch{}
        }
      }
      // The opponent's full name, from its logo ("Northern Arizona University
      // Logo" for "NAU"); stories may use either.
      const full=String(game.opponent?.image?.title||game.opponent?.image?.alt||'').replace(/\s+Logo$/i,'').trim();
      if(full&&full!==opponent){fullNames.set(event.id,full);if(fullNames.size>2000)fullNames.delete(fullNames.keys().next().value);}
      events.push(event);
    }
    if(!events.length&&pastSeason)emptiedBySeason.add(events);
    return events;
  }
  const emptiedBySeason=new WeakSet();
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptiedBySeason.has(events);
  // Some recaps never name the sport ("Wildcats Back in the Win Column with
  // Four-Set Victory Over Oregon State"), so the shared matcher refused the
  // game's own recap. The sport-word check is dropped only for the recap the
  // page data links to that game; opponent and date are still required, and
  // any other candidate is checked as before.
  // The same recap may name the opponent by its initials only ("Arizona Falls
  // to UCSB in Three Sets" for UC Santa Barbara); for that link the initials
  // count as the opponent's name too.
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='arizona')return false;
    if(!url||url!==event.recap_url){
      // Arizona dates its stories on the game day; the shared matcher's
      // one-day window accepted the day-before story that previews the next
      // game ("Arizona Opens Lithuania Tour ..." names Ukraine).
      const dated=String(url||'').match(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      const day=dated?`${dated[1]}-${dated[2].padStart(2,'0')}-${dated[3].padStart(2,'0')}`:'';
      if(!day||day<String(event.start_time).slice(0,10)||day>String(event.end_time||event.start_time).slice(0,10))return false;
      if(recapMatchesEvent(raw,event,url))return true;
      // A story found in the sport's news archive (no recap is linked to the
      // game) may name the opponent in full: "Arizona Blanks Northern Arizona
      // 3-0" for NAU. Sport and date are still required.
      const full=fullNames.get(event.id);
      return Boolean(full)&&[full,full.replace(/^University of\s+|\s+University$/gi,'')].some(name=>recapMatchesEvent(raw,{...event,opponent:name},url));
    }
    const own={...event,sport:''};
    if(recapMatchesEvent(raw,own,url))return true;
    const words=String(event.opponent||'').replace(/\(.*?\)/g,' ').split(/[\s-]+/).filter(Boolean);
    const initials=words.map(word=>/^[A-Z]{2,}$/.test(word)?word:word[0]).join('').toUpperCase();
    return words.length>1&&initials.length>=3&&recapMatchesEvent(raw,{...own,opponent:initials},url);
  }
  const isArizonaCrossCountry=event=>event?.school_id==='arizona'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  // Feed and expanded view both call this; the second call is a no-op. Race
  // rows come from the meet's own recap (linked in the page data).
  async function attachMeetResults(event){
    if(!isArizonaCrossCountry(event)||event.meet_results_verified)return event;
    const unavailable=status=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';event.highlight_status=status;
      return event;
    };
    const failed='Official race results could not be loaded. Open the official recap.';
    if(!event.recap_url)return unavailable('No official recap is published for this meet on arizonawildcats.com.');
    let raw;
    try{
      const response=await fetch(event.recap_url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});
      if(!response.ok)return unavailable(failed);raw=await response.text();
    }catch{return unavailable(failed);}
    if(!recapMatchesEvent(raw,event,event.recap_url))return unavailable(failed);
    const races=parseArizonaRecapResults(raw,{decodeHtml,ordinal});
    if(!races.length)return unavailable(failed);
    // Places come from the official schedule, points from the recap.
    const places=Object.fromEntries([...String(event.headline||'').matchAll(/\b(Men|Women)'s team: (T?\d+\w\w)/g)].map(m=>[m[1],m[2]]));
    const rows=[],lines=[],headline=[];
    for(const race of races){
      const place=places[race.team],result=place?`${place}${race.points?` \u00b7 ${race.points} pts`:''}`:race.points?`${race.points} pts`:null;
      if(result){rows.push({group:race.group,participant:'Arizona team',result});headline.push(`${race.team}'s team: ${result}`);}
      rows.push(...race.rows);
    }
    if(headline.length)event.headline=headline.join(' / ');
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.recap_result_count=rows.length;
    event.source={...event.source,name:'Official athletics meet recap',url:event.recap_url};
    // Highlights only from the verified rows: each team finish, then each
    // race's leader.
    const finish=row=>row.result.replace(' \u00b7 ',' in ');
    for(const race of races){
      const place=places[race.team];
      if(place)lines.push(`Arizona's ${race.team.toLowerCase()} placed ${place}${race.points?` with ${race.points} points`:''}.`);
    }
    for(const race of races){const [leader]=race.rows;lines.push(`${leader.participant} led Arizona in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}, finishing ${finish(leader)}.`);}
    event.highlights=lines.slice(0,4);
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  const isArizonaGolf=event=>event?.school_id==='arizona'&&event.sport==='Golf'&&event.event_type==='MEET'&&event.status==='Final';
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  // The tournament's story: the last round's recap link, or, when the schedule
  // links none (the Tucker Intercollegiate), a story in the team's golf
  // archive dated on the last day that names the tournament.
  async function golfStory(event){
    const lastDay=String(event.end_time||event.start_time).slice(0,10);
    const final=(raw,url)=>raw&&recapMatchesEvent(raw,{...event,start_time:`${lastDay}T12:00:00.000Z`},url);
    if(event.recap_url){const raw=await download(event.recap_url);return final(raw,event.recap_url)?{url:event.recap_url,raw}:null;}
    const team=event.team_label==="Men's"?'mens':event.team_label==="Women's"?'womens':null;if(!team)return null;
    const listing=await download(`https://${HOST}/sports/${team}-golf/archives`);if(!listing)return null;
    const [year,month,day]=lastDay.split('-').map(Number);
    const dated=new RegExp(`/news/${year}/0?${month}/0?${day}/[a-z0-9-]*golf[a-z0-9-]*`,'gi');
    const words=String(event.opponent).toLowerCase().replace(/^the\s+/,'').split(/[^a-z0-9]+/).filter(word=>word.length>=4);
    for(const path of [...new Set(listing.replace(/\\u002F/gi,'/').match(dated)||[])].slice(0,4)){
      if(!words.every(word=>path.includes(word)))continue;
      const url=`https://${HOST}${path}`,raw=await download(url);
      if(final(raw,url))return{url,raw};
    }
    return null;
  }
  // Golf results from the tournament's own story: Arizona's place in the team
  // standings with the field size and total (K-State's "12th of 12 (909)"),
  // and Arizona's individual scores. Feed and expanded view share them.
  async function attachGolfResults(event){
    if(!isArizonaGolf(event)||event.meet_results_verified)return event;
    const story=await golfStory(event);if(!story)return event;
    const {team,players}=parseArizonaGolfRecap(story.raw,{decodeHtml});
    // The schedule's own place (when published) must agree with the story's.
    const published=String(event.headline||'').match(/^(T?\d+)\w\w \((\d+)\)$/);
    if(!team||published&&(published[1].replace(/^T/,'')!==team.place.replace(/^T/,'')||published[2]!==team.total))return event;
    const place=`${team.place.startsWith('T')?'T':''}${ordinal(team.place.replace(/^T/,''))}`;
    const value=`${place}${team.field?` of ${team.field}`:''} (${team.total})`;
    const group=`${event.team_label||''} Individual Results`.trim();
    event.headline=value;event.recap_url=story.url;
    event.results=[{label:'Result',value},...players.map(player=>({group,participant:player.participant,result:`${player.place.startsWith('T')?'T':''}${ordinal(player.place.replace(/^T/,''))} \u00b7 ${player.total}${player.par?` (${player.par})`:''}`}))];
    event.result_count=event.results.length;event.has_more_results=event.results.length>3;
    const lines=[`Arizona finished ${value.replace(/ \((\d+)\)$/,'')} at the ${event.opponent.replace(/^The\s+/,'')} with a team total of ${team.total}.`];
    for(const player of players.slice(0,3))lines.push(`${player.participant} placed ${player.place.startsWith('T')?'T':''}${ordinal(player.place.replace(/^T/,''))} with ${player.total}${player.par?` (${player.par})`:''}.`);
    event.highlights=lines;event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    event.source={...event.source,name:'Official athletics tournament recap',url:story.url};
    return event;
  }
  return{parseSchedule,isEmptySchedule,matchesRecap,isArizonaCrossCountry,attachMeetResults,isArizonaGolf,attachGolfResults};
}
