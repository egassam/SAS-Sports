# SAS Sports school certification

`certified-schools.json` is the protected production baseline. A school is added
to that file only after its candidate certification passes.

## Release gate

1. Run `npm run test:release` after every code change. This protects parser,
   cache, interface, official-route, and seven-school invariants.
2. Run `npm run test:certified` against the proposed deployment. It validates
   current events, official source ownership, scores/results, and athlete
   identity for every protected school.
3. Run `npm run test:isolation` against the proposed deployment. It performs an
   A→B→A switch for every protected school and fails if cached data leaks.

Set `SAS_SPORTS_BASE_URL` to test a preview instead of production.

## Adding a school

1. Add the school's official catalog, schedule, roster, and sponsored-sport
   configuration without editing the protected baseline.
2. Deep-certify it with
   `node tests/validate-schools.mjs --schools=NEW_ID --deep --base=PREVIEW_URL`.
3. Run the complete release gate against the same preview URL.
4. Only after every test passes, add the school to `certified-schools.json` and
   to the workflow matrix. That makes future changes protect it automatically.

Live checks retry temporary network failures. They intentionally run one school
at a time so the test suite cannot overload the Worker and create false errors.
