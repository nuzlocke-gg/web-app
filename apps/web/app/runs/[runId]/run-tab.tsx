"use client"

import {
  createContext,
  use,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

/** A tab of the tracking screen. */
export type RunTab = "encounters" | "pokemon"

const RunTabContext = createContext<
  [RunTab, Dispatch<SetStateAction<RunTab>>] | null
>(null)

/**
 * Keeps the tracking screen's open tab for as long as the Run layout lives,
 * so that back from a Pokémon screen returns to it. A reload opens the
 * Encounters tab.
 */
export function RunTabProvider({ children }: { children: ReactNode }) {
  const tab = useState<RunTab>("encounters")

  return <RunTabContext value={tab}>{children}</RunTabContext>
}

/** The tracking screen's open tab and its setter, as `useState` gives them. */
export function useRunTab() {
  const tab = use(RunTabContext)

  if (!tab) throw new Error("useRunTab must be used inside a RunTabProvider")

  return tab
}
