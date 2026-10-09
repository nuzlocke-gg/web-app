// Proof of concept: extract Places (map sections) and their wild encounter
// tables from a Gen 3 ROM using only the ROM's bytes. No symbols, no fixed
// offsets: each table is found by scanning for its structure. What it needs
// to know is the engine's struct layouts (vanilla, pokeemerald-expansion,
// FireRed/CFRU), which are public and few.
//
//   node gen3-extract.mts <rom.gba> > out.json

import { readFileSync } from "node:fs"

const rom = readFileSync(process.argv[2]!)
const ROM_BASE = 0x08000000
// Reads past the end give 0, which is never a pointer.
const u8 = (o: number) => (o >= 0 && o < rom.length ? rom[o]! : 0)
const u16 = (o: number) => (o >= 0 && o + 2 <= rom.length ? rom.readUInt16LE(o) : 0)
const u32 = (o: number) => (o >= 0 && o + 4 <= rom.length ? rom.readUInt32LE(o) : 0)
const isPtr = (v: number) => v >= ROM_BASE && v < ROM_BASE + rom.length
const off = (v: number) => v - ROM_BASE

// ---------------------------------------------------------------------------
// Text: the Gen 3 character set (English), enough for names.

const CHARS = new Map<number, string>()
for (let i = 0; i < 26; i++) {
  CHARS.set(0xbb + i, String.fromCharCode(65 + i))
  CHARS.set(0xd5 + i, String.fromCharCode(97 + i))
}
for (let i = 0; i < 10; i++) CHARS.set(0xa1 + i, String(i))
for (const [b, c] of [
  [0x00, " "], [0xab, "!"], [0xac, "?"], [0xad, "."], [0xae, "-"],
  [0xb0, "…"], [0xb1, "“"], [0xb2, "”"], [0xb3, "‘"], [0xb4, "'"],
  [0xb5, "♂"], [0xb6, "♀"], [0xb8, ","], [0xba, "/"], [0xf0, ":"],
  [0x1b, "é"], [0x5c, "("], [0x5d, ")"], [0x2d, "&"],
] as const) CHARS.set(b, c)

/** The string at `o`, or undefined if it is not short, printable text. */
function text(o: number, max = 24, allowEmpty = false): string | undefined {
  let s = ""
  for (let i = 0; i < max && o + i < rom.length; i++) {
    const b = u8(o + i)
    if (b === 0xff) return s.length > 0 || allowEmpty ? s : undefined
    // FD xx: a placeholder such as the player's name ("{PLAYER}'s BASE")
    if (b === 0xfd) {
      s += `{${u8(o + ++i)}}`
      continue
    }
    const c = CHARS.get(b)
    if (c === undefined) return undefined
    s += c
  }
  return undefined
}

function encode(s: string): Buffer {
  const rev = new Map([...CHARS].map(([b, c]) => [c, b]))
  return Buffer.from([...s].map((c) => rev.get(c)!))
}

// ---------------------------------------------------------------------------
// Wild encounter headers.

type Kind = "land" | "water" | "rock-smash" | "fishing" | "hidden"
const SLOTS: Record<Kind, number> = { land: 12, water: 5, "rock-smash": 5, fishing: 10, hidden: 3 }

interface HeaderLayout {
  name: string
  /** Pointer slots per time of day, in order. */
  kinds: Kind[]
  /** Times of day (1 when the engine has none). */
  times: number
}

const HEADER_LAYOUTS: HeaderLayout[] = [
  // pokeemerald / pokefirered / CFRU: { u8 group, u8 num, 4 pointers }
  { name: "vanilla", kinds: ["land", "water", "rock-smash", "fishing"], times: 1 },
  // pokeemerald-expansion (2025+): encounterTypes[TIMES_OF_DAY_COUNT] of 5
  { name: "expansion-tod4", kinds: ["land", "water", "rock-smash", "fishing", "hidden"], times: 4 },
  // older expansion with hidden mons and no time of day
  { name: "expansion-5", kinds: ["land", "water", "rock-smash", "fishing", "hidden"], times: 1 },
]

const stride = (l: HeaderLayout) => 4 + 4 * l.kinds.length * l.times

interface Mon { species: number; min: number; max: number }

/** The mons of a WildPokemonInfo pointer, or undefined if it isn't one. */
function infoAt(ptr: number, kind: Kind): { rate: number; mons: Mon[] } | undefined {
  if (!isPtr(ptr) || ptr % 4) return undefined
  const o = off(ptr)
  const rate = u8(o)
  const monsPtr = u32(o + 4)
  if (!isPtr(monsPtr) || monsPtr % 4 || rate === 0) return undefined
  const mons: Mon[] = []
  for (let i = 0; i < SLOTS[kind]; i++) {
    const m = off(monsPtr) + 4 * i
    const min = u8(m), max = u8(m + 1), species = u16(m + 2)
    if (min < 1 || min > 100 || max < min || max > 100 || species === 0 || species > 0x1000) return undefined
    mons.push({ species, min, max })
  }
  return { rate, mons }
}

interface Header {
  group: number
  num: number
  tables: { time: number; kind: Kind; rate: number; mons: Mon[] }[]
}

function headerAt(o: number, l: HeaderLayout): Header | undefined {
  if (o + stride(l) > rom.length) return undefined
  const group = u8(o), num = u8(o + 1)
  if (u16(o + 2) !== 0 || group > 0x40 || num > 0x80) return undefined
  const tables: Header["tables"] = []
  for (let t = 0; t < l.times; t++) {
    for (let k = 0; k < l.kinds.length; k++) {
      const p = u32(o + 4 + 4 * (t * l.kinds.length + k))
      if (p === 0) continue
      const info = infoAt(p, l.kinds[k]!)
      if (!info) return undefined
      tables.push({ time: t, kind: l.kinds[k]!, ...info })
    }
  }
  return tables.length ? { group, num, tables } : undefined
}

interface HeaderTable { at: number; layout: HeaderLayout; headers: Header[] }

/** Every header table in the ROM: runs of valid headers ending in group 0xFF. */
function findWildHeaderTables(): HeaderTable[] {
  const tables: HeaderTable[] = []
  for (const layout of HEADER_LAYOUTS) {
    const s = stride(layout)
    for (let o = 0; o + s <= rom.length; o += 4) {
      // cheap pre-check: the first pointer slot is null or a pointer
      const p = u32(o + 4)
      if (p !== 0 && !isPtr(p)) continue
      const headers: Header[] = []
      let h: Header | undefined
      while ((h = headerAt(o + headers.length * s, layout))) headers.push(h)
      if (!headers.length) continue
      // the table ends with group 0xFF
      if (u8(o + headers.length * s) === 0xff) tables.push({ at: o, layout, headers })
      o += headers.length * s - 4
    }
  }
  return tables
}

// ---------------------------------------------------------------------------
// Map headers: gMapGroups → group → MapHeader. The map section is at +0x14.

function isMapHeader(ptr: number): boolean {
  if (!isPtr(ptr) || ptr % 4) return false
  const o = off(ptr)
  const conn = u32(o + 12)
  return isPtr(u32(o)) && isPtr(u32(o + 4)) && isPtr(u32(o + 8)) && (conn === 0 || isPtr(conn))
}

function findMapGroups(needed: { group: number; num: number }[]): number | undefined {
  const candidates: number[] = []
  for (let o = 0; o + 4 <= rom.length; o += 4) {
    if (!isPtr(u32(o))) continue
    const ok = needed.every(({ group, num }) => {
      const g = u32(o + 4 * group)
      return isPtr(g) && isMapHeader(u32(off(g) + 4 * num))
    })
    if (ok) candidates.push(o)
  }
  // A table shifted by a group can pass the check above. The real one is the
  // one under which map connections are mutual: if A connects to B, then B
  // connects back to A.
  let best: { o: number; score: number } | undefined
  for (const o of candidates) {
    const score = needed.reduce((n, m) => n + mutualConnections(o, m.group, m.num), 0)
    if (score > (best?.score ?? -1)) best = { o, score }
  }
  return best?.o
}

const headerOf = (groups: number, group: number, num: number) => {
  const g = u32(groups + 4 * group)
  return isPtr(g) ? u32(off(g) + 4 * num) : 0
}

/** MapConnections { s32 count; MapConnection *list } and
 *  MapConnection { u8 direction; s32 offset; u8 group; u8 num } (12 bytes). */
function connectionsOf(header: number): [number, number][] {
  if (!isMapHeader(header)) return []
  const c = u32(off(header) + 12)
  if (!isPtr(c)) return []
  const count = u32(off(c)), list = u32(off(c) + 4)
  if (count > 8 || !isPtr(list)) return []
  return Array.from({ length: count }, (_, i) => [u8(off(list) + 12 * i + 8), u8(off(list) + 12 * i + 9)])
}

function mutualConnections(groups: number, group: number, num: number): number {
  return connectionsOf(headerOf(groups, group, num)).filter(([g, n]) =>
    connectionsOf(headerOf(groups, g, n)).some(([g2, n2]) => g2 === group && n2 === num)
  ).length
}

const mapsecOf = (groups: number, group: number, num: number) =>
  u8(off(u32(off(u32(groups + 4 * group)) + 4 * num)) + 0x14)

// ---------------------------------------------------------------------------
// Map section names. Emerald and expansion: RegionMapLocation { x, y, w, h,
// name* } indexed by map section. FireRed: an array of name pointers indexed
// by map section minus 0x58 (the first Kanto section).

function findMapsecNames(usedSecs: number[], maxSecInUse: number) {
  const runs: { layout: "emerald" | "firered"; at: number; names: string[] }[] = []
  for (const layout of ["emerald", "firered"] as const) {
    const s = layout === "emerald" ? 8 : 4
    const p = layout === "emerald" ? 4 : 0
    for (let o = 0; o + s <= rom.length; o += 4) {
      const names: string[] = []
      for (;;) {
        const e = o + names.length * s
        if (e + s > rom.length) break
        if (layout === "emerald" && (u8(e) > 0x40 || u8(e + 1) > 0x40 || u8(e + 2) > 0x20 || u8(e + 3) > 0x20)) break
        const ptr = u32(e + p)
        const n = isPtr(ptr) ? text(off(ptr), 24, true) : undefined
        if (n === undefined) break
        names.push(n)
      }
      if (names.length >= 40) runs.push({ layout, at: o, names })
      if (names.length) o += (names.length - 1) * s
    }
  }
  // The right table names every map section in use, and it is as long as
  // the range of sections the maps use: a name list of another kind
  // (FireRed's Fame Checker, CFRU's Frontier trainer names) does not fit.
  // Repeated names count against a table (the Fame Checker repeats places).
  const first = (l: string) => (l === "firered" ? 0x58 : 0)
  const repeats = (names: string[]) => names.filter((n) => n !== "").length - new Set(names.filter((n) => n !== "")).size
  const fit = (r: (typeof runs)[number]) => Math.abs(r.names.length - (maxSecInUse + 1 - first(r.layout)))
  return runs
    .filter((r) => usedSecs.every((sec) => sec - first(r.layout) >= 0 && sec - first(r.layout) < r.names.length))
    .sort((a, b) => fit(a) - fit(b) || repeats(a.names) - repeats(b.names))
    .map((r) => ({ ...r, first: first(r.layout) }))[0]
}

/** The highest map section any map header uses, below the "none" sections. */
function maxMapsecInUse(groups: number): number {
  let max = 0
  for (let g = 0; g < 0x40 && isPtr(u32(groups + 4 * g)); g++) {
    const arr = off(u32(groups + 4 * g))
    for (let n = 0; n < 0x100 && isMapHeader(u32(arr + 4 * n)); n++) {
      const sec = u8(off(u32(arr + 4 * n)) + 0x14)
      // MAPSEC_NONE / MAPSEC_DYNAMIC sit just past the named sections
      if (sec < 0xd4) max = Math.max(max, sec)
    }
  }
  return max
}

// ---------------------------------------------------------------------------
// Species names: a table with a fixed stride. Found from where BULBASAUR,
// IVYSAUR, VENUSAUR and CHARMANDER sit; the stride is the struct size.

function findSpeciesNames(usedSpecies: number[]) {
  // A species expansion (DPE) copies the table and leaves the vanilla one in
  // place, so the right table is one that names every species in use.
  const maxUsed = Math.max(...usedSpecies)
  for (const [a, b, c, d] of [
    ["BULBASAUR", "IVYSAUR", "VENUSAUR", "CHARMANDER"],
    ["Bulbasaur", "Ivysaur", "Venusaur", "Charmander"],
  ]) {
    const term = (s: string) => Buffer.concat([encode(s), Buffer.from([0xff])])
    const [A, B, C, D] = [a, b, c, d].map((s) => term(s!))
    for (let i = rom.indexOf(A!); i >= 0; i = rom.indexOf(A!, i + 1)) {
      for (let s = 11; s <= 0x400; s++) {
        if (rom.compare(B!, 0, B!.length, i + s, i + s + B!.length) !== 0) continue
        if (rom.compare(C!, 0, C!.length, i + 2 * s, i + 2 * s + C!.length) !== 0) continue
        if (rom.compare(D!, 0, D!.length, i + 3 * s, i + 3 * s + D!.length) !== 0) continue
        const nameOf = (sp: number) => text(i - s + sp * s, 13)
        if (usedSpecies.every((sp) => nameOf(sp) !== undefined) && i - s + maxUsed * s < rom.length) {
          return { at: i - s, stride: s, name: (sp: number) => nameOf(sp) ?? `#${sp}` }
        }
      }
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------

const allTables = findWildHeaderTables()
// The main table (gWildMonHeaders) is the longest. Other tables of its
// layout are extra tables: CFRU's morning/evening/night tables, Battle Pike
// and Pyramid, etc. Which is which is not in the data; a curator names them.
const wild = allTables.reduce<HeaderTable | undefined>((a, b) => (b.headers.length > (a?.headers.length ?? 9) ? b : a), undefined)
if (!wild) throw new Error("no wild encounter table found")
const groups = findMapGroups(wild.headers)
if (groups === undefined) throw new Error("no map group table found")
const secs = wild.headers.map((h) => mapsecOf(groups, h.group, h.num))
const mapsecs = findMapsecNames(secs, maxMapsecInUse(groups))
const usedSpecies = [...new Set(allTables.filter((t) => t.layout === wild.layout).flatMap((t) => t.headers.flatMap((h) => h.tables.flatMap((x) => x.mons.map((m) => m.species)))))]
const species = findSpeciesNames(usedSpecies)

const KIND_METHOD: Record<Kind, string> = { land: "walk", water: "surf", "rock-smash": "rock-smash", fishing: "fishing", hidden: "hidden" }
const seen = new Set<string>()
const out = {
  rom: { title: rom.toString("latin1", 0xa0, 0xac), code: rom.toString("latin1", 0xac, 0xb0) },
  found: {
    wildHeaders: { at: ROM_BASE + wild.at, layout: wild.layout.name, count: wild.headers.length },
    mapGroups: ROM_BASE + groups,
    mapsecNames: mapsecs && { at: ROM_BASE + mapsecs.at, layout: mapsecs.layout, count: mapsecs.names.length },
    speciesNames: species && { at: ROM_BASE + species.at, stride: species.stride },
  },
  extraTables: allTables
    .filter((t) => t !== wild && t.layout === wild.layout)
    // every map of an extra table must be a real map
    .filter((t) => t.headers.every((h) => isMapHeader(headerOf(groups, h.group, h.num))))
    .map((t) => ({
      at: ROM_BASE + t.at,
      headers: t.headers.map((h) => {
        const sec = mapsecOf(groups, h.group, h.num)
        return {
          map: [h.group, h.num],
          place: mapsecs?.names[sec - mapsecs.first],
          tables: h.tables.map((x) => ({ method: KIND_METHOD[x.kind], rate: x.rate, mons: x.mons.map((m) => ({ species: m.species, name: species?.name(m.species), min: m.min, max: m.max })) })),
        }
      }),
    })),
  headers: wild.headers.map((h, i) => {
    const key = `${h.group}.${h.num}`
    const alternate = seen.has(key) // e.g. Altering Cave's 8 swappable tables
    seen.add(key)
    const sec = secs[i]!
    return {
      map: [h.group, h.num],
      mapsec: sec,
      place: mapsecs?.names[sec - mapsecs.first],
      alternate,
      tables: h.tables.map((t) => ({
        method: KIND_METHOD[t.kind],
        time: wild.layout.times > 1 ? t.time : undefined,
        rate: t.rate,
        mons: t.mons.map((m) => ({ species: m.species, name: species?.name(m.species), min: m.min, max: m.max })),
      })),
    }
  }),
}
console.log(JSON.stringify(out, null, 1))
