"use client"

import { SlidersHorizontalIcon } from "@phosphor-icons/react"
import type { MapSummary } from "@workspace/game-data"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import type { OperationFailure } from "headcanon/react"
import { sessionStoragePersistence } from "headcanon/react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { rulesOn, rulesShown, defaultRules } from "@/lib/runs/rules"
import {
  runNameRefusal,
  runNameRefusalMessages,
  type RunNameRefusal,
} from "@/lib/runs/run-name"

import { suggestedRunName } from "./map-choices"
import { MapPicker } from "./map-picker"
import { useCreateRun } from "./use-create-run"

type NewRunFormProps = {
  playerId: string
  /** Every Map, in release order. Not empty; each Map has a Game. */
  maps: MapSummary[]
}

type CreateRunFailure = OperationFailure<"unknown-game">

/** What the screen says when "Make the run" ends without a Run. */
function failureMessage(failure: CreateRunFailure): string | null {
  switch (failure.kind) {
    case "refused":
      return "This game is not available. Choose another map."
    case "stale-client":
      return "Your app is out of date. Refresh the page, then make the run."
    case "denied":
    case "undeliverable":
      return "The run was not made. Make the run again."
    // The "Not saved yet" bar explains these.
    case "unconfirmed":
    case "pending-submission":
    case "no-submission":
      return null
  }
}

/**
 * The New run screen of a solo Run: the Map, the Name, and the Rules row, and
 * "Make the run", which opens the new Run's tracking screen.
 */
export function NewRunForm({ playerId, maps }: NewRunFormProps) {
  const router = useRouter()
  const persistence = useMemo(
    () => sessionStoragePersistence(`new-run:${playerId}`),
    [playerId]
  )
  const [failure, setFailure] = useState<CreateRunFailure | null>(null)
  const createRun = useCreateRun({
    persistence,
    // Navigates from the answer, not a server redirect, so the answer of a
    // submission the player discarded never opens its Run.
    onSettled: (answer) => {
      if (answer.ok) router.push(`/runs/${answer.value.runId}`)
      else setFailure(answer.error)
    },
  })

  const [draftMapId, setDraftMapId] = useState(maps[0]!.id)
  const [draftName, setDraftName] = useState(() =>
    suggestedRunName(maps[0]!.games[0]!.name)
  )
  const [nameRefusal, setNameRefusal] = useState<RunNameRefusal | null>(null)

  // While a submission is held (sending, or restored after a reload and not
  // yet confirmed), the form shows what was submitted and is locked until the
  // server answers: Try again sends exactly that.
  const held = createRun.pending?.args
  const mapId = held?.mapId ?? draftMapId
  const name = held?.name ?? draftName
  const map = maps.find((candidate) => candidate.id === mapId) ?? maps[0]!
  // The Game toggle comes with the first Map that has two Games.
  const game = map.games[0]!

  const shownRules = rulesShown("solo")
  const rulesOnByDefault = rulesOn("solo", defaultRules())
  const sending = createRun.status === "sending"
  const unconfirmed = createRun.status === "unconfirmed"
  const failureText = failure ? failureMessage(failure) : null

  async function makeRun() {
    const trimmed = name.trim()
    const refusal = runNameRefusal(trimmed)

    setNameRefusal(refusal)
    setFailure(null)

    if (refusal) return

    const outcome = await createRun.run({
      mapId: map.id,
      gameId: game.id,
      name: trimmed,
    })

    if (!outcome.ok) setFailure(outcome.error)
  }

  async function retry() {
    setFailure(null)

    const outcome = await createRun.retry()

    if (!outcome.ok) setFailure(outcome.error)
  }

  return (
    <form action={makeRun} className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-2 pb-6">
        <MapPicker
          maps={maps}
          value={map}
          disabled={held !== undefined}
          onChange={(nextMap) => setDraftMapId(nextMap.id)}
        />

        <Field data-invalid={nameRefusal !== null}>
          <FieldLabel htmlFor="run-name">Name</FieldLabel>
          <Input
            id="run-name"
            name="name"
            value={name}
            onChange={(event) => setDraftName(event.target.value)}
            disabled={held !== undefined}
            placeholder="Such as Emerald Hardcore"
            autoComplete="off"
            aria-invalid={nameRefusal !== null}
            // The shared Input drops to text-sm from md; an iPad is wider than
            // md and would still zoom into a smaller font.
            className="h-11 md:text-base"
          />
          <FieldError>
            {nameRefusal ? runNameRefusalMessages[nameRefusal] : null}
          </FieldError>
        </Field>

        <Field>
          <FieldLabel id="rules-label">Rules</FieldLabel>
          {/* The Rules screen opens from this row with the Rules ticket. */}
          <Item variant="muted" size="sm" aria-labelledby="rules-label">
            <ItemMedia variant="icon">
              <SlidersHorizontalIcon
                aria-hidden
                className="text-muted-foreground"
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {rulesOnByDefault.length} of {shownRules.length} rules on
              </ItemTitle>
              <ItemDescription>
                {rulesOnByDefault.map((rule) => rule.name).join(", ")}
              </ItemDescription>
            </ItemContent>
          </Item>
          <FieldDescription>
            The usual rules are on. You can change them at any time while the
            run is active.
          </FieldDescription>
        </Field>
      </main>

      <footer className="flex flex-col gap-2 px-4 pt-3 pb-6">
        {unconfirmed && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-[18px] bg-muted/60 p-3"
          >
            <p>Not saved yet. Your run is kept here.</p>
            {/* No "Start over": the held submission may have committed, and a
                new one would make a second Run. Try again resends the same
                envelope, so it returns that Run or makes it now. */}
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={retry}
            >
              Try again
            </Button>
          </div>
        )}
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {failureText}
        </p>
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={sending || unconfirmed}
          aria-busy={sending}
        >
          Make the run
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Next, you record your starter.
        </p>
      </footer>
    </form>
  )
}
