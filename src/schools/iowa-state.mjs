import {createSidearmScheduleReader,sidearmToday,withoutRanking,sidearmRelation} from '../sidearm-schedule-reader.mjs';
import {sidearmStartTimeText,mergeTournamentRounds,mergeMeetDays,mergeTbaBracket,writeMeetPlaces,golfPlacing,golfMatchPlay,doubleheaderNumber,createRecapMatcher,createArchiveStory,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
// Iowa State school module. Shared publisher utilities stay in the Worker;
// this file owns cyclones.com routes, Iowa State's program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const iowaStateSchool={
  id:'iowa-state',
  // Sports whose official schedule this module reads itself, from the
  // SIDEARM page data (see the reader below). Every other sport keeps the
  // shared parsers. Add a sport only with its fixture tests.
  pageDataSports:new Set(['Football','Volleyball','Soccer','Cross Country','Basketball','Golf','Gymnastics','Tennis','Swimming & Diving','Softball','Track & Field','Wrestling']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  // Turn a sport's scoreboard on with the sport (lines ready below).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Golf']),
  // The men's golf page's address names no team.
  teamLabels:{'/sports/golf/schedule':"Men's"},
  verifiedInstagrams:{},
  scheduleUrls:{
    'iowa-state|Basketball':['https://cyclones.com/sports/mens-basketball/schedule','https://cyclones.com/sports/womens-basketball/schedule'],
    'iowa-state|Cross Country':'https://cyclones.com/sports/cross-country/schedule',
    'iowa-state|Football':'https://cyclones.com/sports/football/schedule',
    // The men's schedule is /sports/golf/; /sports/mens-golf/ is SIDEARM's
    // empty template.
    'iowa-state|Golf':['https://cyclones.com/sports/golf/schedule','https://cyclones.com/sports/womens-golf/schedule'],
    'iowa-state|Gymnastics':'https://cyclones.com/sports/womens-gymnastics/schedule',
    'iowa-state|Soccer':'https://cyclones.com/sports/womens-soccer/schedule',
    'iowa-state|Softball':'https://cyclones.com/sports/softball/schedule',
    'iowa-state|Swimming & Diving':'https://cyclones.com/sports/womens-swimming-and-diving/schedule',
    'iowa-state|Tennis':'https://cyclones.com/sports/womens-tennis/schedule',
    'iowa-state|Track & Field':'https://cyclones.com/sports/track-and-field/schedule',
    'iowa-state|Volleyball':'https://cyclones.com/sports/womens-volleyball/schedule',
    'iowa-state|Wrestling':'https://cyclones.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'iowa-state|Basketball':['https://cyclones.com/sports/mens-basketball/roster','https://cyclones.com/sports/womens-basketball/roster','https://cyclones.com/sports/basketball/roster'],
    'iowa-state|Cross Country':'https://cyclones.com/sports/cross-country/roster',
    'iowa-state|Football':'https://cyclones.com/sports/football/roster',
    'iowa-state|Golf':['https://cyclones.com/sports/womens-golf/roster','https://cyclones.com/sports/mens-golf/roster','https://cyclones.com/sports/golf/roster'],
    'iowa-state|Gymnastics':['https://cyclones.com/sports/womens-gymnastics/roster','https://cyclones.com/sports/mens-gymnastics/roster','https://cyclones.com/sports/gymnastics/roster'],
    'iowa-state|Soccer':'https://cyclones.com/sports/womens-soccer/roster',
    'iowa-state|Softball':'https://cyclones.com/sports/softball/roster',
    'iowa-state|Swimming & Diving':'https://cyclones.com/sports/womens-swimming-and-diving/roster',
    'iowa-state|Tennis':'https://cyclones.com/sports/womens-tennis/roster',
    'iowa-state|Track & Field':['https://cyclones.com/sports/track-and-field/roster','https://cyclones.com/sports/track-field/roster'],
    'iowa-state|Volleyball':'https://cyclones.com/sports/womens-volleyball/roster',
    'iowa-state|Wrestling':'https://cyclones.com/sports/wrestling/roster'
  }
};

const HOST='cyclones.com';
// Iowa State's calendar day.
const iowaStateToday=sidearmToday('America/Chicago');
// Internal games: scrimmages, intrasquads.
const INTERNAL=/\bscrimmage\b|\bintrasquad\b/i;
// Iowa State's TFRRS cross country team pages; set them to read complete races
// (scripts/fetch-school-fixtures.mjs --tfrrs-f= --tfrrs-m= saves them).
export const IOWA_STATE_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/IA_college_f_Iowa_State.html',Men:'https://www.tfrrs.org/teams/xc/IA_college_m_Iowa_State.html'};
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
// cyclones.com is a SIDEARM (Nuxt) site: the shared reader turns its schedule
// page data into events in K-State's results format. These settings are
// Houston's (src/schools/houston.mjs, built from the shared kit
// src/sidearm-school-kit.mjs); change one only for something this site does
// differently, with a fixture test. Every hook applies only to the sports in
// pageDataSports, so the scaffold changes no output until a sport is turned
// on.
export function createIowaStateHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const converted=event=>iowaStateSchool.pageDataSports.has(event?.sport);
  // Tennis tournaments are listed with their last day; a dual is a game.
  const isTournament=(sport,game)=>Boolean(String(game.tournament?.title||'').trim())||sport==='Tennis'&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10);
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:'iowa-state',host:HOST,sports:iowaStateSchool.pageDataSports,squadSports:iowaStateSchool.combinedSports,
    today:iowaStateToday,
    // A "next event" widget repeats a game without its details.
    listed:games=>games.filter(game=>game.type!=='upcoming'),
    merge(sport,games){
      if(sport==='Golf')return mergeTournamentRounds(games);
      if(sport==='Swimming & Diving'||sport==='Track & Field')return mergeMeetDays(games);
      // Bracket rounds with no opponent yet: one event per tournament.
      if(sport==='Basketball')return mergeTbaBracket(games);
      return games;
    },
    opponent(game){
      let opponent=withoutRanking(game.opponent?.title);
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))return'';
      // Tournament pages also list the other teams' matches ("A vs B").
      if(/\S\s+vs\.?\s+\S/i.test(opponent))return'';
      // "(Ex.)" is the site's short exhibition label.
      opponent=opponent.replace(/\s*\(Ex\.?\)$/i,'');
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
    keep:ctx=>Date.parse(ctx.lastDay)>=Date.parse(ctx.today)-86400000,
    relation:(sport,game,meet)=>meet||game.tbd_bracket||isConferenceTournament(game)||isOpenChampionship(game)||isNeutralChampionship(game)?'at':sidearmRelation(game),
    startTime:sidearmStartTimeText,
    // Swimming dual scores may carry a half point.
    score:/^\d+(?:\.\d+)?$/,
    result(event,{sport,result,meet,final}){
      if(!final||!meet)return;
      const text=String(result.prescore_info||result.postscore_info||'').replace(/\s+/g,' ').trim();
      if(sport==='Golf'){
        const matchPlay=golfMatchPlay(text);
        if(matchPlay){event.headline=matchPlay.headline;event.results=matchPlay.results;event.result_count=event.results.length;return;}
        const value=golfPlacing(text)||(/no team score/i.test(text)?'No team score (individuals only)':'Completed');
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
        return;
      }
      writeMeetPlaces(event,{text,schoolName:'Iowa State',ordinal});
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
  const kitRecap=createRecapMatcher({id:'iowa-state',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true});
  // The cross country schedule links no stories; each meet's is in the archive.
  const archive=createArchiveStory({id:'iowa-state',host:HOST,decodeHtml,fetch,headers,meetSports:new Set(['Cross Country'])});
  const crossCountry=createTfrrsMeetResults({id:'iowa-state',schoolName:'Iowa State',teams:IOWA_STATE_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  return{parseSchedule,isEmptySchedule,
    matchesRecap:(raw,event,url)=>converted(event)?kitRecap(raw,event,url):recapMatchesEvent(raw,event,url),
    isFinalWithoutStory:event=>converted(event)&&archive.needsStory(event),
    attachArchiveStory:event=>converted(event)?archive.attachArchiveStory(event):event,
    isCrossCountry:event=>converted(event)&&Boolean(IOWA_STATE_TFRRS_TEAMS.Women||IOWA_STATE_TFRRS_TEAMS.Men)&&crossCountry.matches(event),
    attachMeetResults:crossCountry.attach};
}
