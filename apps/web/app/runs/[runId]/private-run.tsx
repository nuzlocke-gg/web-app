import { LockSimpleIcon } from "@phosphor-icons/react/ssr"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

/**
 * What anyone who is not a Player of the Run sees at its URL, signed in or
 * not, and for a Run that does not exist.
 */
export function PrivateRun() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center gap-2 px-6 pt-24 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-muted/60 text-muted-foreground"
      >
        <LockSimpleIcon className="size-6" />
      </span>
      <h1 className="mt-2 text-base font-medium">This run is private</h1>
      <p className="max-w-70 text-muted-foreground">
        Only its players can open it.
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-4 h-11 w-full max-w-70"
        )}
      >
        Go to your runs
      </Link>
    </main>
  )
}
