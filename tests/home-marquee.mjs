// Each sport's live games under their own marquee sign (user, November 10,
// 2026: "give every sports live it's own marque sign look. For example
// basketball separate, from football, from baseball. It's still to
// overwhelming when there's a lot of live games").
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const pick=re=>{const m=page.match(re);assert.ok(m,`found ${re}`);return m[0]};
const code=[pick(/const EVERYWHERE_SHOWN=[^\n]+/),pick(/const slug=[^\n]+/),pick(/const SPORT_MARQUEE=[\s\S]*?\nfunction homeLiveGrid\([\s\S]*?\n\}\n/)].join('\n');
const esc=s=>String(s).replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
const expanded=new Set();
const grid=Function('esc','expandedLiveSports','homeItem','fieldItem',code+';return homeLiveGrid;')(esc,expanded,(x,kind,g,grouped)=>`<i data-g="${grouped?1:0}">${x.school}</i>`,g=>`<i>${g.id}</i>`);
const games=(sport,n)=>Array.from({length:n},(_,i)=>({sport,school:`${sport}${i}`}));
const signs=html=>[...html.matchAll(/<span class="mq-name">([^<]+)<\/span><span class="mq-count">(\d+) live/g)].map(m=>[m[1],Number(m[2])]);

// 1. One sign per sport, A to Z, each with its count, color and mark.
{
  const html=grid([...games('Football',2),...games('Basketball',3),...games('Baseball',1)],[{sport:'Basketball',id:'scorer'}]);
  assert.deepEqual(signs(html),[['Baseball',1],['Basketball',4],['Football',2]],'scorer games join their sport');
  assert.match(html,/--mq:#ff8a3d[^>]*id="live-basketball"/,'basketball orange');
  assert.match(html,/🏈/);assert.match(html,/⚾/);
  assert.ok(!/data-g="0"/.test(html),'a card in a sport group names its team only');
  assert.ok(!/mq-more|mq-chips/.test(html),'My Teams shows every game, no chips');
  const unknown=grid(games('Curling',1));assert.match(unknown,/--mq:#42d3ff/,'an unlisted sport still gets a sign');
}
// 2. Everywhere: chips, six a sport, then Show all.
{
  const html=grid([...games('Basketball',13),...games('Hockey',4)],[],{capped:true,scope:'everywhere'});
  assert.equal((html.match(/<i /g)||[]).length,10,'6 basketball + 4 hockey');
  assert.match(html,/data-show-sport="Basketball">Show all 13 Basketball/);
  assert.ok(!/data-show-sport="Hockey"/.test(html));
  assert.match(html,/class="mq-chips"[\s\S]*data-jump="live-everywhere-basketball"[\s\S]*data-jump="live-everywhere-hockey"/);
  expanded.add('Basketball');
  assert.equal((grid(games('Basketball',13),[],{capped:true,scope:'everywhere'}).match(/<i /g)||[]).length,13,'Show all opens the sport');
  assert.ok(!/mq-chips/.test(grid(games('Golf',2),[],{capped:true,scope:'everywhere'})),'no chips for one sport');
}
assert.match(page,/@media\(prefers-reduced-motion:reduce\)\{\.sport-marquee::before,\.sport-marquee::after\{animation:none\}\}/,'the bulbs stop for reduced motion');
assert.match(page,/feed\.querySelectorAll\('\[data-show-sport\]'\)/,'Show all is wired');
console.log('home-marquee: ok (a sign per sport, six a sport on Everywhere, Show all, chips)');
