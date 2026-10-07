import {createSidearmScheduleReader,sidearmToday,withoutRanking,sidearmRelation} from '../sidearm-schedule-reader.mjs';
import {sidearmStartTimeText,mergeTournamentRounds,mergeMeetDays,mergeTbaBracket,writeMeetPlaces,golfPlacing,golfMatchPlay,doubleheaderNumber,createRecapMatcher,createArchiveStory,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
// TCU school module. Shared publisher utilities stay in the Worker;
// this file owns gofrogs.com routes, TCU's program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const tcuSchool={
  id:'tcu',
  // Sports whose official schedule this module reads itself, from the
  // SIDEARM page data (see the reader below). Every other sport keeps the
  // shared parsers. Add a sport only with its fixture tests.
  pageDataSports:new Set(['Baseball','Basketball','Beach Volleyball','Cross Country','Equestrian','Football','Golf','Rifle','Soccer','Swimming & Diving','Tennis','Track & Field','Triathlon','Volleyball']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Golf','Tennis']),
  // Accounts the official roster card publishes in a form the shared reader
  // rejects: Sara Gimena's card links
  // "https://www.instagram.com/https://www.instagram.com/saragimena_02/".
  verifiedInstagrams:{
    'tcu|Triathlon|Sara Gimena':'https://www.instagram.com/saragimena_02/'
  },
  // The official pages only: the generic basketball, golf and tennis pages,
  // the separate swimming pages and the homepage render SIDEARM's empty
  // "@season @sport" template; beach volleyball is /womens-beach-volleyball/.
  scheduleUrls:{
    'tcu|Baseball':'https://gofrogs.com/sports/baseball/schedule',
    'tcu|Basketball':['https://gofrogs.com/sports/mens-basketball/schedule','https://gofrogs.com/sports/womens-basketball/schedule'],
    'tcu|Beach Volleyball':'https://gofrogs.com/sports/womens-beach-volleyball/schedule',
    'tcu|Cross Country':'https://gofrogs.com/sports/cross-country/schedule',
    'tcu|Equestrian':'https://gofrogs.com/sports/equestrian/schedule',
    'tcu|Football':'https://gofrogs.com/sports/football/schedule',
    'tcu|Golf':['https://gofrogs.com/sports/womens-golf/schedule','https://gofrogs.com/sports/mens-golf/schedule'],
    'tcu|Rifle':'https://gofrogs.com/sports/rifle/schedule',
    'tcu|Soccer':'https://gofrogs.com/sports/womens-soccer/schedule',
    'tcu|Swimming & Diving':'https://gofrogs.com/sports/swimming-and-diving/schedule',
    'tcu|Tennis':['https://gofrogs.com/sports/womens-tennis/schedule','https://gofrogs.com/sports/mens-tennis/schedule'],
    'tcu|Track & Field':'https://gofrogs.com/sports/track-and-field/schedule',
    'tcu|Triathlon':'https://gofrogs.com/sports/triathlon/schedule',
    'tcu|Volleyball':'https://gofrogs.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'tcu|Baseball':'https://gofrogs.com/sports/baseball/roster',
    'tcu|Basketball':['https://gofrogs.com/sports/mens-basketball/roster','https://gofrogs.com/sports/womens-basketball/roster','https://gofrogs.com/sports/basketball/roster'],
    'tcu|Beach Volleyball':'https://gofrogs.com/sports/womens-beach-volleyball/roster',
    'tcu|Cross Country':'https://gofrogs.com/sports/cross-country/roster',
    'tcu|Equestrian':'https://gofrogs.com/sports/equestrian/roster',
    'tcu|Football':'https://gofrogs.com/sports/football/roster',
    'tcu|Golf':['https://gofrogs.com/sports/womens-golf/roster','https://gofrogs.com/sports/mens-golf/roster','https://gofrogs.com/sports/golf/roster'],
    'tcu|Rifle':'https://gofrogs.com/sports/rifle/roster',
    'tcu|Soccer':'https://gofrogs.com/sports/womens-soccer/roster',
    'tcu|Swimming & Diving':'https://gofrogs.com/sports/swimming-and-diving/roster',
    'tcu|Tennis':['https://gofrogs.com/sports/womens-tennis/roster','https://gofrogs.com/sports/mens-tennis/roster','https://gofrogs.com/sports/tennis/roster'],
    'tcu|Track & Field':['https://gofrogs.com/sports/track-and-field/roster','https://gofrogs.com/sports/track-field/roster'],
    'tcu|Triathlon':'https://gofrogs.com/sports/triathlon/roster',
    'tcu|Volleyball':'https://gofrogs.com/sports/womens-volleyball/roster'
  }
};

const HOST='gofrogs.com';
// TCU's calendar day.
const tcuToday=sidearmToday('America/Chicago');
// Internal games: scrimmages, intrasquads.
const INTERNAL=/\bscrimmage\b|\bintrasquad\b/i;
// TCU's TFRRS cross country team pages; set them to read complete races
// (scripts/fetch-school-fixtures.mjs --tfrrs-f= --tfrrs-m= saves them).
export const TCU_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/TX_college_f_TCU.html',Men:'https://www.tfrrs.org/teams/xc/TX_college_m_TCU.html'};
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
const isOpenChampionship=game=>{const title=String(game.opponent?.title||'').trim();const tournament=String(game.tournament?.title||'').trim();return/\bchampionship\b/i.test(title)&&Boolean(tournament)&&title.startsWith(tournament);};
// gofrogs.com is a SIDEARM (Nuxt) site: the shared reader turns its schedule
// page data into events in K-State's results format. These settings are
// Houston's (src/schools/houston.mjs, built from the shared kit
// src/sidearm-school-kit.mjs); change one only for something this site does
// differently, with a fixture test. Every hook applies only to the sports in
// pageDataSports, so the scaffold changes no output until a sport is turned
// on.
export function createTcuHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const converted=event=>tcuSchool.pageDataSports.has(event?.sport);
  // Tennis tournaments are listed with their last day; a dual is a game.
  const isTournament=(sport,game)=>Boolean(String(game.tournament?.title||'').trim())||sport==='Tennis'&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10);
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:'tcu',host:HOST,sports:tcuSchool.pageDataSports,squadSports:tcuSchool.combinedSports,
    today:tcuToday,
    // A "next event" widget repeats a game without its details.
    listed:games=>games.filter(game=>game.type!=='upcoming'),
    merge(sport,games){
      // A cancelled round ("Cancelled", The Ally's last, Oct 7) keeps the
      // place after the round before it, and a cancelled last round ends the
      // tournament that day.
      if(sport==='Golf')return mergeTournamentRounds(games.map((game,i)=>{
        const previous=games[i-1],text=String(game.result?.postscore_info||game.result?.prescore_info||'');
        return/^cancel+ed$/i.test(text.trim())&&previous?.tournament?.title===game.tournament?.title&&previous?.result?{...game,result:{...game.result,postscore_info:previous.result.postscore_info||previous.result.prescore_info||'',prescore_info:'',cancelledRound:true}}:game;
      }));
      if(sport==='Swimming & Diving'||sport==='Track & Field')return mergeMeetDays(games);
      // Bracket rounds with no opponent yet: one event per tournament.
      if(sport==='Basketball')return mergeTbaBracket(games);
      return games;
    },
    opponent(game){
      let opponent=withoutRanking(game.opponent?.title);
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))return'';
      // A swimming double dual names both hosts: "at Arkansas, vs. Drury".
      const doubleDual=opponent.match(/^at\s+(.+?),\s*vs\.?\s+(.+)$/i);
      if(doubleDual)opponent=`${doubleDual[1]} and ${doubleDual[2]}`;
      // Tournament pages also list the other teams' matches ("A vs B").
      if(/\S\s+vs\.?\s+\S/i.test(opponent))return'';
      // "(Ex.)" and "(Exh.)" are the site's short exhibition labels.
      opponent=opponent.replace(/\s*\(Exh?\.?\)$/i,'');
      // Exhibitions (page-data type "S") read as K-State labels them.
      if(game.type==='S'&&!/\(Exhibition\)$/i.test(opponent))opponent=`${opponent} (Exhibition)`;
      if(isConferenceTournament(game))opponent=String(game.tournament.title).replace(/’/g,"'").trim();
      return opponent;
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
    // An event, not a team, is "at" ("TCU Fall Invitational", "ITF Edmond
    // W100", "CSCAA Open Water Championship"), as is a double dual away.
    relation:(sport,game,meet)=>meet||eventType(sport)!=='GAME'&&(/\b(?:invitational|invite|championships?|classic)\b|^ITF\b/i.test(game.opponent?.title||'')||/^at\s/i.test(game.opponent?.title||''))||game.tbd_bracket||isConferenceTournament(game)||isOpenChampionship(game)||isNeutralChampionship(game)?'at':sidearmRelation(game),
    startTime:sidearmStartTimeText,
    // Swimming dual scores may carry a half point.
    score:/^\d+(?:\.\d+)?$/,
    result(event,{sport,result,meet,final,scored}){
      if(final&&!scored&&sport==='Swimming & Diving'){event.event_type='MEET';event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;return;}
      if(!final||!meet)return;
      // Men's golf publishes its place without a suffix ("3/14").
      const text=String(result.prescore_info||result.postscore_info||'').replace(/\s+/g,' ').trim().replace(/^(T-?)?(\d+)\s*\//,(all,tied,place)=>`${tied?'T':''}${ordinal(place)}/`);
      if(sport==='Golf'){
        const matchPlay=golfMatchPlay(text);
        if(matchPlay){event.headline=matchPlay.headline;event.results=matchPlay.results;event.result_count=event.results.length;return;}
        const value=golfPlacing(text)||(/no team score/i.test(text)?'No team score (individuals only)':'Completed');
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
        return;
      }
      writeMeetPlaces(event,{text,schoolName:'TCU',ordinal});
      if(event.headline==='Completed'&&text&&!/did not score|^nts$/i.test(text)){const value=golfPlacing(text)||text;event.headline=value;event.results=[{label:'Result',value}];}
    },
    // A golf tournament's final story is bound to its last round.
    onRecap:(event,href,{sport})=>{if(sport==='Golf')event.final_story=href;},
    tennisNeedsStory:true,
    // A meet keeps a story another meet also links only when the story names it.
    afterEvent(event,{sport,game,games}){
      if(eventType(sport)!=='MEET'||!event.recap_url)return;
      const path=new URL(event.recap_url).pathname,linked=other=>other!==game&&other.result?.recap?.url&&new URL(other.result.recap.url,event.recap_url).pathname===path;
      const words=withoutRanking(game.opponent?.title).toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>=3&&!MEET_WORDS.has(word));
      if(games.some(linked)&&!words.some(word=>path.includes(word))){delete event.recap_url;delete event.recap_title;}
    },
    gameNumber:doubleheaderNumber()
  },{makeEvent,eventType});
  const kitRecap=createRecapMatcher({id:'tcu',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true});
  // A cross country meet's story can be missing from the schedule (Cowboy
  // Jamboree), and the swimming schedule links none; each is in the archive.
  const archive=createArchiveStory({id:'tcu',host:HOST,decodeHtml,fetch,headers,meetSports:new Set(['Cross Country','Swimming & Diving'])});
  const crossCountry=createTfrrsMeetResults({id:'tcu',schoolName:'TCU',teams:TCU_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  return{parseSchedule,isEmptySchedule,
    matchesRecap:(raw,event,url)=>converted(event)?kitRecap(raw,event,url):recapMatchesEvent(raw,event,url),
    isFinalWithoutStory:event=>converted(event)&&archive.needsStory(event),
    attachArchiveStory:event=>converted(event)?archive.attachArchiveStory(event):event,
    isCrossCountry:event=>converted(event)&&Boolean(TCU_TFRRS_TEAMS.Women||TCU_TFRRS_TEAMS.Men)&&crossCountry.matches(event),
    attachMeetResults:crossCountry.attach};
}
