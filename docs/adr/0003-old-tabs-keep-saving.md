# Old tabs keep saving for one day after a deploy

Next.js gives Server Actions new ids in each build, and headcanon saves every change through a Server Action. After a deploy, a tab that was already open could thus not save. We decided (2026-10-06, Linear "Headcanon integration") to turn on Vercel Skew Protection with its default 1-day maximum age. An old tab then keeps saving to the deployment that served it. From launch, every release must keep working with data written by any deployment from the last day:

- **Database**: expand/contract. An additive change (new table, nullable column, index) ships in one step. A destructive change (drop, rename, type change, new NOT NULL) ships in two releases: first add the new form, then remove the old form at least 1 day after the last deployment that reads it.
- **Protocol**: `run.v1` arguments only gain optional fields. A breaking change gets a new protocol id, and the old one stays for the window.
- **Refusals**: kinds are only added, so the stored headcanon receipts stay readable.

The maximum age counts from the creation of the deployment, not from when the tab opened. For a tab past the window, the page shows a "New version available" notice with Reload. Changes that are not yet saved can then be lost; we accept this as rare.

## Considered options

- **No Skew Protection; reload on a new version.** Rejected: unsent changes are lost at each deploy, which breaks "an old tab keeps working".
- **A longer window (7 days).** Rejected: it delays every destructive migration for little gain.

Before launch, none of these rules apply.
