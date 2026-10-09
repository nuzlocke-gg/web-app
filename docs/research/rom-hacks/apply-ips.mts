// Apply an IPS patch: node apply-ips.mts <base.gba> <patch.ips> <out.gba>
// Records: u24 offset, u16 size, data; size 0 means RLE (u16 count, u8 byte).
// Ends with "EOF", optionally followed by a u24 truncation size.

import { readFileSync, writeFileSync } from "node:fs"

const [basePath, patchPath, outPath] = process.argv.slice(2) as [string, string, string]
const base = readFileSync(basePath)
const patch = readFileSync(patchPath)

if (patch.toString("latin1", 0, 5) !== "PATCH") throw new Error("not an IPS patch")

const u24 = (o: number) => (patch[o]! << 16) | (patch[o + 1]! << 8) | patch[o + 2]!
const writes: { at: number; bytes: Buffer }[] = []
let end = base.length
let p = 5
for (;;) {
  if (p + 3 > patch.length) throw new Error("patch ends without EOF")
  if (patch.toString("latin1", p, p + 3) === "EOF") {
    p += 3
    break
  }
  const at = u24(p)
  const size = patch.readUInt16BE(p + 3)
  p += 5
  let bytes: Buffer
  if (size === 0) {
    bytes = Buffer.alloc(patch.readUInt16BE(p), patch[p + 2]!)
    p += 3
  } else {
    bytes = patch.subarray(p, p + size)
    p += size
  }
  writes.push({ at, bytes })
  end = Math.max(end, at + bytes.length)
}
const truncate = p + 3 <= patch.length ? u24(p) : undefined

const out = Buffer.alloc(truncate ?? end, 0xff)
base.copy(out, 0, 0, Math.min(base.length, out.length))
for (const { at, bytes } of writes) bytes.copy(out, at)
writeFileSync(outPath, out)
console.error(`${writes.length} records, output ${out.length} bytes${truncate ? " (truncated)" : ""}`)
