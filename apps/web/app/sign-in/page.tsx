import { GoogleLogoIcon } from "@phosphor-icons/react/ssr"
import { Button } from "@workspace/ui/components/button"
import { redirect } from "next/navigation"

import { RightsLine } from "@/components/rights-line"
import { readAccount } from "@/lib/actor"
import { signIn } from "@/lib/auth"

async function signInWithGoogle() {
  "use server"

  await signIn("google", { redirectTo: "/" })
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  if (await readAccount()) redirect("/")

  const { error } = await searchParams

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">nuzlocke.gg</h1>
        <p className="text-muted-foreground">
          Track your runs, alone or as a Soul Link with friends.
        </p>
      </div>

      <form action={signInWithGoogle} className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="h-11 w-full">
          <GoogleLogoIcon />
          Sign in with Google
        </Button>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            Sign-in did not work. Try again.
          </p>
        )}
      </form>

      <RightsLine />
    </main>
  )
}
