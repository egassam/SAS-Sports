// Turns on live scoring for a school: writes the SQL that adds the school, its
// school code and its first school admin (who then adds scorekeepers in /score).
// Secrets are hashed here; only the hashes go into the database.
//
//   node scripts/score-setup.mjs --school=manhattan-ks --name="Manhattan" \
//     --code=MHS-XXXX-XXXX --admin=owner --password='a long password'
//   then run the printed SQL against D1:
//   npx wrangler d1 execute sas-sports-live-scoring --remote --file=<file>
//
// Leave --code or --password out to generate a random one (printed once).
import {randomBytes} from 'node:crypto';
import {hashSecret} from '../src/live-scoring/api.mjs';

const arg=name=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const school=arg('school'),name=arg('name'),admin=(arg('admin')||'owner').toLowerCase();
if(!/^[a-z0-9-]{2,64}$/.test(school||'')||!name){console.error('usage: --school=<id> --name="<display name>" [--code=] [--admin=] [--password=]');process.exit(1)}
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const random=n=>[...randomBytes(n)].map(b=>alphabet[b%alphabet.length]).join('');
const code=(arg('code')||`${school.slice(0,3).toUpperCase()}-${random(4)}-${random(4)}`).toUpperCase();
const password=arg('password')||`${random(4)}-${random(4)}-${random(4)}`.toLowerCase();
const q=s=>`'${String(s).replace(/'/g,"''")}'`;
const now=Date.now();
console.log(`-- school code: ${code}\n-- admin: ${admin} / ${password}`);
console.log(`INSERT INTO score_schools(school_id,name,code_hash,enabled,created_at) VALUES(${q(school)},${q(name)},${q(await hashSecret(code))},1,${now}) ON CONFLICT(school_id) DO UPDATE SET name=excluded.name,code_hash=excluded.code_hash,enabled=1;`);
console.log(`INSERT INTO score_users(school_id,username,display_name,password_hash,role,created_at,created_by) VALUES(${q(school)},${q(admin)},NULL,${q(await hashSecret(password))},'admin',${now},'setup') ON CONFLICT(school_id,username) DO UPDATE SET password_hash=excluded.password_hash,role='admin';`);
