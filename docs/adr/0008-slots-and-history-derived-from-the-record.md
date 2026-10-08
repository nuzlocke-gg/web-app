# Slots and the history are derived from the record, not stored

There is no Slot table and no history table. An Encounter carries its Place and a `slot_ordinal`, and a unique index on (journey, place, ordinal) is the rule "one Encounter per Journey per Slot"; a Slot exists when an Encounter has it, which is what "the app stores no empty Slots" means. The history for display (Encounter, evolution, and death lines, each with its time of entry) is read from the Encounter rows, the `evolutions` rows, and the death columns on the Pokémon rows; the player of each line is the Journey's player, so no line stores an actor. We decided this (2026-10-07, Linear "Storage design") because the current state is the truth and the history is a view of it: a correction then changes the old line for free, and nothing can disagree with the record.

## Consequences

- A Link is computed from the Encounters in one Slot, never stored, as "Soul Link pairs and shared fate" decided.
- A new Slot is the plain ordinal the client predicted (max + 1). Two partners who make one at the same time share it, because the unique index is per Journey; the `slot-taken` Refusal is one unique violation. (The join-or-fork rule of "Soul Link collaboration" was cut in the simplification pass of 2026-10-07.)
- A change with no line (rename, move, Form change, Set the Rules) leaves no trace. Showing one later means adding a row for it, not a history table.
- Removing a Pokémon sets `removed_at` and keeps the row, so its evolution lines and its Encounter stay. Removing an Encounter deletes it and its Pokémon.
