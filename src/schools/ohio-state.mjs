import {createSidearmScheduleReader,sidearmToday,withoutRanking,sidearmRelation} from '../sidearm-schedule-reader.mjs';
import {sidearmStartTimeText,mergeTournamentRounds,mergeMeetDays,mergeTbaBracket,writeMeetPlaces,golfPlacing,golfMatchPlay,doubleheaderNumber,createRecapMatcher,createArchiveStory,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
// Ohio State school module. Shared publisher utilities stay in the Worker;
// this file owns ohiostatebuckeyes.com routes, Ohio State's program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const ohioStateSchool={
  id:'ohio-state',
  // Sports whose official schedule this module reads itself, from the
  // SIDEARM page data (see the reader below). Every other sport keeps the
  // shared parsers. Add a sport only with its fixture tests.
  pageDataSports:new Set(['Baseball','Basketball','Cross Country','Fencing','Field Hockey','Football','Golf','Gymnastics','Hockey','Lacrosse','Rifle','Rowing','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball','Wrestling']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  // Turn a sport's scoreboard on with the sport (lines ready below).
  liveScoreboards:{
    // Men's and women's volleyball are shown together: each board carries its team.
    'Volleyball':[{path:'volleyball/womens-college-volleyball',team_label:"Women's",sourceName:"Live women's college volleyball scoreboard"},{path:'volleyball/mens-college-volleyball',team_label:"Men's",sourceName:"Live men's college volleyball scoreboard"}],
    'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Cross Country','Golf','Gymnastics','Hockey','Lacrosse','Soccer','Swimming & Diving','Tennis','Track & Field','Volleyball']),
  // Athlete Instagram from the official profile pages (scripts/athlete-evidence.mjs,
  // Oct 9): pinned where the app's 24-profile read could miss them. Mia
  // Tuman's page also links "zbump7", which several unrelated athletes' pages
  // carry (not hers).
  verifiedInstagrams:{
    'ohio-state|Baseball|Zak Sigman':'https://www.instagram.com/zak_sigman/',
    'ohio-state|Baseball|Sahil Patel':'https://www.instagram.com/sahilpatel.29/',
    'ohio-state|Baseball|Jake Michalak':'https://www.instagram.com/jakemichalak_/',
    'ohio-state|Basketball|John Mobley Jr.':'https://www.instagram.com/jmobleyjr/',
    'ohio-state|Basketball|Ivan Njegovan':'https://www.instagram.com/ivan_njegovan/',
    'ohio-state|Basketball|Braylen Nash':'https://www.instagram.com/braylen.3/',
    'ohio-state|Cross Country|Audrey DeSantis':'https://www.instagram.com/audreydesantis18/',
    'ohio-state|Cross Country|Zoee Lehman':'https://www.instagram.com/zoeelehman/',
    'ohio-state|Cross Country|Colin Cernansky':'https://www.instagram.com/colincernansky/',
    'ohio-state|Field Hockey|Emily Barker':'https://www.instagram.com/_emilybarkerrr/',
    'ohio-state|Field Hockey|Anne Marie Krebs':'https://www.instagram.com/anne_mariekrebs/',
    'ohio-state|Field Hockey|Reagan Eickhoff':'https://www.instagram.com/reaganeickhoff/',
    'ohio-state|Golf|Marina Joyce-Moreno':'https://www.instagram.com/maarina_joycee/',
    'ohio-state|Golf|Nellie Ong':'https://www.instagram.com/nellieong_golf/',
    'ohio-state|Golf|Mandy Song':'https://www.instagram.com/mandysongmeijin/',
    'ohio-state|Lacrosse|Delaney Harlan':'https://www.instagram.com/delaney.harlann/',
    'ohio-state|Lacrosse|Lexie Kupka':'https://www.instagram.com/lexiekupka/',
    'ohio-state|Lacrosse|Maeve Simonds':'https://www.instagram.com/maevesimonds/',
    'ohio-state|Softball|Taylor Cruse':'https://www.instagram.com/tcruse10/',
    'ohio-state|Softball|Reagan Milliken':'https://www.instagram.com/reagan.milliken/',
    'ohio-state|Softball|Hailey Lang':'https://www.instagram.com/haileylangg/',
    'ohio-state|Swimming & Diving|Paige Delma':'https://www.instagram.com/paige_delmaa/',
    'ohio-state|Swimming & Diving|Michelle Mazzara':'https://www.instagram.com/michelle.mazz/',
    'ohio-state|Swimming & Diving|Tyler Read':'https://www.instagram.com/tylerdiverread/',
    'ohio-state|Tennis|Flora Johnson':'https://www.instagram.com/florajohnsonn/',
    'ohio-state|Tennis|Hephzibah Oluwadare':'https://www.instagram.com/heph_oluwadare/',
    'ohio-state|Tennis|Teah Chavez':'https://www.instagram.com/teahchavez/',
    'ohio-state|Volleyball|Mia Tuman':'https://www.instagram.com/miatuman/',
    'ohio-state|Wrestling|Nic Bouzakis':'https://www.instagram.com/nicbouzakis.1/',
    'ohio-state|Wrestling|Brandon Cannon':'https://www.instagram.com/brandonjcannon/',
    'ohio-state|Wrestling|Carter Chase':'https://www.instagram.com/carter.chase3/'
  },
  scheduleUrls:{
    'ohio-state|Baseball':'https://ohiostatebuckeyes.com/sports/baseball/schedule',
    'ohio-state|Basketball':['https://ohiostatebuckeyes.com/sports/mens-basketball/schedule','https://ohiostatebuckeyes.com/sports/womens-basketball/schedule'],
    'ohio-state|Cross Country':['https://ohiostatebuckeyes.com/sports/womens-cross-country/schedule','https://ohiostatebuckeyes.com/sports/mens-cross-country/schedule'],
    'ohio-state|Fencing':'https://ohiostatebuckeyes.com/sports/fencing/schedule',
    'ohio-state|Field Hockey':'https://ohiostatebuckeyes.com/sports/field-hockey/schedule',
    'ohio-state|Football':'https://ohiostatebuckeyes.com/sports/football/schedule',
    'ohio-state|Golf':['https://ohiostatebuckeyes.com/sports/womens-golf/schedule','https://ohiostatebuckeyes.com/sports/mens-golf/schedule'],
    'ohio-state|Gymnastics':['https://ohiostatebuckeyes.com/sports/womens-gymnastics/schedule','https://ohiostatebuckeyes.com/sports/mens-gymnastics/schedule'],
    'ohio-state|Hockey':['https://ohiostatebuckeyes.com/sports/mens-ice-hockey/schedule','https://ohiostatebuckeyes.com/sports/womens-ice-hockey/schedule'],
    'ohio-state|Lacrosse':['https://ohiostatebuckeyes.com/sports/womens-lacrosse/schedule','https://ohiostatebuckeyes.com/sports/mens-lacrosse/schedule'],
    'ohio-state|Rifle':'https://ohiostatebuckeyes.com/sports/rifle/schedule',
    'ohio-state|Rowing':'https://ohiostatebuckeyes.com/sports/rowing/schedule',
    'ohio-state|Soccer':['https://ohiostatebuckeyes.com/sports/womens-soccer/schedule','https://ohiostatebuckeyes.com/sports/mens-soccer/schedule'],
    'ohio-state|Softball':'https://ohiostatebuckeyes.com/sports/softball/schedule',
    'ohio-state|Swimming & Diving':['https://ohiostatebuckeyes.com/sports/womens-swim-dive/schedule','https://ohiostatebuckeyes.com/sports/mens-swim-dive/schedule'],
    'ohio-state|Tennis':['https://ohiostatebuckeyes.com/sports/womens-tennis/schedule','https://ohiostatebuckeyes.com/sports/mens-tennis/schedule'],
    'ohio-state|Track & Field':['https://ohiostatebuckeyes.com/sports/womens-track-field/schedule','https://ohiostatebuckeyes.com/sports/mens-track-field/schedule'],
    'ohio-state|Volleyball':['https://ohiostatebuckeyes.com/sports/womens-volleyball/schedule','https://ohiostatebuckeyes.com/sports/mens-volleyball/schedule'],
    'ohio-state|Wrestling':'https://ohiostatebuckeyes.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'ohio-state|Baseball':'https://ohiostatebuckeyes.com/sports/baseball/roster',
    'ohio-state|Basketball':['https://ohiostatebuckeyes.com/sports/mens-basketball/roster','https://ohiostatebuckeyes.com/sports/womens-basketball/roster'],
    'ohio-state|Cross Country':['https://ohiostatebuckeyes.com/sports/womens-cross-country/roster','https://ohiostatebuckeyes.com/sports/mens-cross-country/roster'],
    'ohio-state|Fencing':'https://ohiostatebuckeyes.com/sports/fencing/roster',
    'ohio-state|Field Hockey':'https://ohiostatebuckeyes.com/sports/field-hockey/roster',
    'ohio-state|Football':'https://ohiostatebuckeyes.com/sports/football/roster',
    'ohio-state|Golf':['https://ohiostatebuckeyes.com/sports/womens-golf/roster','https://ohiostatebuckeyes.com/sports/mens-golf/roster'],
    'ohio-state|Gymnastics':['https://ohiostatebuckeyes.com/sports/womens-gymnastics/roster','https://ohiostatebuckeyes.com/sports/mens-gymnastics/roster'],
    'ohio-state|Hockey':['https://ohiostatebuckeyes.com/sports/mens-ice-hockey/roster','https://ohiostatebuckeyes.com/sports/womens-ice-hockey/roster'],
    'ohio-state|Lacrosse':['https://ohiostatebuckeyes.com/sports/womens-lacrosse/roster','https://ohiostatebuckeyes.com/sports/mens-lacrosse/roster'],
    'ohio-state|Rifle':'https://ohiostatebuckeyes.com/sports/rifle/roster',
    'ohio-state|Rowing':'https://ohiostatebuckeyes.com/sports/rowing/roster',
    'ohio-state|Soccer':['https://ohiostatebuckeyes.com/sports/womens-soccer/roster','https://ohiostatebuckeyes.com/sports/mens-soccer/roster'],
    'ohio-state|Softball':'https://ohiostatebuckeyes.com/sports/softball/roster',
    'ohio-state|Swimming & Diving':['https://ohiostatebuckeyes.com/sports/womens-swim-dive/roster','https://ohiostatebuckeyes.com/sports/mens-swim-dive/roster'],
    'ohio-state|Tennis':['https://ohiostatebuckeyes.com/sports/womens-tennis/roster','https://ohiostatebuckeyes.com/sports/mens-tennis/roster'],
    'ohio-state|Track & Field':['https://ohiostatebuckeyes.com/sports/womens-track-field/roster','https://ohiostatebuckeyes.com/sports/mens-track-field/roster'],
    'ohio-state|Volleyball':['https://ohiostatebuckeyes.com/sports/womens-volleyball/roster','https://ohiostatebuckeyes.com/sports/mens-volleyball/roster'],
    'ohio-state|Wrestling':'https://ohiostatebuckeyes.com/sports/wrestling/roster'
  }
};

const HOST='ohiostatebuckeyes.com';
const OTHER_CONFERENCES={'womens-ice-hockey':'WCHA','mens-volleyball':'MIVA'};
// Ohio State's calendar day.
const ohioStateToday=sidearmToday('America/New_York');
// Internal games: scrimmages, intrasquads, wrestling's "Wrestle Off",
// baseball's "Fall World Series" (Oct 30-Nov 2), softball's "Battle Series".
// Ohio State's own: baseball's "Scarlet & Gray World Series" (Oct 9-11).
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bwrestle[- ]?offs?\b|\bfall world series\b|\bbattle series\b|\bscarlet (?:&|and) gray\b/i;
// Opponents the pages write as institutions ("University of Memphis",
// "DePaul University", "Texas Christian University"); the app writes the
// short name, as the stories do. Miami University and Boston University keep
// theirs (the short name is another school).
const INSTITUTION_NAMES={'Texas Christian':'TCU','Mississippi':'Ole Miss'};
export const ohioStateShortName=name=>{
  if(/^(?:Miami|Boston) University$/i.test(name))return name;
  const short=name.replace(/^University of\s+/i,'').replace(/\s+University$/i,'').trim();
  return INSTITUTION_NAMES[short]||short||name;
};
// Story addresses start with their sport ("womens-cross-country-...",
// "rifle-..."). A card linking another sport's story ("buckeyes-named-2026-27-
// fencing-captains" on the women's Paul Short Run, Oct 2) links the wrong one.
const STORY_SPORTS={Baseball:/baseball/,Basketball:/basketball/,'Cross Country':/cross-country/,Fencing:/fencing/,'Field Hockey':/field-hockey/,Football:/football/,Golf:/golf/,Gymnastics:/gymnastics/,Hockey:/ice-hockey/,Lacrosse:/lacrosse/,Rifle:/rifle/,Rowing:/rowing/,Soccer:/soccer/,Softball:/softball/,'Swimming & Diving':/swim/,Tennis:/tennis/,'Track & Field':/track/,Volleyball:/volleyball/,Wrestling:/wrestling/};
const storyOfOtherSport=(sport,url)=>{
  const slug=String(url||'').split('/').pop()||'';
  const own=STORY_SPORTS[sport];
  return Boolean(own)&&!own.test(slug)&&Object.entries(STORY_SPORTS).some(([name,re])=>name!==sport&&re.test(slug));
};
// Ohio State's TFRRS cross country team pages; set them to read complete races
// (scripts/fetch-school-fixtures.mjs --tfrrs-f= --tfrrs-m= saves them).
export const OHIO_STATE_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/OH_college_f_Ohio_State.html',Men:'https://www.tfrrs.org/teams/xc/OH_college_m_Ohio_State.html'};
// Places the schedule writes as words ("First Place").
const PLACE_WORDS=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
// Words every meet name shares; they do not tell two meets apart.
const MEET_WORDS=new Set(['the','invitational','invite','relays','classic','championship','championships','meet','open','indoor','outdoor','and']);
// A multi-day conference tournament (type P, first to last day); the
// opponent names it or is its first words ("Big 12" for the "Big 12 Softball
// Tournament").
const isConferenceTournament=game=>game.type==='P'&&Boolean(String(game.tournament?.title||'').trim())&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10)&&(/\b(?:tourn\w*|championship)\b/i.test(game.opponent?.title||'')||String(game.tournament.title).startsWith(String(game.opponent?.title||'').trim()||'\0'));
// A championship game whose opponent is not known yet names only the event
// ("Big 12 Football Championship", the opponent and tournament alike): it
// reads "<School> at Big 12 Football Championship", as a meet does. A bracket
// final named after its event reads the same ("Players Era Men's Championship
// Game" in the "Players Era Men's Championship").
// A multi-day event at a neutral site is a meet or tournament ("National
// Invitational Championships", Mar 11-13, swimming; wrestling's "Soldier
// Salute"): "<School> at ...".
const isNeutralChampionship=game=>game.location_indicator==='N'&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10);
// A neutral postseason game named after its round ("NCAA Championship
// Semifinals" in the "NCAA Tournament Final Four") is "at".
const isEventNamedGame=game=>game.type==='P'&&game.location_indicator==='N'&&/\b(?:semifinals?|finals?|championship|tournament|rounds?)\b/i.test(game.opponent?.title||'');
const isOpenChampionship=game=>{const title=String(game.opponent?.title||'').trim();const tournament=String(game.tournament?.title||'').trim();return/\bchampionship\b/i.test(title)&&Boolean(tournament)&&title.startsWith(tournament);};
// ohiostatebuckeyes.com is a SIDEARM (Nuxt) site: the shared reader turns its schedule
// page data into events in K-State's results format. These settings are
// Houston's (src/schools/houston.mjs, built from the shared kit
// src/sidearm-school-kit.mjs); change one only for something this site does
// differently, with a fixture test. Every hook applies only to the sports in
// pageDataSports, so the scaffold changes no output until a sport is turned
// on.
export function createOhioStateHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const converted=event=>ohioStateSchool.pageDataSports.has(event?.sport);
  // Tennis tournaments are listed with their last day; a dual is a game.
  const isTournament=(sport,game)=>Boolean(String(game.tournament?.title||'').trim())||sport==='Tennis'&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10);
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:'ohio-state',host:HOST,sports:ohioStateSchool.pageDataSports,squadSports:ohioStateSchool.combinedSports,
    today:ohioStateToday,
    // A "next event" widget repeats a game without its details.
    listed:games=>games.filter(game=>game.type!=='upcoming'),
    // A card linking another sport's story has none of its own (the archive
    // may hold it).
    recapLinks:(game,result,sport)=>[result?.recap?.url].filter(url=>url&&!storyOfOtherSport(sport,url)),
    merge(sport,games){
      // A cancelled round ("Cancelled", The Ally's last, Oct 7) keeps the
      // place after the round before it, and a cancelled last round ends the
      // tournament that day.
      if(sport==='Golf'){
        // Rounds name no tournament (Mississippi State): the opponent names it.
        const named=games.map(game=>String(game.tournament?.title||'').trim()?game:{...game,tournament:{...game.tournament,title:String(game.opponent?.title||'').trim()}});
        // Match play (the NB3 Matchplay, Sep 29-30) lists one card per match
        // with its points: the tournament reads as its matches.
        const matchPlay=games=>{
          const points=value=>/^\d+(?:\.\d+)?$/.test(String(value??'').trim());
          const named=games.reduce((groups,game)=>{const title=String(game.tournament?.title||'').trim();if(title&&points(game.result?.team_score)&&points(game.result?.opponent_score))(groups[title]||=[]).push(game);return groups;},{});
          return games.map(game=>{
            const matches=named[String(game.tournament?.title||'').trim()];if(!matches)return game;
            const text=matches.map(m=>`${{W:'defeated',L:'lost to'}[m.result.status]||'tied'} ${withoutRanking(m.opponent?.title)}, ${m.result.team_score}-${m.result.opponent_score}`).join('; ');
            return{...game,result:{...game.result,status:'N',team_score:'',opponent_score:'',postscore_info:'',prescore_info:text}};
          });
        };
        return mergeTournamentRounds(matchPlay(named).map((game,i,named)=>{
          // A cancelled last round ("Canceled" as the round's no-play note,
          // Ole Miss at The Ally; "Final Round Canceled, Second Round Scores
          // Become Final", Mississippi State) keeps the round before's place
          // and ends the tournament that day.
          const previous=named[i-1],text=String(game.result?.postscore_info||game.result?.prescore_info||'');
          const cancelled=/^cancel+ed$/i.test(text.trim())||/^cancel+ed$/i.test(String(game.noplay_text||'').trim())||/\bround cancel+ed\b/i.test(text);
          return cancelled&&previous?.tournament?.title===game.tournament?.title&&previous?.result?{...game,noplay_text:'',result:{...game.result,postscore_info:previous.result.postscore_info||'',prescore_info:previous.result.prescore_info||'',cancelledRound:true}}:game;
        }));
      }
      // Tennis and wrestling list a tournament once per day ("UTR Charleston",
      // Sep 18-20): one event from its first to its last day.
      if(sport==='Swimming & Diving'||sport==='Track & Field'||sport==='Tennis'||sport==='Wrestling')return mergeMeetDays(games);
      // Bracket rounds with no opponent yet: one event per tournament.
      if(sport==='Basketball')return mergeTbaBracket(games);
      return games;
    },
    opponent(game){
      // A tied ranking ("#T3 Florida State") is a ranking too.
      // A leading "*" marks an individuals-only golf tournament ("*Thomas
      // Sharkey Individual"); it is not part of the name.
      let opponent=withoutRanking(String(game.opponent?.title||'').replace(/^#T\d+\s+/,'').replace(/^\*+\s*/,''));
      // Two polls: "#1/1 Ohio State", "#19/14 TCU"; unranked in one: "#-/22 Texas".
      opponent=opponent.replace(/^#(?:T?\d+|RV|-)\/(?:T?\d+|RV|-)\s+/i,'');
      // The tennis pages list players' pro events ("W75 Templeton", "W15
      // Nashville", "Columbia Futures 15K", "ITF Berkley W50"): not the team's.
      // Ohio State's men list "M25 Las Vegas" and the "Columbus Challenger" (ATP).
      if(/^ITF\b|^[WM]\d{2,3}\b|\bFutures\b|\bChallenger\b/i.test(opponent))return'';
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))return'';
      // A swimming double dual names both hosts: "at Arkansas, vs. Drury".
      const doubleDual=opponent.match(/^at\s+(.+?),\s*vs\.?\s+(.+)$/i);
      if(doubleDual)opponent=`${doubleDual[1]} and ${doubleDual[2]}`;
      // Tournament pages also list the other teams' matches ("A vs B").
      if(/\S\s+vs\.?\s+\S/i.test(opponent))return'';
      // "(Ex.)" and "(Exh.)" are the site's short exhibition labels.
      // Basketball's exhibitions read "Preseason - Charlotte".
      // Women's basketball writes "Southern Nazarene - EXH".
      // Softball's "Danville Community College (10 inn.)": a game note.
      opponent=opponent.replace(/\s*\(\d+ inn\.?\)$/i,'').replace(/\s*\(Exh?\.?\)$/i,'').replace(/\s+-\s+EXH$/i,'').replace(/^Preseason\s*-\s*/i,'');
      // Exhibitions (page-data type "S") read as K-State labels them.
      // The field hockey page marks the NCAA Tournament (Nov 13-22) type "S":
      // a postseason event is never an exhibition.
      if(game.type==='S'&&!/\(Exhibition\)$/i.test(opponent)&&!/^NCAA\b/i.test(opponent))opponent=`${opponent} (Exhibition)`;
      if(isConferenceTournament(game))opponent=String(game.tournament.title).replace(/’/g,"'").trim();
      // A multi-day event whose opponent is its tournament's first word ("SEC"
      // in the "SEC Tournament", men's basketball, Mar 10-14) reads as the
      // tournament.
      const named=String(game.tournament?.title||'').replace(/’/g,"'").trim();
      if(named.startsWith(`${opponent} `)&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10))opponent=named;
      // A bracket round with no opponent yet ("Opponents TBD") or a home
      // tournament named after the host ("Texas Tech University", the Lubbock
      // 25K) reads as its tournament.
      const tournament=String(game.tournament?.title||'').replace(/’/g,"'").trim();
      // The ITA All-American's opponent is the organizer ("Intercollegiate
      // Tennis Association"); the tournament names the event.
      if(tournament&&(/^opponents?\s+TB[AD]$/i.test(opponent)||/^(?:(?:The )?Ohio State(?: University)?)$/i.test(opponent)||/^Intercollegiate Tennis Association$/i.test(opponent)))opponent=tournament;
      return ohioStateShortName(opponent);
    },
    // Meets are final once their last day has passed; team places are
    // published as text. A dual match is a game.
    meet:(sport,game,scored)=>!scored&&(eventType(sport)==='MEET'||eventType(sport)!=='GAME'&&isTournament(sport,game)),
    // Yesterday's game without a score stays: a late game elsewhere ends
    // after midnight locally and its score is posted after.
    // A past swimming meet the schedule gives no score is final; its story
    // comes from the archive (below).
    final:ctx=>ctx.scored||ctx.meet&&(ctx.lastDay<ctx.today||ctx.result?.cancelledRound&&ctx.lastDay<=ctx.today)||ctx.sport==='Swimming & Diving'&&ctx.lastDay<ctx.today&&!ctx.game.noplay_text,
    keep:ctx=>Date.parse(ctx.lastDay)>=Date.parse(ctx.today)-86400000,
    // An event, not a team, is "at" ("Texas Tech Fall Invitational", "ITF Edmond
    // W100", "CSCAA Open Water Championship"), as is a double dual away.
    relation:(sport,game,meet)=>meet||eventType(sport)!=='GAME'&&(/\b(?:invitational|invite|championships?|classic|league)\b|^ITF\b/i.test(game.opponent?.title||'')||/^at\s/i.test(game.opponent?.title||''))||game.tbd_bracket||/^NCAA\b/.test(game.opponent?.title||'')||isConferenceTournament(game)||isOpenChampionship(game)||isNeutralChampionship(game)||isEventNamedGame(game)?'at':sidearmRelation(game),
    startTime:sidearmStartTimeText,
    // Swimming dual scores may carry a half point.
    score:/^\d+(?:\.\d+)?$/,
    result(event,{sport,result,meet,final,scored}){
      if(final&&!scored&&sport==='Swimming & Diving'){
        const text=String(result.postscore_info||result.prescore_info||'').replace(/\s+/g,' ').trim();
        // A dual per team ("Women: W, 253-33 | Men: M, 248-41"): the scores
        // decide the outcome (the page has written "M" for a win).
        const duals=[...text.matchAll(/\b(Women|Men):\s*\w?,?\s*(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/gi)].map(([,team,mine,theirs])=>({team:team[0].toUpperCase()+team.slice(1).toLowerCase(),value:`${Number(mine)>Number(theirs)?'W':Number(mine)<Number(theirs)?'L':'T'}, ${mine}-${theirs}`}));
        // A league match place: "3rd place - 263.0 points".
        // Georgia's: "4th, 207.5 pts.".
        const place=text.match(/^(T?\d+(?:st|nd|rd|th))(?: place\s*-|,)\s*(\d+(?:\.\d+)?) (?:points|pts\.?)$/i);
        if(duals.length||place){
          event.event_type='MEET';
          event.results=duals.length?duals.map(dual=>({group:`${dual.team}'s Team`,participant:'Ohio State team',result:dual.value})):[{label:'Result',value:`${place[1]} \u00b7 ${Number(place[2])} pts`}];
          event.headline=duals.length?duals.map(dual=>`${dual.team}'s team: ${dual.value}`).join(' / '):event.results[0].value;
          event.result_count=event.results.length;return;
        }
        event.event_type='MEET';event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;return;}
      // A tennis tournament is a meet, so it can take its archive story (Florida's).
      if(final&&meet&&sport==='Tennis')event.event_type='MEET';
      if(!final||!meet)return;
      // Men's golf publishes its place without a suffix ("3/14").
      const text=String(result.prescore_info||result.postscore_info||'').replace(/\s+/g,' ').trim().replace(/^(T-?)?(\d+)\s*\//,(all,tied,place)=>`${tied?'T':''}${ordinal(place)}/`)
        // Each team's place with its points in brackets: "Women (3rd, 98 pts.)".
        .replace(/\b(Women|Men)\s*\(((?:T-?)?\d+(?:st|nd|rd|th)),\s*(\d+)\s*pts\.?\)/gi,'$1: $2 ($3 points)')
        // The place alone: "T-6th Place", "First Place".
        .replace(/^(?:(T-?)(\d+\w\w)|(\d+\w\w)|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)) place$/i,(all,tied,tiedPlace,place,word)=>word?ordinal(PLACE_WORDS.indexOf(word.toLowerCase())+1):`${tied?'T':''}${tiedPlace||place}`);
      if(sport==='Golf'){
        const card=`${String(result.prescore_info||'').trim()} ${String(result.postscore_info||'').trim()}`.replace(/\s+/g,' ').trim();
        // Ole Miss: the place in the field, then the team score to par:
        // "17th/18 --" and "901 (+49)", or "2nd/16--859 (-5)".
        const fielded=card.match(/^(T?\d+(?:st|nd|rd|th))\/(\d+)\s*--\s*(\d+)\s*\(([+-]?\d+|E)\)$/i);
        if(fielded){const value=golfPlacing(`${fielded[1]}/${fielded[2]}`);event.headline=value;event.results=[{label:'Result',value},{label:'Team score',value:`${fielded[3]} (${fielded[4]})`}];event.result_count=2;return;}
        // Oklahoma: the place in the field, then the team score to par:
        // "1st/11 - 831 (-33)"; men's golf without a suffix: "10/16 - 864 (+24)".
        const dashed=card.match(/^(T-?)?(\d+)(?:st|nd|rd|th)?\/(\d+)\s*-\s*(\d{3,4})\s*\(([+-]?\d+|E)\)$/i);
        if(dashed){const value=`${dashed[1]?'T':''}${ordinal(dashed[2])} of ${dashed[3]}`;event.headline=value;event.results=[{label:'Result',value},{label:'Team score',value:`${dashed[4]} (${dashed[5]})`}];event.result_count=2;return;}
        // Texas: the place in the field, then the team score in brackets:
        // "T-2nd of 14 (839)", "5th of 16 (563)".
        const ofField=card.match(/^(T-?)?(\d+(?:st|nd|rd|th))\s+of\s+(\d+)\s*\((\d{3,4})\)$/i);
        if(ofField){const value=`${ofField[1]?'T':''}${ofField[2].toLowerCase()} of ${ofField[3]}`;event.headline=value;event.results=[{label:'Result',value},{label:'Team score',value:ofField[4]}];event.result_count=2;return;}
        // Tennessee: the team score, then the place in the field without a
        // suffix: "846 (-6)" and "2/18", "T-3/18".
        const field=card.match(/^(\d{3,4})\s*\(([+-]?\d+|E)\)\s+(T-?)?(\d+)\/(\d+)$/i);
        if(field){const value=`${field[3]?'T':''}${ordinal(field[4])} of ${field[5]}`;event.headline=value;event.results=[{label:'Result',value},{label:'Team score',value:`${field[1]} (${field[2]})`}];event.result_count=2;return;}
        // Mississippi State: the standing after the final round ("t6th after
        // final rd.", "3rd After Final Round"), "Team Champions"; after a
        // cancelled last round the round before's standing is final.
        const standing=card.match(/^(?:tied for\s+)?(t-?)?(\d+(?:st|nd|rd|th))\s+after\s+(final|\w+)\s+(?:rd|round)\b/i);
        const place=/^team champions?$/i.test(card)?'1st':standing&&(/^final$/i.test(standing[3])||result.cancelledRound)?`${standing[1]||/^tied/i.test(card)?'T':''}${standing[2].toLowerCase()}`:null;
        if(place){event.headline=place;event.results=[{label:'Result',value:place}];event.result_count=1;return;}
        // The place with the rounds and total: "5th (284-279-281/844)".
        // Georgia writes the total after "=": "T6th (280-273-281=834)".
        const scored=text.match(/^(T?\d+(?:st|nd|rd|th))\s*\((?:([\d-]+)[\/=])?(\d+)\)$/i);
        if(scored){event.headline=scored[1];event.results=[{label:'Result',value:scored[1]},{label:'Team score',value:scored[2]?`${scored[3]} (${scored[2]})`:scored[3]}];event.result_count=2;return;}
        const matchPlay=golfMatchPlay(text);
        if(matchPlay){event.headline=matchPlay.headline;event.results=matchPlay.results;event.result_count=event.results.length;return;}
        const value=golfPlacing(text)||(/^T?\d+(?:st|nd|rd|th)$/.test(text)?text:/no team score/i.test(text)?'No team score (individuals only)':'Completed');
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
        return;
      }
      writeMeetPlaces(event,{text,schoolName:'Ohio State',ordinal});
      // A tennis note that is a sentence ("Bulldogs earn 2 Singles, 1 Doubles
      // Win") is not a result; the story tells it.
      if(sport==='Tennis'&&event.headline==='Completed'&&!/^no team scores?$/i.test(text))return;
      if(event.headline==='Completed'&&text&&!/did not score|^nts$/i.test(text)){const value=golfPlacing(text)||text;event.headline=value;event.results=[{label:'Result',value}];}
    },
    // A golf tournament's final story is bound to its last round.
    onRecap:(event,href,{sport})=>{if(sport==='Golf')event.final_story=href;},
    tennisNeedsStory:false,
    // A meet keeps a story another meet also links only when the story names it.
    afterEvent(event,{sport,game,games,url}){
      // Teams outside the Big Ten: women's hockey plays in the WCHA, men's
      // volleyball in the MIVA (the page data marks their league games).
      const league=OTHER_CONFERENCES[url?.pathname?.split('/')[2]];
      if(league)event.conference_name=league;
      if(eventType(sport)!=='MEET'||!event.recap_url)return;
      const path=new URL(event.recap_url).pathname,linked=other=>other!==game&&other.result?.recap?.url&&new URL(other.result.recap.url,event.recap_url).pathname===path;
      // Rifle's institution names: the story says "ole-miss", "tcu".
      const name=withoutRanking(game.opponent?.title).trim(),words=`${name} ${ohioStateShortName(name)}`.toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>=3&&!MEET_WORDS.has(word));
      if(games.some(linked)&&!words.some(word=>path.includes(word))){delete event.recap_url;delete event.recap_title;}
    },
    gameNumber:doubleheaderNumber()
  },{makeEvent,eventType});
  const kitRecap=createRecapMatcher({id:'ohio-state',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true,
    // Tennis posts a weekend tournament's story as late as Tuesday (the ACU
    // Invitational, Sep 18-20, on Sep 22).
    ownLinkDays:3});
  // A cross country meet's story can be missing from the schedule (Cowboy
  // Jamboree), and the swimming schedule links none; each is in the archive.
  const archive=createArchiveStory({id:'ohio-state',host:HOST,decodeHtml,fetch,headers,meetSports:new Set(['Cross Country','Golf','Swimming & Diving','Tennis']),volleyballSets:true});
  // Each team's cross country page is its own event with its own TFRRS team
  // page (Illinois's split): the meet's TFRRS page holds both races.
  const tfrrs=Object.fromEntries(['Women','Men'].map(team=>[team,createTfrrsMeetResults({id:'ohio-state',schoolName:'Ohio State',teams:{[team]:OHIO_STATE_TFRRS_TEAMS[team]},decodeHtml,ordinal,fetch,headers})]));
  const teamOf=event=>/^Men/.test(event?.team_label||'')?'Men':'Women';
  // Track & Field's pages list the 2026 season until 2027 is published.
  const trackEmptied=new WeakSet();
  const readSchedule=(...args)=>{const events=parseSchedule(...args);if(args[2]==='Track & Field'&&Array.isArray(events)&&!events.length)trackEmptied.add(events);return events;};
  return{parseSchedule:readSchedule,isEmptySchedule:events=>isEmptySchedule(events)||trackEmptied.has(events),
    matchesRecap:(raw,event,url)=>converted(event)?kitRecap(raw,event,url):recapMatchesEvent(raw,event,url),
    isFinalWithoutStory:event=>converted(event)&&archive.needsStory(event),
    // A golf story from before the last round ("second entering final
    // round") is not the final story; the tournament waits for its own.
    attachArchiveStory:async event=>{
      if(!converted(event))return event;
      await archive.attachArchiveStory(event);
      const day=String(event.archive_story_verified||'').match(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if(event.sport==='Golf'&&day&&`${day[1]}-${day[2].padStart(2,'0')}-${day[3].padStart(2,'0')}`<String(event.end_time||event.start_time).slice(0,10)){delete event.recap_url;delete event.archive_story_verified;}
      return event;
    },
    isCrossCountry:event=>converted(event)&&tfrrs.Women.matches(event),
    attachMeetResults:async event=>{
      const team=teamOf(event);await tfrrs[team].attach(event);
      // Each team's event keeps its own race.
      if(event.meet_results_verified&&event.team_label){
        const own=text=>new RegExp(`^${team}'s\\b`,'i').test(String(text||''));
        const other=team==='Men'?/\bwomen(?:'s)?\b/i:/\b(?<!wo)men(?:'s)?\b/i;
        event.results=event.results.filter(row=>own(row.group));event.result_count=event.results.length;event.has_more_results=event.results.length>3;event.recap_result_count=event.results.length;
        event.headline=String(event.headline).split(' / ').filter(own).join(' / ')||event.headline;
        event.highlights=(event.highlights||[]).filter(line=>!other.test(line));
      }
      return event;
    },
    // A past tennis tournament is listed only with a story (its own or the
    // archive's), as K-State's.
    isTennisWithoutStory:event=>converted(event)&&event.sport==='Tennis'&&event.status==='Final'&&!event.recap_url,
    // A past golf event whose card publishes no place and whose story is not
    // published is not listed (Maryland's rule).
    isGolfWithoutStory:event=>converted(event)&&event.sport==='Golf'&&event.status==='Final'&&!event.recap_url&&event.headline==='Completed'};
}
