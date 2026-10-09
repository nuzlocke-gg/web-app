// The only entry the app imports. It reads the Maps that the build compiled
// into dist/; nothing here calls a data source.

import { registry } from "../dist/registry.ts"
import { createReader } from "./reader.ts"

const reader = createReader(registry)

/** Every Map, in release order, for the "Choose a map" Drawer. */
export const listMaps = reader.listMaps

/** Loads one Map, once. An unknown Map gives `undefined`. */
export const loadMap = reader.loadMap

/**
 * The URL of a Form's sprite. Every Form of a loaded Map has one; an unknown
 * Species or Form gives `undefined`.
 *
 * @example
 * const src = spriteUrl(map, pokemon.species, pokemon.form)
 */
export const spriteUrl = reader.spriteUrl

export {
  dexNumber,
  evolutionLineOf,
  formTypes,
  getForm,
  getGame,
  getSpecies,
  hasFormChoice,
  nextInLine,
  placeName,
  placesOf,
  primaryType,
  progressTotal,
  searchSpecies,
  suggestions,
  typesOf,
  type LoadedMap,
  type MapSummary,
  type PlaceRow,
  type SuggestionGroup,
} from "./reader.ts"

export type {
  CompiledMap,
  EvolutionLineId,
  Form,
  FormId,
  FormRef,
  Game,
  GameId,
  MapId,
  Method,
  MethodId,
  Origin,
  Place,
  PlaceId,
  PlaceKind,
  Species,
  SpeciesId,
  Type,
} from "./format.ts"
