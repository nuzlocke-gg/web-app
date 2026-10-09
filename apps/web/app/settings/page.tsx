import { CaretLeftIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import { RightsLine } from "@/components/rights-line"
import { requirePlayer } from "@/lib/actor"

import { signOutPlayer } from "./actions"
import { DisplayNameForm } from "./display-name-form"
import { SignOutButton } from "./sign-out-button"
import { ThemeToggle } from "./theme-toggle"

export default async function SettingsPage() {
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
        <h1 className="pl-1 text-base font-medium">Settings</h1>
      </header>

      <main className="flex flex-col gap-7 px-4 pt-2 pb-10">
        <DisplayNameForm displayName={player.displayName} />

        <section className="flex flex-col gap-3" aria-labelledby="email-label">
          <h2 id="email-label" className="text-sm font-medium">
            Google account
          </h2>
          <p className="flex min-h-11 items-center gap-3 rounded-3xl bg-muted/60 px-4 py-2">
            <EnvelopeSimpleIcon
              aria-hidden
              className="shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 truncate">{player.email}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Only you see this. It tells you which account you are signed in
            with.
          </p>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="theme-label">
          <h2 id="theme-label" className="text-sm font-medium">
            Theme
          </h2>
          <ThemeToggle labelledBy="theme-label" />
        </section>

        <form action={signOutPlayer}>
          <SignOutButton />
        </form>

        <footer className="border-t pt-6">
          <RightsLine />
        </footer>
      </main>
    </div>
  )
}
