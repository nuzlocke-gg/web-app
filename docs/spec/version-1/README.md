# nuzlocke.gg version 1

nuzlocke.gg is a public, phone-first web app where a player with a Google account tracks a Nuzlocke Run by manual entry, alone or as a live Soul Link of two or three players. This folder is the version 1 spec, the index that the build tickets split from.

## The documents

| Document | Read it for |
| --- | --- |
| [product.md](product.md) | The problem, the user stories, the domain model, the product rules (Rules and Warnings, Soul Link, shared fate, Run lifecycle, Player identity, visibility and the Reader), and what is out of scope. |
| [screens.md](screens.md) | Each screen, its decided UI copy, the design system, and accessibility. |
| [technical-design.md](technical-design.md) | The platform, the game data, the 15 named changes (`run.v1`), access and Slots, storage, and the headcanon integration. |
| [testing.md](testing.md) | The test seams, what makes a good test, and what is tested. |

The glossary ([`apps/web/CONTEXT.md`](../../../apps/web/CONTEXT.md)) is the authority for every term. Glossary terms are capitalized (Run, Journey, Place, Slot, Link, Warning). UI copy uses the words the tickets decided ("location", "Encounters", never "Place").

## Sources and precedence

This spec was synthesized from the [wayfinder map](https://linear.app/unnamed-system/issue/NUZ-1/wayfinder-map-nuzlockegg-version-1) and its tickets, the five Claude Design prototypes, the glossary, and the ADRs. This spec wins over tickets, prototypes, and ADR text written before it.

## Documents and prototypes

Read these with the spec: the technical design document [Headcanon integration — technical design](https://linear.app/unnamed-system/document/headcanon-integration-technical-design-b19300c09383); the schema and command rules on "Storage design"; the prototypes [Run Tracking Screen](https://claude.ai/artifact/8tPzcegdygrUNyWXUg2mvW), [Pokémon Screen on a Phone](https://claude.ai/artifact/69wSXEs2NpjjatiucVMgnP), [Party Editor on a Phone](https://claude.ai/artifact/UTFwqrc2uYQhKzKKheWnaR), [Navigation and other screens](https://claude.ai/artifact/X6JCv1nXRCRFnDosTnWzN3), and [Notices on the screens](https://claude.ai/artifact/WgYQZS8YiRG48xsstYQ7Qb) (superseded by the Shared Fate Rule; its death Drawer with the prefilled cause still applies) (each canvas has a "Proposals" note that records what was agreed, and board titles that mark rejected alternatives); the design system [nuzlocke.gg](https://claude.ai/artifact/9CktMtc38XzkxhY9hFMJrv) and its local copy in `packages/claude-design`.

## Open details for the build tickets

Small decisions the map left to the build, listed so no ticket invents them silently: whether to turn on Next's `experimental.useOffline` ([NUZ-24](https://linear.app/unnamed-system/issue/NUZ-24/verify-nexts-experimentaluseoffline-with-headcanon); see [Headcanon integration](technical-design.md#headcanon-integration)); whether the lifecycle and metadata actions join `run.v1` or stay separate server actions; the Refusal kind for "wrong state" (reuse `gone` or add one); the denominator Game for Progress on a paired Map in a Soul Link and on the preview card (the resolutions say "the Places of the Game"; the viewer's own Journey's Game is the natural reading, and the first Journey's for a Reader and the card); the Delete account confirm, Rename, and Visibility controls use the existing Drawer and AlertDialog patterns and are not drawn; capital letters in UI copy follow the design system's sentence case and were to be confirmed in the build; sprite rendering details.

## Build order

The order the map implies: the prerequisites (TypeScript 6, Node 22, Vercel Pro, a published headcanon version with the fixes of NUZ-25 to NUZ-31 and of the [headcanon gap](technical-design.md#headcanon-gaps)); the game data package with Emerald, then the schema and migrations with Auth.js and the Player; then the Run command boundary with `run.v1` and the loader; then the tracking, record, and Pokémon screens for a solo Run; then lifecycle, Chain, and the Run list; then Soul Link (waiting, join, Ably, Shared Fate); then the Party editor and the Box tools; then the Reader view and previews; then FireRed and LeafGreen, then Platinum; then sprites and the rights line can land at any point after the data package.

## Risks the map accepted

Sprite rights (a takedown notice is the exposure; the app stays non-commercial and carries the rights line); hand-written curation is the real cost of each Map and one developer carries it; corrected game data changes the suggestions of existing Runs; a change not yet accepted is lost when the tab closes before it is delivered, and a change that a deploy makes `stale-client` may stay unconfirmed (its toast says so); a reload after a failed refresh drops open drafts.
