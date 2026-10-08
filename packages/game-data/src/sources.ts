import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { parse as parseYaml } from "yaml"
import { z } from "zod"

import {
  TYPES,
  type Correction,
  type GeneratedSpecies,
  type GeneratedWild,
  type HandMap,
  type MapId,
  type MapSources,
  type MethodList,
  type OneTimeRow,
  type ReleaseLock,
} from "./format.ts"

// Shape only. Meaning (unknown references, duplicates, play order) is the
// compile's job, so that its errors can name the entry. That is also why
// `forms` and `types` may be empty here.

const type = z.enum(TYPES)

const game = z.strictObject({
  id: z.string(),
  name: z.string(),
  monogram: z.string(),
})

const wildRow = z.strictObject({
  method: z.string(),
  species: z.string(),
  form: z.string(),
})

const sourceForm = z.strictObject({
  id: z.string(),
  name: z.string(),
  types: z.array(type),
})

const sourceSpecies = z.strictObject({
  id: z.string(),
  name: z.string(),
  dex: z.int().positive(),
  forms: z.array(sourceForm),
})

const evolutionLink = z.strictObject({ from: z.string(), to: z.string() })

const methodList: z.ZodType<MethodList> = z.array(
  z.strictObject({
    id: z.string(),
    name: z.string(),
    origin: z.enum(["wild", "gift", "trade"]),
    oneTime: z.boolean(),
  })
)

const handMap: z.ZodType<HandMap> = z.strictObject({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  generation: z.int().positive(),
  releaseOrder: z.int(),
  games: z.array(game).min(1),
  places: z.array(
    z.strictObject({
      id: z.string(),
      kind: z.enum(["starter", "standard", "event"]).optional(),
      name: z.union([z.string(), z.record(z.string(), z.string())]),
      areas: z.array(z.string()).optional(),
    })
  ),
})

const oneTimeRows: z.ZodType<OneTimeRow[]> = z.array(
  z.strictObject({
    place: z.string(),
    games: z.array(z.string()).min(1),
    method: z.string(),
    species: z.string(),
    form: z.string(),
    note: z.string().optional(),
  })
)

const corrections: z.ZodType<Correction[]> = z.array(
  z.discriminatedUnion("op", [
    z.strictObject({
      op: z.literal("remove-wild"),
      area: z.string(),
      game: z.string(),
      row: wildRow,
    }),
    z.strictObject({
      op: z.literal("add-wild"),
      area: z.string(),
      game: z.string(),
      row: wildRow,
    }),
    z.strictObject({
      op: z.literal("ignore-area"),
      area: z.string(),
      why: z.string().min(1),
    }),
    z.strictObject({
      op: z.literal("set-types"),
      species: z.string(),
      form: z.string(),
      expect: z.array(type),
      types: z.array(type),
    }),
    z.strictObject({
      op: z.literal("add-form"),
      species: z.string(),
      form: sourceForm,
    }),
    z.strictObject({ op: z.literal("add-species"), species: sourceSpecies }),
    z.strictObject({
      op: z.literal("add-evolution-link"),
      evolutionLink,
    }),
    z.strictObject({
      op: z.literal("remove-evolution-link"),
      evolutionLink,
    }),
    z.strictObject({
      op: z.literal("own-evolution-line"),
      species: z.string(),
      why: z.string().min(1),
    }),
  ])
)

const generatedWild: z.ZodType<GeneratedWild> = z.strictObject({
  importer: z.string(),
  pin: z.string(),
  areas: z.record(z.string(), z.record(z.string(), z.array(wildRow))),
})

const generatedSpecies: z.ZodType<GeneratedSpecies> = z.strictObject({
  importer: z.string(),
  pin: z.string(),
  species: z.array(sourceSpecies),
  evolutionLinks: z.array(evolutionLink),
})

const releaseLock: z.ZodType<ReleaseLock> = z.strictObject({
  map: z.string(),
  games: z.array(z.string()),
  places: z.array(z.string()),
  species: z.record(z.string(), z.int().positive()),
  forms: z.array(z.string()),
})

/** A parsed value, or the problems that name the file and the path. */
export type Parsed<T> =
  { ok: true; value: T } | { ok: false; problems: string[] }

function parseText<T>(
  schema: z.ZodType<T>,
  text: string,
  file: string
): Parsed<T> {
  let raw: unknown

  try {
    raw = file.endsWith(".json") ? JSON.parse(text) : parseYaml(text)
  } catch (error) {
    return { ok: false, problems: [`${file}: ${(error as Error).message}`] }
  }

  const result = schema.safeParse(raw)

  if (result.success) return { ok: true, value: result.data }

  const problems = result.error.issues.map((issue) => {
    return `${file}: ${formatPath(issue.path) || "(root)"}: ${issue.message}`
  })

  return { ok: false, problems }
}

/** `places[3].id` */
function formatPath(path: PropertyKey[]): string {
  return path
    .map((key, i) =>
      typeof key === "number" ? `[${key}]` : `${i > 0 ? "." : ""}${String(key)}`
    )
    .join("")
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined

    throw error
  }
}

async function listDirectory(path: string) {
  try {
    const entries = await readdir(path, { withFileTypes: true })

    return entries.sort((a, b) => (a.name < b.name ? -1 : 1))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []

    throw error
  }
}

/** The directory names under `<sourcesDir>/maps`, sorted. */
export async function listSourceMaps(sourcesDir: string): Promise<string[]> {
  const entries = await listDirectory(join(sourcesDir, "maps"))

  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

/**
 * Reads and parses every source file of one Map. `one-time.yaml`,
 * `corrections.yaml`, and `generated/` are optional. Problems name the file
 * (relative to `sourcesDir`) and the path in it.
 */
export async function readMapSources(
  sourcesDir: string,
  mapDir: string
): Promise<Parsed<MapSources>> {
  const problems: string[] = []

  async function read<T>(
    schema: z.ZodType<T>,
    file: string,
    whenMissing?: T
  ): Promise<T | undefined> {
    const text = await readOptional(join(sourcesDir, file))

    if (text === undefined) {
      if (whenMissing === undefined) problems.push(`${file}: missing`)

      return whenMissing
    }

    const parsed = parseText(schema, text, file)

    if (parsed.ok) return parsed.value

    problems.push(...parsed.problems)

    return undefined
  }

  const generatedDir = join("maps", mapDir, "generated")
  const generatedFiles = (await listDirectory(join(sourcesDir, generatedDir)))
    .filter((e) => e.isFile())
    .map((e) => e.name)
  const wildFiles = generatedFiles.filter((f) => f.endsWith(".wild.json"))
  const speciesFiles = generatedFiles.filter((f) => f.endsWith(".species.json"))

  const methods = await read(methodList, "methods.yaml")
  const map = await read(handMap, join("maps", mapDir, "map.yaml"))
  const oneTime = await read(
    oneTimeRows,
    join("maps", mapDir, "one-time.yaml"),
    []
  )
  const mapCorrections = await read(
    corrections,
    join("maps", mapDir, "corrections.yaml"),
    []
  )
  const wild = await Promise.all(
    wildFiles.map((f) => read(generatedWild, join(generatedDir, f)))
  )
  const species = await Promise.all(
    speciesFiles.map((f) => read(generatedSpecies, join(generatedDir, f)))
  )

  if (problems.length > 0) return { ok: false, problems }

  return {
    ok: true,
    value: {
      methods: methods!,
      map: map!,
      oneTime: oneTime!,
      corrections: mapCorrections!,
      generatedWild: wild as GeneratedWild[],
      generatedSpecies: species as GeneratedSpecies[],
    },
  }
}

/** The file name of a Map's release lock. */
export const lockFileName = (map: MapId) => `${map}.lock.json`

/** Reads the release lock of a Map. `undefined` when the Map has no lock. */
export async function readLock(
  releasedDir: string,
  map: MapId
): Promise<Parsed<ReleaseLock | undefined>> {
  const file = lockFileName(map)
  const text = await readOptional(join(releasedDir, file))

  if (text === undefined) return { ok: true, value: undefined }

  return parseText(releaseLock, text, file)
}

/** The Maps that have a release lock, sorted. */
export async function listLockedMaps(releasedDir: string): Promise<MapId[]> {
  const entries = await listDirectory(releasedDir)
  const suffix = lockFileName("")

  return entries
    .filter((e) => e.isFile() && e.name.endsWith(suffix))
    .map((e) => e.name.slice(0, -suffix.length))
}
