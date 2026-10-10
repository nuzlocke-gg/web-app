"use client"

import { useMemo } from "react"

import type { Warning } from "@/lib/runs/rule-checks"
import { computeWarnings, gameFactsOf } from "@/lib/runs/warnings"

import { useRun } from "./run-root"
import { useLoadedMap } from "./use-map"

/**
 * The Warnings of the Run as the screens show it, canon plus pending
 * predictions, so they follow each change at once. None while the game data
 * has no Map for the Run.
 */
export function useWarnings(): Warning[] {
  const { value: run } = useRun()
  const map = useLoadedMap()

  return useMemo(
    () => (map ? computeWarnings(run, gameFactsOf(map)) : []),
    [run, map]
  )
}
