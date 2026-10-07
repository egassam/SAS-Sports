import {createSidearmScheduleReader,sidearmToday,withoutRanking,sidearmRelation} from '../sidearm-schedule-reader.mjs';
import {sidearmStartTimeText,mergeTournamentRounds,mergeMeetDays,mergeTbaBracket,writeMeetPlaces,golfPlacing,golfMatchPlay,doubleheaderNumber,createRecapMatcher,createArchiveStory,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
// Houston school module. Shared publisher utilities stay in the Worker;
// this file owns uhcougars.com routes, Houston's program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const houstonSchool={
  id:'houston',
  // Sports whose official schedule this module reads itself, from the
  // SIDEARM page data (see the reader below). Every other sport keeps the
  // shared parsers. Add a sport only with its fixture tests.
  pageDataSports:new Set(['Football','Volleyball','Soccer','Cross Country','Basketball','Golf','Tennis','Swimming & Diving','Baseball','Softball','Track & Field']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // Houston sponsors women's soccer only.
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    Basketball:[
      {path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},
      {path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}
    ],
    Baseball:[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    Softball:[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Golf']),
  verifiedInstagrams:{
    'houston|Tennis|Petja Drame':'https://www.instagram.com/petja.drame/',
    'houston|Tennis|Valeriia Krokhotina':'https://www.instagram.com/leriiakrokhotina/',
    'houston|Tennis|Iva Sepa':'https://www.instagram.com/sepa_iva/'
  },
  // The official pages only: the homepage and the generic pages
  // (/sports/basketball/, /sports/golf/, /sports/tennis/, /sports/track-field/,
  // the swimming variants) are not schedules; they render SIDEARM's empty
  // "@season @sport" template. Houston sponsors women's tennis and women's
  // swimming & diving only (/sports/mens-tennis/ and
  // /sports/mens-swimming-and-diving/ are that empty template).
  scheduleUrls:{
    'houston|Baseball':'https://uhcougars.com/sports/baseball/schedule',
    'houston|Basketball':['https://uhcougars.com/sports/mens-basketball/schedule','https://uhcougars.com/sports/womens-basketball/schedule'],
    'houston|Cross Country':'https://uhcougars.com/sports/cross-country/schedule',
    'houston|Football':'https://uhcougars.com/sports/football/schedule',
    'houston|Golf':['https://uhcougars.com/sports/mens-golf/schedule','https://uhcougars.com/sports/womens-golf/schedule'],
    'houston|Soccer':'https://uhcougars.com/sports/womens-soccer/schedule',
    'houston|Softball':'https://uhcougars.com/sports/softball/schedule',
    'houston|Swimming & Diving':'https://uhcougars.com/sports/womens-swimming-and-diving/schedule',
    'houston|Tennis':'https://uhcougars.com/sports/womens-tennis/schedule',
    'houston|Track & Field':'https://uhcougars.com/sports/track-and-field/schedule',
    'houston|Volleyball':'https://uhcougars.com/sports/womens-volleyball/schedule'
  },
  // Rosters: the same official pages only.
  rosterUrls:{
    'houston|Baseball':'https://uhcougars.com/sports/baseball/roster',
    'houston|Basketball':['https://uhcougars.com/sports/mens-basketball/roster','https://uhcougars.com/sports/womens-basketball/roster'],
    'houston|Cross Country':'https://uhcougars.com/sports/cross-country/roster',
    'houston|Football':'https://uhcougars.com/sports/football/roster',
    'houston|Golf':['https://uhcougars.com/sports/mens-golf/roster','https://uhcougars.com/sports/womens-golf/roster'],
    'houston|Soccer':'https://uhcougars.com/sports/womens-soccer/roster',
    'houston|Softball':'https://uhcougars.com/sports/softball/roster',
    'houston|Swimming & Diving':'https://uhcougars.com/sports/womens-swimming-and-diving/roster',
    'houston|Tennis':'https://uhcougars.com/sports/womens-tennis/roster',
    'houston|Track & Field':'https://uhcougars.com/sports/track-and-field/roster',
    'houston|Volleyball':'https://uhcougars.com/sports/womens-volleyball/roster'
  }
};

const HOST='uhcougars.com';
// Houston's calendar day.
const houstonToday=sidearmToday('America/Chicago');
// Internal games: the softball Red-Black Series, scrimmages, intrasquads.
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bred\s*(?:-|&|and|vs\.?)\s*(?:white|black)\b/i;
// Words every meet name shares; they do not tell two meets apart.
const MEET_WORDS=new Set(['the','invitational','invite','relays','classic','championship','championships','meet','open','indoor','outdoor','and']);
// The Big 12 basketball tournaments (type P, first to last day).
const isConferenceTournament=game=>game.type==='P'&&Boolean(String(game.tournament?.title||'').trim())&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10)&&/\b(?:tourn\w*|championship)\b/i.test(game.opponent?.title||'');
// uhcougars.com is a SIDEARM (Nuxt) site: the shared reader turns its schedule
// page data into events in K-State's results format; the settings below are
// the ones this site needs (src/sidearm-school-kit.mjs).
export function createHoustonHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  // Tennis and swimming tournaments are listed with their last day (the
  // "Rice Invite", Sep 25-27); a tennis dual and a swimming dual meet are games.
  const isTournament=(sport,game)=>Boolean(String(game.tournament?.title||'').trim())||sport==='Tennis'&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10);
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:'houston',host:HOST,sports:houstonSchool.pageDataSports,squadSports:houstonSchool.combinedSports,
    today:houstonToday,
    // A "next event" widget repeats a game without its details.
    listed:games=>games.filter(game=>game.type!=='upcoming'),
    merge(sport,games){
      if(sport==='Golf')return mergeTournamentRounds(games);
      // Swimming lists each meet day (Fresno State, Oct 16 and 17; the Phill
      // Hansel Invitational, Nov 17-20); track each meet day.
      if(sport==='Swimming & Diving'||sport==='Track & Field')return mergeMeetDays(games);
      // Bracket rounds with no opponent yet: one event per tournament.
      if(sport==='Basketball')return mergeTbaBracket(games);
      return games;
    },
    opponent(game,sport){
      let opponent=withoutRanking(game.opponent?.title);
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))return'';
      // Tournament pages also list the other teams' matches ("Houston
      // Christian vs Texas State" at the Flo Hyman Classic).
      if(/\S\s+vs\.?\s+\S/i.test(opponent))return'';
      // Exhibitions (page-data type "S": fall baseball and softball, the
      // basketball and volleyball exhibitions) read as K-State labels them.
      if(game.type==='S'&&!/\(Exhibition\)$/i.test(opponent))opponent=`${opponent} (Exhibition)`;
      // A multi-day conference tournament is named after its tournament (the
      // card reads "Big 12 Women's Basketball Tournment").
      if(isConferenceTournament(game))opponent=String(game.tournament.title).replace(/\u2019/g,"'").trim();
      return opponent;
    },
    // Meets are final once their last day has passed; team places are
    // published as text ("M- 2nd, W- 2nd"). A dual match is a game.
    meet:(sport,game,scored)=>!scored&&(eventType(sport)==='MEET'||eventType(sport)!=='GAME'&&isTournament(sport,game)),
    // Yesterday's game without a score stays: a late game elsewhere ends
    // after midnight in Houston and its score is posted after.
    keep:ctx=>Date.parse(ctx.lastDay)>=Date.parse(ctx.today)-86400000,
    // Meets and tournaments read "Houston at Big 12 Championship", as K-State's.
    relation:(sport,game,meet)=>meet||game.tbd_bracket||isConferenceTournament(game)?'at':sidearmRelation(game),
    startTime:sidearmStartTimeText,
    // Swimming dual scores may carry a half point ("150.5").
    score:/^\d+(?:\.\d+)?$/,
    result(event,{sport,result,meet,final}){
      if(!final||!meet)return;
      const text=String(result.prescore_info||result.postscore_info||'').replace(/\s+/g,' ').trim();
      if(sport==='Golf'){
        // Match play publishes the matches ("defeated New Mexico State, 3-2;
        // lost to New Mexico, 3.5-1.5"): "Match play: 1-1", one row each.
        const matchPlay=golfMatchPlay(text);
        if(matchPlay){event.headline=matchPlay.headline;event.results=matchPlay.results;event.result_count=event.results.length;return;}
        // Otherwise the last round's place and field ("t-10th of 12" ->
        // "T10th of 12"); "No Team Score - Individuals Only" has no team place.
        const value=golfPlacing(text)||(/no team score/i.test(text)?'No team score (individuals only)':'Completed');
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
        return;
      }
      writeMeetPlaces(event,{text,schoolName:'Houston',ordinal});
      // A place in another form (an invitational's "2nd of 6") is shown as published.
      if(event.headline==='Completed'&&text&&!/did not score|^nts$/i.test(text)){const value=golfPlacing(text)||text;event.headline=value;event.results=[{label:'Result',value}];}
    },
    // A golf tournament's final story is bound to its last round.
    onRecap:(event,href,{sport})=>{if(sport==='Golf')event.final_story=href;},
    tennisNeedsStory:true,
    // Track can link one story to two meets on the same days (the Wake Forest
    // Invitational story on the Mt. SAC Relays, Apr 15-16): a meet keeps a
    // story another meet also links only when the story names it.
    afterEvent(event,{sport,game,games}){
      if(eventType(sport)!=='MEET'||!event.recap_url)return;
      const path=new URL(event.recap_url).pathname,linked=other=>other!==game&&other.result?.recap?.url&&new URL(other.result.recap.url,event.recap_url).pathname===path;
      const words=withoutRanking(game.opponent?.title).toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>=3&&!MEET_WORDS.has(word));
      if(games.some(linked)&&!words.some(word=>path.includes(word))){delete event.recap_url;delete event.recap_title;}
    },
    gameNumber:doubleheaderNumber()
  },{makeEvent,eventType});
  // The Sep 4 volleyball recap names Houston Christian only as "the Huskies".
  const matchesRecap=createRecapMatcher({id:'houston',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true});
  const {needsStory:isHoustonFinalWithoutStory,attachArchiveStory}=createArchiveStory({id:'houston',host:HOST,decodeHtml,fetch,headers});
  const crossCountry=createTfrrsMeetResults({id:'houston',schoolName:'Houston',teams:HOUSTON_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  return{parseSchedule,isEmptySchedule,matchesRecap,isHoustonFinalWithoutStory,attachArchiveStory,isHoustonCrossCountry:crossCountry.matches,attachMeetResults:crossCountry.attach};
}
// Houston's two TFRRS team pages list every meet with its date; the meet
// pages publish the complete scored races.
export const HOUSTON_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/TX_college_f_Houston.html',Men:'https://www.tfrrs.org/teams/xc/TX_college_m_Houston.html'};
