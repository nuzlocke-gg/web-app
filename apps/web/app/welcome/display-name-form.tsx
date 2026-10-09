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

import { chooseDisplayName, type ChooseDisplayNameState } from "./actions"

// Refuses a bad name on the screen without a round trip. The server action
// parses it again, because the screen is not the authority.
async function submitDisplayName(
  previous: ChooseDisplayNameState,
  form: FormData
): Promise<ChooseDisplayNameState> {
  const name = parseDisplayName(form.get("displayName"))

  if (!name.ok) return { refusal: name.error }

  return chooseDisplayName(previous, form)
}

/** The name step's form, prefilled so Continue alone keeps the prefill. */
export function DisplayNameForm({ defaultName }: { defaultName: string }) {
  // Controlled, because React resets an uncontrolled form after its action,
  // which would erase what the player typed before a refusal.
  const [name, setName] = useState(defaultName)
  const [state, formAction, pending] = useActionState(submitDisplayName, {
    refusal: null,
  })
  const refusalMessage = state.refusal
    ? displayNameRefusalMessages[state.refusal]
    : null

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field data-invalid={refusalMessage !== null}>
        <FieldLabel htmlFor="displayName">Display name</FieldLabel>
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
          className="h-11 md:text-base"
        />
        <FieldDescription id="displayName-rule">
          1 to {DISPLAY_NAME_MAX} characters. It does not need to be unique.
        </FieldDescription>
        <FieldError>{refusalMessage}</FieldError>
      </Field>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={pending}
        aria-busy={pending}
      >
        Continue
      </Button>
    </form>
  )
}
