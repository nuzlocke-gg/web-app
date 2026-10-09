# Research: Places and wild Encounters from Gen 3 ROM hacks

2026-10-09. A spike, not a decision. It asks whether we can read Places and their wild encounter tables out of a ROM hack's ROM. If we can, we can curate popular hacks cheaply, or let a player bring their own ROM.

## Answer

**Yes, for the wild tables and Place names, from the ROM's bytes alone.** A 300-line extractor ([`gen3-extract.mts`](gen3-extract.mts)) finds every table by its structure: no symbols, no fixed offsets, and no reliance on the hack's source or its author's published data. Run on five ROMs built from public sources, it reproduced every wild table and every Place name exactly:

| ROM (built from source) | Engine layout found | Wild tables vs. source | Place names vs. source | Extra tables found |
| --- | --- | --- | --- | --- |
| Emerald (pret/pokeemerald, SHA-1 matches retail) | vanilla, 20-byte header | 116 / 116 identical | 124 / 124 | Battle Pyramid, Battle Pike |
| Emerald on pokeemerald-expansion (Oct 2026) | expansion, 84-byte time-of-day header | 116 / 116 | 124 / 124 | Battle Pyramid, Battle Pike |
| FireRed (pret/pokefirered, SHA-1 matches retail 1.0) | vanilla | 124 / 124 | 132 / 132 | none |
| FireRed + CFRU | vanilla | 124 / 124 | 132 / 132 | none (CFRU's time tables are empty by default) |
| FireRed + DPE + CFRU, with a Night and a Morning table | vanilla | 124 / 124 | 132 / 132 | the Night and the Morning table, exactly |

"Identical" means the same maps, encounter rates, and every slot's species, minimum level, and maximum level. Each run takes about one second. Every table was found at the address the build's own symbol map gives it.

Against the Emerald Map we ship today (from PokeAPI), the ROM gives the same 63 Places, and 62 of them have identical species for each method. The one difference is Feebas on Route 119: it lives in code (`sWildFeebas` in `wild_encounter.c`), not in a table, so it would be a hand-written row, like the one-time encounters.

**What the ROM does not give us** is everything ADR 0001 already says is hand-written: the play order of Places, the Starter Place, and one-time encounters (gifts, trades, statics, roaming). Those live in scripts. The ROM also does not say which extra table is Morning and which is Night; that is one line per table for a curator.

## Why this works: the game's Place is in the ROM

The glossary defines a Place as "the location that the game records on a Pokémon as the spot where the player met it". In Gen 3 that is the map section (`MAPSEC`), one byte. The ROM links a wild table to a Place in three hops:

```
gWildMonHeaders[i]  { u8 group, u8 num, → land, → water, → rock smash, → fishing }
        │ (group, num)
gMapGroups[group][num] → MapHeader   (byte 0x14: regionMapSectionId = MAPSEC)
        │ MAPSEC
Emerald, expansion:  gRegionMapEntries[MAPSEC] { x, y, w, h, → name }
FireRed, CFRU:       sMapNames[MAPSEC - 0x58] → name
```

So the extractor's Places are exactly the glossary's Places: a cave with several floors is one Place (Granite Cave's four maps share one map section), and so is Underwater. This is also why the 63 Emerald Places match the hand-curated Map one for one.

## How the extractor finds tables without symbols

It knows the engines' struct layouts, which are public and few, and nothing about any one ROM:

- **Wild headers:** the longest run of `{group, num, pointer-or-null…}` entries whose pointers lead to `{rate, → slots}` with sane levels (1–100, min ≤ max) and nonzero species, ending in group `0xFF`. It tries each engine layout and keeps what matches. Other runs of the same layout are the **extra tables**.
- **Map groups:** a pointer → pointer → `MapHeader` chain that resolves every `(group, num)` the wild headers use. A table shifted by one group also passes that test (it did on FireRed). The real one is the table under which **map connections are mutual**: if Route 1 connects to Viridian City, Viridian City connects back.
- **Place names:** runs of name pointers that decode as Gen 3 text. Other name lists pass that test too: FireRed's Fame Checker list and CFRU's Battle Frontier trainer names both did. The real table is as long as the range of map sections the maps use, and it doesn't repeat names.
- **Species names:** a fixed stride found from where BULBASAUR, IVYSAUR, VENUSAUR, and CHARMANDER sit (11 bytes in vanilla, a 264-byte struct in expansion). A species expansion copies this table and leaves the old one behind, so the right table is one that names every species id the wild tables use.

Each heuristic was added because a real ROM broke the one before it. That is the main risk of this approach: **a new hack can break a heuristic**. The mitigation is the grading harness below, plus a test ROM for each supported engine.

Tools that find tables by **code anchors** (HexManiac Advance's `tableReference.txt`, the Universal Pokémon Randomizer's byte patterns) work for CFRU hacks, because CFRU leaves vanilla FireRed code in place. They fail on decomp-built hacks such as Run & Bun, where all code is recompiled and moves. Structural scanning works for both.

## The hacks

| Hack | Base ROM | Engine | Hack source public? | Notes |
| --- | --- | --- | --- | --- |
| Radical Red 4.1 | FireRed 1.0 (BPRE) | CFRU + DPE | No | Distributed as a UPS patch. Day and Night tables. Species past Gen 8 diverge from public DPE ids (unverified). |
| Unbound 2.1 | FireRed 1.0 | CFRU + DPE | Partly | Skeli publishes the Morning, Evening, Night, and swarm tables in CFRU's source and the species in DPE's `Unbound` branch. The daytime tables are only in the ROM. |
| Run & Bun 1.07 | Emerald (BPEE) | pokeemerald + RHH expansion (2023) | No | The author publishes `wild_encounters.json` in decomp format (dekzeh/runandbundex). Probably predates time-of-day headers and `gSpeciesInfo` (unverified). |

So "all of these are open source" holds for the **engines**, not the hacks. The engines are what the extractor needs, and the hacks' own data is what it extracts. Most existing trackers (nuzlocke.app, RunLocke, Nuzlocke Redux) hand-enter or scrape each hack's documentation spreadsheet. None of the ones we found extracts from the ROM.

## What it would take: the gaps

1. **Species and Form identity.** Names map vanilla species to our ids, and they did for all of Emerald. They cannot identify a Form: Alolan Rattata's in-game name is "Rattata". Each engine needs its species numbering (expansion: `natDexNum` plus form tables in `gSpeciesInfo`; DPE: the published `species.h` of the version the hack uses). A species that the hack invents gets a `<hack>:` id, as the spec already allows.
2. **Species facts.** The compile needs types and Evolution Lines, and hacks change them. Both are tables (`gSpeciesInfo` or `gBaseStats`, and `gEvolutionTable`) that the same kind of scan can find. The spike does not read them yet.
3. **Time of day and the hidden method.** Expansion ROMs have four tables per map (Morning, Day, Evening, Night). CFRU adds unlabelled extra tables and a swarm table. Expansion also has DexNav "hidden" slots. Our method groups have none of these. Simplest option: merge every time of day into a Place's list, as most trackers do. That is a product decision.
4. **Extras a curator decides.** Which extra table is which time of day, alternate tables (Emerald's Altering Cave has 9; only the first is reachable without an event), facility tables (Battle Pike and Pyramid have no Place), and code-defined encounters (Feebas).
5. **Version identity.** Data differs between versions of a hack. Identify a ROM by the hash of the patched ROM.

## Options

**A. A ROM importer for curated hacks (recommended first).** `npm run import:rom -- <map> <path-to-own-rom>`, run by an operator, writes `generated/rom.wild.json` and `generated/rom.species.json`. The hand-written `map.yaml`, `one-time.yaml`, and `corrections.yaml` work as they do for Emerald. The importer can also draft `map.yaml` with every Place in section order. This is exactly what ADR 0001 anticipated ("a second source costs one importer, not a redesign"); nothing in the format changes. Cost per hack: a few hours of play order and one-time rows. Expansion hacks also need their species numbering.

**B. A player brings their own ROM.** This would parse the ROM in the browser, so the ROM never leaves the device and we never host it, and produce a Map for that player's Runs. **It conflicts with ADR 0001** ("the app never calls a data source, and Neon holds no game data") and with permanence (identifiers derived from a player's ROM are not ours to keep stable). Such a Map would also have no play order (sorting Places by their lowest wild level is a reasonable fallback), no one-time encounters (players use Custom Places), and only names for invented species. It would need a new ADR. A middle path is to keep B internal: the same browser extractor as a curation tool that outputs a draft source folder for review.

## Risks

- **Permission.** We would ship data derived from each hack. Trackers do this widely, and Skeli and dekzeh publish their data themselves. We found no explicit permission statement from any of the three teams, so asking before shipping a hack's Map is cheap insurance. CFRU's terms forbid profiting from games built on it. That binds hack authors, not tools that read data, but it is worth knowing if nuzlocke.gg is ever monetised. Not legal advice.
- **Heuristics break on a new hack.** Mitigate with a fixture ROM for each engine in CI, and an importer that stops when a table is ambiguous rather than guessing.
- **Untrusted input (option B only).** A ROM is up to 32 MB of attacker-controlled bytes. The extractor's reads are bounds-checked, and every loop is bounded by the ROM size. It would still need a threat-model entry.

## Reproduce

Everything here builds from public sources on Linux with `gcc-arm-none-eabi`, `libpng-dev`, and `libfreeimage-dev`. No retail ROM is downloaded: pret's builds match retail by SHA-1, and CFRU and DPE insert into the FireRed build.

| Repository | Commit |
| --- | --- |
| pret/pokeemerald | `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881` (the commit `one-time.yaml` cites) |
| rh-hideout/pokeemerald-expansion | `7b95be15d84a053948791ce91e5dec0b168947a5` |
| pret/pokefirered | `037335f4c725d7c9aecdac87066f2002b4bd7e14` |
| pret/agbcc | `da598c1d918402c42c0c0d7128ba14567f3175e9` |
| Skeli789/Complete-Fire-Red-Upgrade | `b637a27898b14e25dd24d0f69a3e302f0069deb8` |
| Skeli789/Dynamic-Pokemon-Expansion | `cdfc053a56326a13dc5311b24488445e17536b7e` |

1. Build agbcc and install it into pokeemerald and pokefirered (`./build.sh && ./install.sh ../pokeemerald`), then run `make` in each, `make firered` for FireRed. Run `make` in pokeemerald-expansion, which uses the system `arm-none-eabi-gcc`.
2. For CFRU and DPE on Linux: build devkitPro/grit and put it on `PATH` together with `wav2agb` and `mid2agb` from pokeemerald's `tools/`. Copy `pokefirered.gba` to `BPRE0.gba`. Run `python3 scripts/make.py` in DPE, then in CFRU on DPE's `test.gba`, with CFRU's DPE settings (`NUM_MOVE_TUTORS 128`, `EVOS_PER_MON 16`, `EXPAND_MOVESETS` off). The time-of-day test replaces the empty tables in `src/Tables/wild_encounter_tables.c` with a Night table on Route 1 (group 3, map 19) and a Morning table on Route 2 (group 3, map 20).
3. `node gen3-extract.mts <rom.gba> > out.json` (Node 22.18 or later).
4. `python3 grade.py out.json <decomp dir> [emerald|firered]` compares every table and Place name with the decomp's own `wild_encounters.json`, `map.json` files, and section names. `python3 vs_ours.py out.json <this repo>` compares the Emerald Places with the shipped Map (needs PyYAML).
