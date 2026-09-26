# Kansas cross-country checkpoint — September 26, 2026

## Why K-State's original result display works

The September 4 Platte River Rumble record is keyed to the school, sport,
event date and meet name in `VERIFIED_MEET_DETAILS`. It supplies structured
`group`, `participant` and `result` rows, both team scores, all recorded runners,
and verified highlights before the feed reaches the shared results dialog.
It does not depend on extracting a handful of sentences from a recap.

KU previously fell through to generic document/prose extraction. The first
document link is often cumulative season statistics, and the recap may link
separate men's and women's race PDFs. Prose extraction also confused names,
race divisions and times.

## Completed implementation

- A KU-only adapter emits the same structured result contract used by K-State.
- Exact-event verified records cover Bob Timmons (September 5: 19 finishers,
  two team rows) and Gans Creek (September 25: 20 finishers, one DNF, three
  DNS entries, two team rows).
- Highlights come from result rows. Overall places, scoring points, finish
  times and intermediate splits stay distinct.
- Separate official men's/women's PDFs are discovered from the exact recap;
  cumulative season PDFs are excluded. Hy-Tek and Karmarush tables are supported.
- Future matching documents can be parsed without a saved event record.
  Date, meet, school and sport checks prevent cross-event contamination.
- If a document fails, valid team summaries remain and a partial-results
  message points to the official recap. Unavailable rows are not invented.
- K-State and other schools continue through their existing code paths.
- Version 4.24.0 gives the updated feed a new cache key.

## Validation

`npm run test:release`, `npm test`, and the Wrangler deployment dry run passed.
The release checks protect 18 registered schools and 71 school/sport cache
identities. Focused tests cover both PDF formats, complete KU result sets,
school/date isolation, later-meet parsing, partial failures, fast modal loads,
and the existing K-State September 4 record. Actual downloaded official PDFs
were extracted with the same `unpdf` dependency used by the Worker.

## Remaining scope

This release applies the working result contract to Kansas. It is not a claim
that every school's cross-country results have been repaired. New publisher
formats still require source-specific parsing and verification before rollout.
Verified snapshots are final-result checkpoints; official corrections to those
specific events require re-verifying and updating the stored rows.
