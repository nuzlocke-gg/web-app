"use client"

import { loadMap, type LoadedMap } from "@workspace/game-data"
import { use } from "react"

import { useRun } from "./run-root"

/**
 * The Run's Map, loaded once in the browser and shared by every screen of the
 * Run. Suspends until it loads; the Run layout's Suspense shows the skeleton.
 * Undefined when the game data has no such Map.
 */
export function useLoadedMap(): LoadedMap | undefined {
  const { value: run } = useRun()

  return use(loadMap(run.mapId))
}
