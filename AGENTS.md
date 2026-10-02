# SAS Sports session startup

The user wants one school-module project per conversation.

1. Before beginning SAS Sports work, read the **current repository version** of `docs/SAS_SPORTS_CURRENT_SESSION.md` in full. Fetch the current default branch first when possible; do not rely on an old local copy or conversation memory.
2. Use its latest handoff to identify the verified baseline, completed work, next school, and outstanding issues. Inspect current code and Git status before editing. If the repository has advanced, reconcile that change with the handoff.
3. Work on one school module per session, and within that school on **one sport at a time**, unless the user changes the scope. Finish, verify and publish one sport before starting the next. Preserve the shared results contract and existing verified schools. K-State is the reference for how a sport's results section must look.
4. At the end of each school session, update the current-state and next-session sections of that same Markdown file and append the session's conversation/decision record. Preserve earlier records through append-only session history and Git version history.
5. Record tests actually run, publication status, commit/PR identifiers, live verification, limitations, and remaining tasks accurately. A local fix is not a deployed fix.

5a. **Finish the whole school before stopping (user, October 2, 2026: "do not finish a school until everything is complete within the school").** Do not report a school as complete, end the session, or move to the next school while any item for that school is still open. A school is complete only when every item below is done, verified on the preview and in production, and merged:
   - every sponsored sport reads in K-State's results format: schedule, results, recaps, expanded views, and live scores where K-State has them;
   - athlete certification for every sport is reviewed and passing (featured athletes, verified Instagram or official-profile fallback);
   - every limitation in that school's module doc is fixed, or shown to be impossible to fix from the official sources, with the evidence written down (for example, the site has not published the season yet, or the source returns 403 after spaced retries);
   - the module doc and this handoff are updated.

   Keep working through the open items one sport at a time without stopping to ask. Stop early only for something only the user can decide or unblock, and then say exactly which items are still open and why. Never describe a school with open items as "complete".

6. **Standing merge permission (user, September 29, 2026).** The agent may merge its own SAS Sports pull requests into `main` (which deploys production), for both code and docs PRs, without asking first, when every condition below holds:
   - **Code PRs:**
     - `npm run test:release` and `npm test` pass locally on the final commit.
     - CI on the PR head is green, and the PR has no merge conflict.
     - The branch preview (`https://<branch>-sas-sports.lovetogivepain.workers.dev`) shows the changed sport in K-State's results format.
     - On that preview, K-State XC keeps 18/20 rows and KU XC keeps 26/21.
     - The change stays within the one school and sport in scope.
     - On that preview, 36 forced refreshes (`refresh=1`) of the changed school and sport all return HTTP 200, with no Cloudflare 1102 or 503 errors.
   - **Docs-only PRs:** CI is green and the PR has no merge conflict.

   If any condition fails or is uncertain, stop and ask the user instead of merging.

   After merging a code PR:
   - Verify production `/api/status` and the changed sport's feed and expanded view, plus K-State and KU XC.
   - Record the result in the handoff.
   - If production is wrong, tell the user immediately and open a revert PR for them to approve.

   Never force-push `main`, bypass branch protection, or merge PRs the agent did not open.

This file records the user's continuity preference and the standing merge permission above. It grants no other publication or deployment permission. Follow current user instructions and applicable authorization requirements.
