// The catalog of schools, teams and series (user, October 16: "The plan is to
// expand it for all middle schools, high schools in the country, all NCAA
// sports, and all pro events", then "Start the catalog move").
//
// The catalog lives in D1 (binding CATALOG_DB, database sas-sports-catalog),
// so the page loads its menus a step at a time (Level → group → city or
// league → entry) instead of downloading every entry, and the catalog can
// grow to tens of thousands of entries.
//
// Today the authored copy is still src/schools.json with
// src/sponsored-sports.json (reviewed in pull requests). Production copies
// it into D1 when its revision (a hash of the entries) differs from the
// database's. Previews share the database and never write to it. A preview
// whose catalog matches the database reads D1; one carrying catalog changes
// (or any read that fails) answers from the bundled copy, with the same
// rules and the same answers.
//
// Menu rules, as the page draws them:
// - High School: State, then City, then the school (sections: class).
// - College: Conference, then the school (sections: conference).
// - Pro: Sport, then League, then the team or series (sections: NFL
//   division, else league).

export const CATALOG_LEVELS=[
  {id:'high-school',group:s=>s.state||'',middle:s=>s.city||''},
  {id:'college',group:s=>s.conference||'',middle:null},
  {id:'pro',group:s=>s.pro_sport||'',middle:s=>s.league||''}
];
export const levelOf=s=>s?.level||'college';
const LEVEL_IDS=new Set(CATALOG_LEVELS.map(l=>l.id));
const rules=id=>CATALOG_LEVELS.find(l=>l.id===id)||CATALOG_LEVELS[1];

// What the page needs to know about an entry (no source settings: those
// stay with the Worker).
const CARD_FIELDS=['id','name','short_name','level','state','city','conference','league','pro_sport','classification','division'];
// Each card carries the team's colors (src/team-themes.json; the page keeps
// only the SAS default) and its sports, so the page holds no per-team list.
export function catalogCards(schools,sponsored,timeZoneOf,themes={}){
  return schools.filter(s=>Array.isArray(sponsored[s.id])&&sponsored[s.id].length).map(s=>{
    const card={};for(const f of CARD_FIELDS)if(s[f]!=null&&s[f]!=='')card[f]=s[f];
    if(!card.level)card.level='college';
    card.time_zone=timeZoneOf(s);card.sponsored_sports=sponsored[s.id];
    if(themes[s.id])card.theme=themes[s.id];
    return card;
  });
}
// The revision covers the cards, the full records and the rows derived from
// them (a changed source setting, or a changed rule for names, is a new
// revision too).
export async function catalogRevision(cards,records=[],derived=null){
  const bytes=new TextEncoder().encode(JSON.stringify(derived?[cards,records,derived]:records.length?[cards,records]:cards));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return[...digest.slice(0,12)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export const CATALOG_SCHEMA=[
  `CREATE TABLE IF NOT EXISTS catalog_entries(id TEXT PRIMARY KEY,level TEXT NOT NULL,grp TEXT NOT NULL,mid TEXT NOT NULL,sort INTEGER NOT NULL,card TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS catalog_by_menu ON catalog_entries(level,grp,mid,sort)`,
  `CREATE TABLE IF NOT EXISTS catalog_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
  // The full entry (source settings included) for the Worker's own lookups
  // by id; the page never reads it.
  `CREATE TABLE IF NOT EXISTS catalog_records(id TEXT PRIMARY KEY,entry TEXT NOT NULL)`,
  // Indexes for the lookups that used to scan every entry (catalog step 3):
  // each entry's names and aliases as the Worker normalizes them (opponent
  // matching), and each official site's host (the private-source allowlist).
  `CREATE TABLE IF NOT EXISTS catalog_names(name TEXT NOT NULL,id TEXT NOT NULL,sort INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS catalog_names_by_name ON catalog_names(name)`,
  `CREATE TABLE IF NOT EXISTS catalog_hosts(host TEXT NOT NULL,id TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS catalog_hosts_by_host ON catalog_hosts(host)`
];
// The derived rows: every entry's normalized names (in catalog order) and
// its official host. `normalize` is the Worker's own name rule.
export function catalogDerived(records,normalize){
  const names=[],hosts=[];
  records.forEach((r,sort)=>{
    for(const name of new Set([r.name,r.short_name,...(r.aliases||[])].map(normalize).filter(Boolean)))names.push([name,r.id,sort]);
    try{hosts.push([new URL(r.athletics_url).hostname.toLowerCase().replace(/^www\./,''),r.id])}catch{}
  });
  return{names,hosts};
}
const rowOf=(card,sort)=>{const r=rules(card.level);return{id:card.id,level:card.level,grp:r.group(card),mid:r.middle?r.middle(card):'',sort,card:JSON.stringify(card)}};

// Production only: replace the stored catalog when the revision changed, in
// one transaction (a reader sees the old catalog or the new one).
export async function syncCatalog(db,cards,revision,now=Date.now(),records=[],derived={names:[],hosts:[]}){
  await db.batch(CATALOG_SCHEMA.map(sql=>db.prepare(sql)));
  const stored=await db.prepare(`SELECT value FROM catalog_meta WHERE key='revision'`).first();
  if(stored?.value===revision)return'current';
  const insert=db.prepare(`INSERT INTO catalog_entries(id,level,grp,mid,sort,card) VALUES(?,?,?,?,?,?)`);
  const meta=db.prepare(`INSERT OR REPLACE INTO catalog_meta(key,value) VALUES(?,?)`);
  const record=db.prepare(`INSERT INTO catalog_records(id,entry) VALUES(?,?)`);
  const name=db.prepare(`INSERT INTO catalog_names(name,id,sort) VALUES(?,?,?)`),host=db.prepare(`INSERT INTO catalog_hosts(host,id) VALUES(?,?)`);
  await db.batch([
    db.prepare(`DELETE FROM catalog_entries`),db.prepare(`DELETE FROM catalog_records`),db.prepare(`DELETE FROM catalog_names`),db.prepare(`DELETE FROM catalog_hosts`),
    ...cards.map((card,i)=>{const r=rowOf(card,i);return insert.bind(r.id,r.level,r.grp,r.mid,r.sort,r.card)}),
    ...records.map(entry=>record.bind(entry.id,JSON.stringify(entry))),
    ...derived.names.map(row=>name.bind(...row)),...derived.hosts.map(row=>host.bind(...row)),
    meta.bind('revision',revision),meta.bind('count',String(cards.length)),meta.bind('records',String(records.length)),meta.bind('synced_at',new Date(now).toISOString())
  ]);
  return'synced';
}
export async function storedRevision(db){
  try{return(await db.prepare(`SELECT value FROM catalog_meta WHERE key='revision'`).first())?.value||null}catch{return null}
}
// D1 is read only when it holds this revision and every row of it.
export async function storeMatches(db,revision,count,records=0){
  try{
    const [meta,rows,full]=await Promise.all([storedRevision(db),db.prepare(`SELECT COUNT(*) AS n FROM catalog_entries`).first(),db.prepare(`SELECT COUNT(*) AS n FROM catalog_records`).first()]);
    return meta===revision&&Number(rows?.n)===count&&Number(full?.n)===records;
  }catch{return false}
}
// Full entries by id from D1 (the Worker's lookups; at most 50 a read).
export async function catalogRecords(db,ids){
  const list=[...new Set(ids.filter(Boolean))].slice(0,50);if(!list.length)return[];
  const {results}=await db.prepare(`SELECT entry FROM catalog_records WHERE id IN (${list.map(()=>'?').join(',')})`).bind(...list).all();
  return(results||[]).map(r=>JSON.parse(r.entry));
}

// The opponent an event names: the first entry in catalog order (other than
// the school itself) with a name equal to it, or, both longer than three
// letters, one containing the other (the Worker's rule, now one query).
export async function catalogOpponent(db,wanted,excludeId){
  if(!wanted)return null;
  const row=await db.prepare(`SELECT id FROM catalog_names WHERE id<>? AND (name=? OR (length(name)>3 AND length(?)>3 AND (instr(name,?)>0 OR instr(?,name)>0))) ORDER BY sort LIMIT 1`).bind(excludeId||'',wanted,wanted,wanted,wanted).first();
  return row?.id||null;
}
export async function catalogHostKnown(db,host){
  return Boolean(await db.prepare(`SELECT 1 AS ok FROM catalog_hosts WHERE host=? LIMIT 1`).bind(host).first());
}
// A conference's members (full records, catalog order).
export async function catalogMembers(db,conference){
  const {results}=await db.prepare(`SELECT entry FROM catalog_records WHERE json_extract(entry,'$.conference')=? ORDER BY rowid`).bind(conference).all();
  return(results||[]).map(r=>JSON.parse(r.entry));
}
// Every full record (the /schools listing for scripts), catalog order.
export async function catalogAllRecords(db){
  const {results}=await db.prepare(`SELECT entry FROM catalog_records ORDER BY rowid`).all();
  return(results||[]).map(r=>JSON.parse(r.entry));
}

// Two stores with one interface: D1, and the bundled cards (previews with
// catalog changes, a failed read, tests).
export function bundledStore(cards){
  const rows=cards.map(rowOf);
  return{
    kind:'bundled',
    async levels(){const n=new Map();for(const r of rows)n.set(r.level,(n.get(r.level)||0)+1);return CATALOG_LEVELS.map(l=>({id:l.id,count:n.get(l.id)||0}))},
    async groups(level){return[...new Set(rows.filter(r=>r.level===level).map(r=>r.grp))].filter(Boolean).sort()},
    async middles(level,group){return[...new Set(rows.filter(r=>r.level===level&&(!group||r.grp===group)).map(r=>r.mid))].filter(Boolean).sort()},
    async entries(level,group,middle){return rows.filter(r=>r.level===level&&(!group||r.grp===group)&&(!middle||r.mid===middle)).map(r=>JSON.parse(r.card))},
    async byIds(ids){const want=new Set(ids);return rows.filter(r=>want.has(r.id)).map(r=>JSON.parse(r.card))}
  };
}
export function d1Store(db){
  const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
  return{
    kind:'d1',
    async levels(){const n=new Map((await all(`SELECT level,COUNT(*) AS n FROM catalog_entries GROUP BY level`)).map(r=>[r.level,r.n]));return CATALOG_LEVELS.map(l=>({id:l.id,count:Number(n.get(l.id)||0)}))},
    async groups(level){return(await all(`SELECT DISTINCT grp FROM catalog_entries WHERE level=? AND grp<>'' ORDER BY grp`,level)).map(r=>r.grp)},
    async middles(level,group){return(await all(`SELECT DISTINCT mid FROM catalog_entries WHERE level=? AND (?='' OR grp=?) AND mid<>'' ORDER BY mid`,level,group,group)).map(r=>r.mid)},
    async entries(level,group,middle){return(await all(`SELECT card FROM catalog_entries WHERE level=? AND (?='' OR grp=?) AND (?='' OR mid=?) ORDER BY sort`,level,group,group,middle,middle)).map(r=>JSON.parse(r.card))},
    async byIds(ids){if(!ids.length)return[];return(await all(`SELECT card FROM catalog_entries WHERE id IN (${ids.map(()=>'?').join(',')}) ORDER BY sort`,...ids)).map(r=>JSON.parse(r.card))}
  };
}
// SQLite's ORDER BY sorts by bytes, JavaScript's sort() by UTF-16 code
// units: the same order for these names.

// One menu step: every level with its count (an empty level reads "Soon"),
// the level's groups, the chosen group's cities or leagues, and its entries.
export async function catalogMenu(store,params){
  // A group or city the level no longer has (a saved choice, a stale link)
  // reads as "All", never as an empty list.
  const level=LEVEL_IDS.has(params.level)?params.level:'college',hasMiddle=Boolean(rules(level).middle);
  const [levels,groups]=await Promise.all([store.levels(),store.groups(level)]);
  const group=groups.includes(String(params.group||''))?String(params.group):'';
  const middles=hasMiddle?await store.middles(level,group):[];
  const middle=middles.includes(String(params.middle||''))?String(params.middle):'';
  const entries=await store.entries(level,group,middle);
  return{level,group,middle,levels,groups,middles,entries};
}
// Entries by id (the saved team, favorites), at most 50 at a time.
export async function catalogEntries(store,ids){
  const list=[...new Set(String(ids||'').split(',').map(s=>s.trim()).filter(Boolean))].slice(0,50);
  return store.byIds(list);
}
