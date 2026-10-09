import { TerminalIcon } from "@phosphor-icons/react/ssr"
import { Button } from "@workspace/ui/components/button"
import { cookies, headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { isDevAuthAvailable, signInDevPlayer } from "@/lib/dev-auth"

async function devSignIn() {
  "use server"

  const cookie = await signInDevPlayer((await headers()).get("host"))

  if (!cookie) notFound()

  const cookieStore = await cookies()
  cookieStore.set(cookie.name, cookie.value, cookie.options)

  redirect("/")
}

/**
 * Signs in as the dev Player in local development, so an agent in a browser
 * can sign in without Google. Renders nothing anywhere else.
 */
export async function DevSignInButton() {
  if (!isDevAuthAvailable((await headers()).get("host"))) return null

  return (
    <form action={devSignIn}>
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        className="h-11 w-full"
      >
        <TerminalIcon />
        Dev sign in
      </Button>
    </form>
  )
}
