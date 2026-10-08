# Every write to a Run takes one lock on the Run row

A Run is small, and its parts are joined: a death in one Journey changes the Shared Fate Warnings of every Journey of its Link (it no longer writes them: since 2026-10-07 each player records their own death, ADR 0009), a new Slot or Custom Place shows for all Journeys, and four Rules read more than one Journey. We decided (2026-10-06, Linear "Headcanon integration") that a Run is one unit of consistency. headcanon tracks it as one axis, `run/<runId>`, whose revision is on the Run row. Every writer to an existing Run takes `SELECT … FOR UPDATE` on that row before it reads or changes anything in the Run. This includes headcanon commands, joining, adding a Journey, leaving, and admin tools. The writer then increments the revision and announces the stamp after the commit.

## Considered options

- **One axis and one lock for each Journey.** Rejected: the Run screen loads every Journey anyway, and most Run-level changes would touch all axes.
- **Optimistic revision guards with contention retries, as in the headcanon examples.** Rejected: the row lock serializes the few writers of one Run without retries. `throwMutationContention()` stays only as a guard.

## Consequences

- Writes to one Run run one at a time. This is negligible with two or three players who enter data by hand.
- A writer that skips the lock, or that does not increment the revision, breaks the confirmation of predictions and live updates for every viewer of that Run.
