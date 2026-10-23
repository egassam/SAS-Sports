// Conference games, for each sport's conference record (user, October 7:
// "add the conference record too").
//
// The school's own word comes first: a SIDEARM schedule's page data marks
// every game `conference: true|false` (Iowa State football: Utah and West
// Virginia true; Iowa, the Big 12 Championship false). Each event is matched
// to its page-data game by day and opponent. A site without that flag (WMT,
// custom sites) falls back to membership: a regular-season game against a
// fellow member of the school's conference. The page data's exhibitions
// (type "S") are marked too.
import {sidearmScheduleGames} from './sidearm-schedule-data.mjs';

const words=value=>String(value||'').toLowerCase()
  .replace(/\((?:exhibition|exh\.?|ex\.)\)/g,'')
  .replace(/^(?:#\d+|no\.\s*\d+|rv)\s+/,'')
  .replace(/\bst\.(?=\s|$)/g,'state')
  .replace(/&/g,' and ')
  .replace(/[^a-z0-9]+/g,' ').trim();
const day=value=>String(value||'').slice(0,10);
const shiftDay=(date,days)=>new Date(Date.parse(`${date}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);

// "Kansas State" is "Kansas St." and "K-State"; "UCF" is "Central Florida".
const EXTRA_NAMES={kstate:['k state','kansas state'],ucf:['central florida'],byu:['brigham young'],tcu:['texas christian'],'west-virginia':['wvu','west virginia'],'arizona-state':['asu'],'oklahoma-state':['osu'],kansas:['ku'],pitt:['pittsburgh'],california:['california','cal'],'north-carolina':['unc'],
  // Clemson writes "Miami (Fla.)" (football Oct 3, volleyball Oct 9).
  miami:['miami fla','miami fl'],
  // MAC opponents write "Miami (Ohio)", "Miami (OH)" or plain "Miami";
  // "UMass" is "Massachusetts".
  'miami-oh':['miami','miami ohio','miami oh','miami university','miami university oh'],umass:['massachusetts'],'bowling-green':['bowling green state','bgsu'],
  // Big West opponents write "Long Beach St.", "Cal State Northridge",
  // "CSUB", "UCSB" and the like.
  'cal-baptist':['california baptist','cbu'],'cal-poly':['cal poly slo','cal poly san luis obispo'],'csu-bakersfield':['cal state bakersfield','csub','bakersfield'],
  'cal-state-fullerton':['csuf','csu fullerton','fullerton'],csun:['cal state northridge','csu northridge','northridge'],'long-beach-state':['long beach st','lbsu','long beach','cal state long beach'],
  'uc-irvine':['uci','california irvine'],'uc-riverside':['ucr','california riverside'],'uc-san-diego':['ucsd','california san diego'],'uc-santa-barbara':['ucsb','california santa barbara'],
  'sacramento-state':['sacramento st','sac state'],'utah-valley':['uvu'],
  // American opponents write "FAU", "USF", "UTSA", "UAB", "ECU" and the like.
  'south-florida':['south fla'],'north-texas':['unt'],uab:['alabama birmingham'],utsa:['ut san antonio','texas san antonio'],
  'east-carolina':['ecu'],'wichita-state':['wichita st','wichita'],charlotte:['unc charlotte'],
  // Conference USA opponents write "Jax State", "KSU", "MTSU", "NMSU",
  // "Sam Houston State", "WKU" and the like.
  fiu:['fla international'],'jacksonville-state':['jax state','jacksonville st'],'kennesaw-state':['kennesaw'],
  'middle-tennessee':['middle tenn','middle tennessee state','mtsu','middle tenn st'],'missouri-state':['missouri st'],'new-mexico-state':['new mexico st','nmsu'],
  'sam-houston':['sam houston state','sam houston st','shsu'],'western-kentucky':['western ky'],delaware:['ud'],
  // WCC opponents write "Saint Mary's (Calif.)", "St.
  // Mary's" (its "St." reads as "State" here), "USD", "Seattle", "Denver".
  'saint-marys':['saint mary s','st mary s','saint mary s calif','saint mary s ca','st mary s ca','state mary s'],'san-diego':['usd'],'seattle-u':['seattle','seattle university'],'san-francisco':['usf','usf dons'],
  // Atlantic 10 opponents write "GW", "Bonnies", "St. Joseph's" (its "St."
  // reads as "State" here), "SLU", "URI", "Loyola (Ill.)", "Mason".
  'george-washington':['gw','george washington'],'st-bonaventure':['bonnies'],'saint-josephs':['state joseph s','st joseph s','saint joseph s'],
  'saint-louis':['slu'],'rhode-island':['uri'],'loyola-chicago':['loyola ill','loyola il'],'george-mason':['mason'],'vcu':['virginia commonwealth'],
  // Missouri Valley opponents write "Illinois St.", "SIU", "UNI", "Valpo",
  // "Southern Ill.", "Murray St.", "Illinois-Chicago".
  'illinois-state':['illinois st'],'southern-illinois':['siu','southern ill'],'northern-iowa':['uni'],valparaiso:['valpo'],uic:['illinois chicago'],'murray-state':['murray st'],'indiana-state':['indiana st'],
  // ASUN and UAC opponents write "APSU", "Central Ark.", "EKU", "Florida
  // Gulf Coast", "UNA", "North Fla.", "Queens (N.C.)", "UWG", "ACU", "UALR",
  // "UTA", "UWF".
  'austin-peay':['apsu','austin peay state'],'central-arkansas':['uca','central ark'],'eastern-kentucky':['eku','eastern ky'],fgcu:['florida gulf coast','fla gulf coast'],jacksonville:['ju'],'north-alabama':['una','north ala'],'north-florida':['unf','north fla'],queens:['queens nc','queens n c','queens university of charlotte'],'west-georgia':['uwg','west ga'],'abilene-christian':['acu'],'little-rock':['ualr','arkansas little rock'],'tarleton-state':['tarleton'],'ut-arlington':['uta','texas arlington'],'west-florida':['uwf','west fla'],
  // America East opponents write "Albany", "UNH", "UML", "UVM".
  ualbany:['albany','university at albany','albany ny'],'new-hampshire':['unh'],'umass-lowell':['uml','massachusetts lowell'],vermont:['uvm'],umbc:['maryland baltimore county'],njit:['new jersey tech']};
// A member that plays a sport outside the conference: Notre Dame football is
// independent of the ACC (Miami's Nov 7 game at Notre Dame is non-conference).
const OUTSIDE={ACC:{Football:new Set(['notre-dame'])}};
// A school of another conference that is a member for some teams: Hawaii
// (Mountain West since 2026) stays in the Big West for men's volleyball,
// beach volleyball and women's water polo (bigwest.org, Jul 1, 2026). The
// team is told by its schedule page.
const AFFILIATES={'Big West':[{names:['hawaii','hawai i','rainbow warriors','rainbow wahine'],id:'hawaii',teams:{'Volleyball':/\/sports\/(?:mens-volleyball|mvball)\//,'Beach Volleyball':/./,'Water Polo':/\/sports\/(?:womens-water-polo|wwpolo)\//}}],
  // ASUN lacrosse's outside members (Queens's and Bellarmine's conference
  // schedules, Oct 23): men's Air Force, Utah, Mercer; women's Kennesaw State,
  // Austin Peay (UAC), Lindenwood, Coastal Carolina, Delaware, Liberty.
  // UAC football's outside member: West Florida (ASUN), Austin Peay's and its
  // own conference schedules, Oct 23.
  'UAC':[{names:['west florida','uwf','university of west florida'],id:'west-florida',teams:{'Football':/\/sports\/football\//}}],
  'ASUN':[{names:['air force', 'air force academy'],id:'air-force',teams:{'Lacrosse':/\/sports\/(?:mens-lacrosse|mlax)\//}},{names:['utah', 'university of utah'],id:'utah',teams:{'Lacrosse':/\/sports\/(?:mens-lacrosse|mlax)\//}},{names:['mercer', 'mercer university'],id:'mercer',teams:{'Lacrosse':/\/sports\/(?:mens-lacrosse|mlax)\//}},{names:['kennesaw state', 'kennesaw state university'],id:'kennesaw-state',teams:{'Lacrosse':/\/sports\/(?:womens-lacrosse|wlax)\//}},{names:['austin peay', 'austin peay university', 'austin peay state university', 'apsu'],id:'austin-peay',teams:{'Lacrosse':/\/sports\/(?:womens-lacrosse|wlax)\//}},{names:['lindenwood', 'lindenwood university'],id:'lindenwood',teams:{'Lacrosse':/\/sports\/(?:womens-lacrosse|wlax)\//}},{names:['coastal carolina', 'coastal carolina university'],id:'coastal-carolina',teams:{'Lacrosse':/\/sports\/(?:womens-lacrosse|wlax)\//}},{names:['delaware', 'university of delaware'],id:'delaware',teams:{'Lacrosse':/\/sports\/(?:womens-lacrosse|wlax)\//}},{names:['liberty', 'liberty university'],id:'liberty',teams:{'Lacrosse':/\/sports\/(?:womens-lacrosse|wlax)\//}}]};

// Sports a conference does not sponsor (2026-27). A team in one plays no
// conference schedule or plays in another league (Ole Miss and West Virginia
// rifle; Ole Miss's page marks its Ohio State dual a conference match, Sep 26),
// so the membership conference never names its record. A module that knows
// the league names it (event.conference_name: Kentucky's men's soccer in the
// Sun Belt, Ohio State's women's hockey in the WCHA).
const NOT_SPONSORED={
  'Big 12':new Set(['Rifle','Bowling','Fencing','Field Hockey','Hockey','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  SEC:new Set(['Rifle','Bowling','Beach Volleyball','Fencing','Field Hockey','Hockey','Lacrosse','Rowing','Wrestling','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  'Big Ten':new Set(['Rifle','Bowling','Beach Volleyball','Fencing','Equestrian','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  ACC:new Set(['Rifle','Bowling','Beach Volleyball','Equestrian','Hockey','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The new Pac-12's sports (its July 1, 2026 launch release): no beach
  // volleyball (Boise State's), rowing, lacrosse or equestrian.
  'Pac-12':new Set(['Rifle','Bowling','Beach Volleyball','Equestrian','Fencing','Field Hockey','Hockey','Lacrosse','Rowing','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The Big East plays no football (UConn independent, Georgetown and
  // Villanova in the Patriot League, Butler in the Pioneer), hockey
  // (UConn's Hockey East), wrestling or gymnastics.
  'Big East':new Set(['Football','Hockey','Wrestling','Gymnastics','Rifle','Bowling','Beach Volleyball','Equestrian','Fencing','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The Big Sky (2026-27, with Southern Utah and Utah Tech) sponsors football,
  // basketball, cross country, track, golf, tennis, women's soccer, softball
  // and volleyball: no baseball (Utah Tech's), swimming (Northern Arizona's,
  // Idaho's), gymnastics (Southern Utah's), hockey, wrestling or rowing.
  'Big Sky':new Set(['Baseball','Swimming & Diving','Gymnastics','Hockey','Wrestling','Lacrosse','Rowing','Field Hockey','Rifle','Bowling','Beach Volleyball','Equestrian','Fencing','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The Sun Belt (2026-27, with Louisiana Tech, Texas State gone) sponsors
  // football, basketball, baseball, softball, soccer, volleyball, beach
  // volleyball, cross country, track, golf and tennis: no swimming (its
  // championship ended after 2025: JMU and Marshall swim in the American,
  // ODU and Georgia Southern in the ASUN), lacrosse (James Madison's), field
  // hockey (Old Dominion's, JMU's), wrestling (App State's, ODU's), rowing,
  // hockey or gymnastics.
  'Sun Belt':new Set(['Swimming & Diving','Lacrosse','Field Hockey','Wrestling','Rowing','Hockey','Gymnastics','Rifle','Bowling','Equestrian','Fencing','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The Mountain West (2026-27: Air Force, Grand Canyon, Hawaii, Nevada, New
  // Mexico, San Jose State, UC Davis, UNLV, UTEP, Wyoming; Northern Illinois
  // for football) sponsors football, basketball, baseball, softball, soccer
  // (men's from 2026-27, Utah Tech an affiliate), volleyball, cross country,
  // track, golf, tennis and swimming: no gymnastics (two teams left),
  // wrestling (Air Force's and Wyoming's in the Big 12), beach volleyball,
  // rifle, skiing (New Mexico's in the RMISA) or water polo.
  'Mountain West':new Set(['Gymnastics','Wrestling','Beach Volleyball','Rifle','Skiing','Water Polo','Lacrosse','Field Hockey','Rowing','Hockey','Bowling','Equestrian','Fencing','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The MAC (2026-27: Akron, Ball State, Bowling Green, Buffalo, Central
  // Michigan, Eastern Michigan, Kent State, Miami (OH), Ohio, Toledo, UMass,
  // Western Michigan; Sacramento State for football) sponsors football,
  // basketball, baseball, softball, soccer, volleyball, cross country, track,
  // golf, tennis, swimming, gymnastics, wrestling, field hockey and women's
  // lacrosse: no hockey (Miami's and Bowling Green's in the CCHA/NCHC,
  // UMass's in Hockey East), rowing or rifle.
  MAC:new Set(['Hockey','Rowing','Rifle','Bowling','Beach Volleyball','Equestrian','Fencing','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The Big West (2026-27: Cal Baptist, Cal Poly, CSU Bakersfield, Cal State
  // Fullerton, CSUN, Long Beach State, UC Irvine, UC Riverside, UC San Diego,
  // UC Santa Barbara, Sacramento State, Utah Valley; Hawaii an affiliate)
  // sponsors basketball, baseball, softball, soccer, volleyball (both),
  // beach volleyball, water polo, cross country, track, golf and tennis: no
  // football (Cal Poly's in the Big Sky, Sacramento State's in the MAC),
  // swimming, wrestling (Utah Valley's in the Big 12) or rowing.
  'Big West':new Set(['Football','Swimming & Diving','Gymnastics','Wrestling','Hockey','Lacrosse','Field Hockey','Rowing','Rifle','Bowling','Equestrian','Fencing','Skiing','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The American (2026-27: Charlotte, East Carolina, FAU, Memphis, North
  // Texas, Rice, South Florida, Temple, Tulane, Tulsa, UAB, UTSA, Wichita
  // State; Army and Navy for football only) sponsors football, basketball,
  // baseball, softball, soccer, volleyball, golf, tennis, cross country,
  // track, women's swimming and lacrosse: no beach volleyball, gymnastics,
  // wrestling, field hockey, hockey or rowing (Tulsa rows in the Big 12).
  American:new Set(['Beach Volleyball','Gymnastics','Wrestling','Hockey','Field Hockey','Rowing','Rifle','Bowling','Equestrian','Fencing','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // Conference USA (2026-27: Delaware, FIU, Jacksonville State, Kennesaw
  // State, Liberty, Middle Tennessee, Missouri State, New Mexico State, Sam
  // Houston, Western Kentucky) sponsors football, basketball, baseball,
  // softball, soccer, volleyball, beach volleyball, golf, tennis, cross
  // country, track and swimming: no field hockey, lacrosse, rowing,
  // wrestling or gymnastics.
  'Conference USA':new Set(['Gymnastics','Wrestling','Hockey','Field Hockey','Lacrosse','Rowing','Rifle','Bowling','Equestrian','Fencing','Skiing','Water Polo','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The WCC (2026-27: LMU, Pacific, Pepperdine, Portland, Saint Mary's, San
  // Diego, San Francisco, Santa Clara, Seattle U, Denver) sponsors
  // basketball, baseball, softball, soccer, volleyball (both), beach
  // volleyball, golf, tennis, cross country, track, swimming, rowing and
  // men's water polo (with Air Force, San José State and UC Davis): no
  // football, field hockey, lacrosse, hockey, wrestling or gymnastics.
  WCC:new Set(['Football','Gymnastics','Wrestling','Hockey','Field Hockey','Lacrosse','Rifle','Bowling','Equestrian','Fencing','Skiing','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The Atlantic 10 (2026-27: Davidson, Dayton, Duquesne, Fordham, George
  // Mason, George Washington, La Salle, Loyola Chicago, Rhode Island,
  // Richmond, St. Bonaventure, Saint Joseph's, Saint Louis, VCU) sponsors
  // basketball, baseball, softball, soccer, volleyball, golf, tennis, cross
  // country, track, swimming, rowing, field hockey and women's lacrosse: no
  // football, wrestling, gymnastics, hockey or water polo.
  'Atlantic 10':new Set(['Football','Gymnastics','Wrestling','Hockey','Water Polo','Rifle','Bowling','Beach Volleyball','Equestrian','Fencing','Skiing','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The Missouri Valley (2026-27: Belmont, Bradley, Drake, Evansville,
  // Illinois State, Indiana State, Murray State, Northern Iowa, Southern
  // Illinois, UIC, Valparaiso) sponsors basketball, baseball, softball,
  // soccer, volleyball, golf, tennis, cross country, track and swimming: no
  // football (the Missouri Valley Football Conference is its own league),
  // wrestling, gymnastics, hockey, rowing or lacrosse.
  // The ASUN (2026-27: Bellarmine, FGCU, Jacksonville, Lipscomb, North
  // Florida, Queens, Stetson, West Florida; its conference schedules, Oct 23)
  // sponsors basketball, baseball, softball, soccer, volleyball, beach
  // volleyball, golf, tennis, cross country, track and women's lacrosse: no
  // football, swimming, rowing, wrestling or gymnastics.
  // The America East (2026-27: UAlbany, Binghamton, Bryant, Maine, New
  // Hampshire, NJIT, UMass Lowell, UMBC, Vermont) sponsors basketball,
  // baseball, softball, soccer, volleyball, cross country, track, swimming,
  // tennis, field hockey and lacrosse: no football (CAA), hockey (Hockey
  // East), wrestling, rowing or golf.
  'America East':new Set(['Football','Hockey','Wrestling','Rowing','Golf','Gymnastics','Water Polo','Rifle','Bowling','Beach Volleyball','Equestrian','Fencing','Skiing','Acrobatics & Tumbling','STUNT','Triathlon']),
  // The UAC (2026-27: Abilene Christian, Austin Peay, Central Arkansas,
  // Eastern Kentucky, Little Rock, North Alabama, Tarleton State, UT
  // Arlington, West Georgia; Austin Peay's volleyball conference games and
  // Central Arkansas's golf stories, Oct 23) sponsors football and the
  // ASUN's other sports; its beach volleyball and lacrosse are not confirmed.
  'UAC':new Set(['Swimming & Diving','Rowing','Lacrosse','Beach Volleyball','Gymnastics','Wrestling','Hockey','Field Hockey','Water Polo','Rifle','Bowling','Equestrian','Fencing','Skiing','Acrobatics & Tumbling','STUNT','Triathlon']),
  'ASUN':new Set(['Football','Swimming & Diving','Rowing','Gymnastics','Wrestling','Hockey','Field Hockey','Water Polo','Rifle','Bowling','Equestrian','Fencing','Skiing','Acrobatics & Tumbling','STUNT','Triathlon']),
  'Missouri Valley':new Set(['Football','Gymnastics','Wrestling','Hockey','Rowing','Lacrosse','Field Hockey','Water Polo','Rifle','Bowling','Beach Volleyball','Equestrian','Fencing','Skiing','Acrobatics & Tumbling','STUNT','Triathlon'])
};

// membersOf(conference): the conference's catalog entries (the Worker loads
// them from D1 with the requested school; the bundled list otherwise). The
// name map is kept per member list.
export function createConferenceGames({schools=[],membersOf=conference=>schools.filter(s=>s.conference===conference)}){
  const memberNames=new WeakMap();
  const namesOf=conference=>{
    const members=membersOf(conference);
    if(!memberNames.has(members)){
      const names=new Map();
      for(const school of members)
        for(const name of [school.name,school.short_name,...(EXTRA_NAMES[school.id]||[])])names.set(words(name),school.id);
      memberNames.set(members,names);
    }
    return memberNames.get(members);
  };
  // Postseason and tournament games are not in a conference record.
  const POSTSEASON=/\b(?:tournament|tourney|championships?|regional|super regional|ncaa|bowl|playoff)\b/i;

  function markConferenceGames(events,raw,school,sourceUrl=''){
    if(!Array.isArray(events)||!events.length||!school?.conference)return events;
    markGames(events,raw,school,sourceUrl);
    const unsponsored=NOT_SPONSORED[school.conference];
    if(unsponsored)for(const event of events)if(unsponsored.has(event.sport)&&!event.conference_name)event.conference_game=false;
    return events;
  }
  function markGames(events,raw,school,sourceUrl){
    // SIDEARM's older page marks its conference games on the row (Big Sky,
    // Oct 21: Idaho State's football page marks Cal Poly, a football-only
    // Big Sky member); a page that marks none has no flags.
    const nuxt=/__NUXT_DATA__/.test(String(raw||'')),classic=!nuxt&&/<li\b[^>]*class="sidearm-schedule-game\s/.test(String(raw||''));
    const pageGames=nuxt||classic?sidearmScheduleGames(raw):[];
    const flagged=pageGames.filter(game=>typeof game.conference==='boolean');
    const games=classic&&!flagged.some(game=>game.conference)?[]:flagged;
    if(games.length){
      // The same page data marks exhibitions (type "S"), which records leave
      // out even when a card does not say so (Oklahoma State soccer at Tulsa,
      // Aug 6: okstate.com publishes 5-4-3 without it).
      for(const event of events){
        if(!event.start_time||!event.opponent)continue;
        const opponent=words(event.opponent),dates=new Set([day(event.start_time),shiftDay(day(event.start_time),-1)]);
        const found=games.filter(game=>dates.has(day(game.date))&&(()=>{const other=words(game.opponent?.title);return other&&(other===opponent||other.includes(opponent)||opponent.includes(other));})());
        if(!found.length||!found.every(game=>game.conference===found[0].conference&&game.type===found[0].type))continue;
        if(typeof event.conference_game!=='boolean')event.conference_game=found[0].conference;
        if(found[0].type==='S')event.exhibition=true;
      }
      return events;
    }
    // No page-data flags: membership. A game the page bills as a crossover
    // with another league ("Pac-12 Crossover": Utah Valley men's soccer at Cal
    // Poly, Oct 14, whose men's soccer plays in the Pac-12) is not a league
    // game; gouvu.com counts Big West play 4-1 without it.
    const members=namesOf(school.conference);
    const crossover=pageGames.filter(game=>/\bcrossover\b/i.test(game.promotion||''));
    for(const event of events){
      if(typeof event.conference_game==='boolean'||!event.opponent)continue;
      if(event.start_time&&crossover.some(game=>day(game.date)===day(event.start_time)&&words(game.opponent?.title)===words(event.opponent))){event.conference_game=false;continue;}
      const opponent=words(event.opponent),path=(()=>{try{return new URL(sourceUrl).pathname}catch{return''}})();
      const affiliate=(AFFILIATES[school.conference]||[]).find(a=>a.names.includes(opponent)&&a.teams[event.sport]?.test(path));
      const id=members.get(opponent)||affiliate?.id;
      event.conference_game=Boolean(id&&id!==school.id&&!OUTSIDE[school.conference]?.[event.sport]?.has(id)&&!POSTSEASON.test(`${event.opponent} ${event.title||''}`));
    }
    return events;
  }
  return{markConferenceGames};
}
