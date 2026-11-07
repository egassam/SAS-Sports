// Home screen loading (user, November 7, 2026: "Homepage still loads slow",
// then "Do 1, 2, 4 first"): a pool of four instead of fixed batches, sports
// with nothing current left out, and live and today's games read first.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const pick=re=>{const m=page.match(re);assert.ok(m,`found ${re}`);return m[0]};
const pool=pick(/async function inBatches\(items,size,work\)\{[^\n]+/);
const activity=pick(/const ACTIVITY_COPY_MS=[\s\S]*?\nfunction homeOrder\([^\n]+/);

// 1. A pool: the next item starts as soon as one ends.
{
  const inBatches=Function(pool+';return inBatches;')();
  const started=[],t0=Date.now(),wait=ms=>new Promise(r=>setTimeout(r,ms));
  await inBatches([300,20,20,20,20,20],4,async ms=>{started.push(Date.now()-t0);await wait(ms)});
  assert.ok(started[4]<150&&started[5]<150,`items 5 and 6 start while the slow one runs (${started})`);
  const order=[];await inBatches([1,2,3],1,async x=>{order.push(x)});assert.deepEqual(order,[1,2,3],'one at a time keeps the order');
  await inBatches([],4,async()=>{throw Error('no work')});
}

// 2-4. What the device last saw decides what the home screen reads, and in which order.
{
  const store=new Map(),localStorage={getItem:k=>store.get(k)??null};
  const now=Date.parse('2026-11-07T18:00:00Z'),day=86400000,at=new Date(now-3600000).toISOString();
  const ev=(offsetDays,extra={})=>({start_time:new Date(now+offsetDays*day).toISOString(),...extra});
  const save=(id,sp,groups,when=at)=>store.set(`sas-feed:${id}|${sp}`,JSON.stringify({at:when,groups}));
  const {feedActivity,homeCurrent,homeOrder}=Function('localStorage','schoolToday','Date',activity+';return {feedActivity,homeCurrent,homeOrder};')(
    localStorage,()=> '2026-11-07',class extends Date{static now(){return now}});
  save('kstate','Cross Country',[{sport:'Cross Country',results:[ev(-7.5)],upcoming:[]}]);            // season over
  save('kstate','Football',[{sport:'Football',results:[ev(-6)],upcoming:[ev(0.1)]}]);                  // today
  save('kstate','Basketball',[{sport:'Basketball',results:[],upcoming:[ev(1.5)]}]);                    // tomorrow
  save('kstate','Volleyball',[{sport:'Volleyball',live:[ev(0,{status:'Live'})],results:[],upcoming:[]}]);// live
  save('kstate','Golf',[{sport:'Golf',results:[ev(-20)],upcoming:[ev(100)]}]);                         // off season
  save('kstate','Tennis',[{sport:'Tennis',results:[ev(-1)],upcoming:[]}],new Date(now-40*day).toISOString()); // copy too old
  assert.equal(homeCurrent('kstate','Cross Country'),false,'a season over is left out');
  assert.equal(homeCurrent('kstate','Golf'),false,'nothing within a week either way');
  for(const sp of ['Football','Basketball','Volleyball'])assert.equal(homeCurrent('kstate',sp),true,sp);
  assert.equal(homeCurrent('kstate','Soccer'),true,'no copy on this device: read once');
  assert.equal(feedActivity('kstate','Tennis'),null,'a copy over 30 days old is not used');
  assert.deepEqual(['Soccer','Basketball','Football','Volleyball'].sort((a,b)=>homeOrder('kstate',a)-homeOrder('kstate',b)),['Volleyball','Football','Basketball','Soccer'],'live, today, the next days, then unread');
}
console.log('home-load: ok (pool of four, current sports only, live and today first)');
