"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useActionState, useState } from "react"

import {
  DISPLAY_NAME_MAX,
  displayNameRefusalMessages,
  parseDisplayName,
} from "@/lib/display-name"

import { changeDisplayName, type ChangeDisplayNameState } from "./actions"

// Refuses a bad name on the screen without a round trip. The server action
// parses it again, because the screen is not the authority.
async function submitDisplayName(
  previous: ChangeDisplayNameState,
  form: FormData
): Promise<ChangeDisplayNameState> {
  const name = parseDisplayName(form.get("displayName"))

  if (!name.ok) return { refusal: name.error, savedName: null }

  return changeDisplayName(previous, form)
}

/** The Display Name field of Settings, prefilled with the current name. */
export function DisplayNameForm({ displayName }: { displayName: string }) {
  // Controlled, because React resets an uncontrolled form after its action,
  // which would erase what the player typed before a refusal.
  const [name, setName] = useState(displayName)
  const [state, formAction, pending] = useActionState(submitDisplayName, {
    refusal: null,
    savedName: null,
  })
  const refusalMessage = state.refusal
    ? displayNameRefusalMessages[state.refusal]
    : null
  const showsSaved = state.savedName !== null && state.savedName === name.trim()

  return (
    <form action={formAction}>
      <Field data-invalid={refusalMessage !== null}>
        <FieldLabel htmlFor="displayName">Display name</FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id="displayName"
            name="displayName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="nickname"
            aria-invalid={refusalMessage !== null}
            aria-describedby="displayName-rule"
            // The shared Input drops to text-sm from md; an iPad is wider than
            // md and would still zoom into a smaller font.
            className="h-11 flex-1 md:text-base"
          />
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="h-11"
            disabled={pending}
            aria-busy={pending}
          >
            Save
          </Button>
        </div>
        <FieldDescription id="displayName-rule">
          The players in your runs see this name, and so does anyone who reads a
          run by its link. 1 to {DISPLAY_NAME_MAX} characters.
        </FieldDescription>
        <FieldError>{refusalMessage}</FieldError>
        <p role="status" className="text-sm text-muted-foreground empty:hidden">
          {showsSaved ? "Saved." : ""}
        </p>
      </Field>
    </form>
  )
}
