# PROTOTYPE: game data format (NUZ-44)

Throwaway. It answered Linear NUZ-44 "Game data format". The decisions are in the resolution comment on that ticket and in `docs/spec/version-1/technical-design.md`. The real package is built by NUZ-45 "Game data package: compile and reader".

- `format.ts`: the format as types (identifiers, compiled Map, source files, release lock).
- `model.ts`: pure logic (compile, permanence check, reader). The part worth lifting.
- `fixture.ts`: the fixture Map as source files (TypeScript objects here; YAML in the real package).
- `fixture-out/`: the compiled fixture Maps and their locks.
- `explorer.html`: open by double-click. Built by `node build-explorer.ts` from `explorer.template.html`.
- `node cli.ts`: compiles the fixture into `fixture-out/` and prints a reader tour.
