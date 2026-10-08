import {createRecapMatcher,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';

// Kentucky school module. Shared publisher utilities stay in the Worker;
// this file owns ukathletics.com routes, Kentucky's program combinations, its
// verified Instagram tags and its schedule reader (the site is WMT's
// WordPress template, not SIDEARM: see the reader below).
export const kentuckySchool={
  id:'kentucky',
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set(['Baseball','Basketball','Cross Country','Football','Golf','Gymnastics','Rifle','STUNT','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball']),
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
  // by team. Cross country, track and swimming publish one page for both.
  combinedSports:new Set(['Basketball','Golf','Soccer','Tennis']),
  // The pages' addresses use the site's sport codes (mbball, wgolf).
  teamLabels:{'/sports/mbball/schedule/':"Men's",'/sports/wbball/schedule/':"Women's",'/sports/mgolf/schedule/':"Men's",'/sports/wgolf/schedule/':"Women's",'/sports/msoc/schedule/':"Men's",'/sports/wsoc/schedule/':"Women's",'/sports/mten/schedule/':"Men's",'/sports/wten/schedule/':"Women's"},
  // Sports whose roster cards publish few athlete links: the links their
  // official profile pages publish (scripts/athlete-evidence.mjs, Oct 8).
  verifiedInstagrams:{
    'kentucky|Softball|Gabbie Hensley':'https://www.instagram.com/gabbie.hensley/',
    'kentucky|Softball|Reaghan Oney':'https://www.instagram.com/reaghanoney/',
    'kentucky|Softball|Alexa Riddel':'https://www.instagram.com/alexa_riddel/',
    'kentucky|Tennis|Marina Fuduric':'https://www.instagram.com/marinafuduric/',
    'kentucky|Tennis|Ellie Myers':'https://www.instagram.com/elliemyers77/',
    'kentucky|Tennis|Norina Bak-Szabó':'https://www.instagram.com/bakszabonorcsi/'
  },
  scheduleUrls:{
    'kentucky|Baseball':'https://ukathletics.com/sports/baseball/schedule/',
    'kentucky|Basketball':['https://ukathletics.com/sports/mbball/schedule/','https://ukathletics.com/sports/wbball/schedule/'],
    'kentucky|Cross Country':'https://ukathletics.com/sports/cross/schedule/',
    'kentucky|Football':'https://ukathletics.com/sports/football/schedule/',
    'kentucky|Golf':['https://ukathletics.com/sports/mgolf/schedule/','https://ukathletics.com/sports/wgolf/schedule/'],
    'kentucky|Gymnastics':'https://ukathletics.com/sports/wgym/schedule/',
    'kentucky|Rifle':'https://ukathletics.com/sports/rifle/schedule/',
    'kentucky|STUNT':'https://ukathletics.com/sports/stunt/schedule/',
    'kentucky|Soccer':['https://ukathletics.com/sports/msoc/schedule/','https://ukathletics.com/sports/wsoc/schedule/'],
    'kentucky|Softball':'https://ukathletics.com/sports/softball/schedule/',
    'kentucky|Swimming & Diving':'https://ukathletics.com/sports/swimming/schedule/',
    'kentucky|Tennis':['https://ukathletics.com/sports/mten/schedule/','https://ukathletics.com/sports/wten/schedule/'],
    'kentucky|Track & Field':'https://ukathletics.com/sports/track/schedule/',
    'kentucky|Volleyball':'https://ukathletics.com/sports/wvball/schedule/'
  },
  rosterUrls:{
    'kentucky|Baseball':'https://ukathletics.com/sports/baseball/roster/',
    'kentucky|Basketball':['https://ukathletics.com/sports/mbball/roster/','https://ukathletics.com/sports/wbball/roster/'],
    'kentucky|Cross Country':'https://ukathletics.com/sports/cross/roster/',
    'kentucky|Football':'https://ukathletics.com/sports/football/roster/',
    'kentucky|Golf':['https://ukathletics.com/sports/mgolf/roster/','https://ukathletics.com/sports/wgolf/roster/'],
    'kentucky|Gymnastics':'https://ukathletics.com/sports/wgym/roster/',
    'kentucky|Rifle':'https://ukathletics.com/sports/rifle/roster/',
    'kentucky|STUNT':'https://ukathletics.com/sports/stunt/roster/',
    'kentucky|Soccer':['https://ukathletics.com/sports/msoc/roster/','https://ukathletics.com/sports/wsoc/roster/'],
    'kentucky|Softball':'https://ukathletics.com/sports/softball/roster/',
    'kentucky|Swimming & Diving':'https://ukathletics.com/sports/swimming/roster/',
    'kentucky|Tennis':['https://ukathletics.com/sports/mten/roster/','https://ukathletics.com/sports/wten/roster/'],
    'kentucky|Track & Field':'https://ukathletics.com/sports/track/roster/',
    'kentucky|Volleyball':'https://ukathletics.com/sports/wvball/roster/'
  }
};

const HOST='ukathletics.com';
// Kentucky's TFRRS cross country team pages (complete races and team scores).
export const KENTUCKY_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/KY_college_f_Kentucky.html',Men:'https://www.tfrrs.org/teams/xc/KY_college_m_Kentucky.html'};
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EVENT_NAME=/\b(?:invit\w*|invite|opener|challenge|classic|championships?|open|relays|collegiate|intercollegiate|tournament|festival|cup|qualifier|regionals?|tradition|throwdown)\b/i;
// Internal events: spring and Blue-White games, Big Blue Madness, swimming's
// "Blue vs. White", intrasquads and scrimmages.
const INTERNAL=/\bspring game\b|\bblue[-\s]white\b|\bblue vs\.? white\b|\bbig blue madness\b|\bintrasquad\b|\bscrimmage\b/i;
// The tennis pages list players' pro and junior events ("ITF M15
// Fayetteville", "ATP Columbus Challenger", "US Open Junior Championships")
// and their individual NCAA matches ("Jack Loutit (UK) vs. ..."): not the
// team's.
const PRO_EVENT=/^(?:ITF|ATP|WTA|UTR)\b|\bChallenger\b|\bFutures\b|^US Open Junior|^[WM]\d{2,3}\b/i;
const INDIVIDUAL_MATCH=/\(UK\)\s+vs\.?\s/i;
// Men's soccer plays in the Sun Belt (the SEC sponsors no men's soccer):
// its conference record counts regular-season games against these members.
const SUN_BELT_MEN_SOCCER=new Set(['Coastal Carolina','Georgia Southern','Georgia State','James Madison','Marshall','Old Dominion','South Carolina','UCF','West Virginia']);
const easternDay=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
const ordinalSuffix=n=>n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th';

// The season the page heading names ("<span>2026-27</span> Men's Golf
// Schedule", "<span>2027</span> Baseball Schedule"); a card shows the month
// and day only ("Sat. Sep 5"). A two-year season puts July-December in its
// first year. A one-year season is that year, except the fall games listed
// before a spring season (baseball's October exhibitions on the 2027 page),
// which are the year before.
export function kentuckySeasonYears(raw,months){
  const m=String(raw).match(/hero__title--schedule"[^>]*>\s*<span>\s*(20\d\d)(?:\s*-\s*(\d\d))?\s*<\/span>/i);
  if(!m)return null;
  const first=Number(m[1]);
  if(m[2])return months.map(month=>month>=7?first:2000+Number(m[2]));
  const wrap=months.findIndex((month,i)=>i>0&&month<months[i-1]-2);
  return months.map((month,i)=>wrap>0&&i<wrap?first-1:first);
}

// A golf place as the cards write it, each day's standing with the team score
// ("17th/17 (572)", "T7th/16 (853)", "T7 (296, +8)", "8th (886, +22)"); the last day's is the tournament's.
export function kentuckyGolfPlace(text){
  const m=String(text||'').trim().match(/^(T-?)?(\d+)(?:st|nd|rd|th)?\s*(?:\/\s*(\d+))?\s*\((\d{3,4})(?:\s*,\s*([+-]?\d+|E))?\)$/i);
  if(!m)return null;
  const n=Number(m[2]),place=`${m[1]?'T':''}${n}${ordinalSuffix(n)}${m[3]?` of ${m[3]}`:''}`;
  return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:m[5]?`${m[4]} (${m[5]})`:m[4]}]};
}

// Each team's place, as cross country and track write it: "M: 3rd (48 pts) /
// W: 2nd (40 pts)", "4th: 63 pts (W) / 13th: 18 pts (M)".
export function kentuckyTeamPlaces(text){
  const team=letter=>letter.toUpperCase()==='W'?"Women's":"Men's",rows=[];
  for(const part of String(text||'').split(/\s*\/\s*/)){
    const a=part.match(/^([MW]):\s*(\d+)(?:st|nd|rd|th)\s*\((\d+)\s*pts?\.?\)$/i),b=part.match(/^(\d+)(?:st|nd|rd|th):\s*(\d+)\s*pts?\.?\s*\(([MW])\)$/i);
    if(a)rows.push({team:team(a[1]),place:Number(a[2]),points:a[3]});else if(b)rows.push({team:team(b[3]),place:Number(b[1]),points:b[2]});else return null;
  }
  if(!rows.length)return null;
  rows.sort((x,y)=>x.team<y.team?1:-1);
  const value=row=>`${row.place}${ordinalSuffix(row.place)} · ${row.points} pts`;
  return{headline:rows.map(row=>`${row.team} team: ${value(row)}`).join(' / '),results:rows.map(row=>({label:`${row.team} team`,value:value(row)}))};
}

// A swimming dual per team: "Women - UF 183, UK 115; Men - UF 194, UK 103".
export function kentuckySwimDuals(text){
  const rows=[];
  for(const part of String(text||'').split(/\s*;\s*/)){
    const m=part.match(/^(Women|Men)\s*-\s*(.+?)\s+(\d+(?:\.\d+)?),\s*(.+?)\s+(\d+(?:\.\d+)?)$/i);if(!m)return null;
    const [mine,theirs]=/^UK$/i.test(m[2])?[m[3],m[5]]:/^UK$/i.test(m[4])?[m[5],m[3]]:[null,null];if(mine==null)return null;
    const outcome=Number(mine)>Number(theirs)?'W':Number(mine)<Number(theirs)?'L':'T';
    rows.push({team:`${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}'s`,value:`${outcome}, ${mine}-${theirs}`});
  }
  if(!rows.length)return null;
  rows.sort((x,y)=>x.team<y.team?1:-1);
  return{headline:rows.map(row=>`${row.team} team: ${row.value}`).join(' / '),results:rows.map(row=>({group:`${row.team} Team`,participant:'Kentucky team',result:row.value}))};
}

// ukathletics.com is WMT's WordPress template: each event is a
// div.schedule__item with the venue (home/away/neutral; "tourney" marks a
// tournament's first card), the day, "vs."/"at", the opponent (with
// "(EXH)"), a result slot that holds the result ("W 45-13", the score in
// either order; "L 3-1" for a volleyball loss), a place or the time, and the
// links ("Recap"). Stories live at /news/<y>/<m>/<d>/<slug>/.
export function createKentuckyHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch,headers}){
  const field=(block,pattern)=>visibleText((block.match(pattern)||[])[1]||'');
  const items=raw=>String(raw).split(/<div class="schedule__item /).slice(1).map(part=>part.split(/<section\b|<footer\b/)[0]);
  const storyUrl=(href,sourceUrl)=>{
    const url=absoluteUrl(decodeHtml(href),sourceUrl);let parsed;try{parsed=new URL(url);}catch{return null;}
    if(parsed.protocol!=='https:'||parsed.hostname!==HOST||!/^\/news\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/?$/.test(parsed.pathname))return null;
    return `https://${HOST}${parsed.pathname.replace(/\/?$/,'/')}`;
  };
  // The card's story: the "Recap" link (the postgame link, or a link
  // labeled Recap).
  function cardRecap(block,sourceUrl){
    const links=block.split('schedule-item__bottom')[1]||'';
    for(const [,attrs,label] of links.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
      if(!/schedule-event-link--postgame/.test(attrs)&&!/^recap$/i.test(visibleText(label)))continue;
      const href=(attrs.match(/href="([^"]*)"/)||[])[1];const url=href&&storyUrl(href,sourceUrl);if(url)return url;
    }
    return null;
  }

  // Day cards of one meet (one name, each day at most two days after the one
  // before) become one event from its first to its last day. A finished meet
  // takes the last day's result and story; one under way is today's event.
  function mergeDays(events,today){
    const groups=[];
    for(const event of events){
      const day=Date.parse(event.start_time.slice(0,10));
      const group=event.round_of&&groups.find(g=>g[0].round_of===event.round_of&&day-Date.parse(String(g.at(-1).end_time||g.at(-1).start_time).slice(0,10))<=2*86400000);
      if(group)group.push(event);else groups.push([event]);
    }
    return groups.map(days=>{
      const first=days[0],last=days.at(-1);
      for(const event of days)delete event.round_of;
      if(days.length===1)return first;
      const end=String(last.end_time||last.start_time).slice(0,10);
      const finished=Date.parse(end)<today;
      const event={...first,end_time:`${end}T23:59:59Z`};
      const story=[...days].reverse().find(day=>day.recap_url)?.recap_url;
      if(finished){
        event.status='Final';event.priority_bucket=last.priority_bucket;event.recency_label=last.recency_label;
        for(const key of ['headline','results','result_count','event_type'])if(last[key]!==undefined)event[key]=last[key];
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
    if(school?.id!=='kentucky'||!kentuckySchool.cardSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||!/^\/sports\/[a-z]+\/schedule\/?$/.test(page.pathname))return null;
    raw=String(raw||'');
    const cards=items(raw).map(block=>{
      const day=field(block,/schedule-item__date">([\s\S]*?)<\/div>/i).match(/\b([A-Za-z]{3})\w*\.?\s+(\d{1,2})$/);
      const month=day?MONTHS.indexOf(day[1][0].toUpperCase()+day[1].slice(1,3).toLowerCase())+1:0;
      return{block,month,day:day?Number(day[2]):0};
    }).filter(card=>card.month);
    const years=kentuckySeasonYears(raw,cards.map(card=>card.month));if(!years)return null;
    const local=easternDay(now.getTime()),today=Date.parse(`${local}T00:00:00Z`);
    // Only the current academic year (July-June) is this season; a page still
    // showing last season (track, men's tennis, STUNT) is a valid empty
    // schedule until the new one is published.
    const seasonStart=Date.UTC(Number(local.slice(5,7))>=7?Number(local.slice(0,4)):Number(local.slice(0,4))-1,6,1);
    const meet=eventType(sport)!=='GAME',events=[],seen=new Map();
    cards.forEach(({block,month,day},i)=>{
      const start={year:years[i],month,day},firstDay=Date.UTC(start.year,month-1,day);
      if(firstDay<seasonStart)return;
      const classes=block.slice(0,block.indexOf('"'));
      const venue=(classes.match(/\b(home|away|neutral)\b/)||[])[1]||'';
      const team=(block.match(/schedule-item__team">\s*<h3>([\s\S]*?)<\/h3>/i)||[])[1]||'';
      let name=visibleText(team);
      const exhibition=/\(EXH\)/i.test(name);
      name=name.replace(/\s*\(EXH\)/gi,'').replace(/^(?:(?:#|No\.\s*)\d+\s+)+/i,'').trim();
      if(!name||/^TB[AD]$/i.test(name)||INTERNAL.test(name))return;
      if(sport==='Tennis'&&(PRO_EVENT.test(name)||INDIVIDUAL_MATCH.test(name)))return;
      const resultText=field(block,/schedule-item__result">([\s\S]*?)<\/span>/i);
      if(/^(?:cancel+ed|postponed)\b/i.test(resultText))return;
      // "W 45-13", "W 35-34 (OT)", "L 13-4 (14 inn.)"; doubleheaders "W 17-2,
      // 17-6" (the second game's outcome follows its score).
      const games=[];
      const first=resultText.match(/^([WLT])\s*,?\s*(\d+)\s*-\s*(\d+)(\s*\([^)]*\))?(?:\s*,\s*([WLT])?\s*(\d+)\s*-\s*(\d+))?$/);
      if(first){
        games.push({outcome:first[1],a:Number(first[2]),b:Number(first[3]),note:(first[4]||'').trim()});
        if(first[6]){const a=Number(first[6]),b=Number(first[7]);games.push({outcome:first[5]||(a===b?'T':first[1]),a,b,note:''});}
      }
      const lastDay=firstDay;
      // A game two days past without a published result is neither a final
      // nor upcoming. Yesterday's stays: a night game can run past midnight.
      if(!meet&&!games.length&&lastDay<today-86400000)return;
      const over=meet&&!games.length&&lastDay<today;
      const clock=(resultText.match(/^(\d{1,2}:\d{2})\s*([ap])\.?m\.?$/i)||[]);
      const time=clock[1]?`${clock[1]} ${clock[2].toUpperCase()}M`:null;
      // A meet's day cards share the meet's name: "(Day 2)" and rifle's
      // "Smallbore Day 1" / "Air Rifle Day 2" name the day.
      const meetName=name.replace(/\s*\(Day \d+\)$/i,'').replace(/\s*-?\s*(?:Smallbore|Air Rifle) Day \d+$/i,'').trim()||'Smallbore and Air Rifle';
      let opponent=meet&&!games.length?meetName:name;
      if(exhibition)opponent=`${opponent} (Exhibition)`;
      const relation=venue==='away'?'at':meet&&(venue==='neutral'||EVENT_NAME.test(opponent))?'at':'vs';
      const recapUrl=games.length||over?cardRecap(block,sourceUrl):null;
      const make=(game,number)=>{
        let result=null,us=null,them=null;
        if(game){[us,them]=(game.outcome==='L'?[Math.min(game.a,game.b),Math.max(game.a,game.b)]:[Math.max(game.a,game.b),Math.min(game.a,game.b)]).map(String);result=`${game.outcome}, ${us}-${them}${game.note?` ${game.note}`:''}`;}
        const label=number?`${opponent} (Game ${number})`:opponent;
        const event=makeEvent({school,sport,status:game||over?'Final':'Upcoming',relation,opponent:label,date:`${MONTHS[month-1]} ${day}, ${start.year}`,
          // K-State's results show the date only; upcoming games show the published time.
          time:game||over?null:time,schoolScore:us,oppScore:them,resultText:result,sourceUrl,now});
        if(over)writeMeetResult(event,sport,resultText);
        if(recapUrl)event.recap_url=recapUrl;
        if(meet&&!game)event.round_of=opponent;
        // The same opponent twice in a day (tennis, STUNT) is two events.
        const count=(seen.get(event.id)||0)+1;seen.set(event.id,count);
        if(count>1)event.id=`${event.id}-${count}`;
        return event;
      };
      if(games.length>1)games.forEach((game,n)=>events.push(make(game,n+1)));
      else events.push(make(games[0]||null,0));
    });
    const merged=meet?mergeDays(events,today):events;
    if(/^\/sports\/msoc\//.test(page.pathname))for(const event of merged){event.conference_game=SUN_BELT_MEN_SOCCER.has(event.opponent);event.conference_name='Sun Belt';}
    if(!merged.length)emptied.add(merged);
    return merged;
  }
  // A finished meet's result: golf's place and team score, each team's place
  // (cross country, track), a swimming dual per team; otherwise the card's
  // note ("Ten Event Wins") or "Completed".
  function writeMeetResult(event,sport,text){
    const value=sport==='Golf'?kentuckyGolfPlace(text):sport==='Swimming & Diving'?kentuckySwimDuals(text):kentuckyTeamPlaces(text);
    if(value){
      event.headline=value.headline;event.results=value.results;event.result_count=value.results.length;
      if(sport==='Swimming & Diving')event.event_type='MEET';
      return;
    }
    const note=/^(?:N\/A|Individual Results|All Day|TBA)$/i.test(text)||!text?'Completed':text;
    event.headline=note;event.results=[{label:'Result',value:note}];event.result_count=1;
  }
  const emptied=new WeakSet();
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptied.has(events);

  const matchesRecap=createRecapMatcher({id:'kentucky',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true,ownLinkDays:2});
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/<[^>]+>/g,' ').replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  // A final whose card links no story takes one from the site's news search
  // (the site files stories under no sport): published from the event's
  // first day to three days after its last, naming the sport, the opponent
  // and, for a game, the score (a tie: the score or "draw").
  const SPORT_WORDS={'Baseball':/\bbaseball\b/,'Basketball':/\bbasketball\b|\bhoops\b/,'Cross Country':/\bcross country\b|\bxc\b/,'Football':/\bfootball\b/,'Golf':/\bgolf\b/,'Gymnastics':/\bgym/,'Rifle':/\brifle\b/,'STUNT':/\bstunt\b/,'Soccer':/\bsoccer\b/,'Softball':/\bsoftball\b/,'Swimming & Diving':/\bswim|\bdiv(?:e|ing)\b/,'Tennis':/\btennis\b/,'Track & Field':/\btrack\b/,'Volleyball':/\bvolleyball\b/};
  const meetLike=event=>event.event_type!=='GAME'&&!/^\d+$/.test(String(event.school_score??''));
  const isMeetWithoutStory=event=>event?.school_id==='kentucky'&&meetLike(event)&&event.status==='Final'&&!event.recap_url;
  const isFinalWithoutStory=event=>isMeetWithoutStory(event)||event?.school_id==='kentucky'&&event.status==='Final'&&!event.recap_url&&!/\(Exhibition\)/.test(event.opponent||'')&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
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
  const tfrrs=createTfrrsMeetResults({id:'kentucky',schoolName:'Kentucky',teams:KENTUCKY_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  // A finished meet with neither a place nor a story (tennis's individual
  // tournaments) is not listed; cross country takes TFRRS's results.
  const isUnlisted=event=>isMeetWithoutStory(event)&&event.sport!=='Cross Country'&&event.headline==='Completed';
  return{parseSchedule,isEmptySchedule,matchesRecap,isMeetWithoutStory,isUnlisted,isFinalWithoutStory,attachArchiveStory,
    isCrossCountry:event=>event?.school_id==='kentucky'&&tfrrs.matches(event),attachMeetResults:event=>tfrrs.attach(event)};
}
