# Research: Places and wild Encounters from Gen 3 ROM hacks

2026-10-09. A spike, not a decision. It asks whether we can read Places and their wild encounter tables out of a ROM hack's ROM. If we can, we can curate popular hacks cheaply, or let a player bring their own ROM.

## Answer

**Yes, for the wild tables and Place names, from the ROM's bytes alone.** An extractor of about 500 lines ([`gen3-extract.mts`](gen3-extract.mts)) finds every table by its structure: no symbols, no fixed offsets, and no reliance on the hack's source or its author's published data. Run on five ROMs built from public sources, it reproduced every wild table and every Place name exactly:

| ROM (built from source) | Engine layout found | Wild tables vs. source | Place names vs. source | Extra tables found |
| --- | --- | --- | --- | --- |
| Emerald (pret/pokeemerald, SHA-1 matches retail) | vanilla, 20-byte header | 116 / 116 identical | 124 / 124 | Battle Pyramid, Battle Pike |
| Emerald on pokeemerald-expansion (Oct 2026) | expansion, 84-byte time-of-day header | 116 / 116 | 124 / 124 | Battle Pyramid, Battle Pike |
| FireRed (pret/pokefirered, SHA-1 matches retail 1.0) | vanilla | 124 / 124 | 132 / 132 | none |
| FireRed + CFRU | vanilla | 124 / 124 | 132 / 132 | none (CFRU's time tables are empty by default) |
| FireRed + DPE + CFRU, with a Night and a Morning table | vanilla | 124 / 124 | 132 / 132 | the Night and the Morning table, exactly |

"Identical" means the same maps, encounter rates, and every slot's species, minimum level, and maximum level. Each run takes about one second. Every table was found at the address the build's own symbol map gives it.

Against the Emerald Map we ship today (from PokeAPI), the ROM gives the same 63 Places, and 62 of them have identical species for each method. The one difference is Feebas on Route 119: it lives in code (`sWildFeebas` in `wild_encounter.c`), not in a table, so it would be a hand-written row, like the one-time encounters.

**What the ROM does not give us** is the play order of Places, roaming encounters, and code-defined encounters such as Feebas. The ROM also does not say which extra table is Morning and which is Night; a curator writes one line per table. One-time encounters (gifts, trades, statics) turned out to be mostly extractable after all; see [the Seaglass test](#second-test-emerald-seaglass-what-a-new-hack-costs).

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

## Second test: Emerald Seaglass, what a new hack costs

Seaglass v3.0 (Nemo622, September 2024) is an IPS patch onto Emerald, built on a 2024 pokeemerald-expansion. Its source is not public. We applied the official patch to our retail-identical Emerald build ([`apply-ips.mts`](apply-ips.mts)) and asked how much of a full Map comes out of the ROM, using only what the Emerald and expansion builds taught us.

The first run failed: the extractor found no wild table. Every fix was engine knowledge or a bug, not Seaglass-specific code, and every fix kept the five graded ROMs at 100%.

| Fix | Kind |
| --- | --- |
| Seaglass's 24-byte header stores hidden (DexNav) mons before fishing; stock expansion 1.8 and 1.9 had the 20-byte vanilla header | header layout of a DexNav branch |
| Hidden tables have encounter rate 0 | engine knowledge |
| One header has every pointer null (a map with no encounter types) | engine knowledge |
| The scanner skipped past a false start that sat 20 bytes before the real table | bug |
| Today's expansion moved `MapHeader` fields after byte 0x14, so header checks may only use the layout id | engine version |
| Today's `callnative` adds `ROM_SIZE` to the pointer to flag effects; `givemon` became `callnative ScrCmd_createmon` in 1.9 | engine version |

What then came out, component by component:

| Map component | From the ROM? | Checked against | Seaglass result |
| --- | --- | --- | --- |
| Places (every map section any map uses) | yes | Emerald's curated Map: 99 sections = 89 Places + 3 rules we already apply (Ferry is the dynamic section, Inside of Truck is out, Starter is synthetic) | the same 99 sections as Emerald: no new Places |
| Place names | yes | decomp section names | unchanged |
| Play order | no | — | Emerald's order applies as is |
| Wild tables | yes | the hack's documentation (below) | 137 headers, 67 Places; new wild tables in Littleroot, Rustboro, Fortree, and Scorched Slab; 23 hidden (DexNav) tables; the Scuba Safari minigame's 8 dive maps, which the game records as Pacifidlog Town |
| Species roster | yes: the species that have names | — | 502 species ids: Gen 1–3 complete plus selected later species |
| Species and Form identity | yes, with expansion's public `species.h` | 502 / 502 ids agree with today's `species.h` by name | Unown O, two-segment Dudunsparce, Spiky-eared Pichu, Bloodmoon Ursaluna, … |
| Types | yes ([`facts.mts`](facts.mts)) | PokeAPI | 46 species differ from PokeAPI: deliberate retypes (Blastoise water/steel, Sceptile grass/dragon, Milotic water/fairy, …) |
| Evolution Lines | yes | PokeAPI | 226 / 226 links identical |
| Starter | yes, by a rule ([`starter.mts`](starter.mts)): a table, pointed to exactly, of three three-stage first species, one grass, one fire, one water | Emerald: the one candidate. Today's expansion build: none (the compiler reaches the table from a nearby base), so a curator writes the rows | Treecko, Torchic, Mudkip (the one table) |
| Gifts, statics, trades | yes, by script patterns | Emerald's `one-time.yaml`: 28 / 28 of its script rows on both the vanilla and today's expansion build, no extras | 21 gifts, 29 statics, 4 trades; new legendaries (Jirachi, Celebi, Mewtwo, the birds, the beasts), Spiky-eared Pichu at Fallarbor |
| Roaming, Feebas | no: code | — | hand-written, as for Emerald |

Identity and facts are what PokeAPI cannot give a hack: a Seaglass Map built from PokeAPI types would be wrong for 46 species.

**Checked against the hack's own documentation.** The Seaglass documentation (v3.0 PDF) lists each species' locations. [`doc_vs_rom.py`](doc_vs_rom.py) turns its explicit claims ("Wild: 110", "Fish: 115 (GR)") into 542 (species, Place, method) triples:

- **541 of 542 are in the ROM.** The one miss is "Fish: 109" for Slowpoke: the ROM's Route 109 fishing table has no Slowpoke, so the line looks stale.
- The ROM has **59 more pairs** for species the documentation describes precisely. 49 are DexNav hidden slots, which it does not list. The other 10 are mostly vanilla encounters it leaves out (Wynaut on Route 130, Zubat in Altering Cave).
- **Scuba Safari:** the 36 species of the 8 dive maps are exactly the ones it lists for the minigame.
- **Statics:** all match in Place and level (Celebi Lv 40, Mewtwo Lv 80, the birds and beasts Lv 50, Ho-Oh and Lugia Lv 50, Deoxys Lv 70), as does the Spiky-eared Pichu gift.

**The custom work Seaglass needs is review, not data entry,** about an hour. Every item below is a fact the ROM cannot tell us:

- **Drop the cheat-code gifts.** The 13 Littleroot "gifts" are cheat codes typed at the GameCube in the player's room (`ILOVSPHEAL`, `ILOVEKANTO`, …). They are real gifts at the right Place, but no Nuzlocke counts them.
- **Event Places become ordinary Places.** A sailor in Mossdeep hands out the Eon, Mystic, and Aurora Tickets and the Old Sea Map in the story. So Southern Island, Navel Rock, Birth Island, and Faraway Island count toward Progress in Seaglass.
- **Hand-write what is in code:** the roamer (Latias or Latios after the Elite Four), Feebas, and random gifts (the Rustboro Wishing Well, Alolan eggs from pinball prizes). The Tinkatink egg from a grunt on Route 115 needs no row: an egg's Place is where it hatches.
- **Product decisions** shared with other hacks: hidden (DexNav) mons, and whether minigame catches (the Scuba Safari) count at their recorded Place.

**How the one-time scan works.** It matches command byte patterns, with no script interpreter:

- **Statics:** `setwildbattle`, 6 bytes in vanilla and 11 in expansion, followed by one of the five commands that follow it in both decomps.
- **Event mons:** `seteventmon`, the special whose hits name different species at levels of 5 or more.
- **Gifts:** vanilla `givemon`, or expansion's `callnative`. Its target is whichever native function is most often followed by a species and a level.
- **Trades:** `setvar 0x8008, i` then `copyvar` (vanilla), or `setvar 0x8005, i` then `specialvar` (today), pointing into a trade table. The table is found structurally and sized by the indexes the scripts use.

Each hit gets the Place of the nearest script entry point before it that a map's events reference, within 2 KB. Real encounters sat at most 1 KB past one. Expansion's debug menu, which no map reaches, sat 3 KB past one; that threshold is a heuristic.

## What it would take: the gaps

1. **Species and Form identity.** Solved for expansion hacks, by matching ids to expansion's public `species.h`; a constant names its Form (`SPECIES_PICHU_SPIKY_EARED`). Ids have been stable across expansion versions from 2024 to now. CFRU hacks need DPE's `species.h` of the version the hack uses. A Form's position in the ROM's form table does not work: a hack compiles only the Forms it enables. A species that the hack invents gets a `<hack>:` id, as the spec already allows.
2. **Species facts.** Solved for expansion: types and evolutions are fields of the species struct, found by matching known species. Vanilla and CFRU keep them in separate tables (`gBaseStats`, `gEvolutionTable`) that the same kind of scan can find; not done.
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
3. `node gen3-extract.mts <rom.gba> > out.json` (Node 22.18 or later). It writes the wild tables, every Place, and the one-time encounters.
4. `python3 grade.py out.json <decomp dir> [emerald|firered]` compares every table and Place name with the decomp's own `wild_encounters.json`, `map.json` files, and section names. `python3 vs_ours.py out.json <this repo>` compares the Emerald wild tables with the shipped Map, `places_vs_ours.py` the Places, and `onetime_vs_ours.py` the one-time rows (all need PyYAML).
5. Seaglass: `python3 doc_vs_rom.py <doc-table.txt> <seaglass out.json> <emerald out.json>` compares the ROM with the location table of the hack's documentation, saved as text (not committed). `node apply-ips.mts pokeemerald.gba EmeraldSeaglass_v3.0.ips seaglass.gba` with the official v3.0 patch (SHA-1 `4195fcc6169dba9472076b8b3846776a5d23b857`; the patched ROM's SHA-1 is `b9f4d332d30fc88c379f9e037f9eae3b2755ead4`). For an expansion ROM, `node facts.mts <rom> <species names address> <stride> <PokeAPI csv dir>` writes types and evolutions, and `python3 species_check.py out.json <PokeAPI csv dir>` checks species identity. `node starter.mts <rom> <names address> <stride> <PokeAPI csv dir>` lists Starter candidates. The PokeAPI CSVs come from the commit `importers/pokeapi.ts` pins.
