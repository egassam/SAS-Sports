import assert from 'node:assert/strict';
import {detectPublisher,discoverLinks,inferSport,buildSources,validateDraft} from '../scripts/onboard-school.mjs';

const sidearm=`
<html><head><script src="/assets/sidearm.js"></script></head><body>
<a href="/sports/football/schedule">Football schedule</a>
<a href="/sports/football/roster">Football roster</a>
<a href="/sports/womens-soccer/schedule">Soccer schedule</a>
<a href="/sports/womens-soccer/roster">Soccer roster</a>
</body></html>`;
const wmt=`<html><script id="__NEXT_DATA__" type="application/json">{}</script>
<a href="https://example.edu/sports/cross-country/schedule">XC</a></html>`;

assert.equal(detectPublisher(sidearm,'https://school.example.edu'),'SIDEARM');
assert.equal(detectPublisher(wmt,'https://school.example.edu'),'WMT');
assert.equal(detectPublisher('<meta name="generator" content="PrestoSports">','https://school.example.edu'),'PRESTO');
assert.equal(detectPublisher('<html></html>','https://school.example.edu'),'CUSTOM');

const links=discoverLinks(sidearm,'https://school.example.edu');
assert.deepEqual(links.schedules,[
  'https://school.example.edu/sports/football/schedule',
  'https://school.example.edu/sports/womens-soccer/schedule'
]);
assert.deepEqual(links.rosters,[
  'https://school.example.edu/sports/football/roster',
  'https://school.example.edu/sports/womens-soccer/roster'
]);
assert.equal(inferSport(links.schedules[0]),'Football');
assert.equal(inferSport(links.schedules[1]),'Soccer');

const sources=buildSources(links,['Football','Soccer']);
assert.equal(sources.Football.schedule_urls.length,1);
assert.equal(sources.Football.roster_urls.length,1);
assert.equal(sources.Soccer.schedule_urls.length,1);
assert.equal(sources.Soccer.roster_urls.length,1);

const valid=validateDraft({
  school:{id:'example',name:'Example',athletics_url:'https://school.example.edu'},
  publisher:'SIDEARM',sponsored_sports:['Football','Soccer'],sources
});
assert.equal(valid.valid,true);
assert.deepEqual(valid.errors,[]);
assert.deepEqual(valid.warnings,[]);

const incomplete=validateDraft({
  school:{id:'example',name:'Example',athletics_url:'https://school.example.edu'},
  publisher:'CUSTOM',sponsored_sports:['Football'],sources:{Football:{schedule_urls:[],roster_urls:[]}}
});
assert.equal(incomplete.valid,true);
assert.equal(incomplete.warnings.length,2);

const unsafe=validateDraft({school:{id:'bad',name:'Bad',athletics_url:'http://example.edu'},publisher:'UNKNOWN',sponsored_sports:[]});
assert.equal(unsafe.valid,false);
assert.ok(unsafe.errors.length>=3);

console.log('SAS Sports onboarding discovery and validation checks passed');
