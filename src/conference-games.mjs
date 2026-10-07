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
const EXTRA_NAMES={kstate:['k state','kansas state'],ucf:['central florida'],byu:['brigham young'],tcu:['texas christian'],'west-virginia':['wvu','west virginia'],'arizona-state':['asu'],'oklahoma-state':['osu'],kansas:['ku']};

export function createConferenceGames({schools}){
  const memberNames=new Map();
  const namesOf=conference=>{
    if(!memberNames.has(conference)){
      const names=new Map();
      for(const school of schools.filter(s=>s.conference===conference))
        for(const name of [school.name,school.short_name,...(EXTRA_NAMES[school.id]||[])])names.set(words(name),school.id);
      memberNames.set(conference,names);
    }
    return memberNames.get(conference);
  };
  // Postseason and tournament games are not in a conference record.
  const POSTSEASON=/\b(?:tournament|tourney|championships?|regional|super regional|ncaa|bowl|playoff)\b/i;

  function markConferenceGames(events,raw,school){
    if(!Array.isArray(events)||!events.length||!school?.conference)return events;
    const games=/__NUXT_DATA__/.test(String(raw||''))?sidearmScheduleGames(raw).filter(game=>typeof game.conference==='boolean'):[];
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
    // No page-data flags: membership.
    const members=namesOf(school.conference);
    for(const event of events){
      if(typeof event.conference_game==='boolean'||!event.opponent)continue;
      const id=members.get(words(event.opponent));
      event.conference_game=Boolean(id&&id!==school.id&&!POSTSEASON.test(`${event.opponent} ${event.title||''}`));
    }
    return events;
  }
  return{markConferenceGames};
}
