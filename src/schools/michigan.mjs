import {createSidearmScheduleReader,sidearmToday,withoutRanking,sidearmRelation} from '../sidearm-schedule-reader.mjs';
import {sidearmStartTimeText,mergeTournamentRounds,mergeMeetDays,mergeTbaBracket,writeMeetPlaces,golfPlacing,golfMatchPlay,doubleheaderNumber,createRecapMatcher,createArchiveStory,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
// Michigan school module. Shared publisher utilities stay in the Worker;
// this file owns mgoblue.com routes, Michigan's program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const michiganSchool={
  id:'michigan',
  // Sports whose official schedule this module reads itself, from the
  // SIDEARM page data (see the reader below). Every other sport keeps the
  // shared parsers. Add a sport only with its fixture tests.
  pageDataSports:new Set(['Baseball','Basketball','Cross Country','Field Hockey','Football','Golf','Gymnastics','Hockey','Lacrosse','Rowing','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball','Water Polo','Wrestling']),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  // Turn a sport's scoreboard on with the sport (lines ready below).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // Men's and women's soccer and lacrosse are shown together: each board
    // carries its team.
    'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}],
    'Lacrosse':[{path:'lacrosse/mens-college-lacrosse',team_label:"Men's",sourceName:"Live men's college lacrosse scoreboard"},{path:'lacrosse/womens-college-lacrosse',team_label:"Women's",sourceName:"Live women's college lacrosse scoreboard"}],
    'Field Hockey':[{path:'field-hockey/womens-college-field-hockey',sourceName:'Live college field hockey scoreboard'}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set(['Basketball','Cross Country','Golf','Gymnastics','Lacrosse','Soccer','Swimming & Diving','Tennis','Track & Field']),
  // Athlete Instagram from the official profile pages (scripts/athlete-evidence.mjs,
  // Oct 9): pinned where the app's 24-profile read could miss them.
  verifiedInstagrams:{
    'michigan|Baseball|Wyatt Novara':'https://www.instagram.com/wyattnovara/',
    'michigan|Baseball|Slade Moore':'https://www.instagram.com/slade_moore10/',
    'michigan|Baseball|Tate Carey':'https://www.instagram.com/tatecarey_/',
    'michigan|Cross Country|Lisa Luecke':'https://www.instagram.com/lisa.luecke/',
    'michigan|Cross Country|Jadyn Zdanavage':'https://www.instagram.com/jadynzdan/',
    'michigan|Cross Country|Peter Baracco':'https://www.instagram.com/pj.bara/',
    'michigan|Tennis|Piper Charney':'https://www.instagram.com/pcharnn/',
    'michigan|Tennis|Reese Miller':'https://www.instagram.com/reesemiller39/',
    'michigan|Tennis|Pierce Shaya':'https://www.instagram.com/pierce.shaya/',
    'michigan|Track & Field|Trinity Franklin':'https://www.instagram.com/trinityyy_franklin/',
    'michigan|Track & Field|Sidney Green':'https://www.instagram.com/sidney.greennn/',
    'michigan|Track & Field|Amare Harlan':'https://www.instagram.com/amareharlan/'
  },
  scheduleUrls:{
    'michigan|Baseball':'https://mgoblue.com/sports/baseball/schedule',
    'michigan|Basketball':['https://mgoblue.com/sports/mens-basketball/schedule','https://mgoblue.com/sports/womens-basketball/schedule'],
    'michigan|Cross Country':['https://mgoblue.com/sports/womens-cross-country/schedule','https://mgoblue.com/sports/mens-cross-country/schedule'],
    'michigan|Field Hockey':'https://mgoblue.com/sports/field-hockey/schedule',
    'michigan|Football':'https://mgoblue.com/sports/football/schedule',
    'michigan|Golf':['https://mgoblue.com/sports/womens-golf/schedule','https://mgoblue.com/sports/mens-golf/schedule'],
    'michigan|Gymnastics':['https://mgoblue.com/sports/womens-gymnastics/schedule','https://mgoblue.com/sports/mens-gymnastics/schedule'],
    'michigan|Hockey':'https://mgoblue.com/sports/mens-ice-hockey/schedule',
    'michigan|Lacrosse':['https://mgoblue.com/sports/womens-lacrosse/schedule','https://mgoblue.com/sports/mens-lacrosse/schedule'],
    'michigan|Rowing':'https://mgoblue.com/sports/womens-rowing/schedule',
    'michigan|Soccer':['https://mgoblue.com/sports/womens-soccer/schedule','https://mgoblue.com/sports/mens-soccer/schedule'],
    'michigan|Softball':'https://mgoblue.com/sports/softball/schedule',
    'michigan|Swimming & Diving':['https://mgoblue.com/sports/womens-swimming-and-diving/schedule','https://mgoblue.com/sports/mens-swimming-and-diving/schedule'],
    'michigan|Tennis':['https://mgoblue.com/sports/womens-tennis/schedule','https://mgoblue.com/sports/mens-tennis/schedule'],
    'michigan|Track & Field':['https://mgoblue.com/sports/womens-track-and-field/schedule','https://mgoblue.com/sports/mens-track-and-field/schedule'],
    'michigan|Volleyball':'https://mgoblue.com/sports/womens-volleyball/schedule',
    'michigan|Water Polo':'https://mgoblue.com/sports/womens-water-polo/schedule',
    'michigan|Wrestling':'https://mgoblue.com/sports/wrestling/schedule'
  },
  rosterUrls:{
    'michigan|Baseball':'https://mgoblue.com/sports/baseball/roster',
    'michigan|Basketball':['https://mgoblue.com/sports/mens-basketball/roster','https://mgoblue.com/sports/womens-basketball/roster'],
    'michigan|Cross Country':['https://mgoblue.com/sports/womens-cross-country/roster','https://mgoblue.com/sports/mens-cross-country/roster'],
    'michigan|Field Hockey':'https://mgoblue.com/sports/field-hockey/roster',
    'michigan|Football':'https://mgoblue.com/sports/football/roster',
    'michigan|Golf':['https://mgoblue.com/sports/womens-golf/roster','https://mgoblue.com/sports/mens-golf/roster'],
    'michigan|Gymnastics':['https://mgoblue.com/sports/womens-gymnastics/roster','https://mgoblue.com/sports/mens-gymnastics/roster'],
    'michigan|Hockey':'https://mgoblue.com/sports/mens-ice-hockey/roster',
    'michigan|Lacrosse':['https://mgoblue.com/sports/womens-lacrosse/roster','https://mgoblue.com/sports/mens-lacrosse/roster'],
    'michigan|Rowing':'https://mgoblue.com/sports/womens-rowing/roster',
    'michigan|Soccer':['https://mgoblue.com/sports/womens-soccer/roster','https://mgoblue.com/sports/mens-soccer/roster'],
    'michigan|Softball':'https://mgoblue.com/sports/softball/roster',
    'michigan|Swimming & Diving':['https://mgoblue.com/sports/womens-swimming-and-diving/roster','https://mgoblue.com/sports/mens-swimming-and-diving/roster'],
    'michigan|Tennis':['https://mgoblue.com/sports/womens-tennis/roster','https://mgoblue.com/sports/mens-tennis/roster'],
    'michigan|Track & Field':['https://mgoblue.com/sports/womens-track-and-field/roster','https://mgoblue.com/sports/mens-track-and-field/roster'],
    'michigan|Volleyball':'https://mgoblue.com/sports/womens-volleyball/roster',
    'michigan|Water Polo':'https://mgoblue.com/sports/womens-water-polo/roster',
    'michigan|Wrestling':'https://mgoblue.com/sports/wrestling/roster'
  }
};

const HOST='mgoblue.com';
// Michigan's calendar day.
const michiganToday=sidearmToday('America/New_York');
// Internal games: scrimmages, intrasquads, wrestling's "Wrestle Off",
// baseball's "Fall World Series" (Oct 30-Nov 2), softball's "Battle Series",
// water polo's "Maize & Blue Exhibition" (Oct 18).
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bwrestle[- ]?offs?\b|\bfall world series\b|\bbattle series\b|\bmaize (?:&|and) blue\b/i;
// Michigan's TFRRS cross country team pages; set them to read complete races
// (scripts/fetch-school-fixtures.mjs --tfrrs-f= --tfrrs-m= saves them).
export const MICHIGAN_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/MI_college_f_Michigan.html',Men:'https://www.tfrrs.org/teams/xc/MI_college_m_Michigan.html'};
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
// utsports.com is a SIDEARM (Nuxt) site: the shared reader turns its schedule
// page data into events in K-State's results format. These settings are
// Houston's (src/schools/houston.mjs, built from the shared kit
// src/sidearm-school-kit.mjs); change one only for something this site does
// differently, with a fixture test. Every hook applies only to the sports in
// pageDataSports, so the scaffold changes no output until a sport is turned
// on.
export function createMichiganHandlers({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const converted=event=>michiganSchool.pageDataSports.has(event?.sport);
  // Tennis tournaments are listed with their last day; a dual is a game.
  const isTournament=(sport,game)=>Boolean(String(game.tournament?.title||'').trim())||sport==='Tennis'&&String(game.enddate||'').slice(0,10)>String(game.date).slice(0,10);
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:'michigan',host:HOST,sports:michiganSchool.pageDataSports,squadSports:michiganSchool.combinedSports,
    today:michiganToday,
    // A "next event" widget repeats a game without its details.
    listed:games=>games.filter(game=>game.type!=='upcoming'),
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
      if(/^ITF\b|^[WM]\d{2,3}\b|\bFutures\b/i.test(opponent))return'';
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))return'';
      // A swimming double dual names both hosts: "at Arkansas, vs. Drury".
      const doubleDual=opponent.match(/^at\s+(.+?),\s*vs\.?\s+(.+)$/i);
      if(doubleDual)opponent=`${doubleDual[1]} and ${doubleDual[2]}`;
      // Tournament pages also list the other teams' matches ("A vs B").
      if(/\S\s+vs\.?\s+\S/i.test(opponent))return'';
      // "(Ex.)" and "(Exh.)" are the site's short exhibition labels.
      // Basketball's exhibitions read "Preseason - Charlotte".
      // Women's basketball writes "Southern Nazarene - EXH".
      // A trailing "*" ("Mississippi Valley State*") and a stray ";" ("TEAM
      // BE BETTER; Invitational") are page marks, not names.
      opponent=opponent.replace(/\*+$/,'').replace(/;\s*/g,' ').trim();
      opponent=opponent.replace(/\s*\(Exh?\.?\)$/i,'').replace(/\s+-\s+EXH$/i,'').replace(/^Preseason\s*-\s*/i,'');
      // Exhibitions (page-data type "S") read as K-State labels them.
      if(game.type==='S'&&!/\(Exhibition\)$/i.test(opponent))opponent=`${opponent} (Exhibition)`;
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
      if(tournament&&(/^opponents?\s+TB[AD]$/i.test(opponent)||/^(?:Michigan(?: University| Sooners)?)$/i.test(opponent)))opponent=tournament;
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
          event.results=duals.length?duals.map(dual=>({group:`${dual.team}'s Team`,participant:'Michigan team',result:dual.value})):[{label:'Result',value:`${place[1]} \u00b7 ${Number(place[2])} pts`}];
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
      writeMeetPlaces(event,{text,schoolName:'Michigan',ordinal});
      // A tennis note that is a sentence ("Bulldogs earn 2 Singles, 1 Doubles
      // Win") is not a result; the story tells it.
      if(sport==='Tennis'&&event.headline==='Completed'&&!/^no team scores?$/i.test(text))return;
      if(event.headline==='Completed'&&text&&!/did not score|^nts$/i.test(text)){const value=golfPlacing(text)||text;event.headline=value;event.results=[{label:'Result',value}];}
    },
    // A golf tournament's final story is bound to its last round.
    onRecap:(event,href,{sport})=>{if(sport==='Golf')event.final_story=href;},
    tennisNeedsStory:false,
    // A meet keeps a story another meet also links only when the story names it.
    afterEvent(event,{sport,game,games}){
      if(eventType(sport)!=='MEET'||!event.recap_url)return;
      const path=new URL(event.recap_url).pathname,linked=other=>other!==game&&other.result?.recap?.url&&new URL(other.result.recap.url,event.recap_url).pathname===path;
      const words=withoutRanking(game.opponent?.title).toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>=3&&!MEET_WORDS.has(word));
      if(games.some(linked)&&!words.some(word=>path.includes(word))){delete event.recap_url;delete event.recap_title;}
    },
    gameNumber:doubleheaderNumber()
  },{makeEvent,eventType});
  const kitRecap=createRecapMatcher({id:'michigan',host:HOST,recapMatchesEvent,decodeHtml,trustOwnLink:true,
    // Tennis posts a weekend tournament's story as late as Tuesday (the ACU
    // Invitational, Sep 18-20, on Sep 22).
    ownLinkDays:3,
    // Men's tennis posts a tournament's page the day before it starts.
    ownLinkDaysBefore:{Tennis:1}});
  // A cross country meet's story can be missing from the schedule (Cowboy
  // Jamboree), and the swimming schedule links none; each is in the archive.
  const archive=createArchiveStory({id:'michigan',host:HOST,decodeHtml,fetch,headers,meetSports:new Set(['Cross Country','Golf','Swimming & Diving','Tennis']),volleyballSets:true,
    // Men's tennis posts a tournament's page the day before and fills it in
    // afterward (the Fighting Irish Invitational, Sep 25-26, on Sep 24).
    meetDaysBefore:{Tennis:1}});
  // Each team's cross country page is its own event with its own TFRRS team
  // page (Illinois's split): the meet's TFRRS page holds both races.
  const tfrrs=Object.fromEntries(['Women','Men'].map(team=>[team,createTfrrsMeetResults({id:'michigan',schoolName:'Michigan',teams:{[team]:MICHIGAN_TFRRS_TEAMS[team]},decodeHtml,ordinal,fetch,headers})]));
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
