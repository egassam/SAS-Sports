// Scheduled refresh of the middle and high school feeds (user, November 4,
// 2026: "Do the schedule refreshed"). A Cron Trigger rebuilds a few feeds per
// run, one at a time and spaced out (MaxPreps refuses bursts: 403 when read
// more than about once in 30 s), and keeps each good build as the feed's
// saved copy shared by every Cloudflare location (KV). A visitor's build that
// a school's site or MaxPreps refuses then serves a copy at most a few hours
// old instead of a blank feed.
//
// The October 1 attempt (#87: every college feed every minute) failed every
// scheduled build within minutes and was reverted with no cause found. This
// one keeps a record of every run, every feed's result and its reason
// (`/api/refresh-status`), and can be paused without a deploy
// (`/api/refresh-control`, with the source key).

// Every run: this many feeds, this far apart.
export const REFRESH_BATCH=8;
export const REFRESH_GAP_MS=20000;
// Status record and controls (KV, one write per run).
export const REFRESH_STATUS_KEY='refresh:v1:status';
export const REFRESH_PAUSE_KEY='refresh:v1:paused';

// The feeds to refresh: every sport of every middle and high school module,
// in a fixed order (school, then sport).
export function refreshFeeds(modules){
  const out=[];
  for(const module of modules)for(const sport of Object.keys(module.sports||{}).sort())out.push({school:module.id,sport});
  return out;
}
// The next batch from the cursor, wrapping around the list.
export function nextBatch(feeds,cursor,size=REFRESH_BATCH){
  if(!feeds.length)return{batch:[],cursor:0};
  const start=((Number(cursor)||0)%feeds.length+feeds.length)%feeds.length,batch=[];
  for(let i=0;i<Math.min(size,feeds.length);i++)batch.push(feeds[(start+i)%feeds.length]);
  return{batch,cursor:(start+batch.length)%feeds.length};
}
// The status kept after a run: the last run in full, and totals since the
// first run (or since the counters were reset by a deploy that changed
// the feed list).
export function nextStatus(previous,{at,version,feeds,cursor,results}){
  const prev=previous&&typeof previous==='object'?previous:{};
  const ok=results.filter(r=>r.ok).length,failed=results.length-ok;
  const totals=prev.feeds===feeds?{...prev.totals}:{runs:0,built:0,failed:0,since:at};
  totals.runs=(totals.runs||0)+1;totals.built=(totals.built||0)+ok;totals.failed=(totals.failed||0)+failed;
  return{version,feeds,cursor,totals,last_run:{at,built:ok,failed,results}};
}
