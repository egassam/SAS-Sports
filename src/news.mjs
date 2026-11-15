// Home's news (user, November 2, 2026: "Let's also add news in some way"):
// the official stories the school published about its recent games, read
// from recap links the verified feed already carries. A story is never
// looked for elsewhere, and links that are only a scoreboard (MaxPreps,
// Bound, a timer's results page) are not news.

// One week of news (user, November 2: "Let's limit the news to one week please").
export const NEWS_DAYS=7,NEWS_PER_SPORT=3;
const NOT_STORIES=/maxpreps\.com|bound\.co|gobound\.com|athletic\.net|milesplit\.com|tfrrs\.org|athletic\.live|athleticlive|trackmeet\.io|primetimetiming|runnercard|prep\.golf|tennisreporting|\.pdf(?:$|\?)/i;
const STORY_PATH=/\/(?:news|story|stories|article|articles|recap|recaps)\//i;

// A recap link that reads as a story.
export function isStoryLink(event){
  const url=String(event?.recap_url||'');
  if(!/^https?:\/\//i.test(url)||NOT_STORIES.test(url))return false;
  const label=String(event.recap_label||'');
  if(label&&!/recap|story/i.test(label))return false;
  return STORY_PATH.test(new URL(url).pathname)||/recap/i.test(label);
}

// The newest finals of one team-sport feed that carry a story, newest first.
export function newsCandidates(groups,now=new Date(),days=NEWS_DAYS,limit=NEWS_PER_SPORT){
  const since=now.getTime()-days*864e5,seen=new Set();
  const finals=(Array.isArray(groups)?groups:[]).flatMap(g=>(g.results||[]).map(e=>({e,g})))
    .filter(({e})=>e.status==='Final'&&isStoryLink(e)&&(Date.parse(e.start_time)||0)>=since)
    .sort((a,b)=>(Date.parse(b.e.start_time)||0)-(Date.parse(a.e.start_time)||0));
  const out=[];
  for(const x of finals){if(seen.has(x.e.recap_url))continue;seen.add(x.e.recap_url);out.push(x);if(out.length>=limit)break}
  return out;
}

const decode=s=>String(s||'').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
function meta(html,names){
  for(const name of names){
    const n=name.replace(/[.:]/g,'\\$&');
    const m=html.match(new RegExp(`<meta\\b[^>]*(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']`,'i'))||html.match(new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${n}["']`,'i'));
    if(m&&decode(m[1]))return decode(m[1]);
  }
  return'';
}
// The story's headline, summary, picture and date from its page.
export function storyFromHtml(html,url){
  const raw=String(html||'');
  let headline=meta(raw,['og:title','twitter:title'])||decode((raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  // Site names after the headline ("… - Kansas State University Athletics").
  headline=headline.replace(/\s+[|–—-]\s+[^|–—-]{3,80}$/,'').trim();
  const summary=meta(raw,['og:description','twitter:description','description']).slice(0,240);
  let image=meta(raw,['og:image','og:image:url','twitter:image','twitter:image:src']);
  try{image=image?new URL(image,url).href:''}catch{image=''}
  if(image&&!/^https:\/\//i.test(image))image='';
  const published=meta(raw,['article:published_time','og:article:published_time','pubdate','date'])||'';
  return{headline,summary,image,published:Number.isFinite(Date.parse(published))?new Date(published).toISOString():''};
}

// One story card. The event's title and result stand in when the page
// gives no headline (it cannot be read, or refuses the app).
export function storyFor({e,g},page){
  const host=(()=>{try{return new URL(e.recap_url).hostname.replace(/^www\./,'')}catch{return''}})();
  const result=e.school_score!=null&&e.opponent_score!=null?(e.headline||`${e.school_score}-${e.opponent_score}`):(e.headline||'');
  return{
    id:e.id,url:e.recap_url,source:host,school_id:e.school_id||g.school_id,school:e.school||g.school,sport:e.sport||g.sport,
    event_title:e.title,event_date:e.start_time,result,
    headline:page?.headline||`${e.title}${result?` · ${result}`:''}`,
    summary:page?.summary||'',image:page?.image||'',published:page?.published||'',from_page:Boolean(page?.headline)
  };
}

// ---- Pro teams' news (user, November 15, 2026: "I'm not seeing any news on
// the KC Chiefs page and that seems unlikely. Can you check that and all the
// other pro teams") ----
// A pro team's news was only the ESPN recap of its finals in the last week,
// so an NFL team (one game a week) had none most days, and an offseason team
// none for months. ESPN publishes each team's news
// (`/apis/site/v2/sports/<league>/news?team=<id>`): its own stories, recaps,
// previews and headlines, plus league-wide pieces tagged to every team
// ("Week 10 NFL highlights", 32 teams). Only articles about this team (it is
// one of at most two teams of its league tagged: its own story, or its game)
// from the last week are kept. One read per team, kept 30 minutes.
export const PRO_NEWS_PER_TEAM=6;
const PRO_NEWS_TYPES=new Set(['Story','HeadlineNews','Recap','Preview']);
// The team's ESPN news URL from its catalog entry ("football/nfl/teams/kc", id 12).
export function espnTeamNewsUrl(school){
  if(school?.level!=='pro')return null;
  const espn=(school.providers||[]).find(p=>p?.provider==='ESPN'&&p.provider_school_id&&/\/teams\//.test(p.slug||''));
  if(!espn)return null;
  const league=String(espn.slug).split('/teams/')[0];
  return`https://site.api.espn.com/apis/site/v2/sports/${league}/news?team=${encodeURIComponent(espn.provider_school_id)}&limit=50`;
}
const espnTeamId=school=>(school?.providers||[]).find(p=>p?.provider==='ESPN')?.provider_school_id;
// The same story whether linked over http or https.
export const storyKey=url=>{try{const u=new URL(url);return`${u.hostname.replace(/^www\./,'')}${u.pathname.replace(/\/+$/,'')}${u.search}`}catch{return String(url||'')}};
// The ESPN ids of the league's teams in the catalog (the Chiefs' league:
// the 32 NFL teams). Soccer articles also tag national teams and foreign
// clubs ("Messi to play in Argentina for Inter Miami-River Plate friendly":
// Argentina, Inter Miami, River Plate), so only the league's own teams count.
export function leagueTeamIds(schools,school){
  return new Set((Array.isArray(schools)?schools:[]).filter(s=>s?.level==='pro'&&s.league===school?.league).map(espnTeamId).filter(Boolean).map(String));
}
export function espnTeamStories(payload,school,sport,now=new Date(),days=NEWS_DAYS,limit=PRO_NEWS_PER_TEAM,league=null){
  const team=String(espnTeamId(school)||''),since=now.getTime()-days*864e5,out=[],seen=new Set();
  if(!team)return out;
  for(const a of Array.isArray(payload?.articles)?payload.articles:[]){
    if(!PRO_NEWS_TYPES.has(a?.type))continue;
    const teams=(a.categories||[]).filter(c=>c?.type==='team').map(c=>String(c.teamId??c.team?.id??''));
    if(!teams.includes(team))continue;
    // About this team: it and at most one other team of its league (its game).
    const inLeague=league?.size?teams.filter(id=>league.has(id)):teams;
    if(new Set(inLeague).size>2)continue;
    const published=Date.parse(a.published||a.lastModified||'');if(!Number.isFinite(published)||published<since||published>now.getTime()+864e5)continue;
    let url=a.links?.web?.href||'';try{url=new URL(url).href.replace(/^http:\/\//i,'https://')}catch{continue}
    if(!/^https:\/\//i.test(url)||seen.has(storyKey(url)))continue;seen.add(storyKey(url));
    let image=a.images?.[0]?.url||'';if(!/^https:\/\//i.test(image))image='';
    out.push({id:`espn-news-${a.id||out.length}`,url,source:'espn.com',school_id:school.id,school:school.name,sport,
      event_title:'',event_date:'',result:'',headline:decode(a.headline||''),summary:decode(a.description||'').slice(0,240),image,
      published:new Date(published).toISOString(),from_page:true,kind:a.type});
    if(out.length>=limit)break;
  }
  return out;
}
// A pro team's stories: its game recaps (from the feed) and ESPN's team
// news, one card per story, newest first.
export function mergeStories(...lists){
  const seen=new Set(),out=[];
  for(const s of lists.flat()){if(!s?.url||seen.has(storyKey(s.url)))continue;seen.add(storyKey(s.url));out.push(s)}
  const when=s=>Math.max(Date.parse(s.published)||0,Date.parse(s.event_date)||0);
  return out.sort((a,b)=>when(b)-when(a));
}
