// PROTOTYPE (NUZ-44 "Game data format"). Throwaway.
// The fixture Map, as source files. Each constant is one file of
// `sources/maps/fixture/` (see format.ts). Species are real; the Map is not.

import type {
  Correction, GeneratedSpecies, GeneratedWild, HandMap, MethodList, OneTimeRow,
} from "./format.ts";
import type { MapSources } from "./model.ts";

/** sources/methods.yaml */
export const methods: MethodList = [
  { id: "walk", name: "Walk", origin: "wild", oneTime: false },
  { id: "surf", name: "Surf", origin: "wild", oneTime: false },
  { id: "fishing", name: "Fishing", origin: "wild", oneTime: false },
  { id: "rock-smash", name: "Rock Smash", origin: "wild", oneTime: false },
  { id: "static", name: "Static", origin: "wild", oneTime: true },
  { id: "gift", name: "Gift", origin: "gift", oneTime: true },
  { id: "trade", name: "Trade", origin: "trade", oneTime: true },
  { id: "roaming", name: "Roaming", origin: "wild", oneTime: true },
];

/** sources/maps/fixture/map.yaml */
export const map: HandMap = {
  id: "fixture",
  name: "Fixture Red and Blue",
  region: "Testland",
  generation: 4,
  releaseOrder: 1,
  games: [
    { id: "fixture-red", name: "Fixture Red", monogram: "FR" },
    { id: "fixture-blue", name: "Fixture Blue", monogram: "FB" },
  ],
  places: [
    { id: "starter", kind: "starter", name: "Starter" },
    { id: "route-1", name: "Route 1", areas: ["route-1-area"] },
    // Two source areas, one recorded location.
    { id: "route-2", name: "Route 2", areas: ["route-2-area", "route-2-north-area"] },
    // Counterparts: one Place, a name per Game.
    { id: "black-city", name: { "fixture-red": "Black City", "fixture-blue": "White Forest" }, areas: ["black-city-area"] },
    { id: "trade-house", name: "Trade House" },
    // A second counterpart pair.
    { id: "magma-hideout", name: { "fixture-red": "Magma Hideout", "fixture-blue": "Aqua Hideout" } },
    { id: "cloak-cave", name: "Cloak Cave", areas: ["cloak-cave-area"] },
    // No table at all: an egg can still hatch here.
    { id: "hatch-town", name: "Hatch Town" },
    { id: "navel-rock", kind: "event", name: "Navel Rock" },
  ],
};

/** sources/maps/fixture/generated/pokeapi.wild.json (importer output, committed) */
export const generatedWild: GeneratedWild = {
  importer: "pokeapi",
  pin: "abc1234",
  areas: {
    "route-1-area": {
      "fixture-red": [
        { method: "walk", species: "pidgey", form: "base" },
        { method: "walk", species: "rattata", form: "base" },
      ],
      "fixture-blue": [
        { method: "walk", species: "pidgey", form: "base" },
        { method: "walk", species: "rattata", form: "base" },
      ],
    },
    "route-2-area": {
      "fixture-red": [
        { method: "walk", species: "pikachu", form: "base" },
        { method: "walk", species: "nincada", form: "base" },
        { method: "surf", species: "tentacool", form: "base" },
        { method: "fishing", species: "magikarp", form: "base" },
      ],
      "fixture-blue": [
        { method: "walk", species: "nincada", form: "base" },
        { method: "surf", species: "tentacool", form: "base" },
        { method: "fishing", species: "magikarp", form: "base" },
      ],
    },
    "route-2-north-area": {
      "fixture-red": [{ method: "walk", species: "pikachu", form: "base" }], // merged, deduped
      "fixture-blue": [{ method: "walk", species: "pichu", form: "base" }],
    },
    "black-city-area": {
      "fixture-red": [{ method: "walk", species: "rattata-alola", form: "base" }],
      "fixture-blue": [{ method: "walk", species: "pichu", form: "base" }],
    },
    "cloak-cave-area": {
      "fixture-red": [
        { method: "walk", species: "burmy", form: "plant" },
        { method: "walk", species: "burmy", form: "sandy" },
        { method: "walk", species: "unown", form: "a" },
        { method: "walk", species: "electrode", form: "base" }, // a source error
        { method: "rock-smash", species: "voltorb", form: "base" },
      ],
      "fixture-blue": [
        { method: "walk", species: "burmy", form: "plant" },
        { method: "walk", species: "burmy", form: "trash" },
        { method: "walk", species: "unown", form: "a" },
        { method: "walk", species: "electrode", form: "base" }, // a source error
      ],
    },
    "old-ruins-area": {
      "fixture-red": [{ method: "walk", species: "unown", form: "a" }],
    },
  },
};

const one = (id: string, name: string, dex: number, types: string[]) => ({
  id, name, dex, forms: [{ id: "base", name, types }],
}) as GeneratedSpecies["species"][number];

/** sources/maps/fixture/generated/pokeapi.species.json (importer output, committed) */
export const generatedSpecies: GeneratedSpecies = {
  importer: "pokeapi",
  pin: "abc1234",
  species: [
    one("bulbasaur", "Bulbasaur", 1, ["grass", "poison"]),
    one("ivysaur", "Ivysaur", 2, ["grass", "poison"]),
    one("charmander", "Charmander", 4, ["fire"]),
    one("charmeleon", "Charmeleon", 5, ["fire"]),
    one("squirtle", "Squirtle", 7, ["water"]),
    one("wartortle", "Wartortle", 8, ["water"]),
    one("pidgey", "Pidgey", 16, ["normal", "flying"]),
    one("pidgeotto", "Pidgeotto", 17, ["normal", "flying"]),
    one("rattata", "Rattata", 19, ["normal"]),
    one("rattata-alola", "Alolan Rattata", 19, ["dark", "normal"]),
    one("raticate", "Raticate", 20, ["normal"]),
    one("raticate-alola", "Alolan Raticate", 20, ["dark", "normal"]),
    one("pikachu", "Pikachu", 25, ["electric"]),
    one("raichu", "Raichu", 26, ["electric"]),
    one("raichu-alola", "Alolan Raichu", 26, ["electric", "psychic"]),
    // Normal here; Fairy in "fixture-later". Types are per Map.
    one("clefairy", "Clefairy", 35, ["normal"]),
    one("tentacool", "Tentacool", 72, ["water", "poison"]),
    one("farfetchd", "Farfetch’d", 83, ["normal", "flying"]),
    one("voltorb", "Voltorb", 100, ["electric"]),
    one("electrode", "Electrode", 101, ["electric"]),
    one("magikarp", "Magikarp", 129, ["water"]),
    one("gyarados", "Gyarados", 130, ["water", "flying"]),
    one("lapras", "Lapras", 131, ["water", "ice"]),
    one("eevee", "Eevee", 133, ["normal"]),
    one("vaporeon", "Vaporeon", 134, ["water"]),
    one("snorlax", "Snorlax", 143, ["normal"]),
    one("pichu", "Pichu", 172, ["electric"]),
    one("espeon", "Espeon", 196, ["psychic"]),
    { id: "unown", name: "Unown", dex: 201, forms: [{ id: "a", name: "Unown A", types: ["psychic"] }] },
    one("raikou", "Raikou", 243, ["electric"]),
    one("lugia", "Lugia", 249, ["psychic", "flying"]),
    one("ho-oh", "Ho-Oh", 250, ["fire", "flying"]),
    one("nincada", "Nincada", 290, ["bug", "ground"]),
    one("ninjask", "Ninjask", 291, ["bug", "flying"]),
    one("shedinja", "Shedinja", 292, ["bug", "ghost"]),
    {
      id: "burmy", name: "Burmy", dex: 412, forms: [ // differ only in look
        { id: "plant", name: "Plant Cloak", types: ["bug"] },
        { id: "sandy", name: "Sandy Cloak", types: ["bug"] },
        { id: "trash", name: "Trash Cloak", types: ["bug"] },
      ],
    },
    {
      id: "wormadam", name: "Wormadam", dex: 413, forms: [ // differ in type
        { id: "plant", name: "Plant Cloak", types: ["bug", "grass"] },
        { id: "sandy", name: "Sandy Cloak", types: ["bug", "ground"] },
        { id: "trash", name: "Trash Cloak", types: ["bug", "steel"] },
      ],
    },
    one("mothim", "Mothim", 414, ["bug", "flying"]),
    {
      id: "arceus", name: "Arceus", dex: 493, forms: [
        { id: "base", name: "Arceus", types: ["normal"] },
        { id: "fire", name: "Flame Plate", types: ["normal"] }, // the source is wrong
      ],
    },
  ],
  evolutionLinks: [
    { from: "bulbasaur", to: "ivysaur" },
    { from: "charmander", to: "charmeleon" },
    { from: "squirtle", to: "wartortle" },
    { from: "pidgey", to: "pidgeotto" },
    { from: "rattata", to: "raticate" },
    { from: "rattata", to: "raticate-alola" }, // the source puts the variant in the old line
    { from: "pichu", to: "pikachu" },
    { from: "pikachu", to: "raichu" },
    { from: "pikachu", to: "raichu-alola" },
    { from: "voltorb", to: "electrode" },
    { from: "magikarp", to: "gyarados" },
    { from: "eevee", to: "vaporeon" },
    { from: "eevee", to: "espeon" },
    { from: "nincada", to: "ninjask" },
    { from: "nincada", to: "shedinja" },
    { from: "burmy", to: "wormadam" },
    { from: "burmy", to: "mothim" },
  ],
};

/** sources/maps/fixture/one-time.yaml */
export const oneTime: OneTimeRow[] = [
  ...["bulbasaur", "charmander", "squirtle"].map((species) => ({
    place: "starter", games: ["fixture-red", "fixture-blue"], method: "gift", species, form: "base",
  })),
  { place: "route-1", games: ["fixture-red", "fixture-blue"], method: "roaming", species: "raikou", form: "base" },
  { place: "route-2", games: ["fixture-red", "fixture-blue"], method: "roaming", species: "raikou", form: "base" },
  { place: "trade-house", games: ["fixture-red", "fixture-blue"], method: "trade", species: "farfetchd", form: "base", note: "checked: scripts/trade_house.inc" },
  { place: "trade-house", games: ["fixture-red", "fixture-blue"], method: "gift", species: "lapras", form: "base" },
  { place: "magma-hideout", games: ["fixture-red"], method: "static", species: "snorlax", form: "base" },
  { place: "magma-hideout", games: ["fixture-blue"], method: "static", species: "electrode", form: "base" },
  { place: "navel-rock", games: ["fixture-red"], method: "static", species: "lugia", form: "base" },
  { place: "navel-rock", games: ["fixture-blue"], method: "static", species: "ho-oh", form: "base" },
];

/** sources/maps/fixture/corrections.yaml */
export const corrections: Correction[] = [
  { op: "remove-wild", area: "cloak-cave-area", game: "fixture-red", row: { method: "walk", species: "electrode", form: "base" } },
  { op: "remove-wild", area: "cloak-cave-area", game: "fixture-blue", row: { method: "walk", species: "electrode", form: "base" } },
  { op: "ignore-area", area: "old-ruins-area", why: "Reached only with an item from outside the cartridge" },
  { op: "set-types", species: "arceus", form: "fire", expect: ["normal"], types: ["fire"] },
  { op: "add-form", species: "unown", form: { id: "b", name: "Unown B", types: ["psychic"] } },
  { op: "remove-evolution-link", evolutionLink: { from: "rattata", to: "raticate-alola" } },
  { op: "add-evolution-link", evolutionLink: { from: "rattata-alola", to: "raticate-alola" } },
  { op: "own-evolution-line", species: "shedinja", why: "Recorded as its own Encounter" },
];

export const fixtureSources: MapSources = { methods, map, generatedWild: [generatedWild], generatedSpecies, oneTime, corrections };

/** A second, tiny Map: Clefairy's types differ by Game because the Games are on different Maps. */
export const laterSources: MapSources = {
  methods,
  map: {
    id: "fixture-later", name: "Fixture X", region: "Testland", generation: 6, releaseOrder: 2,
    games: [{ id: "fixture-x", name: "Fixture X", monogram: "X" }],
    places: [{ id: "starter", kind: "starter", name: "Starter" }],
  },
  generatedWild: [],
  generatedSpecies: {
    importer: "pokeapi", pin: "abc1234",
    species: [one("pikachu", "Pikachu", 25, ["electric"]), one("clefairy", "Clefairy", 35, ["fairy"])],
    evolutionLinks: [],
  },
  oneTime: [{ place: "starter", games: ["fixture-x"], method: "gift", species: "clefairy", form: "base" }],
  corrections: [],
};
