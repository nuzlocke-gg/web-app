import { redirect } from "next/navigation"

import { requireAccount } from "@/lib/actor"

import { DisplayNameForm } from "./display-name-form"

export default async function WelcomePage() {
  const account = await requireAccount()

  if (account.displayName !== null) redirect("/")

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Choose your display name</h1>
        <p className="text-muted-foreground">
          The players in your runs see this name. If you stream, use your stream
          name. You can change it later in Settings.
        </p>
      </div>

      <DisplayNameForm defaultName={account.givenName ?? ""} />
    </main>
  )
}
