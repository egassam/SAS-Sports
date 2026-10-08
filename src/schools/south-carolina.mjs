import {createRecapMatcher,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';

// South Carolina school module. Shared publisher utilities stay in the Worker;
// this file owns gamecocksonline.com routes, South Carolina's program
// combinations, its verified Instagram tags and its schedule reader (the
// site is WMT's WordPress template, not SIDEARM: see the reader below).
export const southCarolinaSchool={
  id:'south-carolina',
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set(['Baseball','Basketball','Beach Volleyball','Cross Country','Equestrian','Football','Golf','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team. Track and swimming publish one page for both.
  combinedSports:new Set(['Basketball','Golf','Soccer','Tennis']),
  // The pages' addresses use the site's sport codes (mbball, wgolf).
  teamLabels:{'/sports/mbball/schedule/':"Men's",'/sports/wbball/schedule/':"Women's",'/sports/mgolf/schedule/':"Men's",'/sports/wgolf/schedule/':"Women's",'/sports/msoc/schedule/':"Men's",'/sports/wsoc/schedule/':"Women's",'/sports/mten/schedule/':"Men's",'/sports/wten/schedule/':"Women's"},
  // Every profile page's menu lists the school's team accounts before the
  // athlete's own link: they are never an athlete's.
  blockedInstagramHandles:['gamecockbaseball','gamecockbeachvb','gamecockeq','gamecockfb','gamecockmbb','gamecockmgolf','gamecockmsoccer','gamecockmtennis','gamecocksoftball','gamecocksonline','gamecockswmdive','gamecocktrackxc','gamecockvb','gamecockwbb','gamecockwgolf','gamecockwsoccer','gamecockwtennis'],
  verifiedInstagrams:{},
  scheduleUrls:{
    'south-carolina|Baseball':'https://gamecocksonline.com/sports/baseball/schedule/',
    'south-carolina|Basketball':['https://gamecocksonline.com/sports/mbball/schedule/','https://gamecocksonline.com/sports/wbball/schedule/'],
    'south-carolina|Beach Volleyball':'https://gamecocksonline.com/sports/bvball/schedule/',
    'south-carolina|Cross Country':'https://gamecocksonline.com/sports/wcross/schedule/',
    'south-carolina|Equestrian':'https://gamecocksonline.com/sports/equestrian/schedule/',
    'south-carolina|Football':'https://gamecocksonline.com/sports/football/schedule/',
    'south-carolina|Golf':['https://gamecocksonline.com/sports/mgolf/schedule/','https://gamecocksonline.com/sports/wgolf/schedule/'],
    'south-carolina|Soccer':['https://gamecocksonline.com/sports/msoc/schedule/','https://gamecocksonline.com/sports/wsoc/schedule/'],
    'south-carolina|Softball':'https://gamecocksonline.com/sports/softball/schedule/',
    'south-carolina|Swimming & Diving':'https://gamecocksonline.com/sports/swimming/schedule/',
    'south-carolina|Tennis':['https://gamecocksonline.com/sports/mten/schedule/','https://gamecocksonline.com/sports/wten/schedule/'],
    'south-carolina|Track & Field':'https://gamecocksonline.com/sports/track/schedule/',
    'south-carolina|Volleyball':'https://gamecocksonline.com/sports/wvball/schedule/'
  },
  rosterUrls:{
    'south-carolina|Baseball':'https://gamecocksonline.com/sports/baseball/roster/',
    'south-carolina|Basketball':['https://gamecocksonline.com/sports/mbball/roster/','https://gamecocksonline.com/sports/wbball/roster/'],
    'south-carolina|Beach Volleyball':'https://gamecocksonline.com/sports/bvball/roster/',
    'south-carolina|Cross Country':'https://gamecocksonline.com/sports/wcross/roster/',
    'south-carolina|Equestrian':'https://gamecocksonline.com/sports/equestrian/roster/',
    'south-carolina|Football':'https://gamecocksonline.com/sports/football/roster/',
    'south-carolina|Golf':['https://gamecocksonline.com/sports/mgolf/roster/','https://gamecocksonline.com/sports/wgolf/roster/'],
    'south-carolina|Soccer':['https://gamecocksonline.com/sports/msoc/roster/','https://gamecocksonline.com/sports/wsoc/roster/'],
    'south-carolina|Softball':'https://gamecocksonline.com/sports/softball/roster/',
    'south-carolina|Swimming & Diving':'https://gamecocksonline.com/sports/swimming/roster/',
    'south-carolina|Tennis':['https://gamecocksonline.com/sports/mten/roster/','https://gamecocksonline.com/sports/wten/roster/'],
    'south-carolina|Track & Field':'https://gamecocksonline.com/sports/track/roster/',
    'south-carolina|Volleyball':'https://gamecocksonline.com/sports/wvball/roster/'
  }
};

const HOST='gamecocksonline.com';
// South Carolina's TFRRS cross country team pages (complete races and team scores).
export const SOUTH_CAROLINA_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/SC_college_f_South_Carolina.html',Men:null};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EVENT_NAME=/\b(?:invit\w*|invite|opener|challenge|classic|championships?|open|relays|collegiate|intercollegiate|tournament|festival|cup|qualifier|regionals?|tradition|throwdown|meet)\b/i;
// Internal events: Garnet & Black games, intrasquads and scrimmages.
const INTERNAL=/\bgarnet\s*(?:&|and)\s*black\b|\bintrasquad\b|\bscrimmage\b/i;
// The tennis pages list players' pro events ("ITF M15", "ITF W50
// Lexington"): not the team's.
const PRO_EVENT=/^(?:ITF|ATP|WTA|UTR)\b|\bChallenger\b|\bFutures\b|^US Open Junior|^[WM]\d{2,3}\b/i;
// A conference game is marked after the opponent: "(SEC)", men's soccer's
// "(Sun Belt)".
const CONFERENCE=/\((SEC|Sun Belt|Big 12|ACC|Big Ten|CAA|Coastal Collegiate)\)/i;
const easternDay=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
const ordinalSuffix=n=>n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';
const place=(tie,n)=>`${tie?'T':''}${n}${ordinalSuffix(n)}`;

// A golf round's standing with the team score: "12th, 842 (+2)", "t-4th, 551
// (-17)", "5th, 864 (E)"; the last round's is the tournament's.
export function southCarolinaGolfPlace(text){
  const m=String(text||'').trim().match(/^(T-?)?(\d+)(?:st|nd|rd|th)?,\s*(\d{3,4})(?:\s*\(([+-]?\d+|E)\))?$/i);
  if(!m)return null;
  const value=place(m[1],Number(m[2]));
  return{headline:value,results:[{label:'Result',value},{label:'Team score',value:m[4]?`${m[3]} (${m[4]})`:m[3]}]};
}

// Each team's place: cross country's "1st/13" (the women's team, of 13), track's
// "M: 11th | W: 5th" ("--" when a team scored no points).
export function southCarolinaTeamPlaces(text,sport){
  const value=String(text||'').trim();
  const fielded=value.match(/^(T-?)?(\d+)(?:st|nd|rd|th)?\/(\d+)$/i);
  if(fielded&&sport==='Cross Country'){const result=`${place(fielded[1],Number(fielded[2]))} of ${fielded[3]}`;return{headline:`Women's team: ${result}`,results:[{label:"Women's team",value:result}]};}
  const rows=[];
  for(const part of value.split(/\s*\|\s*/)){
    const m=part.match(/^([MW]):\s*(?:(T-?)?(\d+)(?:st|nd|rd|th)|--)$/i);if(!m)return null;
    if(m[3])rows.push({team:m[1].toUpperCase()==='W'?"Women's":"Men's",value:place(m[2],Number(m[3]))});
  }
  if(!rows.length)return null;
  rows.sort((x,y)=>x.team<y.team?1:-1);
  return{headline:rows.map(row=>`${row.team} team: ${row.value}`).join(' / '),results:rows.map(row=>({label:`${row.team} team`,value:row.value}))};
}

// A swimming dual per team: "Women: W 250-50; Men: W 165-135" (South
// Carolina's score first).
export function southCarolinaSwimDuals(text){
  const rows=[];
  for(const part of String(text||'').split(/\s*;\s*/)){
    const m=part.match(/^(Women|Men):\s*([WLT])\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/i);if(!m)return null;
    rows.push({team:`${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}'s`,value:`${m[2].toUpperCase()}, ${Number(m[3])}-${Number(m[4])}`});
  }
  if(!rows.length)return null;
  rows.sort((x,y)=>x.team<y.team?1:-1);
  return{headline:rows.map(row=>`${row.team} team: ${row.value}`).join(' / '),results:rows.map(row=>({group:`${row.team} Team`,participant:'South Carolina team',result:row.value}))};
}

// gamecocksonline.com is WMT's WordPress template (not Kentucky's): each
// event is a div.event.schedule-table_row with the venue (home/away/neutral)
// and its start as a Unix time (data-order), the day ("Sat Sep 5", "Fri Oct
// 16 - Sat Oct 17") and time ("7:00 pm", "TBA", "All Day"), "vs."/"at", the
// opponent in a strong (after any promotion: "Salute the Troops"), a result
// slot ("W 57-0", South Carolina's score first; a golf round's place, a
// cross country or track place, a swimming dual per team) and the links
// ("Recap"). Stories live at /news/<y>/<m>/<d>/<slug>/.
export function createSouthCarolinaHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  const items=raw=>String(raw).split(/<div data-aos="fade-up" class="event schedule-table_row\s*/).slice(1).map(part=>part.split(/<\/ul>\s*<\/div>\s*<\/section>|<section\b|<footer\b/)[0]);
  const storyUrl=(href,sourceUrl)=>{
    const url=absoluteUrl(decodeHtml(href),sourceUrl);let parsed;try{parsed=new URL(url);}catch{return null;}
    if(parsed.protocol!=='https:'||parsed.hostname!==HOST||!/^\/news\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/?$/.test(parsed.pathname))return null;
    return `https://${HOST}${parsed.pathname.replace(/\/?$/,'/')}`;
  };
  // The card's story: its "Recap" link (the postgame link); a meet over two
  // days links "Day One Recap", "Day Two Recap" and takes the last.
  function cardRecap(block,sourceUrl){
    const links=block.split('schedule-list__bottom')[1]||'';let found=null;
    for(const [,attrs,label] of links.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
      const text=visibleText(label);
      if(!/schedule-event-link--postgame/.test(attrs)&&!/\brecap$/i.test(text))continue;
      const href=(attrs.match(/href="([^"]*)"/)||[])[1];const url=href&&storyUrl(href,sourceUrl);
      if(url){if(!/^Day\b/i.test(text))return url;found=url;}
    }
    return found;
  }

  // Round cards of one tournament (one name, each day at most two days after
  // the one before) become one event from its first to its last day. A
  // finished tournament takes the last round's place and story; one under way
  // is today's event. Golf's match-play final ("vs. Wake Forest", the
  // Stephens Cup's third day) closes the tournament before it.
  function mergeDays(events,today){
    const groups=[];
    for(const event of events){
      const day=Date.parse(event.start_time.slice(0,10));
      const close=g=>day-Date.parse(String(g.at(-1).end_time||g.at(-1).start_time).slice(0,10))<=2*86400000;
      const group=event.round_of&&groups.find(g=>g[0].round_of===event.round_of&&close(g))
        ||event.final_match&&groups.at(-1)?.[0].round_of&&close(groups.at(-1))&&groups.at(-1);
      if(group)group.push(event);else groups.push([event]);
    }
    return groups.map(days=>{
      const first=days[0],last=days.at(-1);
      for(const event of days){delete event.round_of;delete event.final_match;}
      if(days.length===1)return first;
      const end=String(last.end_time||last.start_time).slice(0,10);
      const finished=Date.parse(end)<today;
      const event={...first,end_time:`${end}T23:59:59Z`};
      const story=[...days].reverse().find(day=>day.recap_url)?.recap_url;
      if(finished){
        event.status='Final';event.priority_bucket=last.priority_bucket;event.recency_label=last.recency_label;
        for(const key of ['headline','results','result_count','event_type'])if(last[key]!==undefined)event[key]=last[key];
        for(const key of ['final_opponent','school_score','opponent_score'])if(last.final_opponent&&last[key]!==undefined)event[key]=last[key];
        if(story)event.recap_url=story;else delete event.recap_url;
      }else if(Date.parse(first.start_time.slice(0,10))<=today){
        for(const key of ['headline','results','result_count','recap_url'])delete event[key];
        event.status='Today';event.priority_bucket='today';event.recency_label='In progress';
        event.id=event.id.replace(/-(?:final|upcoming|today)$/,'-today');
      }
      return event;
    });
  }

  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='south-carolina'||!southCarolinaSchool.cardSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||!/^\/sports\/[a-z]+\/schedule\/?$/.test(page.pathname))return null;
    raw=String(raw||'');
    const cards=items(raw);if(!cards.length)return null;
    const local=easternDay(now.getTime()),today=Date.parse(`${local}T00:00:00Z`);
    // Only the current academic year (July-June) is this season; a page still
    // showing last season (track, beach volleyball) is a valid empty schedule
    // until the new one is published.
    const seasonStart=Date.UTC(Number(local.slice(5,7))>=7?Number(local.slice(0,4)):Number(local.slice(0,4))-1,6,1);
    const meet=eventType(sport)!=='GAME',events=[],seen=new Map();
    // Conference games are marked on the page; a page that marks none leaves
    // the record to the conference list.
    const opponentBox=block=>field(block,/schedule-list__opponent">([\s\S]*?)<\/div>/i);
    const marked=cards.some(block=>CONFERENCE.test(opponentBox(block)));
    for(const block of cards){
      const order=Number((block.match(/data-order="(\d+)"/)||[])[1]);
      const when=field(block,/<time>([\s\S]*?)<\/time>/i);
      const days=[...when.matchAll(/\b([A-Z][a-z]{2})\s+(\d{1,2})\b/g)].map(m=>({month:MONTHS.indexOf(m[1])+1,day:Number(m[2])})).filter(d=>d.month);
      if(!order||!days.length)continue;
      // The card's day is written out; the year is the one whose day lies
      // nearest the card's start time (a TBA start is midnight UTC).
      const year=[-1,0,1].map(d=>new Date(order*1000).getUTCFullYear()+d).sort((a,b)=>Math.abs(Date.UTC(a,days[0].month-1,days[0].day)-order*1000)-Math.abs(Date.UTC(b,days[0].month-1,days[0].day)-order*1000))[0];
      const firstDay=Date.UTC(year,days[0].month-1,days[0].day);
      const end=days[1]||days[0],lastDay=Date.UTC(year+(end.month<days[0].month?1:0),end.month-1,end.day);
      if(firstDay<seasonStart)continue;
      const venue=(block.match(/^(home|away|neutral)\b/)||[])[1]||'';
      const teams=(block.match(/schedule-list__teams">([\s\S]*?)<div class="schedule-list__location/i)||[])[1]||'';
      const divider=visibleText((teams.match(/<span>\s*(vs\.?|at)\s*<\/span>/i)||[])[1]||'');
      // The opponent's strong is followed by its marks: "(EXH)", "(SEC)".
      let name=field(block,/schedule-list__opponent">[\s\S]*?<strong>([\s\S]*?)<\/strong>/i);
      const marks=opponentBox(block);
      const exhibition=/\(EXH\)/i.test(marks);
      const conference=(marks.match(CONFERENCE)||[])[1]||null;
      if(!name||/^TB[AD]$/i.test(name)||INTERNAL.test(name))continue;
      if(sport==='Tennis'&&PRO_EVENT.test(name))continue;
      const resultText=field(block,/schedule-list__result">([\s\S]*?)<\/div>/i);
      if(/^(?:cancel+ed|postponed)\b/i.test(resultText))continue;
      // "W 57-0", "L 34-35 (OT)", "T 1-1"; equestrian's tiebreaker "W 5-5".
      const game=resultText.match(/^([WLT])\s+(\d+)\s*-\s*(\d+)(\s*\([^)]*\))?$/);
      // A game two days past without a published result is neither a final
      // nor upcoming. Yesterday's stays: a night game can run past midnight.
      if(!meet&&!game&&lastDay<today-86400000)continue;
      const over=meet&&!game&&lastDay<today;
      const clock=(when.match(/\b(\d{1,2}:\d{2})\s*([ap])\.?m\.?/i)||[]);
      const time=clock[1]?`${clock[1]} ${clock[2].toUpperCase()}M`:null;
      // Golf's round cards: "Visit Knoxville Collegiate R1 & R2", "... R3",
      // "SEC Championships Match Play".
      const tournament=sport==='Golf'?name.replace(/\s+(?:R\d(?:\s*&\s*R\d)*|Match Play)$/i,'').trim():name;
      let opponent=meet&&!game?tournament:name;
      if(exhibition)opponent=`${opponent} (Exhibition)`;
      // Golf, cross country and track are always away meets; a home dual
      // (swimming, equestrian, tennis) follows its venue.
      // A conference tournament's placeholder ("vs. SEC Tournament") is "at".
      const relation=venue==='away'||/\bTournament$/i.test(opponent)||eventType(sport)==='MEET'&&!game||meet&&!game&&(venue==='neutral'||EVENT_NAME.test(opponent))?'at':'vs';
      const recapUrl=game||over?cardRecap(block,sourceUrl):null;
      const [us,them]=game?[game[2],game[3]]:[null,null];
      const event=makeEvent({school,sport,status:game||over?'Final':'Upcoming',relation,opponent,date:`${MONTHS[days[0].month-1]} ${days[0].day}, ${year}`,
        // K-State's results show the date only; upcoming games show the published time.
        time:game||over?null:time,schoolScore:us,oppScore:them,resultText:game?`${game[1]}, ${us}-${them}${game[4]?` ${game[4].trim()}`:''}`:null,sourceUrl,now});
      if(lastDay>firstDay)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      if(over)writeMeetResult(event,sport,resultText);
      if(recapUrl)event.recap_url=recapUrl;
      if(game&&!meet&&marked&&!exhibition){event.conference_game=Boolean(conference);if(conference&&!/^SEC$/i.test(conference))event.conference_name=conference;}
      if(meet&&!game)event.round_of=opponent;
      if(sport==='Golf'&&game){event.final_match=true;event.final_opponent=name;}
      // The same opponent twice in a day (beach volleyball, equestrian) is two events.
      const count=(seen.get(event.id)||0)+1;seen.set(event.id,count);
      if(count>1)event.id=`${event.id}-${count}`;
      events.push(event);
    }
    // A past tennis tournament (no team result) is listed only with its
    // story, as K-State's.
    const merged=(meet?mergeDays(events,today):events).filter(event=>!(event.sport==='Tennis'&&event.status==='Final'&&!event.recap_url&&event.headline==='Completed'));
    // A golf tournament closed by its match-play final reads as the final's
    // result: "Won final vs. Wake Forest, 3-2".
    for(const event of merged)if(event.sport==='Golf'&&event.final_opponent){
      if(event.opponent!==event.final_opponent){const value=`${/^W/.test(event.headline||'')?'Won':/^L/.test(event.headline||'')?'Lost':'Tied'} final vs. ${event.final_opponent}, ${event.school_score}-${event.opponent_score}`;
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
        event.school_score=null;event.opponent_score=null;}
      delete event.final_opponent;
    }
    if(!merged.length)emptied.add(merged);
    return merged;
  }
  // A finished meet's result: golf's place and team score, each team's place
  // (cross country, track), a swimming dual per team; otherwise "Completed"
  // ("NTS", no team score).
  function writeMeetResult(event,sport,text){
    const value=sport==='Golf'?southCarolinaGolfPlace(text):sport==='Swimming & Diving'?southCarolinaSwimDuals(text):southCarolinaTeamPlaces(text,sport);
    if(value){
      event.headline=value.headline;event.results=value.results;event.result_count=value.results.length;
      if(sport==='Swimming & Diving')event.event_type='MEET';
      return;
    }
    event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;
  }
  const emptied=new WeakSet();
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptied.has(events);

  const matchesRecap=createRecapMatcher({id:'south-carolina',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true,ownLinkDays:2});
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/<[^>]+>/g,' ').replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  // A final whose card links no story takes one from the site's news search
  // (the site files stories under no sport): published from the event's
  // first day to three days after its last, naming the sport, the opponent
  // and, for a game, the score (a tie: the score or "draw").
  const SPORT_WORDS={'Baseball':/\bbaseball\b/,'Basketball':/\bbasketball\b|\bhoops\b/,'Cross Country':/\bcross country\b|\bxc\b/,'Football':/\bfootball\b/,'Golf':/\bgolf\b/,'Beach Volleyball':/\bbeach\b/,'Equestrian':/\bequestrian\b/,'Soccer':/\bsoccer\b/,'Softball':/\bsoftball\b/,'Swimming & Diving':/\bswim|\bdiv(?:e|ing)\b/,'Tennis':/\btennis\b/,'Track & Field':/\btrack\b/,'Volleyball':/\bvolleyball\b/};
  const meetLike=event=>event.event_type!=='GAME'&&!/^\d+$/.test(String(event.school_score??''));
  const isMeetWithoutStory=event=>event?.school_id==='south-carolina'&&meetLike(event)&&event.status==='Final'&&!event.recap_url;
  const isFinalWithoutStory=event=>isMeetWithoutStory(event)||event?.school_id==='south-carolina'&&event.status==='Final'&&!event.recap_url&&!/\(Exhibition\)/.test(event.opponent||'')&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  const GENERIC=new Set(['invitational','invite','classic','collegiate','intercollegiate','championship','championships','open','festival','tournament','cup','the','at','and','of','sec','ncaa','regional','region','meet','day','game','results','individual']);
  async function attachArchiveStory(event){
    if(!isFinalWithoutStory(event))return event;
    const sportWord=SPORT_WORDS[event.sport];if(!sportWord)return event;
    const opponent=headlineKey(event.opponent).trim();
    const words=opponent.split(' ').filter(word=>word.length>=4&&!GENERIC.has(word));
    const search=(words.length?words:opponent.split(' ')).join(' ');if(!search)return event;
    const first=Date.parse(`${event.start_time.slice(0,10)}T00:00:00Z`),last=Date.parse(`${String(event.end_time||event.start_time).slice(0,10)}T00:00:00Z`);
    const iso=t=>new Date(t).toISOString().slice(0,19);
    const listing=await download(`https://${HOST}/wp-json/wp/v2/posts?search=${encodeURIComponent(search)}&after=${iso(first-86400000)}&before=${iso(last+4*86400000)}&per_page=20&_fields=link,title,excerpt,date`);
    let posts;try{posts=JSON.parse(listing||'[]');}catch{return event;}
    if(!Array.isArray(posts))return event;
    const [a,b]=[String(event.school_score),String(event.opponent_score)];
    const score=new RegExp(`(?<![\\d-])(?:${a}-${b}|${b}-${a})(?![\\d-])`);
    // Older first: the result story precedes later notes.
    for(const post of [...posts].reverse()){
      const url=storyUrl(post?.link||'',`https://${HOST}/`);if(!url)continue;
      const title=headlineKey(post?.title?.rendered),text=`${title} ${headlineKey(post?.excerpt?.rendered)} ${url.replace(/[^a-z0-9]+/g,' ')} `;
      if(/\b(?:preview|next challenge|hosts?|set to|heads? to|travel|travels|tickets?)\b/.test(title)||!sportWord.test(text))continue;
      if(meetLike(event)){
        if(words.length&&words.every(word=>text.includes(` ${word}`))){event.recap_url=url;event.archive_story_verified=url;return event;}
        continue;
      }
      if(text.includes(` ${opponent} `)&&(score.test(decodeHtml(`${post?.title?.rendered} ${post?.excerpt?.rendered}`))||a===b&&/\b(?:draw|draws|tie|tied|scoreless)\b/.test(text))){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  // One cross country page for both teams; TFRRS gives each team's race.
  const tfrrs=createTfrrsMeetResults({id:'south-carolina',schoolName:'South Carolina',teams:SOUTH_CAROLINA_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  // A finished meet with neither a place nor a story (tennis's individual
  // tournaments) is not listed; cross country takes TFRRS's results.
  const isUnlisted=event=>isMeetWithoutStory(event)&&event.sport!=='Cross Country'&&event.headline==='Completed';
  return{parseSchedule,isEmptySchedule,matchesRecap,isMeetWithoutStory,isUnlisted,isFinalWithoutStory,attachArchiveStory,
    isCrossCountry:event=>event?.school_id==='south-carolina'&&tfrrs.matches(event),attachMeetResults:event=>tfrrs.attach(event)};
}
