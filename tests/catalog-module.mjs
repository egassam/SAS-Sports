// The catalog in D1 (user, October 16: "Start the catalog move"): the page
// reads its menus a step at a time from /catalog/menu and /catalog/entries.
// D1 and the bundled copy must give the same answers, and both must give the
// menus the page drew from the full catalog before the move.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import * as catalogModule from '../src/catalog.mjs';
import {CATALOG_LEVELS,catalogCards,catalogRevision,syncCatalog,storedRevision,storeMatches,bundledStore,d1Store,catalogMenu,catalogEntries,catalogRecords,catalogOpponent,catalogHostKnown,catalogMembers,catalogAllRecords} from '../src/catalog.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json'));
const page=read('../public/index.html'),worker=read('../src/index.js'),wrangler=read('../wrangler.jsonc');

function fakeD1(){
  const sqlite=new DatabaseSync(':memory:');
  const statement=(sql,args=[])=>({
    bind:(...a)=>statement(sql,a),
    async first(){return sqlite.prepare(sql).get(...args)??null},
    async all(){return{results:sqlite.prepare(sql).all(...args)}},
    exec(){if(/^\s*SELECT/i.test(sql))return{results:sqlite.prepare(sql).all(...args)};sqlite.prepare(sql).run(...args);return{}}
  });
  return{sqlite,prepare:sql=>statement(sql),async batch(list){sqlite.exec('BEGIN');try{const out=list.map(s=>s.exec());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
const themes=JSON.parse(read('../src/team-themes.json'));
const zone=s=>s.state==='Kansas'?'America/Chicago':'America/New_York';
const cards=catalogCards(schools,sponsored,zone,themes);

// Cards: every entry with sponsored sports, in catalog order, with only what
// the page needs (no source settings).
assert.equal(cards.length,schools.filter(s=>sponsored[s.id]?.length).length);
assert.deepEqual(cards.map(c=>c.id),schools.filter(s=>sponsored[s.id]?.length).map(s=>s.id));
const kstate=cards.find(c=>c.id==='kstate');
assert.deepEqual(Object.keys(kstate).sort(),['conference','division','id','level','name','short_name','sponsored_sports','state','theme','time_zone']);
// Colors come with every card (step 1 of docs/CATALOG.md: the page holds none).
assert.deepEqual(kstate.theme,{primary:'#512888',secondary:'#A7A9AC',panel:'#241936',panelDark:'#120d1d',line:'#7556a0',onAccent:'#ffffff'});
assert.ok(cards.every(c=>/^#[0-9A-Fa-f]{6}$/.test(c.theme?.primary||'')&&c.theme.onAccent),'every card has its colors');
assert.equal(Object.keys(themes).length,cards.length,'one theme per catalog card');
assert.equal(kstate.level,'college');assert.deepEqual(kstate.sponsored_sports,sponsored.kstate);
assert.ok(!('providers' in kstate)&&!('athletics_url' in kstate));
const revision=await catalogRevision(cards);
assert.match(revision,/^[0-9a-f]{24}$/);
assert.equal(await catalogRevision(cards),revision);
assert.notEqual(await catalogRevision(cards.slice(1)),revision);

// Sync: the first copy writes, the same revision does nothing, a new revision
// replaces every row in one transaction.
const db=fakeD1();
assert.equal(await storedRevision(db),null,'no table yet');
assert.equal(await syncCatalog(db,cards,revision),'synced');
assert.equal(await syncCatalog(db,cards,revision),'current');
assert.equal(await storedRevision(db),revision);
assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_entries').get().n,cards.length);
const fewer=cards.filter(c=>c.id!=='kstate'),fewerRevision=await catalogRevision(fewer);
assert.equal(await syncCatalog(db,fewer,fewerRevision),'synced');
assert.equal(db.sqlite.prepare(`SELECT COUNT(*) AS n FROM catalog_entries WHERE id='kstate'`).get().n,0);
await syncCatalog(db,cards,revision);
// D1 is used only with this revision and all of its rows.
assert.equal(await storeMatches(db,revision,cards.length),true);
assert.equal(await storeMatches(db,fewerRevision,fewer.length),false);
db.sqlite.prepare(`DELETE FROM catalog_entries WHERE id='kstate'`).run();
assert.equal(await storeMatches(db,revision,cards.length),false,'a short table is not used');
await syncCatalog(db,cards,'rebuild');await syncCatalog(db,cards,revision);
assert.equal(await storeMatches(db,revision,cards.length),true);
assert.equal(await storeMatches(fakeD1(),revision,cards.length),false,'no tables');

// The menus the page drew from the whole catalog before the move (its LEVELS
// rules), for every level, group and city: D1 and the bundled copy agree.
const before=({level,group='',middle=''})=>{
  const rule=CATALOG_LEVELS.find(l=>l.id===level),inLevel=cards.filter(c=>c.level===level);
  return{
    groups:[...new Set(inLevel.map(rule.group))].filter(Boolean).sort(),
    middles:rule.middle?[...new Set(inLevel.filter(c=>!group||rule.group(c)===group).map(rule.middle))].filter(Boolean).sort():[],
    entries:inLevel.filter(c=>(!group||rule.group(c)===group)&&(!middle||!rule.middle||rule.middle(c)===middle)).map(c=>c.id)
  };
};
const stores=[bundledStore(cards),d1Store(db)];
let checked=0;
for(const rule of CATALOG_LEVELS){
  const inLevel=cards.filter(c=>c.level===rule.id);
  for(const group of ['',...new Set(inLevel.map(rule.group))]){
    const middles=rule.middle?['',...new Set(inLevel.filter(c=>!group||rule.group(c)===group).map(rule.middle))]:[''];
    for(const middle of middles){
      const want=before({level:rule.id,group,middle});
      const answers=await Promise.all(stores.map(store=>catalogMenu(store,{level:rule.id,group,middle})));
      for(const answer of answers){
        assert.equal(answer.level,rule.id);assert.equal(answer.group,group);assert.equal(answer.middle,middle);
        assert.deepEqual(answer.groups,want.groups,`${rule.id} ${group} groups`);
        assert.deepEqual(answer.middles,want.middles,`${rule.id} ${group} middles`);
        assert.deepEqual(answer.entries.map(e=>e.id),want.entries,`${rule.id} ${group} ${middle} entries`);
      }
      assert.deepEqual(answers[0],answers[1],`${rule.id} ${group} ${middle}: D1 equals the bundled copy`);
      checked++;
    }
  }
}
assert.ok(checked>=18,`${checked} menu steps checked`);
// Levels and their counts (an empty level reads "Soon" on the page).
const levels=(await catalogMenu(stores[1],{level:'pro'})).levels;
assert.deepEqual(levels.map(l=>l.id),['middle-school','high-school','college','pro']);
assert.deepEqual(levels.map(l=>l.count),['middle-school','high-school','college','pro'].map(id=>cards.filter(c=>c.level===id).length));
// Steps the page relies on.
const pro=await catalogMenu(stores[1],{level:'pro',group:'Auto Racing',middle:'IMSA'});
assert.deepEqual(pro.middles,['Formula 1','IMSA','NASCAR']);assert.deepEqual(pro.entries.map(e=>e.id),['imsa-weathertech','imsa-pilot-challenge']);
const kansas=await catalogMenu(stores[1],{level:'high-school',group:'Kansas'});
assert.deepEqual(kansas.middles,['Riley County']);assert.equal(kansas.entries[0].city,'Manhattan','the town comes with the card');assert.deepEqual(kansas.entries.map(e=>e.id),['manhattan-ks']);
const middle=await catalogMenu(stores[1],{level:'middle-school',group:'Kansas',middle:'Riley County'});
assert.deepEqual(middle.entries.map(e=>e.id),['anthony-ms-ks','eisenhower-ms-ks']);
const big12=await catalogMenu(stores[1],{level:'college',group:'Big 12'});
assert.equal(big12.entries.length,16);assert.equal(big12.entries[0].id,cards.find(c=>c.conference==='Big 12').id);
// A group or city the level does not have reads as "All", not as empty.
const stale=await catalogMenu(stores[1],{level:'college',group:'Ivy League'});
assert.equal(stale.group,'');assert.equal(stale.entries.length,cards.filter(c=>c.level==='college').length);
assert.equal((await catalogMenu(stores[1],{level:'high-school',group:'Kansas',middle:'Topeka'})).middle,'');
assert.equal((await catalogMenu(stores[1],{level:'moon'})).level,'college');
// Entries by id: the saved team and favorites, at most 50, unknown ids left out.
for(const store of stores){
  assert.deepEqual((await catalogEntries(store,'kstate,nascar-cup-series,nobody,kstate')).map(e=>e.id),['kstate','nascar-cup-series']);
  assert.deepEqual(await catalogEntries(store,''),[]);
  assert.equal((await catalogEntries(store,cards.map(c=>c.id).join(','))).length,50);
}

// Worker: D1 binding, production-only writes, menu routes, a bundled answer
// when D1 is behind or fails.
assert.ok(wrangler.includes('"binding": "CATALOG_DB", "database_name": "sas-sports-catalog"'));
assert.ok(wrangler.includes('"/catalog/*"'),'catalog routes reach the Worker');
assert.ok(worker.includes("if(url.hostname===PRODUCTION_HOST)await syncCatalog(env.CATALOG_DB,bundle.cards,bundle.revision,Date.now(),bundle.records,bundle.derived);"),'only production writes the catalog');
assert.ok(worker.includes('if(await storeMatches(env.CATALOG_DB,bundle.revision,bundle.cards.length,bundle.records.length))store=d1Store(env.CATALOG_DB);'),'D1 is read only at the bundled revision, with every row');
assert.ok(worker.includes("url.searchParams.get('source')==='bundled'?(await bundledCatalog()).store:chosen.store"),'?source=bundled compares the copies');
assert.ok(worker.includes("try{body=await read(store)}catch{const bundle=await bundledCatalog();body=await read(bundle.store);source='bundled';}"));
assert.ok(worker.includes("if(url.pathname==='/catalog/menu')return catalogAnswer("));
// Each location keeps an answer for an hour, keyed by revision, store and
// request; an answer that fell back to the bundled copy is not kept.
assert.ok(worker.includes('key=new Request(`${url.origin}/__sas_cache/catalog?r=${revision}&s=${store.kind}&p=${encodeURIComponent(url.pathname+url.search)}`)'));
assert.ok(worker.includes("if(edge&&source===store.kind){try{const kept=response.clone();kept.headers.set('cache-control',`public, max-age=${CATALOG_EDGE_SECONDS}`);await edge.put(key,kept)}catch{}}"));
assert.ok(page.includes("  populateSportFilter();\n  updateFavorite();"),'the sport box shows the team\'s sports once its card is known');
assert.ok(worker.includes("if(url.pathname==='/catalog/entries')return catalogAnswer("));

// Page: no packaged catalog, no full download; menus a step at a time, kept
// on the device for a dropped network.
assert.ok(!page.includes('BOOTSTRAP_SCHOOLS'),'the page no longer carries the catalog');
assert.ok(!page.includes("apiFetch('/schools')"),'the page no longer downloads every entry');
assert.ok(page.includes('const menu=await catalogFetch(`/catalog/menu?level=${encodeURIComponent(level)}&group=${encodeURIComponent(group)}&middle=${encodeURIComponent(middle)}`);'));
assert.ok(page.includes('rememberEntries(await catalogFetch(`/catalog/entries?ids=${encodeURIComponent(missing.join(\',\'))}`))'));
assert.ok(page.includes("const key=`sas-catalog:v1:${path}`;"));
// No per-team lists on the page: sports and colors come with the cards.
assert.ok(!page.includes('TEAM_THEMES')&&page.includes('let SCHOOL_SPORTS={};'),'the page carries no per-team map');
assert.ok(!/'kstate':\[/.test(page)&&!/kstate:\{primary:/.test(page));
assert.ok(page.includes("let theme=catalogEntry(themeId)?.theme;"));
assert.ok(page.includes("localStorage.setItem('sas-theme:v1',JSON.stringify({id:themeId,theme}))"),'the last team colors are kept for the next load');
assert.ok(worker.includes('catalogCards(schools,sponsoredSports,schoolTimeZone,teamThemes)'));
assert.ok(page.includes("conference.addEventListener('change',async()=>{if(await refillFromMenus())loadFeed()});"));
assert.ok(page.includes("city.addEventListener('change',async()=>{if(await refillFromMenus())loadFeed()});"));
assert.ok(page.includes('if(generation!==menuGeneration)return null;'),'a slow menu answer never overwrites a newer one');
// Step 2: the Worker's lookups by id. Full records go to D1 with the cards
// (a changed source setting is a new revision); D1 is used only with every
// record; a request naming a school loads its record from D1 first, and
// every lookup by id goes through catalogSchool.
{
  const records=schools,full=await catalogRevision(cards,records);
  assert.notEqual(full,revision,'the records are part of the revision');
  const changed=records.map(r=>r.id==='kstate'?{...r,aliases:[...(r.aliases||[]),'KSU']}:r);
  assert.notEqual(await catalogRevision(cards,changed),full,'a changed source setting is a new revision');
  const db2=fakeD1();
  assert.equal(await syncCatalog(db2,cards,full,Date.now(),records),'synced');
  assert.equal(db2.sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_records').get().n,records.length);
  assert.equal(await storeMatches(db2,full,cards.length,records.length),true);
  assert.equal(await storeMatches(db2,full,cards.length,records.length+1),false,'a short records table is not used');
  assert.deepEqual((await catalogRecords(db2,['kstate','nobody']))[0],records.find(r=>r.id==='kstate'));
  // The real Worker over this D1: a request for K-State loads K-State's
  // record from D1 (marked here so it can be told apart from the bundled one).
  const source=worker.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
  const deps={...schoolModuleDeps,...catalogModule,createSourceFetch,SOURCE_TTL,schools,sponsoredSports:sponsored,teamThemes:themes,rosterSocialInstagrams,handleLiveScoring:()=>new Response(''),extractText:()=>{throw Error('no PDF')},fetch:async()=>new Response('',{status:404}),caches:{default:{async match(){},async put(){}}}};
  const {handler,catalogSchool,bundledCatalog,matchText,opponentSchoolFor,sourceHostAllowed,conferenceMembers}=Function(...Object.keys(deps),source+';return {handler,catalogSchool,bundledCatalog,matchText,opponentSchoolFor,sourceHostAllowed,conferenceMembers};')(...Object.values(deps));
  // D1 as production writes it (the Worker's own cards, records and revision).
  const bundle=await bundledCatalog(),db3=fakeD1();
  await syncCatalog(db3,bundle.cards,bundle.revision,Date.now(),bundle.records,bundle.derived);
  db3.sqlite.prepare(`UPDATE catalog_records SET entry=? WHERE id='kstate'`).run(JSON.stringify({...records.find(r=>r.id==='kstate'),name:'Kansas State (from D1)'}));
  assert.equal(catalogSchool('kstate').name,'Kansas State','before a request: the bundled record');
  await handler.fetch(new Request('https://preview.example/live/status?school=kstate&sport=Volleyball'),{CATALOG_DB:db3},{waitUntil(){}}).catch(()=>{});
  assert.equal(catalogSchool('kstate').name,'Kansas State (from D1)','the request loaded the D1 record');
  assert.equal(catalogSchool('kansas').name,'Kansas','others come from the bundled file until a request names them');
  assert.equal(catalogSchool('nobody'),null);
  // Step 3: the scans that read every entry have D1 indexes, written by the
  // same sync and part of the revision.
  assert.ok(bundle.derived.names.length>schools.length&&bundle.derived.hosts.length===schools.length);
  assert.notEqual(await catalogRevision(bundle.cards,bundle.records,{...bundle.derived,names:bundle.derived.names.slice(1)}),bundle.revision,'the derived rows are part of the revision');
  assert.equal(db3.sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_names').get().n,bundle.derived.names.length);
  // Opponent names: the old scan over every entry and the one D1 query pick
  // the same school for every name, alias, part of a name and decorated
  // name in the catalog, and for names of no catalog school.
  const oldScan=(opponent,current)=>{const wanted=matchText(opponent);if(!wanted)return null;return schools.find(c=>c.id!==current&&[c.name,c.short_name,...(c.aliases||[])].some(label=>{const v=matchText(label);return v===wanted||(v.length>3&&wanted.length>3&&(v.includes(wanted)||wanted.includes(v)))}))?.id||null};
  const probes=new Set(['','Washburn','Northern Iowa','UMKC','Kansas City','Fort Hays State','Nebraska-Omaha','Iowa St.','#12 Texas (Exhibition)','vs. Oklahoma State','at TCU','Miami (Fla.)','Ohio','State','Saint Louis']);
  for(const r of schools)for(const label of [r.name,r.short_name,...(r.aliases||[])].filter(Boolean)){probes.add(label);probes.add(`#5 ${label}`);probes.add(`${label} (Neutral)`);probes.add(label.slice(0,Math.ceil(label.length*0.6)));probes.add(`${label} University`);}
  let agreed=0;
  for(const probe of probes)for(const current of ['kstate','kansas','manhattan-ks','nascar-cup-series']){
    const want=oldScan(probe,current),got=await catalogOpponent(db3,matchText(probe),current);
    assert.equal(got,want,`opponent "${probe}" for ${current}`);agreed++;
  }
  assert.ok(agreed>1500,`${agreed} opponent lookups agree`);
  // The Worker's own lookup uses D1 now (requestCatalog was set by the request above).
  assert.equal((await opponentSchoolFor({opponent:'#9 Iowa State'},{id:'kstate'}))?.id,'iowa-state');
  assert.equal(await opponentSchoolFor({opponent:'Washburn'},{id:'kstate'}),null);
  assert.ok(worker.includes('    const opponentSchool=await opponentSchoolFor(target,school);'));
  // Hosts: every official site, nothing else.
  for(const r of schools)assert.equal(await catalogHostKnown(db3,new URL(r.athletics_url).hostname.replace(/^www\./,'')),true,r.id);
  assert.equal(await catalogHostKnown(db3,'evil.example'),false);
  assert.equal(await sourceHostAllowed('www.kstatesports.com'),true);assert.equal(await sourceHostAllowed('tfrrs.org'),true);assert.equal(await sourceHostAllowed('evil.example'),false);
  // Conference members: the same entries in the same order as the old filter.
  for(const conference of new Set(schools.map(r=>r.conference).filter(Boolean)))
    assert.deepEqual((await catalogMembers(db3,conference)).map(r=>r.id),schools.filter(r=>r.conference===conference).map(r=>r.id),conference);
  assert.equal(conferenceMembers('Big 12').length,16,'the requested school\'s conference was loaded from D1');
  // /schools from D1 equals the bundled listing.
  const listed=async env=>(await handler.fetch(new Request('https://preview.example/schools'),env,{waitUntil(){}})).json();
  assert.equal((await listed({CATALOG_DB:db3})).find(r=>r.id==='kstate').name,'Kansas State (from D1)','/schools reads D1');
  db3.sqlite.prepare(`UPDATE catalog_records SET entry=? WHERE id='kstate'`).run(JSON.stringify(records.find(r=>r.id==='kstate')));
  assert.deepEqual(await listed({CATALOG_DB:db3}),await listed({}));
  assert.deepEqual(await catalogAllRecords(db3),schools);
  // Without a catalog database (tests, a misconfigured deploy) nothing changes.
  const plain=Function(...Object.keys(deps),source+';return {handler,catalogSchool};')(...Object.values(deps));
  await plain.handler.fetch(new Request('https://preview.example/live/status?school=kstate&sport=Volleyball'),{},{waitUntil(){}}).catch(()=>{});
  assert.equal(plain.catalogSchool('kstate').name,'Kansas State');
  // No lookup by id scans the bundled list any more.
  assert.ok(!/schools\.find\((?:s|x)=>(?:s|x)\.id===/.test(worker),'every lookup by id goes through catalogSchool');
  assert.ok(worker.includes("if((url.pathname.startsWith('/live/')||url.pathname.startsWith('/api/'))&&url.searchParams.get('school'))await loadCatalogEntries(env,url,[url.searchParams.get('school')]);"));
}
console.log(`Catalog module tests passed (${checked} menu steps, D1 equals bundled)`);
