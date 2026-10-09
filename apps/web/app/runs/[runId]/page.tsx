import { getGame, loadMap, placesOf } from "@workspace/game-data"

import { loadRunCanon } from "@/lib/runs/canon"
import { viewerJourney } from "@/lib/runs/state"

import { TrackingScreen } from "./tracking-screen"

// Every page that calls the Run action finishes within its deadlines
// (technical design, "Deadlines").
export const maxDuration = 9

type RunPageProps = { params: Promise<{ runId: string }> }

export default async function RunPage({ params }: RunPageProps) {
  const { runId } = await params
  const canon = await loadRunCanon(runId)

  // The layout shows the private page.
  if (!canon) return null

  const gameId = viewerJourney(canon.value).gameId
  const map = await loadMap(canon.value.mapId)
  const starter = map
    ? placesOf(map, gameId).find((place) => place.kind === "starter")
    : undefined

  return (
    <TrackingScreen
      gameName={(map && getGame(map, gameId)?.name) ?? "Unknown game"}
      starterName={starter?.name ?? "Unknown location"}
    />
  )
}
