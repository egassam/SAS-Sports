// Kansas tonight (user, November 18, 2026: item 7 of "What unique things
// should we add now?": "one page with every high school game in the app
// tonight, grouped by county, filling in scores as they're posted"; then
// "Start with 2 then work your way through the rest").
//
// Built from the saved feed copies of every middle or high school the app
// has (the scheduled refresh rebuilds them every 10 minutes); no source is
// read for it. A game is the school's local "today" (its start or its days);
// it reads Live, Final (with its score or "No score posted") or its start.

export const TONIGHT_LEVELS=new Set(['high-school','middle-school']);
const STATUS_ORDER={Live:0,Today:1,Upcoming:1,Final:2};
export function tonightGames(groups,{today,school}){
  const out=[];
  for(const g of groups||[]){
    for(const e of [...(g.live||[]),...(g.upcoming||[]),...(g.results||[])]){
      const first=String(e?.start_time||'').slice(0,10),last=String(e?.end_time||e?.start_time||'').slice(0,10);
      if(!first||first>today||last<today)continue;
      out.push({id:e.id,school_id:school.id,school:school.short_name||school.name,county:school.county||'Other',sport:e.sport,team_label:e.team_label||null,event_type:e.event_type||null,opponent:e.opponent||null,meet_live:e.meet_live||false,title:e.title,status:e.status,display_time:e.display_time||null,start_time:e.start_time,headline:e.headline||null,school_score:e.school_score??null,opponent_score:e.opponent_score??null,live:e.status==='Live'?(e.recency_label||e.headline||'Live'):null});
    }
  }
  return out;
}
// Counties A to Z, each county's games live first, then by start, then final.
export function tonightCounties(games){
  const by=new Map();
  for(const g of games){if(!by.has(g.county))by.set(g.county,[]);by.get(g.county).push(g);}
  return[...by].sort(([a],[b])=>a.localeCompare(b)).map(([county,list])=>({county,live:list.filter(g=>g.status==='Live').length,games:list.sort((a,b)=>(STATUS_ORDER[a.status]??1)-(STATUS_ORDER[b.status]??1)||String(a.start_time).localeCompare(String(b.start_time))||a.school.localeCompare(b.school))}));
}
