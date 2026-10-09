# @workspace/game-data

The project's own game data format (ADR 0001): source files, the compile, and the reader. The spec is the Game data section of `docs/spec/version-1/technical-design.md`.

## Reading game data

The app imports only `@workspace/game-data`. Load a Map once per Run with `loadMap(mapId)`, then pass it to the pure functions (`placesOf`, `suggestions`, `nextInLine`, …). An unknown identifier gives `undefined` or `[]`, never another entry.

The reader reads `dist/`, which the build writes. `dist/` is not committed. A consumer must depend on this package so that `turbo build` builds it first. A plain `next build` does not.

## Sources

```
sources/methods.yaml                         the method groups, in record Drawer order
sources/maps/<map>/map.yaml                  Map facts, Games, Places in play order with their source areas
sources/maps/<map>/one-time.yaml             Static, Roaming, Gift, Trade rows (hand-written only)
sources/maps/<map>/corrections.yaml          changes to generated data, each with what it expects
sources/maps/<map>/generated/<importer>.*.json  written only by that importer
released/<map>.lock.json                     every released identifier of the Map
```

`test/fixtures/sources/` is a small Map that uses every part of the format. `sources/maps/emerald/` is the first real Map.

## Importers

An importer is a one-off generator: it writes only its own files under `generated/`, its output is committed, and a re-import is reviewed as a `git diff`. No build or test calls one.

- `npm run import:pokeapi -- <map>`: the repeatable wild tables (Walk, Surf, Fishing, Rock Smash) and the Species facts of the Map's generation, from PokeAPI's CSV at the commit pinned in `importers/pokeapi.ts`. Each Game id of `map.yaml` must be a PokeAPI version. One-time rows are left out: they are hand-written in `one-time.yaml`.

## Commands

- `npm run build`: compile every Map into `dist/`. It never writes a lock, and it fails when a released identifier no longer resolves, a Species changes its dex number, or a lock is out of date. CI runs it.
- `npm run lock`: the same compile, then it adds new identifiers to every existing lock. Commit the result.
- `npm run lock -- <map>`: create the lock for a Map at its release. From then on, its identifiers are permanent.
