"use client"

import { Avatar } from "@base-ui/react/avatar"
import { useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

// A 96 px sprite fills about the middle two thirds of its frame. Drawn a
// third larger than its box, the sprite fills the box and its empty margin
// spills over the box's edges.
const SCALE = 4 / 3

// From 48 px the image is drawn at 1× or more on a 2× screen, where hard
// pixel edges look right. Smaller sizes shrink the sprite, and
// nearest-neighbour shrinking breaks its outlines.
const PIXELATED_FROM = 48

/** Props of `SpriteImage`. */
export interface SpriteImageProps {
  /** The sprite to show. */
  src: string
  /** Shown instead of `src` when `src` fails to load. */
  fallbackSrc: string
  /** The accessible name of the sprite. */
  label: string
  /** The box's width and height in px. */
  size: number
  /** Joins the box's classes. */
  className?: string
}

/**
 * One sprite image in a box of `size` px, for `Sprite`. When `src` fails to
 * load, it shows `fallbackSrc`; when that fails too, the box stays empty.
 */
export function SpriteImage({
  src,
  fallbackSrc,
  label,
  size,
  className,
}: SpriteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const shown = src === failedSrc ? fallbackSrc : src
  const drawn = Math.round(size * SCALE)

  return (
    <Avatar.Root
      role="img"
      aria-label={label}
      className={cn(
        "grid shrink-0 place-content-center place-items-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* `keepMounted` puts the <img> in the server HTML, so the browser
          fetches it before hydration, and it still reports a load that
          failed before hydration. The label is on the box, so the image has
          an empty alt: a failed image never shows letters. */}
      <Avatar.Image
        keepMounted
        src={shown}
        alt=""
        loading="lazy"
        width={drawn}
        height={drawn}
        onLoadingStatusChange={(status) => {
          if (status === "error" && shown === src) setFailedSrc(src)
        }}
        className={cn(
          "max-w-none shrink-0 data-error:invisible",
          drawn >= PIXELATED_FROM && "[image-rendering:pixelated]"
        )}
        style={{ width: drawn, height: drawn }}
      />
    </Avatar.Root>
  )
}
