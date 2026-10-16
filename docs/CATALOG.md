# Catalog (schools, teams, series)

User, October 16, 2026: "The plan is to expand it for all middle schools, high schools in the country, all NCAA sports, and all pro events", then "Start the catalog move".

That is about 40,000–50,000 entries. The page used to carry every entry (`BOOTSTRAP_SCHOOLS` in `public/index.html`) and download them all again from `/schools`. That does not scale, so the catalog now lives in Cloudflare D1, and the page reads its menus one step at a time.

## Now (4.100.1, step 1 of the move)

- **Store:** D1 database `sas-sports-catalog` (binding `CATALOG_DB`, id `49c4cfa6-ca6a-4999-93c8-1233cd084012`, created Oct 16 in ENAM). The tables are created by the Worker (`CATALOG_SCHEMA` in `src/catalog.mjs`):
  - `catalog_entries(id, level, grp, mid, sort, card)`, indexed on `(level, grp, mid, sort)`. `grp` is the first box: state, conference or sport. `mid` is the second box: city or league. `card` is what the page needs: name, short name, level, state, city, conference, league, sport, class, division, time zone and sponsored sports. It holds no source settings.
  - `catalog_meta`: `revision`, `count`, `synced_at`.
- **Authoring:** `src/schools.json` and `src/sponsored-sports.json` are still the copy reviewed in pull requests. The revision is a hash of the cards. On its first catalog read each minute, **production** (host `sas-sports.lovetogivepain.workers.dev`) replaces the D1 rows when the revision changed, in one transaction. **Previews never write.** A preview reads D1 when the database holds its own revision and every one of its rows (`storeMatches`); otherwise (a branch with catalog changes) it answers from the bundled cards. A failed D1 read also answers from the bundled cards. The response header `x-sas-catalog: <d1|bundled> <revision>` says which was used.
- **Check:** `node scripts/verify-catalog.mjs --prod --expect=d1` (or `--branch=<b> --expect=bundled`) reads every menu step as served and with `?source=bundled`, and compares the two.
- **API:**
  - `GET /catalog/menu?level=&group=&middle=` returns every level with its count, the level's groups, the group's cities or leagues, and the matching entries in catalog order. A group or city the level does not have reads as "All".
  - `GET /catalog/entries?ids=a,b` returns up to 50 entries by id.
  - `/schools` is kept for scripts (`tests/validate-schools.mjs`).
- **Page:** `loadSchools` reads the saved team and the favorites (`/catalog/entries`), then the saved team's menu step. A new level, group or city reads its own step. Each answer is kept in `localStorage` (`sas-catalog:v1:<path>`) for a dropped network, and a slow answer never overwrites a newer one. The menus and their wording are unchanged. `tests/catalog-module.mjs` checks every menu step against the page's old rules, with D1 and the bundled copy giving the same answers.

## Still on the page or in the Worker (next steps)

1. **Colors and sports maps:** `TEAM_THEMES` and the `SCHOOL_SPORTS` fallback are still in `public/index.html`, keyed by id, and `add-school` writes them. Move both into the card (`theme`, `sponsored_sports`), then remove them from the page and update `protect-certified` and the onboarding scripts.
2. **Worker lookups:** the Worker still finds an entry in the bundled `schools.json` (synchronous `schools.find`, about ten places). Route every lookup through one async `catalogEntry(id)` reading D1 (with a per-isolate cache) before the bundled file stops holding every entry.
3. **Imports:** once entries are written to D1 by importers (state associations, NCAA membership, league feeds) instead of `schools.json`, the revision check becomes an import log. Previews would then need their own database or a read-only view.
4. **Big groups:** "All states" for high school would list about 20,000 schools. Require a state for the high-school and middle-school levels, and add search (`/catalog/search?q=`, SQLite FTS5) for the school box.
