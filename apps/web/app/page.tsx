import { GearSixIcon } from "@phosphor-icons/react/ssr"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import { requireActor } from "@/lib/actor"

export default async function HomePage() {
  await requireActor()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 pt-3 pr-2 pb-1 pl-5">
        <span className="flex-1 text-base font-medium">nuzlocke.gg</span>
        <Link
          href="/settings"
          aria-label="Settings"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-11"
          )}
        >
          <GearSixIcon />
        </Link>
      </header>

      <main className="flex flex-col gap-4 px-4 pt-3 pb-10">
        <h1 className="pl-1 text-2xl font-medium">Your runs</h1>
      </main>
    </div>
  )
}
