// PROTOTYPE (NUZ-44 "Game data format"). Throwaway.
// Pure logic: compile (merge + validate), the permanence check, and the reader.
// No DOM, no file system. The explorer page and the CLI call into it.

import type {
  CompiledMap, Correction, FormRef, Form, Game, GameId, GeneratedSpecies,
  GeneratedWild, Group, HandMap, EvolutionLineId, EvolutionLink, MapId, Method, MethodList,
  OneTimeRow, Origin, Place, PlaceId, PlaceKind, ReleaseLock, Species,
  SpeciesId, FormId, Type, WildRow,
} from "./format.ts";

const ID_PATTERN = /^([a-z0-9]+:)?[a-z0-9]+(-[a-z0-9]+)*$/;
const TYPE_ORDER = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark",
  "steel", "fairy",
];

// ===========================================================================
// Compile
// ===========================================================================

export interface MapSources {
  methods: MethodList;
  map: HandMap;
  generatedWild: GeneratedWild[];
  generatedSpecies: GeneratedSpecies;
  oneTime: OneTimeRow[];
  corrections: Correction[];
}

export type CompileResult =
  | { ok: true; map: CompiledMap }
  | { ok: false; problems: string[] };

const rowKey = (r: WildRow) => `${r.method}:${r.species}/${r.form}`;
const linkKey = (l: EvolutionLink) => `${l.from}>${l.to}`;

export function compile(src: MapSources): CompileResult {
  const problems: string[] = [];
  const stop = (m: string) => problems.push(m);
  const methodById = new Map(src.methods.map((m) => [m.id, m]));
  const gameIds = new Set(src.map.games.map((g) => g.id));

  // --- identifiers -------------------------------------------------------
  const checkId = (kind: string, id: string) => {
    if (!ID_PATTERN.test(id)) stop(`${kind} id "${id}" is not a readable id`);
  };
  checkId("Map", src.map.id);
  src.map.games.forEach((g) => checkId("Game", g.id));
  src.map.places.forEach((p) => checkId("Place", p.id));

  // --- Species: generated, then corrections --------------------------------
  const species = new Map<SpeciesId, Omit<Species, "evolutionLine" | "evolvesTo">>();
  for (const s of src.generatedSpecies.species) {
    species.set(s.id, { ...s, forms: s.forms.map((f) => ({ ...f, types: [...f.types] as Form["types"] })) });
  }
  const links = new Map<string, EvolutionLink>(src.generatedSpecies.evolutionLinks.map((l) => [linkKey(l), l]));
  const ownLine = new Set<SpeciesId>();

  for (const c of src.corrections) {
    switch (c.op) {
      case "add-species":
        if (species.has(c.species.id)) stop(`Correction add-species "${c.species.id}": the import now has it. Remove the correction.`);
        else species.set(c.species.id, c.species);
        break;
      case "add-form": {
        const s = species.get(c.species);
        if (!s) stop(`Correction add-form: no Species "${c.species}"`);
        else if (s.forms.some((f) => f.id === c.form.id)) stop(`Correction add-form "${c.species}/${c.form.id}": the import now has it.`);
        else s.forms.push(c.form);
        break;
      }
      case "set-types": {
        const f = species.get(c.species)?.forms.find((x) => x.id === c.form);
        if (!f) stop(`Correction set-types: no Form "${c.species}/${c.form}"`);
        else if (f.types.join("/") !== c.expect.join("/"))
          stop(`Correction set-types "${c.species}/${c.form}" expects ${c.expect.join("/")} but the import now says ${f.types.join("/")}. Review it.`);
        else f.types = c.types as Form["types"];
        break;
      }
      case "add-evolution-link":
        if (links.has(linkKey(c.evolutionLink))) stop(`Correction add-evolution-link ${linkKey(c.evolutionLink)}: the import now has it.`);
        else links.set(linkKey(c.evolutionLink), c.evolutionLink);
        break;
      case "remove-evolution-link":
        if (!links.delete(linkKey(c.evolutionLink))) stop(`Correction remove-evolution-link ${linkKey(c.evolutionLink)}: the import no longer has it.`);
        break;
      case "own-evolution-line":
        ownLine.add(c.species);
        break;
    }
  }
  for (const s of species.values()) {
    checkId("Species", s.id);
    if (s.forms.length === 0) stop(`Species "${s.id}" has no Form`);
    for (const f of s.forms) {
      checkId("Form", f.id);
      if (f.types.length < 1 || f.types.length > 2) stop(`Form "${s.id}/${f.id}" needs one or two types`);
      for (const t of f.types) if (!TYPE_ORDER.includes(t)) stop(`Form "${s.id}/${f.id}" has unknown type "${t}"`);
    }
  }
  // Filter links to the Species of this Map.
  const mapLinks = [...links.values()].filter((l) => species.has(l.from) && species.has(l.to));

  // Evolution Lines: walk the links both ways; an own-line Species is cut out.
  const parent = new Map<SpeciesId, SpeciesId>();
  const find = (x: SpeciesId): SpeciesId => {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  for (const id of species.keys()) parent.set(id, id);
  for (const l of mapLinks) {
    if (ownLine.has(l.from) || ownLine.has(l.to)) continue;
    parent.set(find(l.from), find(l.to));
  }
  const lineMembers = new Map<SpeciesId, SpeciesId[]>();
  for (const id of species.keys()) {
    const root = find(id);
    lineMembers.set(root, [...(lineMembers.get(root) ?? []), id]);
  }
  const lineOfSpecies = new Map<SpeciesId, EvolutionLineId>();
  for (const members of lineMembers.values()) {
    // The line id is the earliest Species in the chain: the member that no
    // link of the line evolves into (Pichu, not Pikachu). With two such
    // members, the lowest dex number, then the id.
    const joined = mapLinks.filter((l) => !ownLine.has(l.from) && !ownLine.has(l.to));
    const roots = members.filter((id) => !joined.some((l) => l.to === id));
    const first = [...(roots.length ? roots : members)].sort((a, b) => species.get(a)!.dex - species.get(b)!.dex || a.localeCompare(b))[0]!;
    for (const m of members) lineOfSpecies.set(m, first);
  }

  const hasForm = (r: FormRef) => species.get(r.species)?.forms.some((f) => f.id === r.form) ?? false;

  // --- Wild rows: generated areas, then corrections -----------------------
  const areas = new Map<string, Map<GameId, WildRow[]>>();
  for (const gw of src.generatedWild) {
    for (const [area, byGame] of Object.entries(gw.areas)) {
      if (areas.has(area)) stop(`Area "${area}" comes from two importers`);
      const m = new Map<GameId, WildRow[]>();
      for (const [g, rows] of Object.entries(byGame)) m.set(g, [...(rows ?? [])]);
      areas.set(area, m);
    }
  }
  const ignored = new Set<string>();
  for (const c of src.corrections) {
    if (c.op === "ignore-area") {
      if (!areas.has(c.area)) stop(`Correction ignore-area "${c.area}": the import no longer has that area.`);
      ignored.add(c.area);
    }
    if (c.op === "remove-wild" || c.op === "add-wild") {
      const rows = areas.get(c.area)?.get(c.game);
      const i = rows?.findIndex((r) => rowKey(r) === rowKey(c.row)) ?? -1;
      if (c.op === "remove-wild") {
        if (i < 0) stop(`Correction remove-wild ${c.area} ${c.game} ${rowKey(c.row)}: the import no longer has that row. Review it.`);
        else rows!.splice(i, 1);
      } else {
        if (i >= 0) stop(`Correction add-wild ${c.area} ${c.game} ${rowKey(c.row)}: the import now has that row. Remove the correction.`);
        else {
          if (!areas.has(c.area)) areas.set(c.area, new Map());
          const m = areas.get(c.area)!;
          m.set(c.game, [...(m.get(c.game) ?? []), c.row]);
        }
      }
    }
  }

  // --- Places --------------------------------------------------------------
  const claimed = new Map<string, PlaceId>();
  const placeIds = new Set<PlaceId>();
  const places: Place[] = [];
  for (const hp of src.map.places) {
    if (placeIds.has(hp.id)) stop(`Place id "${hp.id}" is used twice`);
    placeIds.add(hp.id);
    const kind: PlaceKind = hp.kind ?? "standard";
    const names: Record<GameId, string> =
      typeof hp.name === "string" ? Object.fromEntries([...gameIds].map((g) => [g, hp.name as string])) : { ...hp.name };
    for (const g of Object.keys(names)) if (!gameIds.has(g)) stop(`Place "${hp.id}" names unknown Game "${g}"`);
    for (const g of gameIds) if (!names[g]) stop(`Place "${hp.id}" has no name for ${g}. Every Place is in every Game of its Map.`);
    const rowsByGame = new Map<GameId, Array<{ method: string } & FormRef>>();
    for (const a of hp.areas ?? []) {
      if (claimed.has(a)) stop(`Area "${a}" is claimed by "${claimed.get(a)}" and "${hp.id}"`);
      claimed.set(a, hp.id);
      const byGame = areas.get(a);
      if (!byGame) { stop(`Place "${hp.id}" claims area "${a}", which the import does not have`); continue; }
      for (const [g, rows] of byGame) {
        if (!names[g]) { if (rows.length) stop(`Area "${a}" has rows for ${g}, but Place "${hp.id}" is not in ${g}`); continue; }
        rowsByGame.set(g, [...(rowsByGame.get(g) ?? []), ...rows]);
      }
    }
    places.push({ id: hp.id, kind, names, tables: {}, ...{ _rows: rowsByGame } } as Place & { _rows: typeof rowsByGame });
  }
  for (const a of areas.keys()) if (!claimed.has(a) && !ignored.has(a)) stop(`Area "${a}" from the import belongs to no Place. Claim it or ignore it.`);

  // Generated rows may use only repeatable methods.
  for (const [a, byGame] of areas) for (const rows of byGame.values()) for (const r of rows) {
    const m = methodById.get(r.method);
    if (!m) stop(`Area "${a}" uses unknown method "${r.method}"`);
    else if (m.oneTime) stop(`Area "${a}" has a ${m.name} row (${r.species}). One-time rows are hand-written only.`);
  }

  // One-time rows.
  const placeById = new Map(places.map((p) => [p.id, p as Place & { _rows: Map<GameId, Array<{ method: string } & FormRef>> }]));
  for (const o of src.oneTime) {
    const p = placeById.get(o.place);
    const m = methodById.get(o.method);
    if (!p) { stop(`One-time row ${o.species} names unknown Place "${o.place}"`); continue; }
    if (!m) { stop(`One-time row ${o.species} uses unknown method "${o.method}"`); continue; }
    if (!m.oneTime) stop(`One-time row ${o.species} at "${o.place}" uses ${m.name}, which is not a one-time method`);
    for (const g of o.games) {
      if (!p.names[g]) { stop(`One-time row ${o.species} at "${o.place}": the Place is not in ${g}`); continue; }
      p._rows.set(g, [...(p._rows.get(g) ?? []), { method: o.method, species: o.species, form: o.form }]);
    }
  }

  // Build groups in method order; check references.
  const usedMethods = new Set<string>();
  for (const p of placeById.values()) {
    for (const [g, rows] of p._rows) {
      const groups: Group[] = [];
      for (const m of src.methods) {
        const seen = new Set<string>();
        const entries: FormRef[] = [];
        for (const r of rows) {
          if (r.method !== m.id) continue;
          if (!hasForm(r)) stop(`Place "${p.id}" (${g}) names unknown Species or Form "${r.species}/${r.form}"`);
          const k = `${r.species}/${r.form}`;
          if (seen.has(k)) continue;
          seen.add(k);
          entries.push({ species: r.species, form: r.form });
        }
        if (entries.length) { groups.push({ method: m.id, entries }); usedMethods.add(m.id); }
      }
      p.tables[g] = groups;
    }
    delete (p as Partial<typeof p>)._rows;
  }

  // Play order shape.
  const starters = places.filter((p) => p.kind === "starter");
  if (starters.length !== 1) stop(`The Map needs exactly one Starter Place; it has ${starters.length}`);
  else if (places[0] !== starters[0]) stop(`The Starter Place must be first in the play order`);
  const firstEvent = places.findIndex((p) => p.kind === "event");
  if (firstEvent >= 0 && places.slice(firstEvent).some((p) => p.kind !== "event"))
    stop(`Event Places must be last in the play order`);

  if (problems.length) return { ok: false, problems };

  const compiled: CompiledMap = {
    id: src.map.id,
    name: src.map.name,
    region: src.map.region,
    generation: src.map.generation,
    releaseOrder: src.map.releaseOrder,
    games: src.map.games,
    methods: src.methods.filter((m) => usedMethods.has(m.id)).map(({ id, name, origin }) => ({ id, name, origin })),
    places,
    species: [...species.values()]
      .sort((a, b) => a.dex - b.dex || a.id.localeCompare(b.id))
      .map((s) => ({
        ...s,
        evolvesTo: mapLinks.filter((l) => l.from === s.id).map((l) => l.to),
        evolutionLine: lineOfSpecies.get(s.id)!,
      })),
  };
  return { ok: true, map: compiled };
}

// ===========================================================================
// Permanence check
// ===========================================================================

export function lockFor(map: CompiledMap, previous?: ReleaseLock): ReleaseLock {
  const union = (a: string[] = [], b: string[]) => [...new Set([...a, ...b])];
  return {
    map: map.id,
    games: union(previous?.games, map.games.map((g) => g.id)),
    places: union(previous?.places, map.places.map((p) => p.id)),
    species: { ...previous?.species, ...Object.fromEntries(map.species.map((s) => [s.id, previous?.species[s.id] ?? s.dex])) },
    forms: union(previous?.forms, map.species.flatMap((s) => s.forms.map((f) => `${s.id}/${f.id}`))),
  };
}

/** Problems that stop a release. `frozen` is CI: the lock must already be complete. */
export function checkPermanence(map: CompiledMap, lock: ReleaseLock | undefined, frozen: boolean): string[] {
  if (!lock) return []; // before launch: identifiers change freely
  const problems: string[] = [];
  const games = new Set(map.games.map((g) => g.id));
  const places = new Set(map.places.map((p) => p.id));
  const species = new Map(map.species.map((s) => [s.id, s]));
  const forms = new Set(map.species.flatMap((s) => s.forms.map((f) => `${s.id}/${f.id}`)));
  for (const g of lock.games) if (!games.has(g)) problems.push(`Released Game "${g}" no longer resolves in this Map`);
  for (const p of lock.places) if (!places.has(p)) problems.push(`Released Place "${p}" no longer resolves. Runs that recorded it would show "Unknown location".`);
  for (const [id, dex] of Object.entries(lock.species)) {
    const s = species.get(id);
    if (!s) problems.push(`Released Species "${id}" no longer resolves`);
    else if (s.dex !== dex) problems.push(`Released Species "${id}" changed meaning: dex ${dex} is now ${s.dex}`);
  }
  for (const f of lock.forms) if (!forms.has(f)) problems.push(`Released Form "${f}" no longer resolves`);
  if (frozen) {
    const next = lockFor(map, lock);
    const added =
      next.games.length - lock.games.length + next.places.length - lock.places.length +
      Object.keys(next.species).length - Object.keys(lock.species).length + next.forms.length - lock.forms.length;
    if (added > 0) problems.push(`The lock is out of date: ${added} new id(s). Run the compile without --frozen and commit the lock.`);
  }
  return problems;
}

// ===========================================================================
// Reader
// ===========================================================================

/** The loaded Map with lookup indexes. Every reader function takes it first. */
export interface LoadedMap {
  data: CompiledMap;
  games: Map<GameId, Game>;
  places: Map<PlaceId, Place>;
  species: Map<SpeciesId, Species>;
  methods: Map<string, Method>;
}

export interface MapSummary {
  id: MapId; name: string; region: string; generation: number; releaseOrder: number; games: Game[];
}

export function index(data: CompiledMap): LoadedMap {
  return {
    data,
    games: new Map(data.games.map((g) => [g.id, g])),
    places: new Map(data.places.map((p) => [p.id, p])),
    species: new Map(data.species.map((s) => [s.id, s])),
    methods: new Map(data.methods.map((m) => [m.id, m])),
  };
}

/**
 * The real package: a generated table of `() => import("../dist/<map>.json")`
 * plus a small static catalog. Here: an in-memory registry.
 */
export function createReader(compiled: CompiledMap[]) {
  const byId = new Map(compiled.map((m) => [m.id, m]));
  const cache = new Map<MapId, Promise<LoadedMap | undefined>>();
  return {
    /** New run "Choose a map" Drawer: grouped by region, release order. Sync, small. */
    listMaps(): MapSummary[] {
      return compiled
        .map(({ id, name, region, generation, releaseOrder, games }) => ({ id, name, region, generation, releaseOrder, games }))
        .sort((a, b) => a.releaseOrder - b.releaseOrder);
    },
    /** Every Run screen. Unknown Map: undefined (the screen says "Unknown game"). */
    loadMap(id: MapId): Promise<LoadedMap | undefined> {
      if (!cache.has(id)) cache.set(id, Promise.resolve(byId.has(id) ? index(byId.get(id)!) : undefined));
      return cache.get(id)!;
    },
  };
}

/** Run list row, Journey chips: the Game's name and monogram. */
export const getGame = (m: LoadedMap, game: GameId): Game | undefined => m.games.get(game);

export interface PlaceRow { id: PlaceId; kind: PlaceKind; name: string }

/** Encounters tab: the Places of one Game in play order, Starter first, Event Places last. */
export function placesOf(m: LoadedMap, game: GameId): PlaceRow[] {
  return m.data.places.filter((p) => p.names[game]).map((p) => ({ id: p.id, kind: p.kind, name: p.names[game]! }));
}

/** Rows, headers, History, Warning text: the name in this Game. Unknown Place or Game: undefined. */
export const placeName = (m: LoadedMap, place: PlaceId, game: GameId): string | undefined =>
  m.places.get(place)?.names[game];

export interface SuggestionGroup { method: string; name: string; origin: Origin; entries: FormRef[] }

/** Record Drawer step 1 (the groups) and step 2 (the default origin). Empty when none. */
export function suggestions(m: LoadedMap, place: PlaceId, game: GameId): SuggestionGroup[] {
  const groups = m.places.get(place)?.tables[game] ?? [];
  return groups.map((g) => {
    const method = m.methods.get(g.method)!;
    return { method: method.id, name: method.name, origin: method.origin, entries: g.entries };
  });
}

/** Rows, chips, sprites. Unknown: undefined, never a stand-in. */
export const getSpecies = (m: LoadedMap, s: SpeciesId): Species | undefined => m.species.get(s);
export const getForm = (m: LoadedMap, s: SpeciesId, f: FormId): Form | undefined =>
  m.species.get(s)?.forms.find((x) => x.id === f);
/** The Form control shows only when this is true. */
export const hasFormChoice = (m: LoadedMap, s: SpeciesId): boolean => (m.species.get(s)?.forms.length ?? 0) > 1;

const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Record Drawer search ("Search all 386 species"), Evolve "Other species",
 * Correct encounter. Ignores case, accents, and punctuation ("mr mime",
 * "farfetchd", "flabebe"). Digits match the dex number. Prefix matches
 * first, then dex order.
 */
export function searchSpecies(m: LoadedMap, query: string): Species[] {
  const q = fold(query);
  if (!q) return m.data.species;
  if (/^\d+$/.test(q)) return m.data.species.filter((s) => String(s.dex).startsWith(q.replace(/^0+/, "") || "0"));
  const hits = m.data.species.filter((s) => fold(s.name).includes(q));
  return [...hits.filter((s) => fold(s.name).startsWith(q)), ...hits.filter((s) => !fold(s.name).startsWith(q))];
}

/**
 * Evolve "Next in its line". Empty: the screen says the Species does not
 * evolve. The target Form: the same Form id when the target has it, else
 * its first Form (Burmy sandy -> Wormadam sandy).
 */
export function nextInLine(m: LoadedMap, s: SpeciesId, f?: FormId): FormRef[] {
  return (m.species.get(s)?.evolvesTo ?? []).flatMap((to) => {
    const t = m.species.get(to);
    if (!t) return [];
    return [{ species: to, form: t.forms.find((x) => x.id === f)?.id ?? t.forms[0]!.id }];
  });
}

/** Duplicate Clause, Shared Duplicate Clause, the "Same line as Fang" mark. Unknown: undefined (the Rule skips it). */
export const evolutionLineOf = (m: LoadedMap, s: SpeciesId): EvolutionLineId | undefined => m.species.get(s)?.evolutionLine;

/** Type Restriction. The Form's first type in this Map. Unknown: undefined (the Rule skips it). */
export const primaryType = (m: LoadedMap, s: SpeciesId, f: FormId): Type | undefined => getForm(m, s, f)?.types[0];

/** Box type filter. */
export const formTypes = (m: LoadedMap, s: SpeciesId, f: FormId): readonly Type[] | undefined => getForm(m, s, f)?.types;

/** Box filter grid: the types that exist in this Map, in the games' order. */
export function typesOf(m: LoadedMap): Type[] {
  const present = new Set(m.data.species.flatMap((s) => s.forms.flatMap((f) => f.types)));
  return TYPE_ORDER.filter((t) => present.has(t as Type)) as Type[];
}

/** Box "National Dex" sort. Unknown: undefined (sorts last). */
export const dexNumber = (m: LoadedMap, s: SpeciesId): number | undefined => m.species.get(s)?.dex;

/**
 * Progress denominator: Run list, Attempts screen, link preview.
 * Every Place of the Map (all Games have all Places), Starter included,
 * Event Places left out. The same for a solo Run and a Soul Link.
 */
export function progressTotal(m: LoadedMap): number {
  return m.data.places.filter((p) => p.kind !== "event").length;
}
