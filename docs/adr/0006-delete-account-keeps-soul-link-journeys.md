# Delete account keeps the Journeys of a Soul Link

A Player can delete their account, and a deleted Player can hold a Journey in a partner's Soul Link. The Encounters of that Journey hold up the partners' Links, so removing it would break the partners' Run. We decided (2026-10-07, Linear "Player identity") that Delete account removes the Player's solo Runs and the account's Google id, email, and Display Name, but keeps a tombstone with the player id and keeps every Journey in a Soul Link that still has a living Player. Chips and history lines render the tombstone as "Deleted player".

## Considered options

- **Delete every Run the Player is in, Soul Links included.** Rejected: partners lose a Run they played, and the deleting Player has no right to it alone.
- **Delete nothing, only the sign-in.** Rejected: solo Runs readable by link would stay public with no one able to archive them.
- **A tombstone Journey in a Run that is still Waiting for players.** Rejected: the Journey is empty and would block the start. Delete account leaves a waiting Run the same way Leave does.

## Consequences

- When the last living Player of a Soul Link deletes their account, the Run goes with the account, the same as a solo Run.
- A Failed Soul Link with a deleted Player has no Try again, because ADR 0005 keeps the players. The remaining Players make a new Run, which begins a chain of its own.
- History lines store the player id, never the name text, so a rename and a deletion both render from the account row.
