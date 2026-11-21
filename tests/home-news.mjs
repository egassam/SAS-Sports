// Home's news (user, November 2, 2026): official stories linked from the
// favorites' recent finals.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isStoryLink,newsCandidates,storyFromHtml,storyFor} from '../src/news.mjs';

const now=new Date('2026-11-02T18:00:00Z');
const final=(id,day,extra={})=>({id,status:'Final',title:`K-State vs ${id}`,start_time:`${day}T12:00:00.000Z`,school_score:'3',opponent_score:'1',headline:'W, 3-1',recap_url:`https://www.kstatesports.com/news/${day.replace(/-/g,'/')}/volleyball-${id}`,...extra});
const groups=[{school_id:'kstate',school:'Kansas State',sport:'Volleyball',results:[
  final('tcu','2026-11-01'),final('kansas','2026-10-30'),final('baylor','2026-10-25'),final('utah','2026-10-20'),
  final('old','2026-09-01'),
  final('maxpreps','2026-10-31',{recap_url:'https://www.maxpreps.com/games/1',recap_label:'View MaxPreps game page'}),
  final('pdf','2026-10-31',{recap_url:'https://www.kstatesports.com/documents/2026/10/31/1.PDF'}),
  {...final('live','2026-11-02'),status:'Live'}
]}];

assert.equal(isStoryLink(groups[0].results[0]),true,'an official /news/ recap is a story');
assert.equal(isStoryLink(groups[0].results[5]),false,'a MaxPreps game page is not news');
assert.equal(isStoryLink(groups[0].results[6]),false,'a box score PDF is not news');
assert.equal(isStoryLink({recap_url:'https://espn.com/x/recap/_/gameId/1',recap_label:'View ESPN recap'}),true,'a labelled recap is a story');
assert.equal(isStoryLink({recap_url:'https://bound.co/x',recap_label:'View on Bound'}),false,'a Bound page is not news');

const picked=newsCandidates(groups,now);
assert.deepEqual(picked.map(x=>x.e.id),['tcu','kansas'],'the newest finals with a story, within one week (Oct 25 is out)');
assert.deepEqual(newsCandidates(groups,now,21).map(x=>x.e.id),['tcu','kansas','baylor'],'at most three per sport');

const html=`<html><head><title>Ignored</title><meta property="og:title" content="K-State Falls in Four at No. 16 TCU - Kansas State University Athletics"><meta property="og:description" content="FORT WORTH &amp; more &#8211; the Wildcats fell."><meta property="og:image" content="/images/2026/11/1/tcu.jpg"><meta property="article:published_time" content="2026-11-01T22:10:00Z"></head></html>`;
const page=storyFromHtml(html,'https://www.kstatesports.com/news/2026/11/1/volleyball-tcu');
assert.equal(page.headline,'K-State Falls in Four at No. 16 TCU','the site name after the headline is dropped');
assert.equal(page.summary,'FORT WORTH & more – the Wildcats fell.');
assert.equal(page.image,'https://www.kstatesports.com/images/2026/11/1/tcu.jpg','a relative picture becomes absolute');
assert.equal(page.published,'2026-11-01T22:10:00.000Z');
assert.equal(storyFromHtml('<meta property="og:image" content="http://x.com/a.jpg">','https://x.com/news/a').image,'','a picture over http is not shown on an https page');

const card=storyFor(picked[0],page);
assert.equal(card.headline,'K-State Falls in Four at No. 16 TCU');
assert.equal(card.school_id,'kstate');assert.equal(card.sport,'Volleyball');assert.equal(card.source,'kstatesports.com');
const fallback=storyFor(picked[1],null);
assert.equal(fallback.headline,'K-State vs kansas · W, 3-1','an unread page falls back to the game and its result');
assert.equal(fallback.from_page,false);

// The News tab (user, November 2: "a news button next to the upcoming
// button so you can just see news").
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert.ok(/data-view="upcoming"[^\n]*Upcoming<\/button>\n\s*<button class="tab" data-view="news" aria-pressed="false">News<\/button>/.test(index),'News sits right after Upcoming');
assert.ok(index.includes("if(currentView==='news')return renderNews();"),'the News tab shows only news');
assert.ok(index.includes("function newsPairs(){return homeMode()?homePairs().filter(([id])=>homeTeams().includes(id)):[[school.value,sportFilter.value]]"),'a sport page asks for that sport\'s news');
assert.ok(index.includes("if(currentView==='news'&&currentGroups.length)loadNews("),'switching to News loads the stories');

// Favorites banners (user, November 2: "a distinct my favorite banner for
// each of the live, results, upcoming and news").
for(const [title,kind] of [['Live now · My Teams','live'],['Recent results','results'],['Coming up','upcoming'],['News','news'],['Today','today']])
  assert.ok(new RegExp(`'${title}':\\['${kind}',`).test(index),`${title} wears the ${kind} banner`);
assert.ok(!/'Live now · Everywhere':\[/.test(index),'Live everywhere keeps the plain heading');
assert.ok(index.includes('const fav=homeView&&FAV_BANNERS[title];'),'banners only on Home, not on a team page');
for(const kind of ['live','today','results','upcoming','news'])assert.ok(index.includes(`.fav-banner.fav-${kind}{--fav:`),`${kind} has its own color`);

assert.ok(index.includes('const NEWS_DAYS=7;')&&index.includes('inNewsWeek(n)'),'the page keeps one week of news, saved copies too');

// SAS Scorer games on Home (user, November 2: "Yes, show it on Home"):
// favorites that score their own games, live ones only, in Live now · My
// Teams; the team page's own box does not poll while Home shows.
assert.ok(index.includes("const ids=homeTeams().filter(id=>fieldScoring.has(id));"),'only favorites with the scorer on are asked');
assert.ok(index.includes(".filter(g=>g.status==='live');"),'only live scorer games join Home');
assert.ok(index.includes("const chips=[[mine,[...live,...field],'Live'],"),'the Live chip counts them');
assert.ok(index.includes("fieldTimer=setTimeout(loadFieldHome,games.length?3000:30000);"),'3 s while live, 30 s otherwise');
assert.ok(index.includes("if(!scoring.has(id)||document.body.classList.contains('home-view')){box.hidden=true;box.innerHTML='';return}"),'the team box is quiet on Home');
assert.ok(/const key=JSON\.stringify\(games\.map\(g=>\[g\.id/.test(index),'a new server_now alone does not redraw Home');

// A favorite whose catalog card failed to load at startup is asked for again
// before Home picks its sports (user, November 2: "Anthony Middle School
// girls basketball isn't showing up for upcoming today").
assert.ok(index.includes("if(favoriteSchoolIds().some(id=>!SCHOOL_SPORTS[id]))await ensureEntries(favoriteSchoolIds());"),'Home re-asks for missing favorite cards (every favorite: a level page needs their levels)');
assert.ok(index.includes("ids.filter(id=>id&&(!knownSchools.has(id)||!SCHOOL_SPORTS[id]))"),'a card without its sports is asked for again');

console.log('home-news: ok');

// Pro teams' news (user, November 15, 2026: "I'm not seeing any news on the
// KC Chiefs page and that seems unlikely. Can you check that and all the
// other pro teams"): ESPN's team news, saved Nov 15 (trimmed to the fields
// read), only articles about this team (one or two teams tagged) from the
// last week, merged with the feed's recaps.
{
  const {espnTeamNewsUrl,espnTeamStories:read,mergeStories,storyKey,leagueTeamIds}=await import('../src/news.mjs');
  const {gunzipSync}=await import('node:zlib');
  const schools=JSON.parse(readFileSync(new URL('../src/schools.json',import.meta.url),'utf8')),entry=id=>schools.find(s=>s.id===id);
  const payload=id=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-news/${id}-2026-11-15.json.gz`,import.meta.url))).toString('utf8'));
  const at=new Date('2026-11-15T17:30:00Z');
  // As the Worker reads them: the league's own teams decide what is about one team.
  const espnTeamStories=(p,e,sp,now)=>read(p,e,sp,now,undefined,undefined,leagueTeamIds(schools,e));
  assert.equal(leagueTeamIds(schools,entry('kansas-city-chiefs')).size,32);
  assert.equal(espnTeamNewsUrl(entry('kansas-city-chiefs')),'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?team=12&limit=50');
  assert.equal(espnTeamNewsUrl(entry('sporting-kansas-city')),'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/news?team=186&limit=50');
  assert.equal(espnTeamNewsUrl(entry('formula-1')),null,'a racing series has no ESPN team');
  assert.equal(espnTeamNewsUrl(entry('kstate')),null,'colleges keep their official stories only');
  // The Chiefs, no game in the last week: six stories about them; league-wide pieces (32 teams) and videos are left out.
  const chiefs=espnTeamStories(payload('kansas-city-chiefs'),entry('kansas-city-chiefs'),'Football',at);
  assert.deepEqual(chiefs.map(s=>s.headline),["Sources: Chiefs had renowned baseball doctors weigh in on Patrick Mahomes' elbow","Chiefs' Kenneth Walker III (groin) to sit out vs. Falcons",'Chiefs RB Kenneth Walker III (groin) misses practice, status uncertain','NFL rushing leaders in spotlight as Kenneth Walker III and Chiefs face Bijan Robinson and Falcons','Chiefs sticking with struggling Harrison Butker as kicker this week',"How Josh Downs fits with Patrick Mahomes and the Chiefs' offense"]);
  assert.equal(chiefs.length,6);
  assert.ok(chiefs.every(s=>s.url.startsWith('https://')&&s.source==='espn.com'&&s.school_id==='kansas-city-chiefs'&&s.published&&s.image.startsWith('https://')));
  assert.ok(!chiefs.some(s=>/Week 10 NFL highlights|Power Rankings/.test(s.headline)),'league-wide pieces are not team news');
  assert.ok(chiefs.every(s=>Date.parse(s.published)>=at-7*864e5),'one week of news');
  assert.equal(espnTeamStories(payload('boston-celtics'),entry('boston-celtics'),'Basketball',at).length,6);
  assert.equal(espnTeamStories(payload('kansas-city-royals'),entry('kansas-city-royals'),'Baseball',at).length,0,'the offseason week holds only league-wide pieces');
  assert.deepEqual(espnTeamStories(null,entry('kansas-city-chiefs'),'Football',at),[],'a refused read adds nothing');
  // Soccer tags national teams and foreign clubs: only MLS teams count, so
  // the Messi friendly (Argentina, Inter Miami, River Plate) is Inter Miami
  // news; the MVP shortlist naming several MLS clubs is not.
  const miami=espnTeamStories(payload('inter-miami'),entry('inter-miami'),'Soccer',at);
  assert.deepEqual(miami.map(s=>s.headline),['Messi to play in Argentina Jan. 19 for Inter Miami-River friendly',"Why Messi won't be 'doing a Wrexham' as owner of Cornellà"]);
  assert.equal(read(payload('inter-miami'),entry('inter-miami'),'Soccer',at).length,0,'counting every tagged team (national teams, foreign clubs) loses both');
  // The Kraken's recap is the same story as the feed's recap link (http vs https): one card.
  const kraken=espnTeamStories(payload('seattle-kraken'),entry('seattle-kraken'),'Hockey',at);
  const feedRecap={id:'r',url:'https://www.espn.com/nhl/recap?gameId=401891809',headline:'Hurricanes 5-1 Kraken',event_date:'2026-11-14T10:00:00.000Z',published:''};
  assert.equal(storyKey('http://www.espn.com/nhl/recap?gameId=401891809'),storyKey(feedRecap.url));
  const merged=mergeStories([feedRecap],kraken);
  assert.equal(merged.filter(s=>storyKey(s.url)===storyKey(feedRecap.url)).length,1);
  assert.equal(merged.length,kraken.length);
  // Wiring: the Worker reads the team news without waiting for a final, and
  // keeps an answer only when it read the current feed; the page asks a pro
  // team for news even in a week without a game.
  const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  assert.ok(worker.includes('const team=newsUrl?espnTeamStories(await readJson(newsUrl,SOURCE_TTL.article),entry,sport,new Date(),undefined,undefined,leagueTeamIds(schools,entry)):[];'));
  assert.ok(worker.includes('const keep=Boolean(fresh);'),'an answer from an older copy is not kept');
  assert.ok(worker.includes('if(espnTeamNewsUrl(catalogSchool(school)))for(const group of groups)group.team_news=true;'));
  assert.ok(index.includes("const hasStory=g=>Boolean(g?.team_news)||"),'the page asks a pro team for news without a recent final');
}
console.log('pro team news checks passed');
