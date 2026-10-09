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
  // 2024 expansion with DexNav: hidden mons come before fishing
  { name: "expansion-dexnav", kinds: ["land", "water", "rock-smash", "hidden", "fishing"], times: 1 },
]

const stride = (l: HeaderLayout) => 4 + 4 * l.kinds.length * l.times

interface Mon { species: number; min: number; max: number }

/** The mons of a WildPokemonInfo pointer, or undefined if it isn't one. */
function infoAt(ptr: number, kind: Kind): { rate: number; mons: Mon[] } | undefined {
  if (!isPtr(ptr) || ptr % 4) return undefined
  const o = off(ptr)
  const rate = u8(o)
  const monsPtr = u32(o + 4)
  // hidden (DexNav) tables are not rolled like grass, so their rate is 0
  if (!isPtr(monsPtr) || monsPtr % 4 || (rate === 0 && kind !== "hidden")) return undefined
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
  // A header with every pointer null exists (Seaglass has one for a map with
  // no encounter types). All-zero bytes are not a header, though.
  return tables.length || group || num ? { group, num, tables } : undefined
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
      // the table ends with group 0xFF; skip past a table, never past a
      // false start (one could sit just before a real table)
      if (u8(o + headers.length * s) !== 0xff || !headers.some((x) => x.tables.length)) continue
      tables.push({ at: o, layout, headers })
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
  for (const h of allMaps(groups)) {
    const sec = u8(off(h) + 0x14)
    // MAPSEC_NONE / MAPSEC_DYNAMIC sit just past the named sections
    if (sec < 0xd4) max = Math.max(max, sec)
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

/** Every map header, group by group. A group's list ends at the next
 *  group's list or at the group table itself (the last list often sits just
 *  before it), or at a header whose fields are not sane. */
function allMaps(groups: number): number[] {
  const starts = new Set<number>()
  for (let g = 0; g < 0x40 && isPtr(u32(groups + 4 * g)); g++) starts.add(off(u32(groups + 4 * g)))
  const saneHeader = (ptr: number) => {
    if (!isMapHeader(ptr)) return false
    const o = off(ptr)
    // the layout id is a small index; a pointer read as a header has 0x08xx
    // there. (Bytes past 0x14 differ between engine versions, so no checks.)
    const layoutId = u16(o + 0x12)
    return layoutId >= 1 && layoutId < 0x800
  }
  const maps: number[] = []
  for (const arr of starts) {
    for (let n = 0; n < 0x100; n++) {
      const e = arr + 4 * n
      if ((n > 0 && starts.has(e)) || e === groups || !saneHeader(u32(e))) break
      maps.push(u32(e))
    }
  }
  return maps
}

/** Every named map section that some map uses: the candidate Places. */
function allPlaces(groups: number) {
  const secs = new Map<number, number>() // section -> number of maps
  for (const h of allMaps(groups)) {
    const sec = u8(off(h) + 0x14)
    secs.set(sec, (secs.get(sec) ?? 0) + 1)
  }
  return [...secs].sort((a, b) => a[0] - b[0]).map(([sec, maps]) => ({ mapsec: sec, name: mapsecs?.names[sec - mapsecs.first], maps }))
}

// ---------------------------------------------------------------------------
// One-time encounters in scripts. Commands are found by their byte patterns
// (no script interpreter), then given the Place of the nearest script entry
// point before them that a map's events reference. Scripts are compiled one
// map file after another, so that entry point is in the same file.

/** Script entry points referenced by map events and map scripts, with the
 *  map section of each map that references them. */
function scriptEntryPoints(maps: number[]): Map<number, Set<number>> {
  const entries = new Map<number, Set<number>>()
  const add = (ptr: number, sec: number) => {
    if (!isPtr(ptr)) return
    const s = entries.get(off(ptr)) ?? new Set<number>()
    s.add(sec)
    entries.set(off(ptr), s)
  }
  for (const h of maps) {
    const o = off(h), sec = u8(o + 0x14)
    const ev = u32(o + 4)
    if (isPtr(ev)) {
      const e = off(ev)
      const [objects, , coords, bgs] = [u8(e), u8(e + 1), u8(e + 2), u8(e + 3)]
      // ObjectEventTemplate: 24 bytes, script at +0x10
      if (isPtr(u32(e + 4))) for (let i = 0; i < objects; i++) add(u32(off(u32(e + 4)) + 24 * i + 0x10), sec)
      // CoordEvent: 16 bytes, script at +12
      if (isPtr(u32(e + 12))) for (let i = 0; i < coords; i++) add(u32(off(u32(e + 12)) + 16 * i + 12), sec)
      // BgEvent: 12 bytes, script at +8 for the kinds that have one (0..4)
      if (isPtr(u32(e + 16))) for (let i = 0; i < bgs; i++) if (u8(off(u32(e + 16)) + 12 * i + 5) <= 4) add(u32(off(u32(e + 16)) + 12 * i + 8), sec)
    }
    // map scripts: { u8 type, u32 ptr } until type 0; types 2 and 4 point to
    // tables of { u16 var, u16 value, u32 script } until var 0
    const ms = u32(o + 8)
    if (isPtr(ms)) {
      for (let m = off(ms), n = 0; u8(m) !== 0 && n < 16; m += 5, n++) {
        const p = u32(m + 1)
        if (u8(m) === 2 || u8(m) === 4) {
          if (isPtr(p)) for (let t = off(p), k = 0; u16(t) !== 0 && k < 32; t += 8, k++) add(u32(t + 4), sec)
        } else add(p, sec)
      }
    }
  }
  return entries
}

interface OneTime { kind: "gift" | "egg" | "static"; species: number; level?: number; at: number }

function findOneTimeCommands(isSpecies: (id: number) => boolean): OneTime[] {
  const found: OneTime[] = []
  const eventMons: { special: number; species: number; level: number; at: number }[] = []
  const lvl = (v: number) => v >= 1 && v <= 100
  // expansion givemon: callnative <fn> [00 06] species:u16 level:u16 flags:u32.
  // The fn is the callnative target most often followed by a species and level.
  const targets = new Map<number, { skip: number; hits: number[] }[]>()
  for (let o = 0; o + 13 <= rom.length; o++) {
    if (u8(o) !== 0x23) continue
    // newer expansion adds ROM_SIZE (0x2000000) to the pointer to flag "requests effects"
    let fn = rom.readUInt32LE(o + 1)
    if (!isPtr(fn) && isPtr(fn - 0x2000000)) fn -= 0x2000000
    if (!isPtr(fn) || fn % 2 === 0) continue // a Thumb function pointer is odd
    for (const skip of [0, 2]) {
      if (skip && !(u8(o + 5) === 0 && u8(o + 6) === 6)) continue
      const sp = u16(o + 5 + skip), lv = u16(o + 7 + skip)
      if (!isSpecies(sp) || !lvl(lv)) continue
      const list = targets.get(fn) ?? []
      let t = list.find((x) => x.skip === skip)
      if (!t) list.push((t = { skip, hits: [] }))
      t.hits.push(o)
      targets.set(fn, list)
    }
  }
  const best = [...targets].flatMap(([fn, l]) => l.map((t) => ({ fn, ...t }))).sort((a, b) => b.hits.length - a.hits.length)[0]
  if (best && best.hits.length >= 3) for (const o of best.hits) found.push({ kind: "gift", species: u16(o + 5 + best.skip), level: u16(o + 7 + best.skip), at: o })
  for (let o = 0; o + 16 <= rom.length; o++) {
    const op = u8(o)
    // vanilla givemon: 79 species level item 00000000 00000000 00
    if (op === 0x79 && isSpecies(u16(o + 1)) && lvl(u8(o + 3)) && u32(o + 6) === 0 && u32(o + 10) === 0 && u8(o + 14) === 0) found.push({ kind: "gift", species: u16(o + 1), level: u8(o + 3), at: o })
    // setwildbattle B6 species level item (6 bytes), or with species2 level2
    // item2 in expansion (11 bytes). In both decomps the next command is one of
    // setflag, waitse, setvar, special, dowildbattle.
    if (op === 0xb6 && isSpecies(u16(o + 1)) && lvl(u8(o + 3))) {
      const next = (n: number) => [0x29, 0x30, 0x16, 0x25, 0xb7].includes(u8(o + n))
      const second = u16(o + 6) === 0 || (isSpecies(u16(o + 6)) && lvl(u8(o + 8)))
      if (next(6) || (second && next(11))) found.push({ kind: "static", species: u16(o + 1), level: u8(o + 3), at: o })
    }
    // seteventmon: setvar 0x8004 species; setvar 0x8005 level; setvar 0x8006 item; special id
    if (op === 0x16 && u16(o + 1) === 0x8004 && u8(o + 5) === 0x16 && u16(o + 6) === 0x8005 && u8(o + 10) === 0x16 && u16(o + 11) === 0x8006 && u8(o + 15) === 0x25 && isSpecies(u16(o + 3)) && lvl(u16(o + 8)))
      eventMons.push({ special: u16(o + 16), species: u16(o + 3), level: u16(o + 8), at: o })
  }
  // Other specials take the same three vars (small indexes, not species). The
  // event-mon special is the one whose hits name different species, all at
  // level 5 or more.
  const bySpecial = new Map<number, typeof eventMons>()
  for (const e of eventMons) bySpecial.set(e.special, [...(bySpecial.get(e.special) ?? []), e])
  const eventSpecial = [...bySpecial]
    .filter(([, l]) => l.every((e) => e.level >= 5))
    .sort((a, b) => new Set(b[1].map((e) => e.species)).size - new Set(a[1].map((e) => e.species)).size)[0]
  for (const e of eventSpecial?.[1] ?? []) found.push({ kind: "static", species: e.species, level: e.level, at: e.at })
  return found
}

/** The in-game trade table: a run of fixed-size records that start with a
 *  nickname and hold the species given and, later, the species asked for.
 *  Several runs can pass; the right one fits the trade indexes that trade
 *  scripts use (`needed`), and its nicknames are real names. */
function findTrades(isSpecies: (id: number) => boolean, needed: number) {
  const named = (o: number) => { const t = text(o, 13); return t !== undefined && /[A-Za-z].*[A-Za-z]/.test(t) }
  let best: { at: number; stride: number; given: number; asked: number; count: number } | undefined
  const fit = (n: number) => (n >= needed ? n - needed : 1000)
  for (const stride of [56, 60, 64, 68, 72]) {
    for (let o = 0; o + 2 * stride <= rom.length; o += 4) {
      if (!named(o)) continue
      for (const given of [12, 14]) {
        if (!isSpecies(u16(o + given))) continue
        for (let asked = stride - 2; asked > given + 20; asked -= 2) {
          let n = 0
          // the six IVs after the given species are each 0..31
          const ivsOk = (r: number) => [0, 1, 2, 3, 4, 5].every((i) => u8(r + given + 2 + i) <= 31)
          while (n < 16 && named(o + n * stride) && isSpecies(u16(o + n * stride + given)) && ivsOk(o + n * stride) && isSpecies(u16(o + n * stride + asked))) n++
          if (n >= 1 && fit(n) < fit(best?.count ?? 0)) best = { at: o, stride, given, asked, count: n }
        }
      }
    }
  }
  return best
}

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
  places: allPlaces(groups),
  oneTime: (() => {
    if (!species) return []
    const isSpecies = (id: number) => id > 0 && id < 0x800 && text(species.at + id * species.stride, 13) !== undefined && !text(species.at + id * species.stride, 13)!.startsWith("?")
    const entries = scriptEntryPoints(allMaps(groups))
    const sorted = [...entries.keys()].sort((a, b) => a - b)
    const commands: (OneTime & { kind: OneTime["kind"] | "trade"; asked?: number })[] = findOneTimeCommands(isSpecies)
    // trades: setvar VAR_0x8008, index (16 08 80 i 00), then at once
    // copyvar VAR_0x8004, VAR_0x8008, selects a record of the trade table
    const tradeRefs: { index: number; at: number }[] = []
    for (let o = 0; o + 10 <= rom.length; o++) {
      if (u8(o) === 0x16 && u16(o + 1) === 0x8008 && u16(o + 3) < 64 && u8(o + 5) === 0x19 && u16(o + 6) === 0x8004 && u16(o + 8) === 0x8008)
        tradeRefs.push({ index: u16(o + 3), at: o })
      // newer expansion's ingame_trade: setvar VAR_0x8005, id; specialvar VAR_0x8009, ...
      if (u8(o) === 0x16 && u16(o + 1) === 0x8005 && u16(o + 3) < 64 && u8(o + 5) === 0x26 && u16(o + 6) === 0x8009)
        tradeRefs.push({ index: u16(o + 3), at: o })
    }
    const trades = tradeRefs.length ? findTrades(isSpecies, Math.max(...tradeRefs.map((t) => t.index)) + 1) : undefined
    if (trades) for (const t of tradeRefs) {
      const r = trades.at + t.index * trades.stride
      commands.push({ kind: "trade", species: u16(r + trades.given), asked: u16(r + trades.asked), at: t.at })
    }
    return commands.map((c) => {
      // nearest entry point at or before the command, within 2 KB: real
      // encounters sat at most ~1 KB past one; expansion's debug menu (no map
      // reaches it) sat ~3 KB past the nearest map script
      let lo = 0, hi = sorted.length - 1, ep = -1
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (sorted[mid]! <= c.at) { ep = sorted[mid]!; lo = mid + 1 } else hi = mid - 1 }
      const secs = ep >= 0 && c.at - ep < 0x800 ? [...entries.get(ep)!] : []
      return { kind: c.kind, species: c.species, name: species.name(c.species), level: c.level, asked: c.asked && species.name(c.asked), at: ROM_BASE + c.at, places: secs.map((sec) => mapsecs?.names[sec - mapsecs.first] ?? `#${sec}`) }
    }).filter((c) => c.places.length) // a command no map's script reaches is not an encounter
  })(),
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
  emptyHeaders: wild.headers.filter((h) => !h.tables.length).map((h) => [h.group, h.num]),
  headers: wild.headers.flatMap((h, i) => (h.tables.length ? [{ h, i }] : [])).map(({ h, i }) => {
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
