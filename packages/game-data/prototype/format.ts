// PROTOTYPE (NUZ-44 "Game data format"). Throwaway. Not the real package.
//
// The game data format, written as types:
//   1. Identifiers
//   2. The compiled Map (what the app reads)
//   3. The source files (what people and importers write)
//   4. The release lock (what the permanence check compares against)

// ---------------------------------------------------------------------------
// 1. Identifiers
// ---------------------------------------------------------------------------

/**
 * All identifiers are lowercase ASCII words joined by "-": `emerald`,
 * `route-101`, `vulpix-alola`, `nidoran-f`, `mr-mime`, `farfetchd`.
 * A ROM hack prefixes its own new Species with `<hack>:` (`unbound:foo`),
 * so a hack Species can never collide with a mainline one.
 */
export type Id = string;
export const ID_PATTERN = /^([a-z0-9]+:)?[a-z0-9]+(-[a-z0-9]+)*$/;

export type MapId = Id; // unique in the project: `emerald`, `firered-leafgreen`
export type GameId = Id; // unique in the project: `firered`, `leafgreen`
export type PlaceId = Id; // unique in its Map: `route-1`, `starter`
export type SpeciesId = Id; // the same in every Map: `vulpix-alola`
/** Unique in its Species only. A Run stores the pair (Species, Form). */
export type FormId = Id; // `base`, `sandy`, `trash`
export type MethodId = Id; // project-wide list: `walk`, `surf`, `gift`, ...
/** Derived by the compile, never stored, never permanent. Compare in one Map only. */
export type EvolutionLineId = Id;

/** The value an Encounter stores as its origin. */
export type Origin = "wild" | "gift" | "trade";

/** A closed list in the package code, in the games' own order. */
export const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark",
  "steel", "fairy",
] as const;
export type Type = (typeof TYPES)[number];

// ---------------------------------------------------------------------------
// 2. The compiled Map: one JSON file per Map, `dist/<map>.json`
// ---------------------------------------------------------------------------

export interface CompiledMap {
  id: MapId;
  name: string; // "FireRed and LeafGreen"
  region: string; // "Kanto": a label to group the "Choose a map" Drawer
  generation: number;
  releaseOrder: number; // sorts Maps inside a region
  games: Game[]; // display order
  /** Only the groups this Map uses, in record Drawer order (Roaming last). */
  methods: Method[];
  /** Play order. Exactly one Starter Place, first. Event Places last. */
  places: Place[];
  /** All Species of the generation, National Dex order. */
  species: Species[];
  // Room for later: `milestones?: Milestone[]` is added here, an unordered
  // set with Map-defined kinds and opponents per Game. It is additive, so it
  // needs no new Map. Nothing reads it in version 1.
}

export interface Game {
  id: GameId;
  name: string; // "LeafGreen"
  monogram: string; // "LG": the Run list row before there is a starter
}

export interface Method {
  id: MethodId;
  name: string; // "Rock Smash"
  origin: Origin; // the default origin the record Drawer preselects
}

export type PlaceKind = "starter" | "standard" | "event";

export interface Place {
  id: PlaceId;
  kind: PlaceKind;
  /**
   * A name for every Game of the Map: every Game has every Place.
   * Counterparts (Black City and White Forest) are one Place, two names.
   */
  names: Record<GameId, string>;
  /** Encounter tables per Game. A Game may have none. */
  tables: Partial<Record<GameId, Group[]>>;
}

/** One method group of a table, in the Map's `methods` order. */
export interface Group {
  method: MethodId;
  /** No duplicates. Source order (an importer writes the most common first). */
  entries: FormRef[];
}

export interface FormRef {
  species: SpeciesId;
  form: FormId;
}

export interface Species {
  id: SpeciesId;
  name: string; // "Alolan Raichu"
  dex: number; // National Dex number; a ROM hack Species uses its own number
  /** One or more. The first is the default. Type-different Forms are required. */
  forms: Form[];
  /** The Species this one evolves into in this Map (after the filter). */
  evolvesTo: SpeciesId[];
  evolutionLine: EvolutionLineId;
}

export interface Form {
  id: FormId; // a Species with one Form uses `base`
  name: string; // "Sandy Cloak"; the Species name when it has one Form
  /** The types in this Map. All Games of a Map share one generation. */
  types: [Type] | [Type, Type];
}

// ---------------------------------------------------------------------------
// 3. The source files: `sources/maps/<map>/`
//
//    generated/<importer>.wild.json      written only by that importer
//    generated/<importer>.species.json   written only by that importer
//    map.yaml          hand: Map facts, Games, Places in play order + areas
//    one-time.yaml     hand: Static, Roaming, Gift, Trade rows
//    corrections.yaml  hand: changes to generated data, each with what it expects
//
//    sources/methods.yaml  hand: the project-wide method group list
//
// The importer output is an intermediate shape that every importer writes
// (PokeAPI now, pret later). The compile never reads a source's own shape.
// ---------------------------------------------------------------------------

/** generated/<importer>.wild.json: repeatable wild rows by source area. */
export interface GeneratedWild {
  importer: string; // "pokeapi"
  pin: string; // the source commit
  /** Source area id -> Game -> rows. Area ids are the importer's own. */
  areas: Record<string, Partial<Record<GameId, WildRow[]>>>;
}
export interface WildRow extends FormRef {
  /** Repeatable methods only. One-time methods are dropped at import. */
  method: MethodId;
}

/** generated/<importer>.species.json: Species facts as of the Map's generation. */
export interface GeneratedSpecies {
  importer: string;
  pin: string;
  species: Array<Omit<Species, "evolutionLine" | "evolvesTo">>;
  evolutionLinks: EvolutionLink[];
}
export interface EvolutionLink {
  from: SpeciesId;
  to: SpeciesId;
}

/** map.yaml */
export interface HandMap {
  id: MapId;
  name: string;
  region: string;
  generation: number;
  releaseOrder: number;
  games: Game[];
  places: HandPlace[]; // the play order
}
export interface HandPlace {
  id: PlaceId;
  kind?: PlaceKind; // default "standard"
  /** One string when the name is the same in every Game; else one per Game, all required. */
  name: string | Partial<Record<GameId, string>>;
  /** The source areas whose wild rows belong to this Place. */
  areas?: string[];
}

/** one-time.yaml: never generated. Checked by hand against the game's source. */
export interface OneTimeRow extends FormRef {
  place: PlaceId;
  games: GameId[]; // the Games that have it
  method: MethodId; // static, roaming, gift, trade, ...
  note?: string; // where it was checked ("pokeemerald data/maps/...")
}

/**
 * corrections.yaml. Hand-written wins, but each correction states what it
 * expects in the generated data. When a re-import changes that, the
 * compile stops and names the correction.
 */
export type Correction =
  | { op: "remove-wild"; area: string; game: GameId; row: WildRow } // expects present
  | { op: "add-wild"; area: string; game: GameId; row: WildRow } // expects absent
  | { op: "ignore-area"; area: string; why: string } // expects the area exists
  | { op: "set-types"; species: SpeciesId; form: FormId; expect: Type[]; types: Type[] }
  | { op: "add-form"; species: SpeciesId; form: Form } // expects absent
  | { op: "add-species"; species: Omit<Species, "evolutionLine" | "evolvesTo"> } // expects absent
  | { op: "add-evolution-link"; evolutionLink: EvolutionLink } // expects absent
  | { op: "remove-evolution-link"; evolutionLink: EvolutionLink } // expects present
  | { op: "own-evolution-line"; species: SpeciesId; why: string }; // Shedinja

/**
 * methods.yaml: the one project-wide list, in record Drawer order. It grows
 * when a Game needs a group. A one-time group is hand-written only; an
 * importer row with a one-time method stops the compile.
 */
export type MethodList = Array<Method & { oneTime: boolean }>;

// ---------------------------------------------------------------------------
// 4. The release lock: `released/<map>.lock.json`, committed
//
// Created at launch. The compile adds new ids to it; CI runs the compile in
// frozen mode and fails when the lock would change (an id not yet locked)
// or when a locked id fails the check. Before launch there is no lock and
// identifiers change freely.
// ---------------------------------------------------------------------------

export interface ReleaseLock {
  map: MapId;
  games: GameId[]; // must stay in this Map
  places: PlaceId[]; // must still resolve; name, order, kind, tables may change
  /** Species id -> dex number. Must resolve, and the number must not change. */
  species: Record<SpeciesId, number>;
  /** "species/form". Must resolve; name and types may change (corrections). */
  forms: string[];
}
