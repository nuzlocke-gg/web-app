# Old tabs reload after a deploy

Next.js can give Server Actions new ids in a new build, and headcanon saves every change through a Server Action. After a deploy, a tab that was already open may thus fail to save (an unchanged action can keep its id; see below). We first decided (2026-10-06, Linear "Headcanon integration") to turn on Vercel Skew Protection with a 1-day maximum age, so an old tab kept saving to the deployment that served it. We reversed that on 2026-10-07 (the simplification pass of the version 1 spec): **there is no Skew Protection.**

- An old tab's next router refresh sees a build-id mismatch, and Next loads the new build in a full-page load.
- A save from an old tab to an action the new build does not know fails with `UnrecognizedActionError`, and that attempt writes nothing. headcanon settles it as `stale-client`: the change gets a toast saying it could not be confirmed (an earlier attempt may have committed before its response was lost) and the page shows "Your app is out of date. Refresh?". An action id can survive a deploy (Next derives it from a cached key and the action's code), so a save to an unchanged action may still commit; the next refresh then loads the new build. Protocol compatibility does not depend on ids rotating.
- **Database**: migrations run before the new deployment is promoted, so the schema stays usable by the previous release for the minutes of a deploy. An additive change ships in one step; a destructive change ships in two releases, with no waiting period between them.
- **Protocol**: `run.v1` arguments only gain optional fields; a breaking change gets a new protocol id.
- **Values**: Refusal kinds and enum values are only added, so stored headcanon receipts stay readable. Readers are lenient from launch (an unknown Refusal kind renders a generic toast; an unknown enum value renders as unknown and is never written back), so no value needs a two-step release.

## Why

Changes save at once, so a tab rarely holds an unsent change at the moment of a deploy, and deploys are ours to schedule. The window bought a day of saving for that rare tab at the cost of a version endpoint, a "new version" notice, a one-day wait on every destructive migration, and a two-release rule for every new value. The toast already tells the player when a change may be lost.

## Considered options

- **Skew Protection with a 1-day window** (the first decision). Rejected on review: the cost above for a rare case.
- **A longer window (7 days).** Rejected: it delays every destructive migration for little gain.

Before launch, none of these rules apply.
