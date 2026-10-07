import {createSidearmScheduleReader,sidearmToday,withoutRanking,sidearmRelation} from '../sidearm-schedule-reader.mjs';
import {sidearmStartTimeText,mergeTournamentRounds,mergeMeetDays,mergeTbaBracket,writeMeetPlaces,golfPlacing,golfMatchPlay,doubleheaderNumber,createRecapMatcher,createArchiveStory,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
// West Virginia school module. Shared publisher utilities stay in the Worker;
// this file owns wvusports.com routes, West Virginia's program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const westVirginiaSchool={
  id:'west-virginia',
  // Sports whose official schedule this module reads itself, from the
  // SIDEARM page data (see the reader below). Every other sport keeps the
  // shared parsers. Add a sport only with its fixture tests.
  pageDataSports:new Set(['Baseball','Basketball','Cross Country','Football','Golf','Gymnastics','Rifle','Rowing','Soccer','Swimming & Diving','Tennis','Track & Field','Volleyball','Wrestling']),
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
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  verifiedInstagrams:{},
  // The official pages only: the generic pages render SIDEARM's empty
  // "@season @sport" template, and West Virginia publishes one team in golf
  // (men), tennis, cross country, track, rowing and gymnastics (women).
  scheduleUrls:{
    'west-virginia|Baseball':'https://wvusports.com/sports/baseball/schedule',
    'west-virginia|Basketball':['https://wvusports.com/sports/mens-basketball/schedule','https://wvusports.com/sports/womens-basketball/schedule'],
    'west-virginia|Cross Country':'https://wvusports.com/sports/womens-cross-country/schedule',
    'west-virginia|Football':'https://wvusports.com/sports/football/schedule',
    'west-virginia|Golf':'https://wvusports.com/sports/mens-golf/schedule',
    'west-virginia|Gymnastics':'https://wvusports.com/sports/womens-gymnastics/schedule',
    'west-virginia|Rifle':'https://wvusports.com/sports/rifle/schedule',
    'west-virginia|Rowing':'https://wvusports.com/sports/womens-rowing/schedule',
    'west-virginia|Soccer':'https://wvusports.com/sports/womens-soccer/schedule',
    'west-virginia|Swimming & Diving':['https://wvusports.com/sports/womens-swimming-and-diving/schedule','https://wvusports.com/sports/mens-swimming-and-diving/schedule'],
    'west-virginia|Tennis':'https://wvusports.com/sports/womens-tennis/schedule',
    'west-virginia|Track & Field':'https://wvusports.com/sports/womens-track-and-field/schedule',
    'west-virginia|Volleyball':'https://wvusports.com/sports/womens-volleyball/schedule',
    'west-virginia|Wrestling':'https://wvusports.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'west-virginia|Baseball':'https://wvusports.com/sports/baseball/roster',
    'west-virginia|Basketball':['https://wvusports.com/sports/mens-basketball/roster','https://wvusports.com/sports/womens-basketball/roster'],
    'west-virginia|Cross Country':'https://wvusports.com/sports/womens-cross-country/roster',
    'west-virginia|Football':'https://wvusports.com/sports/football/roster',
    'west-virginia|Golf':'https://wvusports.com/sports/mens-golf/roster',
    'west-virginia|Gymnastics':'https://wvusports.com/sports/womens-gymnastics/roster',
    'west-virginia|Rifle':'https://wvusports.com/sports/rifle/roster',
    'west-virginia|Rowing':'https://wvusports.com/sports/womens-rowing/roster',
    'west-virginia|Soccer':'https://wvusports.com/sports/womens-soccer/roster',
    'west-virginia|Swimming & Diving':['https://wvusports.com/sports/womens-swimming-and-diving/roster','https://wvusports.com/sports/mens-swimming-and-diving/roster'],
    'west-virginia|Tennis':'https://wvusports.com/sports/womens-tennis/roster',
    'west-virginia|Track & Field':'https://wvusports.com/sports/womens-track-and-field/roster',
    'west-virginia|Volleyball':'https://wvusports.com/sports/womens-volleyball/roster',
    'west-virginia|Wrestling':'https://wvusports.com/sports/wrestling/roster'
  }
};

const HOST='wvusports.com';
// West Virginia's calendar day.
const westVirginiaToday=sidearmToday('America/New_York');
// Internal games: scrimmages, intrasquads.
// Internal games: scrimmages, intrasquads, wrestling's "Wrestle Off".
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bwrestle[- ]?offs?\b/i;
// West Virginia's TFRRS cross country team pages; set them to read complete races
// (scripts/fetch-school-fixtures.mjs --tfrrs-f= --tfrrs-m= saves them).
export const WEST_VIRGINIA_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/WV_college_f_West_Virginia.html',Men:null};
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
// wvusports.com is a SIDEARM (Nuxt) site: the shared reader turns its schedule
// page data into events in K-State's results format. These settings are
// Houston's (src/schools/houston.mjs, built from the shared kit
// src/sidearm-school-kit.mjs); change one only for something this site does
// differently, with a fixture test. Every hook applies only to the sports in
// pageDataSports, so the scaffold changes no output until a sport is turned
// on.
export function createWestVirginiaHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const converted=event=>westVirginiaSchool.pageDataSports.has(event?.sport);
  // Tennis tournaments are listed with their last day; a dual is a game.
  const isTournament=(sport,game)=>Boolean(String(game.tournament?.title||'').trim())||sport==='Tennis'&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10);
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:'west-virginia',host:HOST,sports:westVirginiaSchool.pageDataSports,squadSports:westVirginiaSchool.combinedSports,
    today:westVirginiaToday,
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
      // Tennis and wrestling list a tournament once per day ("UTR Charleston",
      // Sep 18-20): one event from its first to its last day.
      if(sport==='Swimming & Diving'||sport==='Track & Field'||sport==='Tennis'||sport==='Wrestling')return mergeMeetDays(games);
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
      // A bracket round with no opponent yet ("Opponents TBD") or a home
      // tournament named after the host ("Texas Tech University", the Lubbock
      // 25K) reads as its tournament.
      const tournament=String(game.tournament?.title||'').replace(/’/g,"'").trim();
      if(tournament&&(/^opponents?\s+TB[AD]$/i.test(opponent)||/^(?:West Virginia|WVU)\b/i.test(opponent)&&!/\b(?:open|invitational|invite|classic|slam|championships?)\b/i.test(opponent)))opponent=tournament;
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
    // An event, not a team, is "at" ("Texas Tech Fall Invitational", "ITF Edmond
    // W100", "CSCAA Open Water Championship"), as is a double dual away.
    relation:(sport,game,meet)=>meet||eventType(sport)!=='GAME'&&(/\b(?:invitational|invite|championships?|classic)\b|^ITF\b/i.test(game.opponent?.title||'')||/^at\s/i.test(game.opponent?.title||''))||game.tbd_bracket||isConferenceTournament(game)||isOpenChampionship(game)||isNeutralChampionship(game)||isEventNamedGame(game)?'at':sidearmRelation(game),
    startTime:sidearmStartTimeText,
    // Swimming dual scores may carry a half point.
    score:/^\d+(?:\.\d+)?$/,
    result(event,{sport,result,meet,final,scored}){
      if(final&&!scored&&sport==='Swimming & Diving'){event.event_type='MEET';event.headline='Completed';event.results=[{label:'Result',value:'Completed'}];event.result_count=1;return;}
      if(!final||!meet)return;
      // Men's golf publishes its place without a suffix ("3/14").
      const text=String(result.prescore_info||result.postscore_info||'').replace(/\s+/g,' ').trim().replace(/^(T-?)?(\d+)\s*\//,(all,tied,place)=>`${tied?'T':''}${ordinal(place)}/`)
        // wvusports.com writes the place alone: "T-6th Place", "First Place".
        .replace(/^(?:(T-?)(\d+\w\w)|(\d+\w\w)|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)) place$/i,(all,tied,tiedPlace,place,word)=>word?ordinal(PLACE_WORDS.indexOf(word.toLowerCase())+1):`${tied?'T':''}${tiedPlace||place}`);
      if(sport==='Golf'){
        const matchPlay=golfMatchPlay(text);
        if(matchPlay){event.headline=matchPlay.headline;event.results=matchPlay.results;event.result_count=event.results.length;return;}
        const value=golfPlacing(text)||(/^T?\d+(?:st|nd|rd|th)$/.test(text)?text:/no team score/i.test(text)?'No team score (individuals only)':'Completed');
        event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;
        return;
      }
      // Cross country and track are women's teams only: a bare place ("First
      // Place") is the women's team's.
      writeMeetPlaces(event,{text:/^T?\d+(?:st|nd|rd|th)$/.test(text)&&(sport==='Cross Country'||sport==='Track & Field')?`Women: ${text}`:text,schoolName:'West Virginia',ordinal});
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
  const kitRecap=createRecapMatcher({id:'west-virginia',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true,
    // Tennis posts a weekend tournament's story as late as Tuesday (the ACU
    // Invitational, Sep 18-20, on Sep 22).
    ownLinkDays:3});
  // A cross country meet's story can be missing from the schedule (Cowboy
  // Jamboree), and the swimming schedule links none; each is in the archive.
  const archive=createArchiveStory({id:'west-virginia',host:HOST,decodeHtml,fetch,headers,meetSports:new Set(['Cross Country','Swimming & Diving']),volleyballSets:true});
  const crossCountry=createTfrrsMeetResults({id:'west-virginia',schoolName:'West Virginia',teams:WEST_VIRGINIA_TFRRS_TEAMS,
    // TFRRS names the "RMU Invitational" "RMU Colonial Cross Country Invitational".
    meetName:event=>String(event.opponent||'').replace(/^RMU\b(?! Colonial)/,'RMU Colonial'),decodeHtml,ordinal,fetch,headers});
  return{parseSchedule,isEmptySchedule,
    matchesRecap:(raw,event,url)=>converted(event)?kitRecap(raw,event,url):recapMatchesEvent(raw,event,url),
    isFinalWithoutStory:event=>converted(event)&&archive.needsStory(event),
    attachArchiveStory:event=>converted(event)?archive.attachArchiveStory(event):event,
    isCrossCountry:event=>converted(event)&&Boolean(WEST_VIRGINIA_TFRRS_TEAMS.Women||WEST_VIRGINIA_TFRRS_TEAMS.Men)&&crossCountry.matches(event),
    attachMeetResults:crossCountry.attach};
}
