# SAS Sports school onboarding

The onboarding pipeline discovers a candidate school without exposing it in the production selector. The protected Big 12 baseline remains unchanged until the candidate passes every gate.

## Start a candidate

The school identity must already exist in `src/schools.json`.

```bash
npm run onboard-school -- --school nebraska
```

The command:

1. Loads the official athletics homepage from `src/schools.json`.
2. Detects SIDEARM, WMT, Presto, or a custom publisher.
3. Discovers official schedule and roster links.
4. Maps those links to SAS Sports names.
5. Writes `onboarding/drafts/nebraska.json`.
6. Reports missing schedule or roster links for manual review.

Use an explicit sports list when the athletics homepage does not publish every navigation link:

```bash
npm run onboard-school -- --school nebraska --sports "Football,Volleyball,Soccer,Cross Country"
```

## Review before applying

Check the generated draft against `onboarding/school.schema.json`.

Required review:

- Every listed sport is actually sponsored by the school.
- Every source remains on an official athletics domain.
- Men’s and women’s combined sports include all required sources.
- Empty schedules are unpublished seasons, not parser failures.
- Roster pages contain athletes rather than staff or team landing pages.
- School colors pass the existing accessible-theme checks.
- Personal social links are identity-verified; never substitute a team account.

## Apply the reviewed sports list

```bash
npm run onboard-school -- --school nebraska --sports "..." --apply
```

`--apply` updates only `src/sponsored-sports.json`. School-specific source overrides remain review-only because a bad URL can affect live parsing.

## Certification

Run local protections while generating the draft:

```bash
npm run onboard-school -- --school nebraska --sports "..." --apply --certify
```

Run deep live certification against a deployed preview:

```bash
node tests/validate-schools.mjs --schools=nebraska --deep --base=PREVIEW_URL
npm run test:isolation:full
```

A school may be added to `tests/certified-schools.json` and the GitHub Actions matrix only after:

- all sponsored feeds are isolated;
- current results and upcoming events are valid;
- football can transition Upcoming → Live → Final;
- every displayed final has correct score/result and official recap behavior;
- athlete names, portraits, profiles, and verified social links belong to the correct sport;
- rapid school and sport switching cannot show stale data;
- the complete previously certified baseline still passes;
- mobile loading and the current-school color theme are verified.

## Rollback

Before each onboarding batch, create a branch from the known-good commit:

```bash
git branch checkpoint/before-SCHOOL-YYYY-MM-DD
```

Add one school per candidate branch. If certification fails, repair the candidate branch or return to the checkpoint; do not patch failures directly into the protected baseline.
