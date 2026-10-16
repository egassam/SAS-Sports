// Athlete Instagram from the school's INFLCR Exchange (Teamworks), the NIL
// marketplace most Big Ten and ACC schools link from their official NIL page
// (user, October 16: "Fix all the schools from the nil"; the same kind of
// source as Opendorse, src/opendorse.mjs, and the same rules):
// - only schools whose official site links their exchange (the module's
//   `inflcr: {school}`; NIL pages checked October 16);
// - only athletes on the school's current official roster, looked up by
//   name on the exchange's public athlete list (the one the public exchange
//   page reads, no sign-in: api.inflcr.com/public/schools/<school>/athletes
//   ?name=; api.inflcr.com robots.txt disallows nothing);
// - the record must name the same athlete and a team of the same sport (team
//   names vary: "Utah Football", "USC T&F", "University of Michigan
//   Track/Field & XC", "MBB"); every record on a school's exchange is that
//   school's;
// - an empty or blocked handle is not used. Athletes connect these accounts
//   themselves.
import {sameName,plain,instagramFrom} from './opendorse.mjs';
export const INFLCR_SCHOOLS='https://api.inflcr.com/public/schools/';

// The app's sports a team name covers ("Track/Field & XC": both).
const TEAM_SPORTS=[
  [/\bbeach\b/,'Beach Volleyball'],[/(?<!beach )\bvolleyball\b|\bvb\b/,'Volleyball'],
  [/\bfootball\b|\bfb\b/,'Football'],[/\bbasketball\b|\b[mw]bb\b/,'Basketball'],
  [/\bsoccer\b/,'Soccer'],[/\bbaseball\b/,'Baseball'],[/\bsoftball\b/,'Softball'],
  [/\bgolf\b/,'Golf'],[/\btennis\b/,'Tennis'],[/\browing\b|\bcrew\b/,'Rowing'],
  [/\blacrosse\b|\blax\b/,'Lacrosse'],[/\bgymnastics\b/,'Gymnastics'],[/\bwrestling\b/,'Wrestling'],
  [/\bfencing\b/,'Fencing'],[/\brifle\b/,'Rifle'],[/\bbowling\b/,'Bowling'],[/\bwater polo\b/,'Water Polo'],
  [/\bfield hockey\b/,'Field Hockey'],[/(?<!field )\bhockey\b/,'Hockey'],
  [/\bswim|\bdiving\b/,'Swimming & Diving'],
  [/\btrack\b|\bt ?& ?f\b|\bt\/f\b/,'Track & Field'],[/\bxc\b|\bcross country\b/,'Cross Country'],
  [/\bskiing\b|\bski\b/,'Skiing'],[/\bequestrian\b/,'Equestrian'],[/\btriathlon\b/,'Triathlon'],
  [/\bacrobatics\b/,'Acrobatics & Tumbling'],[/\bstunt\b/,'STUNT']
];
export function inflcrTeamSports(team){
  const t=plain(team).replace(/track\/field/g,'track field');
  return new Set(TEAM_SPORTS.filter(([re])=>re.test(t)).map(([,sport])=>sport));
}
// Cross country runners are often on the track team's record.
const sportMatches=(team,sport)=>{const sports=inflcrTeamSports(team);return sports.has(sport)||(sport==='Cross Country'&&sports.has('Track & Field'))};

const records=payload=>{const data=payload?.data;return Array.isArray(data)?data:data&&typeof data==='object'?Object.values(data):[]};
// The athlete's Instagram from a name search's answer; null otherwise.
export function inflcrInstagram(payload,{name,sport,blocked=new Set()}){
  for(const record of records(payload)){
    if(!sameName(`${record.first_name||''} ${record.last_name||''}`,name))continue;
    if(!sportMatches(record.team,sport))continue;
    const profile=(record.social_profiles||[]).find(p=>p.social_provider===2);
    const url=instagramFrom(profile?.username||profile?.public_profile_url,blocked);
    if(url)return url;
  }
  return null;
}
