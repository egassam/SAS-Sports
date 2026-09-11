import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('./certified-schools.json',import.meta.url),'utf8'));
const args=process.argv.slice(2);
const value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const base=(value('base')||process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
const timeout=Number(value('timeout')||45000);
const mode=value('mode')||'smoke';
const full=mode==='full';
const pauseMs=Number(value('pause-ms')||(full?2000:1250));
const pause=()=>new Promise(resolve=>setTimeout(resolve,pauseMs));

async function json(path){
  let lastError;
  for(let attempt=1;attempt<=4;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(`${base}${path}`,{headers:{accept:'application/json'},signal:controller.signal});
      const body=await response.json();
      if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body).slice(0,200)}`);
      return body;
    }catch(error){
      lastError=error;
      if(attempt<4){
        const overloaded=/HTTP 503|resource limits|Error 1102/i.test(String(error?.message));
        await new Promise(resolve=>setTimeout(resolve,overloaded?attempt*10000:attempt*750));
      }
    }
    finally{clearTimeout(timer)}
  }
  throw lastError;
}

function events(groups){return groups.flatMap(group=>['live','results','upcoming','other'].flatMap(key=>group[key]||[]))}
function assertOwned(groups,schoolId,sport){
  assert.ok(Array.isArray(groups)&&groups.length===1,`${schoolId} ${sport} did not return exactly one group`);
  assert.equal(groups[0].school_id,schoolId,`${schoolId} received another school's group`);
  assert.equal(groups[0].sport,sport,`${schoolId} received another sport's group`);
  for(const event of events(groups))assert.equal(event.school_id,schoolId,`${schoolId} received a contaminated event`);
}

function stableFeed(groups){
  return groups.map(group=>({
    school_id:group.school_id,
    sport:group.sport,
    live:(group.live||[]).map(stableEvent),
    results:(group.results||[]).map(stableEvent),
    upcoming:(group.upcoming||[]).map(stableEvent),
    other:(group.other||[]).map(stableEvent)
  }));
}
function stableEvent(event){
  return{
    id:event.id,school_id:event.school_id,sport:event.sport,status:event.status,
    title:event.title,start_time:event.start_time,opponent:event.opponent,
    school_score:event.school_score,opponent_score:event.opponent_score,
    headline:event.headline,results:event.results,recap_url:event.recap_url,
    source_url:event.source?.url
  };
}

const rows=[];
for(let index=0;index<manifest.schools.length;index++){
  const first=manifest.schools[index];
  const second=manifest.schools[(index+1)%manifest.schools.length];
  const path=(school,sport)=>`/live/feed/grouped?school=${encodeURIComponent(school)}&sport=${encodeURIComponent(sport)}`;
  const sports=full?first.critical_sports:[first.critical_sports[0]];
  for(const firstSport of sports){
    const secondSport=second.critical_sports.includes(firstSport)?firstSport:second.critical_sports[0];
    const firstBefore=await json(path(first.id,firstSport));
    await pause();
    const middle=await json(path(second.id,secondSport));
    await pause();
    const firstAfter=await json(path(first.id,firstSport));
    assertOwned(firstBefore,first.id,firstSport);
    assertOwned(middle,second.id,secondSport);
    assertOwned(firstAfter,first.id,firstSport);
    assert.deepEqual(stableFeed(firstAfter),stableFeed(firstBefore),`${first.name} ${firstSport} changed after loading ${second.name} ${secondSport}; cache keys may be leaking`);
    rows.push({school:first.name,sport:firstSport,switched_to:second.name,status:'PASS'});
    await pause();
  }
}
console.table(rows);
console.log(`${full?'Full':'Smoke'} cross-school A→B→A isolation passed for ${rows.length} school-sport feeds across ${manifest.schools.length} certified schools against ${base}.`);
