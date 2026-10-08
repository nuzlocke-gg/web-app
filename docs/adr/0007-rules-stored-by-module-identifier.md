# Rules are stored by the identifiers their module owns

A Run's Rules are a map, `rules jsonb { "<rule id>": true | false }`. The rules module owns the list of Rules, their identifiers, their defaults, and the checks. The database does not know the list. We decided this (2026-10-07, Linear "Storage design") so that the list has one home: a column per Rule puts the list in the schema as well, every new Rule is then a migration and a module change, and a custom player-written rule (out of scope, kept possible) has no column at all.

This ADR first also covered Notices (stored messages of `kind text` and `payload jsonb`, owned by a notices module). The simplification pass of 2026-10-07 removed Notices; the Shared Fate Rule replaces them (ADR 0009).

## Rules the module keeps

- A Rule identifier is permanent once released, the same as a released game data identifier (ADR 0001). One that changes meaning gets a new identifier; the old one stays known.
- An absent Rule key is Off. Run creation writes every known Rule explicitly, and "Try again" copies the map. A Rule added by a later release is thus Off on every existing Run, Finished ones included: the Rules of a Finished Run are a record, and a new Rule is a choice the player makes.
- "Set the Rules" merges only the changed keys, under the Run lock, and preserves keys the writer does not know. The dependency "Shared Duplicate Clause implies Duplicate Clause" is normalized in the shared function, not by a constraint.

## Considered options

- **One boolean column per Rule.** Rejected: typed and constrained, but the Rule list then lives in two places.
- **A `run_rules` row table.** Rejected for now: the same ownership, at the cost of a join on every Run load; it can come back if a Rule ever needs columns of its own.
