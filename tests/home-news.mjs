// Home's news (user, November 2, 2026): official stories linked from the
// favorites' recent finals.
import assert from 'node:assert/strict';
import {isStoryLink,newsCandidates,storyFromHtml,storyFor} from '../src/news.mjs';

const now=new Date('2026-11-02T18:00:00Z');
const final=(id,day,extra={})=>({id,status:'Final',title:`K-State vs ${id}`,start_time:`${day}T12:00:00.000Z`,school_score:'3',opponent_score:'1',headline:'W, 3-1',recap_url:`https://www.kstatesports.com/news/${day.replace(/-/g,'/')}/volleyball-${id}`,...extra});
const groups=[{school_id:'kstate',school:'Kansas State',sport:'Volleyball',results:[
  final('tcu','2026-11-01'),final('kansas','2026-10-30'),final('baylor','2026-10-25'),final('utah','2026-10-20'),
  final('old','2026-09-01'),
  final('maxpreps','2026-10-31',{recap_url:'https://www.maxpreps.com/games/1',recap_label:'View MaxPreps game page'}),
  final('pdf','2026-10-31',{recap_url:'https://www.kstatesports.com/documents/2026/10/31/1.PDF'}),
  {...final('live','2026-11-02'),status:'Live'}
]}];

assert.equal(isStoryLink(groups[0].results[0]),true,'an official /news/ recap is a story');
assert.equal(isStoryLink(groups[0].results[5]),false,'a MaxPreps game page is not news');
assert.equal(isStoryLink(groups[0].results[6]),false,'a box score PDF is not news');
assert.equal(isStoryLink({recap_url:'https://espn.com/x/recap/_/gameId/1',recap_label:'View ESPN recap'}),true,'a labelled recap is a story');
assert.equal(isStoryLink({recap_url:'https://bound.co/x',recap_label:'View on Bound'}),false,'a Bound page is not news');

const picked=newsCandidates(groups,now);
assert.deepEqual(picked.map(x=>x.e.id),['tcu','kansas','baylor'],'the three newest finals with a story, within three weeks');

const html=`<html><head><title>Ignored</title><meta property="og:title" content="K-State Falls in Four at No. 16 TCU - Kansas State University Athletics"><meta property="og:description" content="FORT WORTH &amp; more &#8211; the Wildcats fell."><meta property="og:image" content="/images/2026/11/1/tcu.jpg"><meta property="article:published_time" content="2026-11-01T22:10:00Z"></head></html>`;
const page=storyFromHtml(html,'https://www.kstatesports.com/news/2026/11/1/volleyball-tcu');
assert.equal(page.headline,'K-State Falls in Four at No. 16 TCU','the site name after the headline is dropped');
assert.equal(page.summary,'FORT WORTH & more – the Wildcats fell.');
assert.equal(page.image,'https://www.kstatesports.com/images/2026/11/1/tcu.jpg','a relative picture becomes absolute');
assert.equal(page.published,'2026-11-01T22:10:00.000Z');
assert.equal(storyFromHtml('<meta property="og:image" content="http://x.com/a.jpg">','https://x.com/news/a').image,'','a picture over http is not shown on an https page');

const card=storyFor(picked[0],page);
assert.equal(card.headline,'K-State Falls in Four at No. 16 TCU');
assert.equal(card.school_id,'kstate');assert.equal(card.sport,'Volleyball');assert.equal(card.source,'kstatesports.com');
const fallback=storyFor(picked[1],null);
assert.equal(fallback.headline,'K-State vs kansas · W, 3-1','an unread page falls back to the game and its result');
assert.equal(fallback.from_page,false);

console.log('home-news: ok');
