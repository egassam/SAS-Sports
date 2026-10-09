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
2. Audit athlete identities from both official roster/profile links and each
   official school-sport Instagram account. An official team tag or an
   unambiguous athlete/account identification in an official post is accepted;
   name guesses and team-profile substitutes are rejected. Record the review
   date and source type in `athlete_verification`, and protect every successful
   sport with a positive `athlete_minimums` value. When an official roster
   publishes no personal links, list that sport in
   `athlete_profile_fallback_sports`; its athletes may then carry no Instagram
   only if their profile is an official roster URL on the school's domain.
3. Deep-certify it with
   `node tests/validate-schools.mjs --schools=NEW_ID --deep --base=PREVIEW_URL`.
4. Run the complete release gate against the same preview URL.
5. Only after every test passes, add the school to `certified-schools.json` and
   to the workflow matrix. That makes future changes protect it automatically.

Live checks retry temporary network failures. They intentionally run one school
at a time so the test suite cannot overload the Worker and create false errors.

## Live scoreboard tester

`npm run test:live-scoreboard` (`scripts/live-scoreboard-tester.mjs`) watches
every converted school-sport that has a live scoreboard. It switches itself on
and off:

- **ON**: a game of a sport still under test is in progress on ESPN, or has
  just ended. The tester polls the app's feed once a minute, the way the app
  reads it.
- **OFF**: no game of a sport under test is in progress. A run reads ESPN once
  and ends, or with `--minutes=N` sleeps until the next start time.
- **DONE**: the sport passed and is not tested again. `--reset=all|<school>[:<sport>]`
  turns it back on.

A sport passes when one of its games is in the feed's `live` list exactly once
and joined to the official schedule, with ESPN's score, a status line and, in
football, who has the ball. This must hold on two polls at least 60 s apart.
After ESPN marks the game final, the card must move to `results` with ESPN's
final score. A score up to 45 s behind ESPN counts as current. A card further
behind, or still live 15 minutes after the final, is retried and then fails.
Any other broken rule fails at once. A failing sport stays ON for its next
game, and the run exits 1.

`.github/workflows/live-scoreboard.yml` runs the tester every 10 minutes. Each
run follows live games for up to 9 minutes. The workflow keeps
`live-scoreboard-state.json` and a readable `STATUS.md` on the
`live-scoreboard-state` branch, and never writes to `main`. Read the state with
`git fetch origin live-scoreboard-state && git show FETCH_HEAD:STATUS.md`.
Locally, `--status` prints the table. `--state=<file>` picks the state file,
and `--base=<url>` or `--branch=<preview>` picks the app to test.
`tests/live-scoreboard-tester.mjs` checks these rules offline against a saved
ESPN payload.
