// Weather on outdoor games (user, November 18, 2026: item 4 of "What unique
// things should we add now?"). Fixtures of November 18, 2026: Open-Meteo's
// geocoder for "Manhattan", the NWS point for Manhattan, Kan. and its hourly
// forecast (156 hours).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {parsePlace,stateCode,geocodeResult,forecastAt,weatherLine,geocodeUrl,pointsUrl,placeKey} from '../src/game-weather.mjs';

const fixture=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/game-weather/${name}`,import.meta.url))).toString('utf8'));
const geocode=fixture('geocode-manhattan-2026-11-18.json.gz'),points=fixture('nws-points-manhattan-2026-11-18.json.gz'),hourly=fixture('nws-hourly-manhattan-2026-11-18.json.gz');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));

// Places as schedules name them.
assert.deepEqual(parsePlace('Manhattan, Kan.'),{city:'Manhattan',state:'KS'});
assert.deepEqual(parsePlace('Arlington, Texas'),{city:'Arlington',state:'TX'});
assert.deepEqual(parsePlace('Kansas City, Mo. (Arrowhead Stadium)'),{city:'Kansas City',state:'MO'});
assert.deepEqual(parsePlace('Chapel Hill, N.C.'),{city:'Chapel Hill',state:'NC'});
assert.deepEqual(parsePlace('Ames, IA'),{city:'Ames',state:'IA'});
assert.equal(parsePlace('Dublin, Ireland'),null,'outside the United States: none');
assert.equal(parsePlace('TBA'),null);
assert.equal(stateCode('Okla.'),'OK');assert.equal(stateCode('W.Va.'),'WV');assert.equal(stateCode('Kansas'),'KS');

// Manhattan, Kansas, not New York.
assert.deepEqual(geocodeResult(geocode,{city:'Manhattan',state:'KS'}),{lat:39.1836,lon:-96.5717});
assert.equal(geocodeResult(geocode,{city:'Manhattan',state:'TX'}),null);
assert.equal(geocodeUrl({city:'Manhattan'}),'https://geocoding-api.open-meteo.com/v1/search?name=Manhattan&count=10&country_code=US');
assert.equal(pointsUrl({lat:39.1836,lon:-96.5717}),'https://api.weather.gov/points/39.1836,-96.5717');
assert.equal(placeKey('Manhattan','KS'),'geo:v1:manhattan|KS');

// The hour of the start, by the place's clock: K-State vs Arizona, Nov 21,
// 6:00 PM in Manhattan.
const w=forecastAt(hourly,'2026-11-21T18:00');
assert.deepEqual(w,{time:'2026-11-21T18:00:00-06:00',temp:55,unit:'F',short:'Light Rain Likely',wind:'5 mph NW',precip:72,daytime:false});
assert.equal(weatherLine(w),'55°F · Light Rain Likely · Wind 5 mph NW · 72% chance of precipitation');
assert.equal(forecastAt(hourly,'2026-12-25T18:00'),null,'beyond the forecast: none');
assert.equal(forecastAt(null,'2026-11-21T18:00'),null);

// Through the Worker: a coming K-State football game in Manhattan gets the
// forecast; the place and the point are kept in KV, so a second build reads
// only the hourly forecast (from the source cache).
const answers={[geocodeUrl({city:'Manhattan'})]:geocode,[pointsUrl({lat:39.1836,lon:-96.5717})]:points,[points.properties.forecastHourly]:hourly};
const asked=[];
const fetch=async(url,init={})=>{const u=String(url?.url||url);asked.push({url:u,agent:new Headers(init.headers||url?.headers||{}).get('user-agent')});const body=answers[u];return body?new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}}):new Response('',{status:404});};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {attachWeather,catalogSchool}')(...Object.values(deps));
const kv=new Map(),env={HIGHLIGHTS:{get:async(k,t)=>kv.has(k)?(t==='json'?JSON.parse(kv.get(k)):kv.get(k)):null,put:async(k,v)=>{kv.set(k,v)}}};
const RealNow=Date.now;Date.now=()=>Date.parse('2026-11-18T23:00:00Z');
try{
  const game=(extra={})=>({id:'g',event_type:'GAME',status:'Upcoming',opponent:'Arizona',start_time:'2026-11-21T18:00:00.000Z',display_time:'Nov 21, 6:00 PM',site:{place:'Manhattan, Kan.',indicator:'H'},...extra});
  const groups=[{sport:'Football',upcoming:[game(),game({id:'tba',display_time:'Nov 21'}),game({id:'none',site:null}),game({id:'far',start_time:'2026-12-05T18:00:00.000Z',display_time:'Dec 5, 6:00 PM'})],results:[]}];
  await worker.attachWeather(groups,worker.catalogSchool('kstate'),'Football',env);
  const [first,tba,none,far]=groups[0].upcoming;
  assert.deepEqual({...first.weather,source:first.weather.source.name},{...w,place:'Manhattan, Kan.',source:'National Weather Service'});
  assert.equal(first.weather.source.url,'https://forecast.weather.gov/MapClick.php?lat=39.1836&lon=-96.5717');
  assert.equal(tba.weather,undefined,'no published start time');
  assert.equal(none.weather,undefined,'no place');
  assert.equal(far.weather,undefined,'beyond the forecast');
  assert.ok(kv.has(placeKey('Manhattan','KS'))&&kv.has('nws:v1:point:39.1836,-96.5717'));
  assert.ok(asked.filter(a=>a.url.startsWith('https://api.weather.gov/')).every(a=>a.agent==='SAS-Sports (game-day forecasts)'),'NWS asks for a User-Agent');
  // An indoor sport, a pro team: none.
  const indoor=[{sport:'Basketball',upcoming:[game()],results:[]}];
  await worker.attachWeather(indoor,worker.catalogSchool('kstate'),'Basketball',env);
  assert.equal(indoor[0].upcoming[0].weather,undefined);
}finally{Date.now=RealNow}

// The page shows it on coming cards and the next game.
const html=read('../public/index.html');
assert.match(html,/function weatherBlock\(e\)/);
assert.match(html,/\$\{count\}\$\{weatherBlock\(e\)\}\$\{seriesBlock\(e,true\)\}/);
console.log('game-weather: ok (K-State vs Arizona, Nov 21: 55°F, light rain likely)');
