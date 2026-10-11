import { listMaps } from "@workspace/game-data"

import { requirePlayer } from "@/lib/actor"

import { NewRunForm } from "./new-run-form"

// The page calls a Run writer, which must finish within its deadlines
// (technical design, "Deadlines").
export const maxDuration = 9

export default async function NewRunPage() {
  const player = await requirePlayer()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <NewRunForm playerId={player.id} maps={listMaps()} />
    </div>
  )
}
