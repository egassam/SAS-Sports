import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sidearmScheduleGames} from '../src/sidearm-schedule-data.mjs';

// The older SIDEARM schedule page (Utah State's football page, saved Oct 19)
// embeds its games as plain JSON in a Vue/knockout script, not __NUXT_DATA__:
// the shared reader cuts the array out and reads the same game objects.
// Mutation: without the classic reader the page gives no games.
const page=gunzipSync(readFileSync(new URL('./fixtures/sidearm-classic/utah-state-football-schedule.html.gz',import.meta.url))).toString('utf8');
const games=sidearmScheduleGames(page);
assert.equal(games.length,13);
assert.deepEqual(games.slice(0,2).map(g=>[g.date.slice(0,10),g.opponent.title,g.result?.status,g.result?.team_score,g.result?.opponent_score]),[['2026-09-05','Idaho State','L','17','29'],['2026-09-12','#19 Washington','L','14','16']]);
// Another page of the site (its scoreboard widget also lists "games"): no
// schedule_id, no games.
assert.deepEqual(sidearmScheduleGames(page.replace(/\bvar\s+schedule_id\s*=\s*\d+/,'')),[]);
// The same older page with no game data (Big Sky, Oct 21): each game is
// read from its rendered row. Eastern Washington football: day and published
// time, "at", the opponent with its rank, the result spans, the recap and the
// row's conference mark. Mutation: without the row reader every Big Sky
// classic page gives no games.
const big=(school,name)=>gunzipSync(readFileSync(new URL(`./fixtures/${school}-module/${name}-schedule.html.gz`,import.meta.url))).toString('utf8');
const ewu=sidearmScheduleGames(big('eastern-washington','football'));
assert.equal(ewu.length,12);
// The ranking span before the name is kept as the prefix (Southland, Oct 24).
assert.deepEqual(ewu[0],{id:6130,date:'2026-08-29T14:00:00',enddate:null,time:'2:00 PM',location_indicator:'A',at_vs:'at',opponent:{title:'#24/25 Northern Arizona',prefix:'#24/25'},tournament:null,
  result:{status:'L',team_score:'27',opponent_score:'34',prescore_info:'',postscore_info:'',recap:{url:'/news/2026/8/29/football-eagles-miss-upset-bid-over-lumberjacks-in-season-opener.aspx'}},noplay_text:'',type:'',conference:true});
// A non-conference game has no conference mark (Northern Iowa, Sep 5).
assert.equal(ewu[1].conference,false);
// An opponent marked "(Exh.)" is an exhibition (type "S", as the page data
// types one): men's basketball vs CSU Bakersfield, Oct 18.
assert.equal(sidearmScheduleGames(big('eastern-washington','mens-basketball'))[0].type,'S');
// A tournament block names its games' tournament (Idaho State volleyball at
// the Shocker Volleyball Classic); a season used as a block ("Fall Season",
// Southern Utah golf) is no tournament; a multi-day event runs to its
// "enddate" day; a meet's place is its result text.
assert.deepEqual(sidearmScheduleGames(big('idaho-state','womens-volleyball')).slice(0,3).map(g=>g.tournament?.title),['Shocker Volleyball Classic','Shocker Volleyball Classic','Shocker Volleyball Classic']);
const suu=sidearmScheduleGames(big('southern-utah','womens-golf'))[0];
assert.deepEqual([suu.date,suu.enddate,suu.opponent.title,suu.tournament,suu.result.prescore_info],['2026-09-14T00:00:00','2026-09-15T00:00:00','Wolverine Invitational',null,'3rd of 10']);
// Portland State writes the season in an h1 and the opponent in an h3.
assert.deepEqual(sidearmScheduleGames(big('portland-state','football')).slice(0,1).map(g=>[g.date,g.opponent.title,g.result.status]),[['2026-08-29T12:00:00','#6 UC Davis','L']]);
console.log('Classic SIDEARM schedule checks passed');
