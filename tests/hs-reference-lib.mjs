// The middle and high school reference (user, November 6, 2026: "List it has
// Manhattan high, Anthony, and Eisenhower"): Manhattan High School, Susan B.
// Anthony Middle School and Eisenhower Middle School, as K-State is for
// college. docs/HIGH_SCHOOL_REFERENCE.md.
export const REFERENCE_SCHOOLS=['manhattan-ks','anthony-ms-ks','eisenhower-ms-ks'];
// One card as a line: status, day, title, headline, and what a card shows
// besides (score, rows, ranks, no-result mark, video, recap link).
export function cardLine(e){
  const bits=[e.status,e.display_time||String(e.start_time||'').slice(0,10),e.title];
  if(e.school_score!=null||e.opponent_score!=null)bits.push(`${e.school_score}-${e.opponent_score}`);
  bits.push(`| ${e.headline||''}`);
  if(e.result_count)bits.push(`rows ${e.result_count}`);
  if(e.no_result_posted)bits.push('no result posted');
  if(e.school_rank)bits.push(`rank ${e.school_rank.rank}`);
  if(e.opponent_rank)bits.push(`opp rank ${e.opponent_rank.rank}`);
  if(e.recap_url)bits.push('recap');
  return bits.join(' ');
}
