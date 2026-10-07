# The kind of a Run is fixed at creation

A Run is solo or a Soul Link from its creation, and it never changes kind. In a Soul Link, Links are keyed on the Slots that the players fill from the start, so a partner who joined a Run that already had Encounters would find every Link incomplete and the First Encounter Rule already spent. We decided (2026-10-06, Linear "Soul Link collaboration") that a Soul Link Run gathers its two or three players in a "Waiting for players" state, through one invite link, and that no entry is possible before any player taps "Start the Run". After the start, nobody joins and nobody leaves.

## Considered options

- **A solo Run that becomes a Soul Link when a partner joins.** Rejected: see above. It also needs the live root to switch mode under a queue of pending changes.
- **A player count set at creation, with an automatic start.** Rejected: a Run waits forever when the third friend never comes.
- **Four players.** Rejected for version 1: with four Parties, Type Restriction makes the starters unusable. The cap can rise if there is demand.

## Consequences

- The mode of the headcanon root (`useRun` or `useLinkedRun`) is a property of the Run and never switches at run time.
- The Soul Link Rules show when the Run is a Soul Link, not when it has two Journeys. A Run stores all seven Rule values from creation.
- A partner who stops playing after the start is a matter of the Run's lifecycle (a failed or abandoned Run), not of membership.
