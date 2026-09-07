import assert from 'node:assert/strict';

const DEFAULT_BASE='https://sas-sports.lovetogivepain.workers.dev';
const DEFAULT_SCHOOLS=['kstate','kansas','florida','arizona','arizona-state'];
const DEFAULT_SPORTS=['Cross Country','Soccer','Volleyball','Football'];
const args=process.argv.slice(2);
const value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const base=(value('base')||process.env.SAS_SPORTS_BASE_URL||DEFAULT_BASE).replace(/\/$/,'');
const schoolIds=(value('schools')||args.find(x=>!x.startsWith('--'))||DEFAULT_SCHOOLS.join(',')).split(',').map(x=>x.trim()).filter(Boolean);
const sports=(value('sports')||DEFAULT_SPORTS.join(',')).split(',').map(x=>x.trim()).filter(Boolean);
const timeout=Number(value('timeout')||45000);
const deep=args.includes('--deep');

async function getJson(path){
  let lastError;
  for(let attempt=1;attempt<=3;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(`${base}${path}`,{headers:{accept:'application/json'},signal:controller.signal});
      const text=await response.text();let body;
      try{body=JSON.parse(text)}catch{throw new Error(`HTTP ${response.status}: response was not JSON`)}
      if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body).slice(0,240)}`);
      return body;
    }catch(error){
      lastError=error;
      if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*750));
    }finally{clearTimeout(timer)}
  }
  throw lastError;
}

function currentFallYear(){const now=new Date();return now.getUTCMonth()+1>=7?now.getUTCFullYear():now.getUTCFullYear()-1}
function validateEvent(event,schoolId,sport){
  assert.equal(event.school_id,schoolId,'wrong school attached to event');
  assert.equal(event.sport,sport,'wrong sport attached to event');
  assert.ok(event.id&&event.title&&event.status,'event identity is incomplete');
  assert.ok(event.opponent&&!/^(?:undefined|null)$/i.test(event.opponent),'event opponent or meet name is invalid');
  assert.ok(!/\b(?:undefined|null)\b/i.test(event.title),'event title contains a missing value');
  assert.ok(!event.headline||!/^(?:undefined|null)$/i.test(event.headline),'event headline contains a missing value');
  assert.ok(!(event.results||[]).some(item=>/^(?:undefined|null)$/i.test(item?.value)),'event result contains a missing value');
  assert.ok(event.source?.url?.startsWith('https://'),'event lacks an official HTTPS source');
  if(DEFAULT_SPORTS.includes(sport)&&event.start_time)assert.equal(new Date(event.start_time).getUTCFullYear(),currentFallYear(),'stale season event returned');
  if(event.status==='Final')assert.ok(event.headline||event.school_score!=null||event.results?.length,'final event has no score or result');
}

async function validateSport(school,sport){
  const encoded=`school=${encodeURIComponent(school.id)}&sport=${encodeURIComponent(sport)}`;
  const groups=await getJson(`/live/feed/grouped?${encoded}`);
  assert.ok(Array.isArray(groups)&&groups.length===1,'feed did not return one sport group');
  const group=groups[0],events=['live','results','upcoming','other'].flatMap(key=>group[key]||[]);
  assert.ok(events.length>0,'official feed returned no events');
  events.forEach(event=>validateEvent(event,school.id,sport));
  const officialHost=new URL(school.athletics_url).hostname.replace(/^www\./,'');
  assert.ok(events.every(event=>new URL(event.source.url).hostname.replace(/^www\./,'').endsWith(officialHost)),'event points outside the official athletics domain');
  const officialResponse=await fetch(events[0].source.url,{headers:{accept:'text/html'}});
  if(officialResponse.ok){
    const officialHtml=await officialResponse.text();
    const officialHasCompleted=/(?:Completed Event:|schedule-event-item--completed|s-game-card-standard__header-game-(?:team-score|pre-score))/i.test(officialHtml);
    if(officialHasCompleted)assert.ok((group.results||[]).length>0,'official schedule has completed events but app returned zero results');
  }

  const athletes=await getJson(`/live/athletes?${encoded}`);
  assert.equal(athletes.length,3,'featured athlete row must contain exactly three athletes');
  for(const athlete of athletes){
    assert.ok(/\S+\s+\S+/.test(athlete.name),'athlete name is missing or looks like a jersey number');
    assert.ok((athlete.instagram_url||athlete.profile_url)?.startsWith('https://'),'athlete has no clickable destination');
  }

  const newestFinal=(group.results||[])[0];let highlight=deep?'SKIP:NO_FINAL':'NOT_RUN';
  if(deep&&newestFinal){
    const detail=await getJson(`/live/highlights?${encoded}&event_id=${encodeURIComponent(newestFinal.id)}`);
    assert.equal(detail.id,newestFinal.id,'highlight response belongs to a different event');
    assert.equal(detail.opponent,newestFinal.opponent,'highlight opponent does not match');
    assert.equal(detail.start_time?.slice(0,10),newestFinal.start_time?.slice(0,10),'highlight event date does not match');
    highlight=detail.highlights_verified&&detail.highlights?.length>=3?'PASS':`WARN:${detail.highlight_state||'no_verified_recap'}`;
  }
  return{events:events.length,results:(group.results||[]).length,upcoming:(group.upcoming||[]).length,athletes:athletes.length,highlight};
}

const catalog=await getJson('/schools');
const rows=[];let failed=false;
for(const schoolId of schoolIds){
  const school=catalog.find(item=>item.id===schoolId);
  if(!school){rows.push({school:schoolId,sport:'—',status:'FAIL',detail:'school is missing from catalog'});failed=true;continue}
  for(const sport of sports){
    try{
      const result=await validateSport(school,sport),warning=String(result.highlight).startsWith('WARN:');
      rows.push({school:schoolId,sport,status:warning?'PASS*':'PASS',events:result.events,results:result.results,upcoming:result.upcoming,athletes:result.athletes,highlights:result.highlight});
    }catch(error){rows.push({school:schoolId,sport,status:'FAIL',detail:error.message});failed=true}
  }
}

console.table(rows);
console.log(`\nCertified ${rows.filter(x=>x.status.startsWith('PASS')).length}/${rows.length} school-sport feeds against ${base}.`);
console.log('PASS* means required checks passed, but the newest final had no usable official recap.');
if(!deep)console.log('Run one school with --deep to additionally generate and verify its newest highlights.');
if(failed)process.exitCode=1;
