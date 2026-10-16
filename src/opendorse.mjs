// Athlete Instagram from the school's official NIL marketplace on Opendorse
// (user, October 8: approved as the next athlete source, after official roster
// cards and profile pages and before profile cards; "Yes when I get my usage
// back"). Rules:
// - only schools whose official site links their marketplace (the module's
//   `opendorse: {marketplace, team}`; homepages checked October 16);
// - only athletes on the school's current official roster, looked up by name
//   at opendorse.com/profile/<first-last>;
// - the profile must name the same athlete and the sport, and carry the
//   school as its team: Opendorse lists a marketplace's own athletes under
//   previousTeams with currentTeams empty (Madison Booker, Colton Vasek,
//   Oct 16), so currentTeams decides when it has entries (an athlete now on
//   another team) and previousTeams otherwise; a name shared with another
//   school's athlete (taylor-harvey: Delaware State golf) does not match;
// - an empty or blocked handle is not used. Athletes enter these handles
//   themselves (less certain than an official link; the user accepted this).
// robots.txt allows /profile/ (only /search is disallowed).
export const OPENDORSE_PROFILE='https://opendorse.com/profile/';

export const plain=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
export const opendorseSlug=name=>plain(name).replace(/['’.]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const sameName=(a,b)=>plain(a).replace(/[^a-z0-9]+/g,' ').trim()===plain(b).replace(/[^a-z0-9]+/g,' ').trim();
// "Women's Track and Field" → "track & field".
const sportKey=s=>plain(s).replace(/\b(?:men|women)'?s\b/g,'').replace(/\band\b/g,'&').replace(/\s+/g,' ').trim();

export function opendorseProfile(html){
  const m=String(html||'').match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if(!m)return null;
  try{return JSON.parse(m[1])?.props?.pageProps?.initialState?.profile?.profileData||null}catch{return null}
}

// The athlete's Instagram when the profile passes every rule; null otherwise.
export function opendorseInstagram(html,{name,team,sport,blocked=new Set()}){
  const profile=opendorseProfile(html);if(!profile)return null;
  if(!sameName(`${profile.firstName||''} ${profile.lastName||''}`,name))return null;
  const teams=(profile.currentTeams||[]).length?profile.currentTeams:(profile.previousTeams||[]);
  if(!teams.some(t=>sameName(t,team)))return null;
  if(!(profile.sports||[]).some(s=>sportKey(s)===sportKey(sport)))return null;
  return instagramFrom(profile.instagramUrl,blocked);
}
// An Instagram address or handle as the app stores it, or null (empty,
// blocked, not Instagram, not a profile).
export function instagramFrom(value,blocked=new Set()){
  const raw=String(value||'').trim();if(!raw)return null;
  let url;try{url=new URL(/^https?:\/\//i.test(raw)?raw:/instagram\.com/i.test(raw)?`https://${raw.replace(/^\/+/,'')}`:`https://www.instagram.com/${raw.replace(/^@/,'')}`)}catch{return null}
  if(!/(?:^|\.)instagram\.com$/i.test(url.hostname))return null;
  const parts=url.pathname.split('/').filter(Boolean),handle=(parts[0]||'').replace(/^@/,'').toLowerCase();
  if(parts.length!==1||!/^[a-z0-9._]{2,30}$/.test(handle)||blocked.has(handle))return null;
  return`https://www.instagram.com/${handle}/`;
}
