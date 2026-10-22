// Shared rules found onboarding the American (Oct 22).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {meetTeamPlaces,golfStoryPlace} from '../src/sidearm-school-kit.mjs';
import {wmtMeetResult} from '../src/wmt-api-kit.mjs';
import {inferSport} from '../scripts/onboard-school.mjs';
import {createConferenceGames} from '../src/conference-games.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');
const ordinal=n=>{const v=Number(n),s=v%100>=11&&v%100<=13?'th':({1:'st',2:'nd',3:'rd'}[v%10]||'th');return`${v}${s}`;};

// Team places with the team written out: "Women's 11th; Men's DNF" (East
// Carolina's Adidas Challenge, Sep 18). Mutation: without "'s" the line is
// "not read by any rule".
assert.deepEqual(meetTeamPlaces("Women's 11th; Men's DNF",ordinal),{Women:{place:'11th',points:null}});
// Coastal Carolina's "Women (9th)" and NC State's forms still read.
assert.deepEqual(meetTeamPlaces('Women (9th); Men (2nd)',ordinal),{Women:{place:'9th',points:null},Men:{place:'2nd',points:null}});
// The place first ("9th (M), 4th (W)", Indiana) stays unread: its TFRRS
// results decide (5th, 159 points).
assert.deepEqual(meetTeamPlaces('9th (M), 4th (W)',ordinal),{});

// UTSA's API results. Mutation: without each form the line is not read.
assert.equal(wmtMeetResult("Men's 4th / Women's 4th",'Cross Country').headline,"Men's team: 4th / Women's team: 4th");
assert.equal(wmtMeetResult('2nd/11','Golf').headline,'2nd of 11');
assert.equal(wmtMeetResult('T-10th/13','Golf').headline,'T10th of 13');
assert.equal(wmtMeetResult('No Team Result','Golf').headline,'No team score (individuals only)');
assert.equal(wmtMeetResult('No Team Result','Tennis').headline,'Completed');
// A cross country place without a team stays as written.
assert.equal(wmtMeetResult('2nd/11','Cross Country').headline,'2nd/11');

// A golf story's "taking 11th in the field of 13" (North Texas at The
// Clerico, Oct 21; the card has no place). Mutation: without "taking" it is
// null.
assert.equal(golfStoryPlace(fixture('north-texas-module/story-2026-10-21-mens-golf-mens-golf-wraps-up-fall-slate-.html.gz'),{team:"(?:Mean Green|North Texas|UNT|(?:Men's|Women's) Golf)"}),'11th');

// UTSA's "Track & Field/Cross Country" team is track. Mutation: without the
// slug onboarding leaves the team out.
assert.equal(inferSport('/sports/track-fieldcross-country/schedule'),'Track & Field');

// American conference games by membership: opponents write "FAU", "USF",
// "UTSA", "UAB", "ECU", "Wichita St.". Mutation: without the names these
// games leave the record.
const schools=JSON.parse(read('../src/schools.json'));
assert.deepEqual(schools.filter(s=>s.conference==='American').map(s=>s.id).sort(),['charlotte','east-carolina','fau','memphis','north-texas','rice','south-florida','temple','tulane','tulsa','uab','utsa','wichita-state']);
const {markConferenceGames}=createConferenceGames({schools});
const tulsa=schools.find(s=>s.id==='tulsa');
const games=markConferenceGames(['FAU','USF','UTSA','UAB','ECU','Wichita','UNC Charlotte','Oklahoma State'].map((opponent,i)=>({sport:'Volleyball',opponent,status:'Final',start_time:`2026-10-${String(i+1).padStart(2,'0')}T18:00:00Z`,title:`Tulsa vs ${opponent}`})),'',tulsa);
assert.deepEqual(games.map(g=>g.conference_game),[true,true,true,true,true,true,true,false]);
console.log('American shared checks passed');
