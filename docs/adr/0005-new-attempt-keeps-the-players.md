# A new attempt keeps the players of the Failed Run

Players retry a Nuzlocke many times, and a Run list that shows "Attempt 3" needs the Runs to know each other. We decided (2026-10-07, Linear "Run lifecycle") that a Failed Run has at most one next Run, made by "Try again" with the same kind, name, Rules, Custom Places, and one Journey for each player on the same Game. The new Run records the Failed Run as its previous Run, and the attempt number is computed from that chain. A Soul Link attempt goes straight to Active, with no "Waiting for players" and no invite link: the players are already known, and a chain with a different set of players is a different chain.

## Considered options

- **A new Soul Link attempt begins in "Waiting for players" with the old players present.** Rejected: the only purpose of the wait is to let a partner leave, and a leave would change the players and break the chain. A partner who does not want the attempt archives it instead, and the others can bring it back.
- **A new Soul Link attempt begins in "Waiting for players" with a fresh invite link.** Rejected: the app cannot tell the partners, and the chain would hold whoever joined.
- **An attempt number that the player types, or no link at all.** Rejected: the number drifts, and "Try again" is the one place a player wants the link made for them.

## Consequences

- "Try again" is a writer to the Failed Run (ADR 0002): it takes the Run lock, and it refuses when the Run already has a next Run, so two players who tap at once make one Run and the second one is sent to it.
- A Complete Run has no "Try again". A new Run from a Complete one is a new chain.
- ~~Reopening a Failed Run that already has a next Run is allowed.~~ Amended 2026-10-07 (Linear "Navigation and the other screens on a phone"): **only the newest attempt of a chain can be reopened.** A Failed Run with a next Run is a closed record: it opens read-only, and its banner sends the player to the newest attempt. Two Active Runs in one chain would break the line, and the Run list could not say which one is the chain. Reopen refuses with the existing Refusal kind "a change to something in the wrong state".
- The Run list shows **one row per chain**: the newest attempt. It sorts by the state of that attempt. Earlier attempts are on an Attempts screen of the chain. Archiving the newest attempt hides the chain.
