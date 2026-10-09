# The app reads its own game data format, compiled before release

Mainline Games start from PokeAPI and ROM hacks from sources we supply, and no source gives the play order of Places, the Starter Place, or reliable one-time encounters. We decided (2026-10-05, Linear "Game data contract") that the project owns one game data format: importers and hand-written files produce it before a release, the compiled files ship with the app in a workspace package, and the app reads them through one reader. The app never calls a data source, and Neon holds no game data.

## Considered options

- **An adapter for each source at run time.** Rejected: the hand-written data is necessary anyway, the importer's work then runs inside the app, and the app must keep snapshots for old Runs.
- **Game data in Postgres.** Rejected for version 1: it adds a publication step and a second store that must agree with the code. It can come later with no change to the format.

## Consequences

- An importer supplies only repeatable wild tables and Species facts. One-time encounters (gift, trade, static, roaming) are always hand-written, because PokeAPI has errors there and decompiled source code keeps them in scripts.
- Corrections reach existing Runs. From the launch, a released identifier (Game, Map, Place, Species, Form) is permanent and never gets a different meaning; a change that breaks this makes a new Map. There are no edition numbers.
- A second source costs one importer, not a redesign.
- Importers are one-off generators whose output is committed apart from the hand-written files (2026-10-07). A build never calls a data source, and a re-import is reviewed as a diff; the one exception is the sprites, which the build copies from a pinned commit of the PokeAPI sprites repository because they are not committed (2026-10-08, NUZ-47); the compile merges, validates, and checks that released identifiers stay permanent.
- The permanence check compares against a committed lock per Map that lists every released identifier, created at launch and kept complete by CI (2026-10-08, Linear "Game data format"). The compiled output is built, not committed.
