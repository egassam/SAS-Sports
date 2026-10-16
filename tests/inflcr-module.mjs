// Athlete Instagram from the school's INFLCR Exchange (user, October 16: "Fix
// all the schools from the nil"). Fixtures are real name-search answers of
// October 16, 2026 from Michigan's public exchange list.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {INFLCR_SCHOOLS,inflcrTeamSports,inflcrInstagram} from '../src/inflcr.mjs';
import {instagramFrom} from '../src/opendorse.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const answer=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/inflcr/${name}.json.gz`,import.meta.url))).toString('utf8'));
const worker=read('../src/index.js');

assert.equal(INFLCR_SCHOOLS,'https://api.inflcr.com/public/schools/');
// Team names as the exchanges write them.
const sports=t=>[...inflcrTeamSports(t)].sort();
assert.deepEqual(sports('University of Michigan Track/Field & XC'),['Cross Country','Track & Field']);
assert.deepEqual(sports('USC T&F'),['Track & Field']);
assert.deepEqual(sports('University of Michigan MBB'),['Basketball']);
assert.deepEqual(sports('University of Michigan WBB'),['Basketball']);
assert.deepEqual(sports("University of Michigan Men's Ice Hockey"),['Hockey']);
assert.deepEqual(sports("University of Michigan Women's Field Hockey"),['Field Hockey']);
assert.deepEqual(sports('UCLA Beach Volleyball'),['Beach Volleyball']);
assert.deepEqual(sports("University of Michigan Women's Volleyball"),['Volleyball']);
assert.deepEqual(sports("University of Michigan Women's Swimming and Diving"),['Swimming & Diving']);
assert.deepEqual(sports("University of Michigan Women's Rowing"),['Rowing']);
assert.deepEqual(sports('Utah Football'),['Football']);
assert.deepEqual(sports('University of Michigan Cheer'),[]);

// A football player with Instagram.
assert.equal(inflcrInstagram(answer('fb'),{name:'James Kavouklis',sport:'Football'}),'https://www.instagram.com/james_kavo/');
assert.equal(inflcrInstagram(answer('fb'),{name:'James Kavouklis',sport:'Basketball'}),null,'another sport');
assert.equal(inflcrInstagram(answer('fb'),{name:'James Kavouk',sport:'Football'}),null,'another name');
assert.equal(inflcrInstagram(answer('fb'),{name:'James Kavouklis',sport:'Football',blocked:new Set(['james_kavo'])}),null,'blocked');
// A runner on the "Track/Field & XC" team: both sports.
assert.equal(inflcrInstagram(answer('xc'),{name:'Riley Flemington',sport:'Cross Country'}),'https://www.instagram.com/rileyflemington/');
assert.equal(inflcrInstagram(answer('xc'),{name:'Riley Flemington',sport:'Track & Field'}),'https://www.instagram.com/rileyflemington/');
// No Instagram connected.
assert.equal(inflcrInstagram(answer('none'),{name:'Sammi Woods',sport:'Soccer'}),null);
// Later pages answer an object keyed by position, not a list.
const fb=answer('fb'),keyed={...fb,data:Object.fromEntries((Array.isArray(fb.data)?fb.data:Object.values(fb.data)).map((r,i)=>[String(160+i),r]))};
assert.equal(inflcrInstagram(keyed,{name:'James Kavouklis',sport:'Football'}),'https://www.instagram.com/james_kavo/');
assert.equal(inflcrInstagram(null,{name:'James Kavouklis',sport:'Football'}),null);
// Handles in either form.
assert.equal(instagramFrom('james_kavo'),'https://www.instagram.com/james_kavo/');
assert.equal(instagramFrom('@James_Kavo'),'https://www.instagram.com/james_kavo/');
assert.equal(instagramFrom('https://instagram.com/james_kavo'),'https://www.instagram.com/james_kavo/');
assert.equal(instagramFrom('www.instagram.com/'),null);
assert.equal(instagramFrom('https://www.tiktok.com/@jameskavo'),null);

// Eleven schools link their exchange from their official site; Opendorse
// marketplaces for ten. A school uses one of them.
const exchanges={utah:'university-of-utah',indiana:'indiana-university',usc:'university-of-southern-california','ohio-state':'the-ohio-state-university',purdue:'purdue-university',ucla:'ucla',duke:'duke-university',michigan:'university-of-michigan',minnesota:'university-of-minnesota',rutgers:'rutgers-university',miami:'university-of-miami'};
for(const [id,slug] of Object.entries(exchanges)){const m=read(`../src/schools/${id}.mjs`);assert.ok(m.includes(`inflcr:{school:'${slug}'}`),id);assert.ok(!m.includes('opendorse:{'),id);}
for(const [id,team] of [['mississippi-state','Mississippi State Bulldogs'],['vanderbilt','Vanderbilt Commodores'],['boston-college','Boston College Eagles']])assert.ok(read(`../src/schools/${id}.mjs`).includes(`team:'${team}'}`),id);
assert.ok(worker.includes(":nil?.inflcr?{source:'inflcr',url:profile=>`${INFLCR_SCHOOLS}${nil.inflcr.school}/athletes?name=${encodeURIComponent(profile.name)}`"));
console.log('INFLCR module tests passed');
