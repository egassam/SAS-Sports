// The test harnesses evaluate src/index.js with its import lines removed and
// pass the imported names in themselves. School modules are read here from
// index.js's own `./schools/*` imports, so adding a school module needs only
// its import line in index.js: no harness has to list it.
import {readFileSync} from 'node:fs';

const index=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
export const schoolModuleDeps={};
for(const [,names,path] of index.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"](\.\/schools\/[^'"]+)['"];?$/gm)){
  const module=await import(new URL(`../src/${path.slice(2)}`,import.meta.url));
  for(const name of names.split(',').map(x=>x.trim()).filter(Boolean)){
    if(!(name in module))throw Error(`src/index.js imports ${name} from ${path}, which does not export it`);
    schoolModuleDeps[name]=module[name];
  }
}
