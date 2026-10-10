"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"
import type { OperationFailure } from "headcanon/react"
import { useId, useState } from "react"

import {
  houseRulesOf,
  houseRulesRefusal,
  houseRulesRefusalMessages,
} from "@/lib/runs/house-rules"
import type { RunState } from "@/lib/runs/state"

import { useSetHouseRules } from "./use-set-house-rules"

type HouseRulesFailure = OperationFailure<never>

/** What the field says when Save ends without saving. */
function failureMessage(failure: HouseRulesFailure): string | null {
  switch (failure.kind) {
    case "stale-client":
      return "Your app is out of date. Refresh the page, then save again."
    case "refused":
    case "denied":
    case "undeliverable":
      return "The house rules were not saved. Save them again."
    // The "Not saved yet" box explains these.
    case "unconfirmed":
    case "pending-submission":
    case "no-submission":
      return null
  }
}

/**
 * The House rules field of a Run: the text the player is typing over the
 * Run's saved text, and its Save. Pass it to {@link HouseRulesField}; the
 * screen reads `dirty` to ask before the player leaves.
 */
export function useHouseRules(run: RunState) {
  const [draft, setDraft] = useState<string | null>(null)
  const [failure, setFailure] = useState<HouseRulesFailure | null>(null)
  const saving = useSetHouseRules({
    scope: run.viewerId,
    onSettled: (answer) => {
      if (answer.ok) setDraft(null)
      else setFailure(answer.error)
    },
  })

  // While a save is held (sending, or not yet confirmed), the field shows
  // what was sent and is locked until the server answers: Try again resends
  // exactly that.
  const held = saving.pending?.args.houseRules
  const locked = held !== undefined
  const text = locked ? (held ?? "") : (draft ?? run.houseRules ?? "")
  const toSave = houseRulesOf(text)
  // Text already sent is not a draft: leaving does not stop its save.
  const dirty = !locked && draft !== null && toSave !== run.houseRules

  async function save() {
    setFailure(null)

    const outcome = await saving.run({ runId: run.id, houseRules: toSave })

    if (!outcome.ok) setFailure(outcome.error)
  }

  async function retry() {
    setFailure(null)

    const outcome = await saving.retry()

    if (!outcome.ok) setFailure(outcome.error)
  }

  return {
    text,
    edit: setDraft,
    /** The field holds text that is not saved. */
    dirty,
    locked,
    sending: saving.status === "sending",
    unconfirmed: saving.status === "unconfirmed",
    failureText: failure ? failureMessage(failure) : null,
    save,
    retry,
  }
}

/** What {@link useHouseRules} returns. */
export type HouseRules = ReturnType<typeof useHouseRules>

/**
 * The House rules Textarea with Save, editable in every state of the Run.
 * Plain text, line breaks kept.
 */
export function HouseRulesField({ houseRules }: { houseRules: HouseRules }) {
  const id = useId()
  const refusal = houseRulesRefusal(houseRules.text)

  return (
    <section className="flex flex-col gap-3">
      <Field data-invalid={refusal !== null || undefined}>
        <FieldLabel htmlFor={id}>House rules</FieldLabel>
        <Textarea
          id={id}
          value={houseRules.text}
          onChange={(event) => houseRules.edit(event.target.value)}
          disabled={houseRules.locked}
          aria-invalid={refusal !== null || undefined}
          placeholder="Such as a level cap, Set mode, or no items in battle"
          rows={6}
          // The shared Textarea drops to text-sm from md; an iPad is wider
          // than md and would still zoom into a smaller font.
          className="min-h-32 text-base md:text-base"
        />
        {refusal ? (
          <FieldError>{houseRulesRefusalMessages[refusal]}</FieldError>
        ) : (
          <FieldDescription>
            Rules the app cannot check. Every player can change them.
          </FieldDescription>
        )}
      </Field>

      {houseRules.unconfirmed ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-[18px] bg-muted/60 p-3"
        >
          <p>Not saved yet. Your house rules are kept here.</p>
          <Button
            type="button"
            variant="secondary"
            className="h-11"
            onClick={houseRules.retry}
          >
            Try again
          </Button>
        </div>
      ) : null}
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {houseRules.failureText}
      </p>
      <Button
        type="button"
        size="lg"
        className="h-11 self-end"
        disabled={!houseRules.dirty || refusal !== null || houseRules.locked}
        aria-busy={houseRules.sending}
        onClick={houseRules.save}
      >
        Save
      </Button>
    </section>
  )
}
