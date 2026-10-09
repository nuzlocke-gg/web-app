// The Starter table: 3 distinct u16 species ids stored together and pointed
// to by a u32, each the first of a three-stage line, one grass, one fire, one
// water (PokeAPI's types of that species). Small species ids turn up all over
// graphics data; without the type rule there are a hundred candidates.
//   node starter.mts <rom> <names addr> <stride> <pokeapi dir>
import { readFileSync } from "node:fs"
const [romPath, namesArg, strideArg, api] = process.argv.slice(2) as [string, string, string, string]
const rom = readFileSync(romPath)
const B = 0x08000000, names = Number(namesArg) - B, stride = Number(strideArg)
const C = new Map<number, string>(); for (let i = 0; i < 26; i++) { C.set(0xbb + i, String.fromCharCode(65 + i)); C.set(0xd5 + i, String.fromCharCode(97 + i)) }
for (const [b, c] of [[0, " "], [0xad, "."], [0xae, "-"], [0xb4, "'"], [0xb5, "♂"], [0xb6, "♀"], [0x1b, "é"]] as const) C.set(b, c)
const nm = (sp: number) => { if (sp < 1 || sp > 2000 || names + sp * stride + 13 > rom.length) return undefined; let s = ""; for (let i = 0; i < 13; i++) { const b = rom[names + sp * stride + i]!; if (b === 0xff) return s || undefined; const c = C.get(b); if (c === undefined) return undefined; s += c } return undefined }
const csv = (f: string) => { const [h, ...rows] = readFileSync(`${api}/${f}.csv`, "utf8").trim().split("\n").map((l) => l.split(",")); return rows.map((r) => Object.fromEntries(h!.map((k, i) => [k, r[i]!]))) }
const norm = (n: string) => n.toUpperCase().replace("♀", "F").replace("♂", "M").replace("É", "E").replace(/[^A-Z0-9]/g, "")
const dexByName = new Map(csv("pokemon_species_names").filter((r) => r.local_language_id === "9").map((r) => [norm(r.name!), Number(r.pokemon_species_id)]))
const from = new Map(csv("pokemon_species").filter((r) => r.evolves_from_species_id).map((r) => [Number(r.id), Number(r.evolves_from_species_id)]))
const children = new Map<number, number[]>(); for (const [c, p] of from) children.set(p, [...(children.get(p) ?? []), c])
const stages = (d: number): number => 1 + Math.max(0, ...(children.get(d) ?? []).map(stages))
const isBase3 = (sp: number) => { const n = nm(sp); const d = n && dexByName.get(norm(n)); return !!d && !from.has(d) && stages(d) === 3 }
const typeName = new Map(csv("types").map((r) => [r.id!, r.identifier!]))
const types = new Map<number, string[]>()
for (const r of csv("pokemon_types")) { const id = Number(r.pokemon_id); types.set(id, [...(types.get(id) ?? []), typeName.get(r.type_id!)!]) }
const triangle = (ids: number[]) => {
  const t = ids.map((sp) => types.get(dexByName.get(norm(nm(sp)!))!) ?? [])
  return ["grass", "fire", "water"].every((want) => t.filter((x) => x.includes(want)).length === 1)
}
const out: [string, string[]][] = []
// The table must be pointed to exactly. Without that rule, Kanto starter
// trios in other data give 6 to 40 candidates. A modern compiler can reach
// the table from a nearby base instead (today's expansion build): then there
// is no candidate, and the curator writes the Starter rows.
for (let o = 0; o + 4 <= rom.length; o += 4) {
  const v = rom.readUInt32LE(o); if (v < B || v >= B + rom.length || v % 2) continue
  const x = v - B, ids = [rom.readUInt16LE(x), rom.readUInt16LE(x + 2), rom.readUInt16LE(x + 4)]
  if (new Set(ids).size === 3 && ids.every(isBase3) && triangle(ids)) out.push([v.toString(16) + " (ptr at " + (o + B).toString(16) + ")", ids.map((i) => nm(i)!)])
}
console.log(out.length, "candidates:"); for (const c of out) console.log("  ", c[0], c[1].join(", "))
