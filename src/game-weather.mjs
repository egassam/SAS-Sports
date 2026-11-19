// Weather on outdoor games (user, November 18, 2026: item 4 of "What unique
// things should we add now?", "Start with 2 then work your way through the
// rest"): a coming outdoor game's forecast at its start, for the place the
// schedule names.
//
// Sources (free, no key):
// - the place: the schedule's own location ("Manhattan, Kan.", SIDEARM's
//   game `location`), placed by Open-Meteo's geocoder (city and state);
// - the forecast: the National Weather Service (api.weather.gov), the
//   point's hourly forecast (`/points/<lat>,<lon>` gives `forecastHourly`,
//   156 hours of periods with temperature, wind, short forecast and chance of
//   precipitation). NWS covers the United States only.
// A game with no named place, no published start time, indoors, or beyond
// the forecast's hours shows none.

export const WEATHER_SPORTS=new Set(['Football','Soccer','Baseball','Softball','Track & Field','Cross Country','Golf','Lacrosse','Field Hockey','Rowing','Beach Volleyball']);
export const NWS_API='https://api.weather.gov/';
export const GEOCODER='https://geocoding-api.open-meteo.com/v1/search';
export const placeKey=(city,state)=>`geo:v1:${city.toLowerCase()}|${state}`;

const STATES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
// AP style and other spellings schedules use ("Kan.", "Okla.", "Texas", "Ga.").
const AP={ala:'AL',ariz:'AZ',ark:'AR',calif:'CA',cal:'CA',colo:'CO',conn:'CT',del:'DE',fla:'FL',ga:'GA',ill:'IL',ind:'IN',kan:'KS',kans:'KS',ky:'KY',la:'LA',md:'MD',mass:'MA',mich:'MI',minn:'MN',miss:'MS',mo:'MO',mont:'MT',neb:'NE',nebr:'NE',nev:'NV','n.h':'NH','n.j':'NJ','n.m':'NM','n.y':'NY','n.c':'NC','n.d':'ND',okla:'OK',ore:'OR',pa:'PA',penn:'PA','r.i':'RI','s.c':'SC','s.d':'SD',tenn:'TN',tex:'TX',vt:'VT',va:'VA',wash:'WA','w.va':'WV',wis:'WI',wyo:'WY','d.c':'DC'};
const STATE_BY_NAME=Object.fromEntries(Object.entries(STATES).map(([k,v])=>[v.toLowerCase(),k]));
export function stateCode(text){
  const t=String(text||'').trim().replace(/\.$/,'').toLowerCase();if(!t)return null;
  if(t.length===2&&STATES[t.toUpperCase()])return t.toUpperCase();
  return AP[t]||AP[t.replace(/\./g,'')]||STATE_BY_NAME[t]||null;
}
// "Manhattan, Kan.", "Arlington, Texas", "Kansas City, Mo. (Arrowhead)" →
// {city, state}; a place with no US state is none.
export function parsePlace(place){
  const m=String(place||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').match(/^\s*([A-Za-z.' -]+?)\s*,\s*([A-Za-z. ]+?)\s*(?:[|/–-].*)?$/);
  if(!m)return null;
  const state=stateCode(m[2]);
  return state?{city:m[1].trim(),state}:null;
}
// The geocoder's place in that state.
export function geocodeResult(payload,{city,state}){
  const name=STATES[state];
  const hit=(payload?.results||[]).find(r=>String(r.country_code||'').toUpperCase()==='US'&&r.admin1===name&&String(r.name||'').toLowerCase()===city.toLowerCase())
    ||(payload?.results||[]).find(r=>String(r.country_code||'').toUpperCase()==='US'&&r.admin1===name);
  return hit&&Number.isFinite(hit.latitude)&&Number.isFinite(hit.longitude)?{lat:Math.round(hit.latitude*1e4)/1e4,lon:Math.round(hit.longitude*1e4)/1e4}:null;
}
export const geocodeUrl=({city})=>`${GEOCODER}?name=${encodeURIComponent(city)}&count=10&country_code=US`;
export const pointsUrl=({lat,lon})=>`${NWS_API}points/${lat},${lon}`;

// The hour of the forecast the game starts in, by the place's local clock
// (an event's start is its local wall clock: "2026-11-21T18:00").
export function forecastAt(payload,localStart){
  const periods=payload?.properties?.periods;if(!Array.isArray(periods)||!localStart)return null;
  const want=String(localStart).slice(0,13);
  const p=periods.find(x=>String(x.startTime).slice(0,13)===want);
  if(!p)return null;
  const precip=p.probabilityOfPrecipitation?.value;
  return{time:p.startTime,temp:Number.isFinite(p.temperature)?p.temperature:null,unit:p.temperatureUnit||'F',short:p.shortForecast||null,wind:[p.windSpeed,p.windDirection].filter(Boolean).join(' ')||null,precip:Number.isFinite(precip)?precip:null,daytime:p.isDaytime??null};
}
// "48°F · Mostly Clear · Wind 10 mph S · 20% chance of rain".
export function weatherLine(w){
  if(!w)return'';
  return[w.temp!=null?`${w.temp}°${w.unit||'F'}`:null,w.short,w.wind?`Wind ${w.wind}`:null,w.precip?`${w.precip}% chance of precipitation`:null].filter(Boolean).join(' · ');
}
