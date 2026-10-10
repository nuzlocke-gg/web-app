import {
  spriteUrl,
  unknownSpriteUrl,
  type FormId,
  type LoadedMap,
  type SpeciesId,
} from "@workspace/game-data"

import { speciesName, UNKNOWN_SPECIES } from "./species-name"
import { SpriteImage } from "./sprite-image"

/**
 * The sprite sizes the screens use, in px: 20 chip, 28 small row, 32 pill,
 * 36 list row, 48 peek, 64 Pokémon header.
 */
export type SpriteSize = 20 | 28 | 32 | 36 | 48 | 64

/** Props of `Sprite`. */
export interface SpriteProps {
  /** The Map of the Run, which names the Species and has its sprites. */
  map: LoadedMap
  species: SpeciesId
  form: FormId
  /** The box's width and height in px. The sprite spills a little past it. */
  size: SpriteSize
  /** Joins the box's classes, for example `opacity-50` for a dead Pokémon. */
  className?: string
}

/**
 * A Species and Form's sprite, labelled with the Species name. An unknown
 * Species or Form shows the unknown sprite, labelled "Unknown Pokémon"; a
 * sprite that fails to load shows the unknown sprite too.
 *
 * It sends only the sprite's URLs and label to the browser, never the Map.
 *
 * @example
 * <Sprite map={map} species={pokemon.species} form={pokemon.form} size={36} />
 */
export function Sprite({ map, species, form, size, className }: SpriteProps) {
  const src = spriteUrl(map, species, form)
  const label = src ? speciesName(map, species) : UNKNOWN_SPECIES

  return (
    <SpriteImage
      src={src ?? unknownSpriteUrl}
      fallbackSrc={unknownSpriteUrl}
      label={label}
      size={size}
      className={className}
    />
  )
}

/**
 * The unknown sprite, labelled "Unknown Pokémon", for an Encounter whose
 * Species the player did not see.
 */
export function UnknownSprite({
  size,
  className,
}: Pick<SpriteProps, "size" | "className">) {
  return (
    <SpriteImage
      src={unknownSpriteUrl}
      fallbackSrc={unknownSpriteUrl}
      label={UNKNOWN_SPECIES}
      size={size}
      className={className}
    />
  )
}
