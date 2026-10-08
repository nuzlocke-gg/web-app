# A linked death is recorded by each player, prompted by the Shared Fate Rule

In a Soul Link, the Pokémon of one Link share their fate: when one dies, the others should die too. We decided (2026-10-07, Linear "Storage design") that the app does not kill them. A player records the death of their own Pokémon only, with its level and cause. This replaces the automatic death of the whole Link decided in "Soul Link pairs and shared fate" (2026-10-05).

The partners were first told by a stored **Notice** ("Riley's Treecko died. Mark Torchic as dead?") that stayed until they acted or dismissed it, with a matching Notice for an undo. The simplification pass of 2026-10-07 replaced Notices with a **Shared Fate Rule** (Soul Link, on by default): a Warning on each living Pokémon, in the Party or the Box, whose Link has a dead Pokémon from another Journey. The Warning carries "Record death" with the cause prefilled ("Linked to Riley's Mudkip").

## Why

- The product's rule everywhere else is that the player is the authority and the app only suggests. The automatic kill was the one place where the app changed data on its own, and the one place where a player's entry wrote into a partner's Journey. With Notices gone, no command writes into a partner's rows at all.
- A Warning already is the app's way to say "your Run breaks a Rule"; shared fate is a Rule like the others, and a group that plays without it turns it off.
- A death is three columns on the Pokémon (`died_at`, `death_level`, `death_cause`). Notices needed a client `death_id` to name the deaths they were about; without them, deaths need no identity. Record, Edit, and Undo a death test the life state under the Run lock.

## Considered options

- **Automatic death of the full Link in one change.** Rejected: see above. The death group needed a pointer to the Pokémon that fainted, which had to survive the removal of that Pokémon's Encounter; the group was a fact of the wrong lifetime.
- **A stored Notice to each partner** (the first decision). Rejected on review: a kind list, payload schemas, mootness, superseding dismissals, Dismiss by ids, writes into partners' rows, and Finished-Run variants, to deliver a prompt that the record already implies. Its two objections to a Warning are answered: a Warning cannot be dismissed, but turning the Rule off is the dismissal; "a partner undid a linked death" cannot be derived, and the app no longer mirrors an undo (the players settle a mistaken mirror between them).
- **Extending Complete Links.** Rejected: Complete Links asks "can I use this Pokémon?" (any partner gap, Party only); Shared Fate asks "should it be dead?" (a dead partner only, Party or Box). When both mark a Pokémon, only the Shared Fate Warning shows.

## Consequences

- A partner's Journey shows the Pokémon alive, to the partner and to a Reader, until the partner records its death.
- The death Drawer in a Soul Link names the linked Pokémon whose players will see the Warning. Undo restores one Pokémon and sends no undo prompt; in a Link of three it can leave or create an ordinary Shared Fate Warning while another linked Pokémon is still dead.
- A stale Undo from the same player's second device can undo a newer death; it is visible and one tap to fix.
- The Whiteout Rule's "Your party wiped." is derived: a Journey with no living Party Pokémon and at least one Pokémon that died in the Party. The games do not let the player deposit their last Pokémon, so no stored flag is needed.
