// High school to college (user, November 18, 2026: "What unique things should
// we add now?", then "Start with 2 then work your way through the rest"; item
// 1: a high school's former players now on college rosters). A college roster
// page names each player's hometown and high school; a player whose high
// school and hometown match one of the app's Kansas high schools is that
// school's.
//
// Roster pages read (the same pages the app reads for featured athletes):
// - SIDEARM's card list (Nuxt): `s-person-card` with the name in its heading
//   link, `<span class="sr-only">Hometown</span> Goodland, Kan.` and
//   `<span class="sr-only">Last School</span> Goodland` (K-State, Oklahoma);
// - SIDEARM's table (Nuxt): a row per player, `roster-table-cell--hometown`,
//   `roster-table-cell--high-school` (Missouri, Nebraska);
// - SIDEARM's classic list: `sidearm-roster-player-hometown`,
//   `sidearm-roster-player-highschool`.

export const ALUMNI_COLLEGES=['kstate','kansas','wichita-state','iowa-state','oklahoma-state','iowa','nebraska','creighton','missouri','oklahoma','tulsa','missouri-state','saint-louis','drake','northern-iowa','lindenwood','southeast-missouri','kansas-city','omaha','oral-roberts'];
export const COLLEGE_ALUMNI_MS=24*3600e3;
export const collegeAlumniKey=id=>`alumni:v1:college:${id}`;

const decode=s=>String(s??'').replace(/&amp;/g,'&').replace(/&#39;|&#x27;|&rsquo;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const text=s=>decode(String(s??'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();

// One roster page's players: name, hometown, high school, previous school,
// position and class when the page gives them.
export function rosterHometowns(html,base=''){
  const raw=String(html||''),out=[];
  const abs=href=>{if(!href)return null;try{return new URL(decode(href),base||undefined).toString()}catch{return null}};
  // SIDEARM's Nuxt pages keep the roster in `__NUXT_DATA__` (a flat array
  // whose objects point at their values by index): every player's
  // `full_name`, `hometown`, `high_school`, `previous_school`, `slug`, class
  // and position, whatever the visible layout (Missouri's list shows no
  // hometown at all).
  const nuxt=raw.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if(nuxt){
    try{
      const data=JSON.parse(nuxt[1]);
      const at=v=>typeof v==='number'&&v>=0&&v<data.length?data[v]:v;
      const field=(o,k)=>{const v=at(o?.[k]);return typeof v==='string'?v:null};
      const nested=(o,k,f)=>{const v=at(o?.[k]);return v&&typeof v==='object'?field(v,f):null};
      for(const o of data){
        if(!o||typeof o!=='object'||Array.isArray(o)||!('hometown' in o)||!('high_school' in o))continue;
        const name=field(o,'full_name')||[field(o,'first_name'),field(o,'last_name')].filter(Boolean).join(' ');
        const hometown=field(o,'hometown');if(!name||!hometown)continue;
        const slug=field(o,'slug');
        const href=slug?raw.match(new RegExp(`href="([^"]*/roster/(?:player/)?${slug.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:/\\d+)?)"`))?.[1]:null;
        out.push({name:text(name),hometown:text(hometown),high_school:text(field(o,'high_school')||''),previous_school:text(field(o,'previous_school')||'')||null,position:nested(o,'player_position','abbreviation')||nested(o,'player_position','name')||null,year:nested(o,'class_level','name')||null,url:abs(href)});
      }
    }catch{}
  }
  // Cards: each card from its opening to the next.
  const cards=out.length?[]:raw.split(/<div[^>]*class="[^"]*\bs-person-card\b(?![-_])[^"]*"/).slice(1);
  for(const card of cards){
    const hometown=card.match(/<span class="sr-only">Hometown<\/span>([\s\S]*?)<\/span>/)?.[1];
    if(hometown==null)continue;
    const school=card.match(/<span class="sr-only">(?:Last School|High School)<\/span>([\s\S]*?)<\/span>/)?.[1];
    const previous=card.match(/<span class="sr-only">Previous School<\/span>([\s\S]*?)<\/span>/)?.[1];
    const link=card.match(/<a[^>]*href="([^"]*\/roster\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const heading=card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1];
    const name=text(heading||link?.[2]||'');
    const position=text(card.match(/s-person-details__bio-stats-item[^>]*>\s*<span class="sr-only">Position<\/span>([\s\S]*?)<\/span>/)?.[1]||'');
    const year=text(card.match(/<span class="sr-only">(?:Academic Year|Class)<\/span>([\s\S]*?)<\/span>/)?.[1]||'');
    if(name)out.push({name,hometown:text(hometown),high_school:text(school||''),previous_school:text(previous||'').replace(/^Previous School:\s*/i,'')||null,position:position||null,year:year||null,url:abs(link?.[1])});
  }
  // Table rows.
  if(!out.length)for(const row of raw.split(/<tr\b/).slice(1)){
    const cell=key=>{const m=row.match(new RegExp(`roster-table-cell--${key}"[^>]*>([\\s\\S]*?)</td>`));return m?text(m[1]):null};
    const hometown=cell('hometown');if(hometown==null)continue;
    const link=row.match(/<a[^>]*href="([^"]*\/roster\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const name=text(link?.[2]||'');
    if(name)out.push({name,hometown,high_school:cell('high-school')||'',previous_school:cell('previous-school')||null,position:cell('player-position-name')||cell('player-position-short')||null,year:cell('class-level-name')||cell('class-level-short')||null,url:abs(link?.[1])});
  }
  // Classic list.
  if(!out.length)for(const item of raw.split(/<li[^>]*class="[^"]*sidearm-roster-player\b(?![-_])[^"]*"/).slice(1)){
    const pick=key=>{const m=item.match(new RegExp(`class="[^"]*sidearm-roster-player-${key}\\b[^"]*"[^>]*>([\\s\\S]*?)</(?:span|div|p)>`));return m?text(m[1]):null};
    const hometown=pick('hometown');if(hometown==null)continue;
    const link=item.match(/<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const name=text(link?.[2]||'');
    if(name)out.push({name,hometown,high_school:pick('highschool')||'',previous_school:pick('previous-school')||null,position:pick('position')||null,year:pick('academic-year')||null,url:abs(link?.[1])});
  }
  // A page lists a player once.
  const seen=new Set();
  return out.filter(p=>{const k=`${p.name}|${p.hometown}`;if(seen.has(k))return false;seen.add(k);return true});
}

// "Seneca, Kan." → {city:'Seneca',state:'KS'}.
const STATE_ABBR={'kan':'KS','kans':'KS','kansas':'KS','ks':'KS'};
export function hometownParts(hometown){
  const m=String(hometown||'').match(/^\s*([^,/]+?)\s*,\s*([A-Za-z. ]+?)\.?\s*$/);
  if(!m)return null;
  const state=STATE_ABBR[m[2].toLowerCase().replace(/\./g,'').trim()]||m[2].trim();
  return{city:m[1].trim(),state};
}
// "Junction City HS", "Free State High School", "St. Marys": the school's
// name without "High School", "HS", "Jr/Sr"; "St." is "Saint".
export const highSchoolKey=s=>String(s||'').toLowerCase().replace(/\(.*?\)/g,' ')
  .replace(/\b(?:junior\s*\/\s*senior|jr\.?\s*[-/]\s*sr\.?)\b/g,' ')
  .replace(/\b(?:high school|high|hs|h\.s\.)\b/g,' ').replace(/\bst\.?\s/g,'saint ').replace(/\bco\b/g,'county')
  .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const cityKey=s=>String(s||'').toLowerCase().replace(/\bst\.?\s/g,'saint ').replace(/[^a-z0-9]+/g,' ').trim();

// The app's Kansas high school a player came from: the roster's high school
// is one of the school's names AND the hometown is in Kansas and is the
// school's city or one of its towns (`towns`): "Blue Valley" from Leawood or
// Stilwell is Blue Valley High (Overland Park), not Blue Valley of Randolph.
export function alumniMatcher(highSchools){
  const byName=new Map();
  for(const s of highSchools){
    for(const n of new Set([s.name,s.short_name,...(s.aliases||[])].filter(Boolean).map(highSchoolKey).filter(k=>k&&k.length>2))){
      if(!byName.has(n))byName.set(n,[]);byName.get(n).push(s);
    }
  }
  return player=>{
    const home=hometownParts(player?.hometown);if(!home||home.state!=='KS')return null;
    // "Mill Valley/Coffeyville CC", "Centennial / Utah / San Diego State":
    // a table's high school cell may go on with the later schools.
    const first=String(player.high_school||'').split('/')[0];
    const named=byName.get(highSchoolKey(player.high_school))||byName.get(highSchoolKey(first))||[];
    return named.find(s=>[s.city,...(s.towns||[])].some(t=>cityKey(t)===cityKey(home.city)))||null;
  };
}

// A college's index: every rostered player whose high school is one of the
// app's, by sport.
export function collegeAlumniIndex(college,pages,match){
  const players=[];
  for(const page of pages){
    for(const p of page.players){
      const school=match(p);if(!school)continue;
      players.push({school_id:school.id,name:p.name,sport:page.sport,team:page.team||null,position:p.position,year:p.year,url:p.url,hometown:p.hometown,high_school:p.high_school,college_id:college.id});
    }
  }
  return players;
}
