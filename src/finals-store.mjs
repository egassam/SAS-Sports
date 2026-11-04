// Stored finals (user, November 4, 2026: "Once we have results from anywhere
// shouldn't we just be saving them in a database? Results do not change.",
// then "Yes, build it and merge when everything passes").
//
// Every middle and high school final an official source gives (a game's
// score, a meet's results) is kept in D1, one row per game or meet. Each
// build writes the finals it has not stored yet, and the ones an official
// source has changed (a coach's MaxPreps correction, a timer's re-posted
// results; the old version is kept in `history`). Each build reads the
// school-sport's stored finals back: a game a refused source left "No score
// posted" takes its stored final, and a final the sources no longer list is
// listed again. Results come only from official sources: nothing else
// writes to the table (user, November 4: no results from parents or
// unofficial scorers).

export const FINALS_TABLE_SQL=`CREATE TABLE IF NOT EXISTS finals (
  scope TEXT NOT NULL, school TEXT NOT NULL, sport TEXT NOT NULL, event_key TEXT NOT NULL,
  date TEXT NOT NULL, event TEXT NOT NULL, sig TEXT NOT NULL, source TEXT,
  first_seen TEXT NOT NULL, last_changed TEXT NOT NULL, history TEXT,
  PRIMARY KEY (scope, school, sport, event_key))`;
export const FINALS_INDEX_SQL='CREATE INDEX IF NOT EXISTS finals_by_day ON finals (scope, school, sport, date)';
const HISTORY_KEEP=5;

const words=s=>String(s||'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\.?\s/g,'saint ').replace(/&/g,' and ').replace(/\b(?:high school|hs|varsity|the)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
const day=e=>String(e?.start_time||'').slice(0,10);
const isMeet=e=>e?.event_type==='MEET';

// An official final: a game with its score, or a meet with its results.
// "No score posted", a game still to finish and a live card are not.
export function isStoredFinal(e){
  if(!e||e.status!=='Final'||e.no_result_posted||e.meet_live)return false;
  if(e.school_score!=null&&e.opponent_score!=null&&e.school_score!==''&&e.opponent_score!=='')return true;
  return isMeet(e)&&Array.isArray(e.results)&&e.results.length>0;
}
// What a final says: its result and every results row. Two readings of one
// final with the same signature are the same final.
export function finalSig(e){
  return JSON.stringify([e.headline||null,e.school_score??null,e.opponent_score??null,(e.results||[]).map(r=>[r.group??null,r.participant??r.label??null,r.result??r.value??null])]);
}
// The row key: day, team (girls/boys, grade), and the opponent or meet. A
// day's second game against the same opponent (a doubleheader) is "#2".
export function finalKeys(events){
  const seen=new Map();
  return events.map(e=>{
    const base=`${day(e)}|${e.team_label||''}|${isMeet(e)?'meet':words(e.opponent)}`;
    const n=(seen.get(base)||0)+1;seen.set(base,n);
    return n>1?`${base}#${n}`:base;
  });
}
// The same game or meet: one day, one team, and for a game a compatible
// opponent (one name's words within the other's: "Topeka" and "Topeka High").
export function sameFinal(a,b,compatible=null){
  if(day(a)!==day(b)||(a.team_label||'')!==(b.team_label||'')||isMeet(a)!==isMeet(b))return false;
  if(isMeet(a))return true;
  if(compatible)return compatible(a.opponent,b.opponent);
  const x=words(a.opponent).split(' ').filter(Boolean),y=words(b.opponent).split(' ').filter(Boolean);
  if(!x.length||!y.length)return false;
  const [short,long]=x.length<=y.length?[x,y]:[y,x];
  return short.every(w=>long.includes(w));
}

// The same game, exactly: one day and team, and the same opponent words.
export const exactFinal=(a,b)=>day(a)===day(b)&&(a.team_label||'')===(b.team_label||'')&&isMeet(a)===isMeet(b)&&(isMeet(a)||words(a.opponent)===words(b.opponent));

// A build's events and the school-sport's stored rows ({key, event, sig,
// history}) → the events to show, and the rows to write.
//   - a built final not stored: inserted;
//   - a built final whose reading changed: updated, the old one into history;
//   - a stored final the build shows unscored ("No score posted"): replaces it;
//   - a stored final the build does not list at all: listed again;
//   - a doubleheader's games keep their own rows.
// Every match is tried on the exact opponent first and only then on a
// compatible name ("Topeka" and "Topeka High"), so a triangular's two
// matches (Topeka and Topeka West) never trade scores.
export function mergeFinals(built,stored,{now=new Date().toISOString(),source=null,compatible=null}={}){
  const events=[...built],writes=[],keys=finalKeys(built),used=new Set(),claimed=new Set();
  const rows=(stored||[]).map(r=>({...r,event:typeof r.event==='string'?JSON.parse(r.event):r.event}));
  // 1. What the build has: each built final's row, by key, then exactly, then compatibly.
  const finals=built.map((e,i)=>i).filter(i=>isStoredFinal(built[i]));
  const rowFor=new Map();
  for(const pass of [(r,i)=>r.key===keys[i],(r,i)=>exactFinal(r.event,built[i]),(r,i)=>sameFinal(r.event,built[i],compatible)])
    for(const i of finals){if(rowFor.has(i))continue;const row=rows.find(r=>!used.has(r)&&pass(r,i));if(row){used.add(row);rowFor.set(i,row);}}
  for(const i of finals){
    const e=built[i],sig=finalSig(e),row=rowFor.get(i);
    claimed.add(i);
    if(!row)writes.push({op:'insert',key:keys[i],date:day(e),event:e,sig,source,first_seen:now,last_changed:now,history:[]});
    else if(row.sig!==sig){
      const history=[{event:row.event,sig:row.sig,replaced:now},...(row.history?JSON.parse(typeof row.history==='string'?row.history:JSON.stringify(row.history)):[])].slice(0,HISTORY_KEEP);
      writes.push({op:'update',key:row.key,date:day(e),event:e,sig,source,last_changed:now,history});
    }
  }
  // 2. What only the store has: each built game takes one stored final (a
  // doubleheader's second game its own), exactly first, then compatibly.
  // The build's game that shows no final (a refused source) takes the stored
  // final's place; a game still to finish (Today, Live) is left as it is.
  const left=rows.filter(r=>!used.has(r));
  for(const pass of [exactFinal,(a,b)=>sameFinal(a,b,compatible)])
    for(const row of left){
      if(used.has(row))continue;
      const i=events.findIndex((e,j)=>!claimed.has(j)&&pass(e,row.event));
      if(i<0)continue;
      used.add(row);claimed.add(i);
      if(events[i].no_result_posted||events[i].status==='Final')events[i]={...row.event,stored_final:true};
    }
  // A stored final the build does not list at all is listed again.
  for(const row of left)if(!used.has(row))events.push({...row.event,stored_final:true});
  return{events,writes};
}
