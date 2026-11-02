// Home's news (user, November 2, 2026: "Let's also add news in some way"):
// the official stories the school published about its recent games, read
// from recap links the verified feed already carries. A story is never
// looked for elsewhere, and links that are only a scoreboard (MaxPreps,
// Bound, a timer's results page) are not news.

export const NEWS_DAYS=21,NEWS_PER_SPORT=3;
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
