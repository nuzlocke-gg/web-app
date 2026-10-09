import {
  getSpecies,
  spriteUrl,
  type FormId,
  type LoadedMap,
  type SpeciesId,
} from "@workspace/game-data"
import { Avatar, AvatarImage } from "@workspace/ui/components/avatar"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The circle sizes the screens use, in px: 20 chip, 28 small row, 32 pill,
 * 36 list row, 48 peek, 64 Pokémon header.
 */
export type SpriteSize = 20 | 28 | 32 | 36 | 48 | 64

/** Props of `Sprite`. */
export interface SpriteProps {
  /** The Map of the Run, which names the Species and has its sprites. */
  map: LoadedMap
  species: SpeciesId
  form: FormId
  /** The circle's diameter in px. */
  size: SpriteSize
  /** Joins the circle's classes, for example `opacity-50` for a dead Pokémon. */
  className?: string
}

// A 96 px sprite fills about the middle two thirds of its frame. Drawn a
// third larger than the circle, the circle crops the empty margin.
const CROP = 4 / 3

// From 48 px the image is drawn at 1× or more on a 2× screen, where hard
// pixel edges look right. Smaller sizes shrink the sprite, and
// nearest-neighbour shrinking breaks its outlines.
const PIXELATED_FROM = 48

/**
 * A Species and Form's sprite in a circle, labelled with the Species name.
 * An unknown Species or Form, or a sprite that fails to load, shows the
 * empty circle; an unknown one is labelled "Unknown Pokémon".
 *
 * @example
 * <Sprite map={map} species={pokemon.species} form={pokemon.form} size={36} />
 */
export function Sprite({ map, species, form, size, className }: SpriteProps) {
  const src = spriteUrl(map, species, form)
  const label = src ? getSpecies(map, species)!.name : "Unknown Pokémon"
  const drawn = Math.round(size * CROP)

  return (
    <Avatar
      role="img"
      aria-label={label}
      className={cn(
        "items-center justify-center overflow-hidden bg-background",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src && (
        // `keepMounted` puts the <img> in the server HTML, so the browser
        // fetches it before hydration. The label is on the circle, so the
        // image has an empty alt, and a failed load hides it: never letters.
        <AvatarImage
          keepMounted
          src={src}
          alt=""
          loading="lazy"
          width={drawn}
          height={drawn}
          className={cn(
            "max-w-none shrink-0 rounded-none data-error:hidden",
            drawn >= PIXELATED_FROM && "[image-rendering:pixelated]"
          )}
          style={{ width: drawn, height: drawn }}
        />
      )}
    </Avatar>
  )
}
