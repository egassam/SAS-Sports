import {createSidearmScheduleReader} from '../sidearm-schedule-reader.mjs';
import {findTfrrsMeet,parseTfrrsResults} from '../tfrrs-results.mjs';
// Baylor school module. Shared publisher utilities stay in the Worker; this
// file owns baylorbears.com routes, Baylor's program combinations and its
// schedule reader. Routes started as the exact candidates production used
// before the module existed (route parity); each sport is then corrected and
// verified one at a time.
export const baylorSchool={
  id:'baylor',
  // Sports whose official schedule this module reads itself, from the page
  // data (see parseSchedule). Every other sport keeps the shared parsers.
  pageDataSports:new Set(['Football','Volleyball','Soccer','Cross Country','Basketball','Baseball','Softball','Golf','Tennis','Equestrian','Acrobatics & Tumbling','Track & Field']),
  // Live game state comes from an independent scoreboard; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    Football:[{path:'football/college-football',sourceName:'Live college football scoreboard'}],
    // Volleyball scores are sets won; the live detail names the current set.
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // ESPN's women's college soccer scoreboard (Baylor sponsors women's soccer
    // only); it lists every Division I match.
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    // Both teams, labeled to match the official men's and women's pages (the
    // shared request asks for every Division I game).
    Basketball:[
      {path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},
      {path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}
    ],
    Baseball:[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    Softball:[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Stored expanded views (/live/highlights) are kept 30 days; raise this
  // when a change rewrites already-stored Baylor finals.
  highlightRevision:2,
  combinedSports:new Set(['Basketball','Golf','Tennis']),
  scheduleUrls:{
    // The sport's page is acrobatics-tumbling; acrobatics-and-tumbling renders
    // SIDEARM's empty "@season @sport" template and the homepage is not a
    // schedule.
    'baylor|Acrobatics & Tumbling':'https://baylorbears.com/sports/acrobatics-tumbling/schedule',
    // The official page only: the homepage adds other sports' ticker events.
    'baylor|Baseball':'https://baylorbears.com/sports/baseball/schedule',
    // The two official pages only: the generic page and the homepage are not
    // basketball schedules.
    'baylor|Basketball':['https://baylorbears.com/sports/mens-basketball/schedule','https://baylorbears.com/sports/womens-basketball/schedule'],
    'baylor|Cross Country':'https://baylorbears.com/sports/cross-country/schedule',
    // The official page only: the homepage adds other sports' ticker events.
    'baylor|Equestrian':'https://baylorbears.com/sports/equestrian/schedule',
    'baylor|Football':'https://baylorbears.com/sports/football/schedule',
    // Both teams (production showed the women's page only, the first that
    // loaded); /sports/golf/ and the homepage are not golf schedules.
    'baylor|Golf':['https://baylorbears.com/sports/womens-golf/schedule','https://baylorbears.com/sports/mens-golf/schedule'],
    'baylor|Soccer':'https://baylorbears.com/sports/womens-soccer/schedule',
    // The official page only: the homepage adds other sports' ticker events.
    'baylor|Softball':'https://baylorbears.com/sports/softball/schedule',
    // Both teams (production showed the women's page only, the first that
    // loaded); /sports/tennis/ and the homepage are not tennis schedules.
    'baylor|Tennis':['https://baylorbears.com/sports/womens-tennis/schedule','https://baylorbears.com/sports/mens-tennis/schedule'],
    // The official page only: the other slug and the homepage are not track
    // schedules.
    'baylor|Track & Field':'https://baylorbears.com/sports/track-and-field/schedule',
    'baylor|Volleyball':'https://baylorbears.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'baylor|Acrobatics & Tumbling':'https://baylorbears.com/sports/acrobatics-tumbling/roster',
    'baylor|Baseball':'https://baylorbears.com/sports/baseball/roster',
    'baylor|Basketball':['https://baylorbears.com/sports/mens-basketball/roster','https://baylorbears.com/sports/womens-basketball/roster','https://baylorbears.com/sports/basketball/roster'],
    'baylor|Cross Country':'https://baylorbears.com/sports/cross-country/roster',
    'baylor|Equestrian':'https://baylorbears.com/sports/equestrian/roster',
    'baylor|Football':'https://baylorbears.com/sports/football/roster',
    'baylor|Golf':['https://baylorbears.com/sports/womens-golf/roster','https://baylorbears.com/sports/mens-golf/roster','https://baylorbears.com/sports/golf/roster'],
    'baylor|Soccer':['https://baylorbears.com/sports/womens-soccer/roster','https://baylorbears.com/sports/wsoc/roster','https://baylorbears.com/sports/soccer/roster','https://baylorbears.com/sports/mens-soccer/roster'],
    'baylor|Softball':'https://baylorbears.com/sports/softball/roster',
    'baylor|Tennis':['https://baylorbears.com/sports/womens-tennis/roster','https://baylorbears.com/sports/mens-tennis/roster','https://baylorbears.com/sports/tennis/roster'],
    'baylor|Track & Field':['https://baylorbears.com/sports/track-and-field/roster','https://baylorbears.com/sports/track-field/roster'],
    'baylor|Volleyball':['https://baylorbears.com/sports/womens-volleyball/roster','https://baylorbears.com/sports/wvball/roster','https://baylorbears.com/sports/volleyball/roster']
  }
};

const HOST='baylorbears.com';
// Internal events: "Green & Gold Fall Scrimmage", intrasquads.
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bgreen\s*(?:&|and|vs\.?|-)\s*gold\b/i;
// Baylor's calendar day (Waco, America/Chicago).
const baylorToday=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
// Rankings describe the week, not the opponent: "#21 Colorado", "No. 23 BYU",
// "RV Georgia Tech". Exhibitions are written "Florida (EXH)" or "West Texas
// A&M (Exhibition)"; they read "Florida (Exhibition)".
export function baylorOpponent(title){
  const name=String(title||'').replace(/\s+/g,' ').trim().replace(/^(?:#\d+|No\.\s*\d+|RV)\s+/i,'');
  const exhibition=/\s*\((?:EXH|Exh|Exhib|Exhibition)\.?\)$/i;
  return exhibition.test(name)?`${name.replace(exhibition,'').trim()} (Exhibition)`:name;
}

// baylorbears.com is a SIDEARM (Nuxt) site. Its schedule pages embed every
// game as page data: the local start ("2026-10-03T21:30:00", "9:30 p.m."),
// home/away/neutral, the result (status W/L/T, both scores) and the game's own
// recap link. The shared parsers read only the rendered cards, which omit the
// start time, so every upcoming game showed its date alone.
// A story's headline (og:title): "No. 21 VB Tops Hawaii in Five-Set Thriller".
export function baylorStoryHeadline(raw){
  const m=String(raw||'').match(/<meta\b[^>]*property=["']og:title["'][^>]*content=(["'])(.*?)\1/i)||String(raw||'').match(/<meta\b[^>]*content=(["'])(.*?)\1[^>]*property=["']og:title["']/i);
  return m?m[2]:'';
}

// TFRRS (the collegiate results database) publishes each meet's complete
// scored results as plain tables: "Women 2 Mile CC Team Results (2 Mile)"
// with PL/Team/Score, then "... Individual Results" with PL/NAME/YEAR/TEAM/
// TIME. Baylor's team pages (one per team) list every meet with its date.
// Baylor's own recaps name only some runners, and the Texas A&M Invitational
// has none; the "Results" links on the schedule go to Flash Results and
// XpressTiming pages.
export const BAYLOR_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/TX_college_f_Baylor.html',Men:'https://www.tfrrs.org/teams/xc/TX_college_m_Baylor.html'};
// TFRRS meet finder and race reader are shared (`src/tfrrs-results.mjs`);
// Baylor rows are Baylor's by the TFRRS TEAM column.
export const findBaylorTfrrsMeet=(raw,options)=>findTfrrsMeet(raw,{...options,match:'all'});
export const parseBaylorTfrrsResults=(raw,options)=>parseTfrrsResults(raw,{...options,team:'Baylor'});

// Golf publishes one entry per round ("Schooner Fall Classic" on Sep 19, 20
// and 21). K-State shows one event per tournament: consecutive days of the
// same tournament become one event from its first to its last day. The last
// round with a result carries the final place, total and recap (a day-one
// line such as "15th (+7, 287)" is not the result); an unfinished tournament
// shows its next round.
function mergeRounds(games,today){
  const groups=[];
  for(const game of games){
    const key=String(game.opponent?.title||'').trim().toLowerCase(),previous=groups.at(-1);
    const gap=previous?(Date.parse(game.date.slice(0,10))-Date.parse(previous.at(-1).date.slice(0,10)))/86400000:Infinity;
    if(previous&&key&&String(previous[0].opponent?.title||'').trim().toLowerCase()===key&&gap>=0&&gap<=2){previous.push(game);continue;}
    groups.push([game]);
  }
  return groups.map(rounds=>{
    if(rounds.length===1)return rounds[0];
    const first=rounds[0],last=rounds.at(-1),next=rounds.find(round=>round.date.slice(0,10)>=today);
    const shown=next&&first.date.slice(0,10)<today?next:first;
    const scored=[...rounds].reverse().find(round=>round.result?.postscore_info||round.result?.prescore_info||round.result?.recap?.url);
    return{...shown,date:first.date,enddate:last.date,result:scored?.result||null};
  });
}
// "9th (+4, 844)", "T7th (-32, 832)", "3rd (-5, 845)": place, score to par
// and total.
export function baylorGolfPlacing(value){
  const m=String(value||'').trim().match(/^(T)?(\d{1,3})(?:st|nd|rd|th)\s*\(\s*([+-]\d+|E|Even)\s*,\s*(\d{3,4})\s*\)$/i);
  return m?{tied:Boolean(m[1]),place:Number(m[2]),par:/^e/i.test(m[3])?0:Number(m[3]),total:m[4]}:null;
}

export function createBaylorHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:'baylor',host:HOST,sports:baylorSchool.pageDataSports,squadSports:baylorSchool.combinedSports,
    today:baylorToday,
    merge:(sport,games,today)=>sport==='Golf'?mergeRounds(games,today):games,
    opponent(game){
      const opponent=baylorOpponent(game.opponent?.title);
      // A tournament game whose opponent is not yet known ("TBD") is named
      // after its tournament ("Getterman Classic").
      const tournament=String(game.tournament?.title||'').replace(/\s+presented by\b.*$/i,'').trim();
      const named=/^TB[AD]$/i.test(opponent)&&tournament?tournament
        // A championship listed by its conference or body ("Big 12", "NCEA")
        // is named after the event ("Big 12 Equestrian Championship").
        :game.type==='P'&&tournament&&tournament.toLowerCase().startsWith(`${opponent.toLowerCase()} `)?tournament:opponent;
      return!named||/^TB[AD]$/i.test(named)||INTERNAL.test(named)?'':named;
    },
    // Acrobatics & tumbling scores have decimals ("277.415-256.590").
    score:/^\d+(?:\.\d+)?$/,
    result(event,{sport,meet,final,placing}){
      const golf=sport==='Golf'?baylorGolfPlacing(placing):null;
      if(golf&&final){
        const value=`${golf.tied?'T':''}${ordinal(golf.place)} (${golf.total})`;
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
        event.golf_par=golf.par;
      }else if(meet&&final&&sport!=='Golf'){
        // Women first, as K-State's: "Women's team: 3rd / Men's team: 4th".
        // TFRRS adds the points and races (attachMeetResults).
        // Track writes them several ways: "Women T7th (16); Men 11th (of 13)",
        // "Women T-21st (11 points)", "M 10th of 13 (37 points)".
        const places={};
        for(const m of placing.matchAll(/\b(Men|Women|M|W)\b\s*:?\s*(T-?)?(\d{1,3})(?:st|nd|rd|th)(?:\s+of\s+\d+)?(?:\s*\((?:of\s+\d+|(\d+(?:\.\d+)?)\s*points?|\d+)\))?/gi)){
          const team=/^w/i.test(m[1])?'Women':'Men';
          places[team]??=`${m[2]?'T':''}${ordinal(m[3])}${m[4]?` \u00b7 ${m[4]} pts`:''}`;
        }
        const teams=['Women','Men'].filter(name=>places[name]);
        event.headline=teams.length?teams.map(name=>`${name}'s team: ${places[name]}`).join(' / '):'Completed';
        event.results=teams.length?teams.map(name=>({group:`${name}'s Team`,participant:'Baylor team',result:places[name]})):[{label:'Result',value:'Completed'}];
        event.result_count=event.results.length;
      }
    },
    // The result's recap, or a schedule file titled "Recap".
    recapLinks:(game,result)=>[result?.recap?.url,...(game.media?.gamefiles||[]).filter(file=>/^recap$/i.test(String(file?.gamefileTitle||'').trim())).map(file=>file.gamefileLink)],
    // The women's Rice Invitational has no story, so it is not listed.
    tennisNeedsStory:true,
    gameNumber(game,games,{firstDay}){
      const sameDay=games.filter(other=>other.date.slice(0,10)===firstDay&&baylorOpponent(other.opponent?.title)===baylorOpponent(game.opponent?.title));
      return sameDay.length>1?sameDay.indexOf(game)+1:0;
    }
  },{makeEvent,eventType});
  // The card's own recap link is checked by the shared matcher. Any other
  // candidate must also name the opponent in its headline: Baylor's stories
  // name the next opponent ("WHAT'S NEXT ... against Georgia Southern") and
  // their dateline ("HONOLULU, Hawaii"), so on a tournament day the shared
  // matcher took each Aug 30 story for the other match.
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='baylor')return false;
    // A golf story already verified against the schedule's place, score to
    // par and last day (attachGolfStory); it may name the event differently.
    if(url&&url===event.golf_story_verified&&url===event.recap_url)return true;
    // The card's own recap link: a multi-day event (a tennis tournament, Sep
    // 19-27) is recapped on its last day.
    if(url&&url===event.recap_url&&event.end_time&&recapMatchesEvent(raw,{...event,start_time:event.end_time.replace(/T.*$/,'T12:00:00.000Z')},url))return true;
    if(!recapMatchesEvent(raw,event,url))return false;
    if(url&&url===event.recap_url)return true;
    // A men's or women's event refuses the other team's story
    // ("/news/2026/9/27/womens-tennis-..." for the men's ITA All-Americans).
    const slug=String(url||'').split('/').pop().toLowerCase();
    if(event.team_label==="Men's"&&/^(?:womens|wgolf|wt|wbb)-/.test(slug)||event.team_label==="Women's"&&/^(?:mens|mgolf|mt|mbb)-/.test(slug))return false;
    const key=value=>` ${String(value).toLowerCase().replace(/&amp;|&#38;/g,'&').replace(/&#x27;|&#39;|\u2019/g,"'").replace(/[^a-z0-9&']+/g,' ').trim()} `;
    const opponent=key(String(event.opponent||'').replace(/\(.*?\)/g,' ')).trim();
    return opponent.length>=2&&key(baylorStoryHeadline(raw)).includes(` ${opponent} `);
  }
  // A golf final whose schedule links no story (the women's Charleston
  // Intercollegiate) takes Baylor's story from the team's golf archive: dated
  // on the last day, about golf, and stating the schedule's own place and
  // score to par ("a third-place finish ... at 5-under" for "3rd (-5, 845)").
  // The story may name the event differently ("Cougar Classic").
  const isBaylorGolfWithoutStory=event=>event?.school_id==='baylor'&&event.sport==='Golf'&&event.status==='Final'&&!event.recap_url&&Number.isFinite(event.golf_par);
  async function attachGolfStory(event){
    if(!isBaylorGolfWithoutStory(event))return event;
    const team=event.team_label==="Men's"?'mens':event.team_label==="Women's"?'womens':(String(event.source?.url||'').match(/\/sports\/(mens|womens)-golf\//)||[])[1];if(!team)return event;
    const listing=await download(`https://${HOST}/sports/${team}-golf/archives`);if(!listing)return event;
    const [year,month,day]=String(event.end_time||event.start_time).slice(0,10).split('-').map(Number);
    const dated=new RegExp(`/news/${year}/0?${month}/0?${day}/[a-z0-9-]*golf[a-z0-9-]*`,'gi');
    const place=Number(String(event.headline).match(/^T?(\d+)/)?.[1]);
    const words=['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','13th','14th','15th','16th','17th','18th','19th','20th'];
    const par=event.golf_par===0?/\beven[- ]par\b/i:new RegExp(`\\b${Math.abs(event.golf_par)}-${event.golf_par<0?'under':'over'}\\b`,'i');
    for(const path of [...new Set(listing.replace(/\\u002F/gi,'/').match(dated)||[])].slice(0,4)){
      const url=`https://${HOST}${path}`,raw=await download(url);if(!raw)continue;
      const story=decodeHtml((raw.match(/<div\b[^>]*id=["']story-[\s\S]*?(?=<div\b[^>]*class=["'][^"']*related|$)/i)?.[0]||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
      const placed=new RegExp(`\\b(?:${ordinal(place)}|${words[place]||ordinal(place)})(?:[- ]place)?\\b`,'i');
      if(/\bfinish/i.test(story)&&placed.test(story)&&par.test(story)){event.recap_url=url;event.golf_story_verified=url;return event;}
    }
    return event;
  }
  const isBaylorCrossCountry=event=>event?.school_id==='baylor'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  // Feed and expanded view both call this; the second call is a no-op. The
  // races come from TFRRS: the meet is found on each team's TFRRS page by
  // date and name; a team place the schedule publishes must agree.
  async function attachMeetResults(event){
    if(!isBaylorCrossCountry(event)||event.meet_results_verified)return event;
    const unavailable=status=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';event.highlight_status=status;
      return event;
    };
    const failed='Official race results could not be loaded. Open the official results.';
    const date=String(event.start_time).slice(0,10);
    const pages=new Map();
    for(const team of ['Women','Men']){
      const listing=await download(BAYLOR_TFRRS_TEAMS[team]);if(!listing)continue;
      const url=findBaylorTfrrsMeet(listing,{decodeHtml,date,name:event.opponent});
      if(url&&!pages.has(url))pages.set(url,team);
    }
    if(!pages.size)return unavailable('No results for this meet are published on TFRRS yet.');
    const races=[];let resultsUrl=null;
    for(const url of pages.keys()){
      const page=await download(url);if(!page)return unavailable(failed);
      for(const race of parseBaylorTfrrsResults(page,{decodeHtml,ordinal}))if(!races.some(other=>other.group===race.group))races.push(race);
      resultsUrl??=url;
    }
    races.sort((a,b)=>(a.team==='Women'?0:1)-(b.team==='Women'?0:1));
    if(!races.length)return unavailable(failed);
    // A team place the schedule publishes must agree with TFRRS's.
    const published=Object.fromEntries([...String(event.headline||'').matchAll(/\b(Men|Women)'s team: (T?\d+)\w\w/g)].map(m=>[m[1],m[2]]));
    for(const race of races)if(race.result&&published[race.team]&&published[race.team]!==String(race.result.place))return unavailable(failed);
    const rows=[],headline=[],lines=[];
    for(const race of races){
      if(race.result){
        const value=`${ordinal(race.result.place)} \u00b7 ${race.result.score} pts`;
        rows.push({group:race.group,participant:'Baylor team',result:value});
        if(!headline.some(line=>line.startsWith(`${race.team}'s team:`)))headline.push(`${race.team}'s team: ${value}`);
        lines.push(`Baylor's ${race.team.toLowerCase()} placed ${ordinal(race.result.place)} with ${race.result.score} points.`);
      }
      rows.push(...race.runners.map(runner=>({group:race.group,participant:runner.participant,result:runner.result})));
    }
    // Without a team score (too few runners), the headline names each team's
    // first finisher: "Women's: Lucy Benton 68th / Men's: Matthew King 36th".
    for(const team of ['Women','Men'])if(!headline.some(line=>line.startsWith(`${team}'s`))){
      const race=races.find(race=>race.team===team&&!race.result);const [first]=race?.runners||[];
      if(first)headline.push(`${team}'s: ${first.participant} ${/^\d+$/.test(first.place)?ordinal(first.place):first.place}`);
    }
    headline.sort((a,b)=>(a.startsWith('Women')?0:1)-(b.startsWith('Women')?0:1));
    event.headline=headline.join(' / ');
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.recap_result_count=rows.length;
    // The source link stays on baylorbears.com (the official recap, or the
    // schedule); the TFRRS page is kept beside it. Not result_url: that would
    // start the shared generic TFRRS enrichment.
    event.results_source_url=resultsUrl;
    event.source={...event.source,name:event.recap_url?'Official athletics meet recap; results from TFRRS':'Official athletics schedule; results from TFRRS',url:event.recap_url||event.source?.url};
    // Highlights only from the verified rows: each team finish, then each
    // race's first Baylor finisher, then the next finishers (certification
    // asks for three).
    for(const race of races){const [leader]=race.runners;if(leader)lines.push(`${leader.participant} led Baylor in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}, finishing ${leader.result.replace(' \u00b7 ',' in ')}.`);}
    for(let i=1;lines.length<4&&races.some(race=>race.runners[i]);i++)for(const race of races){const runner=race.runners[i];if(runner&&lines.length<4)lines.push(`${runner.participant} finished ${runner.result.replace(' \u00b7 ',' in ')} in the ${race.group.replace(/^\w+/,word=>word.toLowerCase())}.`);}
    event.highlights=lines.slice(0,4);
    event.highlights_verified=true;event.meet_results_verified=true;
    event.highlight_state='official_recap_results';event.highlight_status=null;
    return event;
  }
  return{parseSchedule,isEmptySchedule,matchesRecap,isBaylorCrossCountry,attachMeetResults,isBaylorGolfWithoutStory,attachGolfStory};
}
