// PROTOTYPE (NUZ-44). `node packages/game-data/prototype/cli.ts`
// Compiles the fixture Maps, writes them to fixture-out/, and prints a reader tour.

import { mkdirSync, writeFileSync } from "node:fs";
import { compile, createReader, lockFor, placesOf, suggestions, searchSpecies, nextInLine, evolutionLineOf, primaryType, progressTotal, placeName } from "./model.ts";
import { fixtureSources, laterSources } from "./fixture.ts";

const out = new URL("./fixture-out/", import.meta.url);
mkdirSync(out, { recursive: true });
const compiled = [];
for (const src of [fixtureSources, laterSources]) {
  const r = compile(src);
  if (!r.ok) { console.error(`${src.map.id}: compile stopped\n  ${r.problems.join("\n  ")}`); process.exit(1); }
  writeFileSync(new URL(`${r.map.id}.json`, out), JSON.stringify(r.map, null, 2) + "\n");
  writeFileSync(new URL(`${r.map.id}.lock.json`, out), JSON.stringify(lockFor(r.map), null, 2) + "\n");
  compiled.push(r.map);
}

const reader = createReader(compiled);
const m = (await reader.loadMap("fixture"))!;
console.log("placesOf blue:", placesOf(m, "fixture-blue").map((p) => p.name).join(" | "));
console.log("suggestions route-2 red:", JSON.stringify(suggestions(m, "route-2", "fixture-red")));
console.log("search 'far':", searchSpecies(m, "far").map((s) => s.name));
console.log("nextInLine burmy/sandy:", nextInLine(m, "burmy", "sandy"));
console.log("lines:", ["raichu-alola", "pichu", "raticate-alola", "raticate", "shedinja", "ninjask"].map((s) => `${s}=${evolutionLineOf(m, s)}`).join(" "));
console.log("primaryType wormadam/trash:", primaryType(m, "wormadam", "trash"), "clefairy:", primaryType(m, "clefairy", "base"),
  "later clefairy:", primaryType((await reader.loadMap("fixture-later"))!, "clefairy", "base"));
console.log("progressTotal:", progressTotal(m));
console.log("placeName magma-hideout:", placeName(m, "magma-hideout", "fixture-red"), "/", placeName(m, "magma-hideout", "fixture-blue"), "| unknown:", placeName(m, "nowhere", "fixture-red"));
