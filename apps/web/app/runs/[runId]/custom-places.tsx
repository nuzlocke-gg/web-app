"use client"

import { CaretRightIcon, DotsThreeIcon, PlusIcon } from "@phosphor-icons/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { DrawerFooter } from "@workspace/ui/components/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useId, useState } from "react"

import { useLeavePrompt } from "@/components/use-leave-prompt"
import {
  CUSTOM_PLACE_NAME_MAX,
  customPlaceNameFits,
} from "@/lib/runs/custom-place-name"
import { removeCustomPlace, renameCustomPlace } from "@/lib/runs/mutations"
import type { PlaceRef } from "@/lib/runs/place"

import { DrawerHeaderRow } from "./drawer-header-row"
import { locationNameTaken, type LocationRow } from "./encounter-list"
import { useRun, useRunChange } from "./run-root"

/**
 * Why a trimmed name cannot name a Custom location, as the screen says it,
 * or null when it can. An empty name has no message; the screen only
 * disables its button.
 * @param except The Custom location being renamed, which may keep its name.
 */
export function customNameProblem(
  locations: LocationRow[],
  name: string,
  except?: PlaceRef
): string | null {
  if (!customPlaceNameFits(name)) {
    return `Use ${CUSTOM_PLACE_NAME_MAX} characters or fewer.`
  }

  if (locationNameTaken(locations, name, except)) {
    return `There is already a location named “${name}”.`
  }

  return null
}

type AddCustomPlaceFieldProps = {
  locations: LocationRow[]
  onAdd: (name: string) => void
}

/** "Not listed? Add a custom location": a name and "Add location". */
export function AddCustomPlaceField({
  locations,
  onAdd,
}: AddCustomPlaceFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState("")
  const name = draft.trim()
  const problem = customNameProblem(locations, name)
  const blocked = name === "" || problem !== null

  return (
    <form
      className="mt-3 border-t pt-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!blocked) onAdd(name)
      }}
    >
      <Field data-invalid={problem !== null || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>
          Not listed? Add a custom location
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id={`${id}-name`}
            className="h-11 flex-1 text-base"
            placeholder="Name, such as Link trade"
            autoComplete="off"
            value={draft}
            aria-invalid={problem !== null || undefined}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-11"
            disabled={blocked}
          >
            Add location
          </Button>
        </div>
        {problem ? (
          <FieldError>{problem}</FieldError>
        ) : (
          <FieldDescription>
            For a trade, an event or a gift. It has no encounter table and does
            not count in Progress.
          </FieldDescription>
        )}
      </Field>
    </form>
  )
}

/** The search offer to add the search term as a Custom location. */
export function AddFromSearch({
  name,
  onAdd,
}: {
  /** The trimmed search term. */
  name: string
  onAdd: (name: string) => void
}) {
  return (
    <button
      type="button"
      className="mt-3 flex min-h-13 w-full items-center gap-2.5 rounded-2xl border border-dashed border-primary/55 py-2 pr-2.5 pl-3.5 text-left hover:bg-muted"
      onClick={() => onAdd(name)}
    >
      <PlusIcon aria-hidden className="shrink-0 text-primary" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-primary">Add “{name}”</span>
        <span className="text-xs text-muted-foreground">
          New custom location. All journeys share it.
        </span>
      </span>
      <CaretRightIcon aria-hidden className="shrink-0 text-muted-foreground" />
    </button>
  )
}

/**
 * The "…" menu of a Custom location in the Add a location Drawer: Rename,
 * and Remove behind a confirmation. Remove is refused while the location has
 * Encounters, and the refusal says so.
 */
export function CustomPlaceMenu({
  location,
  onRename,
}: {
  location: LocationRow
  onRename: () => void
}) {
  const { value: run } = useRun()
  const change = useRunChange()
  const [removing, setRemoving] = useState(false)

  function remove() {
    change(
      removeCustomPlace({ runId: run.id, customPlaceId: location.place.id }),
      "Location removal"
    )
    setRemoving(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={`More for ${location.name}`}
            />
          }
        >
          <DotsThreeIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          <DropdownMenuItem className="min-h-11" onClick={onRename}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11"
            onClick={() => setRemoving(true)}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{location.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves the list for every player of the run. A location with
              encounters cannot be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg" className="h-11">
              Keep location
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              className="h-11"
              onClick={remove}
            >
              Remove location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type RenameCustomPlaceStepProps = {
  location: LocationRow
  locations: LocationRow[]
  open: boolean
  onBack: () => void
}

/** The Drawer step that renames a Custom location, also one with Encounters. */
export function RenameCustomPlaceStep({
  location,
  locations,
  open,
  onBack,
}: RenameCustomPlaceStepProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const id = useId()
  const [draft, setDraft] = useState(location.name)
  const name = draft.trim()
  const problem = customNameProblem(locations, name, location.place)
  const blocked = name === "" || problem !== null

  useLeavePrompt(open && name !== location.name)

  function save() {
    change(
      renameCustomPlace({
        runId: run.id,
        customPlaceId: location.place.id,
        name,
      }),
      "Rename"
    )
    onBack()
  }

  return (
    <>
      <DrawerHeaderRow
        title="Rename location"
        description={location.name}
        back={{ label: "Back to locations", onClick: onBack }}
      />
      <form
        className="flex flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          if (!blocked) save()
        }}
      >
        <div className="px-4 pt-3 pb-2">
          <Field data-invalid={problem !== null || undefined}>
            <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
            <Input
              id={`${id}-name`}
              className="h-11 text-base"
              autoComplete="off"
              value={draft}
              aria-invalid={problem !== null || undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
            {problem ? <FieldError>{problem}</FieldError> : null}
          </Field>
        </div>
        <DrawerFooter className="pt-3">
          <Button type="submit" size="lg" className="h-11" disabled={blocked}>
            Save name
          </Button>
        </DrawerFooter>
      </form>
    </>
  )
}
