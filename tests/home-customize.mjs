// Customize Home (user, November 21, 2026: "Can we set the home screen up so
// users can choose what they want to see? For example if the only want to
// see pro football and college basketball?"; favorites always show; a
// Customize panel).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const start=page.indexOf('// Customize Home (user, November 21, 2026'),end=page.indexOf('function renderHome(groups){');
assert.ok(start>0&&end>start,'the block is found');
const block=page.slice(start,end);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
const store=new Map(),localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
const env={homeView:true};
const load=()=>Function('esc','localStorage','env',block.replace(/\bhomeView\b/g,'env.homeView')+';return{homeAllows,homeCustomize,homeFilterSummary,saveHomeFilter,get set(){return homeFilterSet},open:v=>{homeCustomOpen=v},HOME_FILTER_SPORTS};')(esc,localStorage,env);

// 1. Nothing chosen: everything shows; the bar says so.
{
  const h=load();
  assert.ok(h.homeAllows('college','Volleyball')&&h.homeAllows('pro','Hockey'),'nothing chosen shows everything');
  assert.match(h.homeCustomize(),/Showing: <b>Everything<\/b>[\s\S]*data-home-customize aria-expanded="false"/);
  assert.ok(!/home-custom-panel/.test(h.homeCustomize()),'the panel is closed');
}
// 2. The user's example: Pro Football and College Basketball, kept on the device.
{
  const h=load();h.set.add('pro|Football');h.set.add('college|Basketball');h.saveHomeFilter();
  const again=load();
  assert.deepEqual([...again.set].sort(),['college|Basketball','pro|Football'],'saved and read back');
  assert.ok(again.homeAllows('pro','Football')&&again.homeAllows('college','Basketball'));
  assert.ok(!again.homeAllows('college','Football')&&!again.homeAllows('pro','Basketball')&&!again.homeAllows('high-school','Basketball'),'only the chosen pairs');
  assert.ok(again.homeAllows(undefined,'Basketball'),'no level reads as college');
  assert.match(again.homeCustomize(),/Showing: <b>your teams \+ (?:Pro Football, College Basketball|College Basketball, Pro Football)<\/b>/,'the bar names the choice and that favorites stay');
  again.open(true);
  const panel=again.homeCustomize();
  assert.match(panel,/id="homeCustomPanel"[\s\S]*Your ★ favorite teams always show/);
  for(const lv of ['Pro','College','High school','Middle school'])assert.ok(panel.includes(`<div class="hc-level">${lv}</div>`),lv);
  assert.match(panel,/class="ghost hc-chip on" data-home-pick="pro\|Football" aria-pressed="true">✓ Football/,'a chosen chip is on');
  assert.match(panel,/class="ghost hc-chip" data-home-pick="pro\|Hockey" aria-pressed="false">Hockey/);
  assert.match(panel,/data-home-all>Show everything[\s\S]*data-home-done>Done/);
}
// 3. Bad stored data, or no storage: everything shows.
{
  store.set('sas-home-filter','{oops');assert.equal(load().set.size,0);
  store.set('sas-home-filter','[1,"x","pro|Football"]');assert.deepEqual([...load().set],['pro|Football'],'only level|sport strings');
}
// 4. A team's own page has no Customize bar.
{env.homeView=false;assert.equal(load().homeCustomize(),'');env.homeView=true}
// 5. Every level lists the sports its catalog teams play.
{
  const h=load();
  const schools=JSON.parse(readFileSync(new URL('../src/schools.json',import.meta.url),'utf8')),sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
  for(const s of (Array.isArray(schools)?schools:schools.schools)){const lv=s.level||'college';for(const sp of sponsored[s.id]||s.sponsored_sports||[])assert.ok(h.HOME_FILTER_SPORTS[lv].includes(sp),`${lv} ${sp} (${s.id}) is offered`)}
}
// 6. Wired into Home: everyone else's games are trimmed; favorites are not.
assert.match(page,/\.filter\(x=>!homeView\|\|teams\.includes\(x\.school_id\)\|\|homeAllows\(/,'feeds: favorites always, the rest by the choice');
assert.match(page,/allLive\.filter\(x=>!favoriteOf\(x\)&&homeAllows\(/,'Live now everywhere');
assert.match(page,/others=homeView\?boards\.filter\(x=>!mineOf\(x\.g\)&&homeAllows\(weekLevelOf\(x\),weekSportOf\(x\)\)\)/,'the week ahead');
assert.match(page,/feed\.innerHTML=customHtml\+homeSection\(mine,live,'live'\)/,'the bar leads Home');
assert.match(page,/feed\.innerHTML=customHtml\+`<div class="empty">[\s\S]*?bindFeedCards\(\);return\}/,'and stays when the choice leaves nothing to show');
for(const sel of ['[data-home-customize]','[data-home-pick]','[data-home-all]','[data-home-done]'])assert.ok(page.includes(`'${sel}'`),`${sel} is wired`);
console.log('home-customize: ok (pairs saved on the device, favorites always shown, the panel, wired into Home)');
