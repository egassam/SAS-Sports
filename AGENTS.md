# SAS Sports session startup

The user wants one school-module project per conversation.

1. Before beginning SAS Sports work, read the **current repository version** of `docs/SAS_SPORTS_CURRENT_SESSION.md` in full. Fetch the current default branch first when possible; do not rely on an old local copy or conversation memory. That file is kept short. Earlier records and evidence are in `docs/SAS_SPORTS_HISTORY.md` (append-only); search it when needed, but do not read it in full at startup (user, October 4, 2026).
2. Use its latest handoff to identify the verified baseline, completed work, next school, and outstanding issues. Inspect current code and Git status before editing. If the repository has advanced, reconcile that change with the handoff.
3. Work on one school module per session, and within that school build and test **one sport at a time**, unless the user changes the scope. **Batched publishing (user, October 4, 2026):** a pull request may carry several finished sports of the same school, each built, tested and verified on its own. Every sport in the PR gets the full gate in item 6. Preserve the shared results contract and existing verified schools. K-State is the reference for how a sport's results section must look.
4. At the end of each school session, update `docs/SAS_SPORTS_CURRENT_SESSION.md` (current state, open items, next session, a one-line session-log entry) and append the session's full conversation/decision record to the end of `docs/SAS_SPORTS_HISTORY.md`. Keep the current file short; move superseded detail to the history file. Preserve earlier records through the append-only history and Git version history.
5. Record tests actually run, publication status, commit/PR identifiers, live verification, limitations, and remaining tasks accurately. A local fix is not a deployed fix.

5a. **Finish the whole school before stopping (user, October 2, 2026: "do not finish a school until everything is complete within the school").** Do not report a school as complete, end the session, or move to the next school while any item for that school is still open. A school is complete only when every item below is done, verified on the preview and in production, and merged:
   - every sponsored sport reads in K-State's results format: schedule, results, recaps, expanded views, and live scores where K-State has them;
   - athlete certification for every sport is reviewed and passing: **three featured athletes with verified Instagram in every sport** (user, October 7, 2026: "I keep seeing only two athletes with Instagram accounts in different sports. I want three!"). Search the roster cards, then the athletes' official profile pages, then athletes tagged by the official team Instagram account. When those publish no further link, official roster-profile cards fill the remaining slots and the sport passes (user, October 7, 2026: "Use official profile cards for those"); list the sport in `athlete_profile_fallback_sports` (`tests/certified-schools.json`) with the evidence in the module doc. Every sport shows three featured athletes;
   - every limitation in that school's module doc is fixed, or shown to be impossible to fix from the official sources, with the evidence written down (for example, the site has not published the season yet, or the source returns 403 after spaced retries);
   - the module doc and this handoff are updated.

   Keep working through the open items one sport at a time without stopping to ask. Stop early only for something only the user can decide or unblock, and then say exactly which items are still open and why. Never describe a school with open items as "complete".

6. **Standing merge permission (user, September 29, 2026).** The agent may merge its own SAS Sports pull requests into `main` (which deploys production), for both code and docs PRs, without asking first, when every condition below holds:
   - **Code PRs:**
     - `npm run test:release` passes locally on the final commit (it runs every test in `npm test`, plus the checks and isolation).
     - CI on the PR head is green, and the PR has no merge conflict.
     - The branch preview (`https://<branch>-sas-sports.lovetogivepain.workers.dev`) shows every changed sport in K-State's results format.
     - On that preview, K-State XC keeps 18/20 rows and KU XC keeps 26/21.
     - The change stays within the one school in scope (one or more of its sports).
     - On that preview, 36 forced refreshes (`refresh=1`) of each changed sport all return HTTP 200, with no Cloudflare 1102 or 503 errors.
     - `npm run verify:preview -- --branch=<branch> --school=<id> --sports="<changed sports>"` runs the XC, refresh, results-format and expanded-view checks above in one command; the page itself is still checked by eye.
   - **Docs-only PRs:** CI is green and the PR has no merge conflict.

   If any condition fails or is uncertain, stop and ask the user instead of merging.

   After merging a code PR:
   - Verify production `/api/status` and each changed sport's feed and expanded views, plus K-State and KU XC (`npm run verify:prod -- --school=<id> --sports="<changed sports>" --version=<version>`).
   - Record the result in the handoff.
   - If production is wrong, tell the user immediately and open a revert PR for them to approve.

   Never force-push `main`, bypass branch protection, or merge PRs the agent did not open.

This file records the user's continuity preference and the standing merge permission above. It grants no other publication or deployment permission. Follow current user instructions and applicable authorization requirements.
