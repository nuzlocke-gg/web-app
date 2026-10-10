import { CaretLeftIcon } from "@phosphor-icons/react/ssr"
import { listMaps } from "@workspace/game-data"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import { requirePlayer } from "@/lib/actor"

import { NewRunForm } from "./new-run-form"

// The page calls a Run writer, which must finish within its deadlines
// (technical design, "Deadlines").
export const maxDuration = 9

export default async function NewRunPage() {
  const player = await requirePlayer()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <header className="flex items-center gap-1 px-2 pt-3 pb-2">
        <Link
          href="/"
          aria-label="Back to your runs"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-11"
          )}
        >
          <CaretLeftIcon />
        </Link>
        <h1 className="pl-1 text-base font-medium">New run</h1>
      </header>

      <NewRunForm playerId={player.id} maps={listMaps()} />
    </div>
  )
}
