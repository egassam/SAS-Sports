// Athlete Instagram from the school's official NIL marketplace on Opendorse
// (user, October 8: the approved next athlete source). Fixtures are the real
// profile pages of October 16, 2026 (their __NEXT_DATA__ only).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {opendorseSlug,opendorseProfile,opendorseInstagram,OPENDORSE_PROFILE} from '../src/opendorse.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=slug=>gunzipSync(readFileSync(new URL(`./fixtures/opendorse/${slug}.html.gz`,import.meta.url))).toString('utf8');
const worker=read('../src/index.js');

// Slugs as Opendorse writes them.
assert.equal(OPENDORSE_PROFILE,'https://opendorse.com/profile/');
assert.equal(opendorseSlug('Madison Booker'),'madison-booker');
assert.equal(opendorseSlug('Abby Vander Wal'),'abby-vander-wal');
assert.equal(opendorseSlug("D'Andre O'Neal Jr."),'dandre-oneal-jr');
assert.equal(opendorseSlug('José Núñez'),'jose-nunez');
assert.equal(opendorseSlug(''),'');

const texas={team:'Texas Longhorns'};
// A current Texas athlete: Opendorse lists the marketplace's own athletes
// under previousTeams with currentTeams empty.
const booker=opendorseProfile(page('madison-booker'));
assert.deepEqual([booker.currentTeams,booker.previousTeams],[[],['Texas Longhorns']]);
assert.equal(opendorseInstagram(page('madison-booker'),{...texas,name:'Madison Booker',sport:'Basketball'}),'https://www.instagram.com/therealmaddieb_/');
assert.equal(opendorseInstagram(page('colton-vasek'),{...texas,name:'Colton Vasek',sport:'Football'}),'https://www.instagram.com/coltonvasek2/');
assert.equal(opendorseInstagram(page('abby-vander-wal'),{...texas,name:'Abby Vander Wal',sport:'Volleyball'}),'https://www.instagram.com/abbyvanderwal/');
// The sport must match ("Women's Basketball" is Basketball, not Volleyball).
assert.equal(opendorseInstagram(page('madison-booker'),{...texas,name:'Madison Booker',sport:'Volleyball'}),null);
// The name must match (a roster name the slug happens to reach is not enough).
assert.equal(opendorseInstagram(page('madison-booker'),{...texas,name:'Maddie Booker',sport:'Basketball'}),null);
// The same slug can be another school's athlete: taylor-harvey is a
// Delaware State golfer (currentTeams), not Texas's.
assert.equal(opendorseInstagram(page('taylor-harvey'),{...texas,name:'Taylor Harvey',sport:'Golf'}),null);
assert.equal(opendorseInstagram(page('taylor-harvey'),{team:'Delaware State Hornets',name:'Taylor Harvey',sport:'Golf'}),'https://www.instagram.com/taylorharveymadegolf/');
// An athlete now listed on another team is not the school's, even if the
// school is among the previous teams.
const moved=page('colton-vasek').replace('"currentTeams":[]','"currentTeams":["Oklahoma Sooners"]');
assert.equal(opendorseInstagram(moved,{...texas,name:'Colton Vasek',sport:'Football'}),null);
assert.equal(opendorseInstagram(moved,{team:'Oklahoma Sooners',name:'Colton Vasek',sport:'Football'}),'https://www.instagram.com/coltonvasek2/');
// Handles: empty, blocked, a page that is not a profile, or not Instagram.
const withHandle=v=>page('colton-vasek').replace('"instagramUrl":"www.instagram.com/coltonvasek2"',`"instagramUrl":${JSON.stringify(v)}`);
assert.equal(opendorseInstagram(withHandle(''),{...texas,name:'Colton Vasek',sport:'Football'}),null);
assert.equal(opendorseInstagram(withHandle('www.instagram.com/'),{...texas,name:'Colton Vasek',sport:'Football'}),null);
assert.equal(opendorseInstagram(withHandle('www.instagram.com/@'),{...texas,name:'Colton Vasek',sport:'Football'}),null);
assert.equal(opendorseInstagram(withHandle('https://instagram.com/@ColtonVasek2?hl=en'),{...texas,name:'Colton Vasek',sport:'Football'}),'https://www.instagram.com/coltonvasek2/');
assert.equal(opendorseInstagram(withHandle('www.tiktok.com/coltonvasek2'),{...texas,name:'Colton Vasek',sport:'Football'}),null);
assert.equal(opendorseInstagram(withHandle('www.instagram.com/texaslonghorns'),{...texas,name:'Colton Vasek',sport:'Football',blocked:new Set(['texaslonghorns'])}),null);
assert.equal(opendorseInstagram('<html>no data</html>',{...texas,name:'Colton Vasek',sport:'Football'}),null);
// Sports with two words and an "and": Track and Field, Swimming & Diving.
const sport=s=>page('colton-vasek').replace('"sports":["Football"]',`"sports":[${JSON.stringify(s)}]`);
assert.ok(opendorseInstagram(sport("Women's Track and Field"),{...texas,name:'Colton Vasek',sport:'Track & Field'}));
assert.ok(opendorseInstagram(sport("Men's Swimming & Diving"),{...texas,name:'Colton Vasek',sport:'Swimming & Diving'}));
assert.ok(opendorseInstagram(sport('Cross Country'),{...texas,name:'Colton Vasek',sport:'Cross Country'}));
assert.equal(opendorseInstagram(sport("Women's Track and Field"),{...texas,name:'Colton Vasek',sport:'Cross Country'}),null);

// The Worker asks Opendorse only for a school whose official site links its
// marketplace, after roster cards and profile pages, for roster athletes,
// until three have Instagram, at most OPENDORSE_BUDGET a sport.
for(const [id,marketplace,team] of [['mississippi-state','mississippistate-bulldogs','Mississippi State Bulldogs'],['vanderbilt','vanderbilt-commodores','Vanderbilt Commodores'],['boston-college','bostoncollege-eagles','Boston College Eagles'],['texas','texas-longhorns','Texas Longhorns'],['oklahoma','oklahoma-sooners','Oklahoma Sooners'],['missouri','missouri-tigers','Missouri Tigers'],['wisconsin','wisconsin-badgers','Wisconsin Badgers'],['tcu','tcu-hornedfrogs','TCU Horned Frogs'],['nebraska','nebraska-huskers','Nebraska Huskers'],['maryland','maryland-terrapins','Maryland Terrapins']])
  assert.ok(read(`../src/schools/${id}.mjs`).includes(`opendorse:{marketplace:'${marketplace}',team:'${team}'}`),id);
assert.ok(worker.includes("const lookup=nil?.opendorse?{source:'opendorse',url:profile=>`${OPENDORSE_PROFILE}${opendorseSlug(profile.name)}`"));
assert.ok(worker.includes("if(lookup&&found.filter(a=>a.instagram_url).length<3){"));
assert.ok(worker.indexOf("if(lookup&&found.filter(a=>a.instagram_url).length<3){")>worker.indexOf('for(let start=0;start<Math.min(unread.length,ATHLETE_PROFILE_BUDGET)'),'after the official profile pages');
assert.ok(worker.includes('const ATHLETE_PROFILE_BUDGET=24,OPENDORSE_BUDGET=18,NIL_LOOKUP_MS=10000;'));
assert.ok(worker.includes('&&Date.now()-started<NIL_LOOKUP_MS;start+=6){'),'marketplace lookups stop after the time limit');
console.log('Opendorse module tests passed');
