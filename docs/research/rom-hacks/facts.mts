// Species facts from an expansion ROM: find the types field and the
// evolutions pointer inside the species struct by matching known values,
// then dump types and evolutions for every named species.
//   node facts.mts <rom> <names addr> <stride> <pokeapi csv dir> > facts.json
import { readFileSync } from "node:fs"
const [romPath, namesArg, strideArg, api] = process.argv.slice(2) as [string, string, string, string]
const rom = readFileSync(romPath)
const B = 0x08000000, names = Number(namesArg) - B, stride = Number(strideArg)
const at = (sp: number) => names + sp * stride
const isPtr = (v: number) => v >= B && v < B + rom.length
const csv = (f: string) => { const [h, ...rows] = readFileSync(`${api}/${f}.csv`, "utf8").trim().split("\n").map((l) => l.split(",")); return rows.map((r) => Object.fromEntries(h!.map((k, i) => [k, r[i]!]))) }
const typeName = new Map(csv("types").map((r) => [r.id!, r.identifier!]))
const apiTypes = new Map<number, string[]>()
for (const r of csv("pokemon_types")) { const id = Number(r.pokemon_id); if (id > 905) continue; const t = apiTypes.get(id) ?? []; t[Number(r.slot) - 1] = typeName.get(r.type_id!)!; apiTypes.set(id, t) }
const C = new Map<number, string>(); for (let i = 0; i < 26; i++) { C.set(0xbb + i, String.fromCharCode(65 + i)); C.set(0xd5 + i, String.fromCharCode(97 + i)) }
for (const [b, c] of [[0, " "], [0xad, "."], [0xae, "-"], [0xb4, "'"], [0xb5, "♂"], [0xb6, "♀"], [0x1b, "é"], [0xf0, ":"]] as const) C.set(b, c)
for (let i = 0; i < 10; i++) C.set(0xa1 + i, String(i))
const nm = (sp: number) => { let s = ""; for (let i = 0; i < 13; i++) { const b = rom[at(sp) + i]!; if (b === 0xff) return s; const c = C.get(b); if (c === undefined) return undefined; s += c } return undefined }

// 1. types: two bytes at offset k. Learn rom id -> type by majority vote over
//    the named species 1..905 (a hack may change some types), keep the best k.
let typesK: number | undefined, typeMap = new Map<number, string>(), bestScore = 0
const named = Array.from({ length: 905 }, (_, i) => i + 1).filter((sp) => nm(sp) && apiTypes.has(sp))
for (let k = -stride; k < stride - 1; k++) {
  const votes = new Map<number, Map<string, number>>()
  const vote = (id: number, t: string) => { const v = votes.get(id) ?? new Map(); v.set(t, (v.get(t) ?? 0) + 1); votes.set(id, v) }
  for (const sp of named) { const w = apiTypes.get(sp)!; vote(rom[at(sp) + k]!, w[0]!); vote(rom[at(sp) + k + 1]!, w[1] ?? w[0]!) }
  const m = new Map([...votes].map(([id, v]) => [id, [...v].sort((a, b) => b[1] - a[1])[0]![0]]))
  if (new Set(m.values()).size !== m.size) continue // two ids for one type: not a types field
  let score = 0
  for (const sp of named) { const w = apiTypes.get(sp)!; if (m.get(rom[at(sp) + k]!) === w[0] && m.get(rom[at(sp) + k + 1]!) === (w[1] ?? w[0])) score++ }
  if (score > bestScore) { bestScore = score; typesK = k; typeMap = m }
}
console.error(`types field at name${typesK! >= 0 ? "+" : ""}${typesK}; ${bestScore}/${named.length} named species agree with PokeAPI's current types; ids: ${[...typeMap].sort((a, b) => a[0] - b[0]).map(([a, b]) => a + "=" + b).join(" ")}`)

// 2. evolutions: a pointer field whose list { u16 method, u16 param, u16 target } (end 0xFFFF)
//    sends Bulbasaur to 2, Charmander to 5, Squirtle to 8, Caterpie to 11
const evoList = (p: number, size: number) => { const out: { method: number; param: number; target: number }[] = []; for (let i = 0; i < 16; i++) { const o = p - B + size * i; const method = rom.readUInt16LE(o); if (method === 0xffff) return out; out.push({ method, param: rom.readUInt16LE(o + 2), target: rom.readUInt16LE(o + 4) }) } return undefined }
let evoK: number | undefined, evoSize = 6
for (const size of [6, 8, 12]) for (let k = -stride; k < stride && evoK === undefined; k += 4) {
  const ok = [[1, 2], [4, 5], [7, 8], [10, 11]].every(([a, b]) => { const p = rom.readUInt32LE(at(a!) + k); return isPtr(p) && evoList(p, size)?.some((e) => e.target === b) })
  if (ok) { evoK = k; evoSize = size }
}
console.error(`evolutions pointer at name${evoK! >= 0 ? "+" : ""}${evoK}, entry size ${evoSize}`)

const species: { id: number; name: string; types: string[]; evolvesTo: number[] }[] = []
for (let sp = 1; sp < 2000 && at(sp) + stride <= rom.length; sp++) {
  const name = nm(sp); if (!name || name.startsWith("?")) continue
  // a real entry also has two known types; past the table's end, text fragments do not
  if (!typeMap.has(rom[at(sp) + typesK!]!) || !typeMap.has(rom[at(sp) + typesK! + 1]!)) continue
  const t1 = typeMap.get(rom[at(sp) + typesK!]!) ?? `#${rom[at(sp) + typesK!]}`, t2 = typeMap.get(rom[at(sp) + typesK! + 1]!) ?? `#${rom[at(sp) + typesK! + 1]}`
  const p = rom.readUInt32LE(at(sp) + evoK!)
  species.push({ id: sp, name, types: t1 === t2 ? [t1] : [t1, t2], evolvesTo: isPtr(p) ? (evoList(p, evoSize) ?? []).map((e) => e.target) : [] })
}
// 3. form tables: a pointer field to a u16 list (end 0xFFFF) holding the species' own id,
//    found by majority over the named species that have one
const formList = (p: number) => { const out: number[] = []; for (let i = 0; i < 64; i++) { const v = rom.readUInt16LE(p - B + 2 * i); if (v === 0xffff) return out; out.push(v) } return undefined }
const formHits = new Map<number, number>()
for (const s of species) for (let k = -stride; k < stride; k += 4) {
  const p = rom.readUInt32LE(at(s.id) + k)
  const l = isPtr(p) && p % 2 === 0 ? formList(p) : undefined
  // a Form table lists Forms of one species: every id in it has this name
  if (l && l.length >= 2 && l.includes(s.id) && l.every((id) => nm(id) === s.name)) formHits.set(k, (formHits.get(k) ?? 0) + 1)
}
const formK = [...formHits].sort((a, b) => b[1] - a[1])[0]?.[0]
console.error(`form table pointer at name${formK! >= 0 ? "+" : ""}${formK}; votes ${JSON.stringify([...formHits])}`)
const withForms = species.map((s) => { const p = rom.readUInt32LE(at(s.id) + formK!); const l = isPtr(p) ? formList(p) : undefined; return { ...s, forms: l && l.includes(s.id) ? l : undefined } })
console.log(JSON.stringify({ typesK, evoK, evoSize, formK, species: withForms }))
