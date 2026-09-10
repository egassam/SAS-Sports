import assert from 'node:assert/strict';
import {rosterSocialInstagrams} from '../src/roster-socials.js';

const fixture=`
  <a href="https://twitter.com/cameronepps7" aria-label="Cameron Epps Twitter profile page"></a>
  <a data-test-id="social" href="https://www.instagram.com/_.cammo" class="social" aria-label="Cameron Epps Instagram profile page"></a>
  <a aria-label="Cooper Lai Instagram profile page" href="https://www.instagram.com/cooper.lai"></a>
  <a href="https://www.instagram.com/okstatefb/" aria-label="Instagram"></a>
  <a href="https://www.instagram.com/explore/tags/cowboys" aria-label="Tag Instagram profile page"></a>`;

const accounts=rosterSocialInstagrams(fixture);
assert.equal(accounts.get('cameron epps'),'https://www.instagram.com/_.cammo/');
assert.equal(accounts.get('cooper lai'),'https://www.instagram.com/cooper.lai/');
assert.equal(accounts.has('instagram'),false,'unbound team navigation must be ignored');
assert.equal(accounts.has('tag'),false,'non-profile Instagram paths must be ignored');
assert.equal(accounts.size,2);
console.log('Official roster-card Instagram identity test passed.');
