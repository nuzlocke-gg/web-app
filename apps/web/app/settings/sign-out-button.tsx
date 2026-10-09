"use client"

import { SignOutIcon } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { useFormStatus } from "react-dom"

/** The submit button of the Sign out form, busy until the redirect. */
export function SignOutButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      className="h-11 w-full"
      disabled={pending}
      aria-busy={pending}
    >
      <SignOutIcon />
      Sign out
    </Button>
  )
}
