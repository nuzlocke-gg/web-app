"use client"

import type { FormRef, LoadedMap } from "@workspace/game-data"
import { Field, FieldLabel, FieldTitle } from "@workspace/ui/components/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import { RadioGroupItem } from "@workspace/ui/components/radio-group"
import { useId, type ReactNode } from "react"

import { Sprite } from "@/components/sprite"
import { WarningMark } from "@/components/warning-alert"

import type { SpeciesChoice } from "./species-choices"

/** One titled group of Species in a Species picker. */
export function SpeciesSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-1.5 pt-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

/** A Warning under a Species of a picker, such as "Same line as Fang". */
export type SpeciesNote = {
  /** The name of the Rule it warns about. */
  rule: string
  text: string
}

type ChoiceGridProps = {
  map: LoadedMap
  choices: SpeciesChoice[]
  noteOf?: (choice: SpeciesChoice) => SpeciesNote | undefined
  onPick: (choice: SpeciesChoice) => void
}

/**
 * Species in two columns, each a button that picks it at once, with its
 * Warning note when it has one.
 */
export function ChoiceGrid({ map, choices, noteOf, onPick }: ChoiceGridProps) {
  return (
    <ItemGroup className="grid grid-cols-2 gap-1.5">
      {choices.map((choice) => {
        const note = noteOf?.(choice)

        return (
          <div key={speciesChoiceValue(choice.met)} role="listitem">
            <Item
              variant="muted"
              size="xs"
              render={
                <button
                  type="button"
                  className="min-h-11 text-left"
                  onClick={() => onPick(choice)}
                />
              }
            >
              <ItemMedia>
                <Sprite
                  map={map}
                  species={choice.met.species}
                  form={choice.met.form}
                  size={32}
                />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle>{choice.name}</ItemTitle>
                {note ? (
                  <ItemDescription className="flex items-center gap-1">
                    <span className="truncate">{note.text}</span>
                    <WarningMark rule={note.rule} />
                  </ItemDescription>
                ) : null}
              </ItemContent>
            </Item>
          </div>
        )
      })}
    </ItemGroup>
  )
}

/**
 * The value of a Species and Form as a radio of a {@link RadioGrid}.
 * @example
 * <RadioGroup value={picked && speciesChoiceValue(picked.met)} …>
 */
export function speciesChoiceValue(met: FormRef): string {
  return `${met.species}/${met.form}`
}

/**
 * Species in two columns, each a choice card with a radio. Place it inside a
 * `RadioGroup`, whose values are {@link speciesChoiceValue}; one group may
 * hold several grids.
 */
export function RadioGrid({
  map,
  choices,
}: {
  map: LoadedMap
  choices: SpeciesChoice[]
}) {
  const id = useId()

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {choices.map((choice) => {
        const value = speciesChoiceValue(choice.met)

        return (
          <FieldLabel key={value} htmlFor={`${id}-${value}`}>
            <Field
              orientation="horizontal"
              className="min-h-11 gap-2 py-1! pr-3! pl-1!"
            >
              {/* The label names the radio; the sprite would name it twice. */}
              <span aria-hidden className="contents">
                <Sprite
                  map={map}
                  species={choice.met.species}
                  form={choice.met.form}
                  size={32}
                />
              </span>
              <FieldTitle className="min-w-0 flex-1">
                <span className="truncate">{choice.name}</span>
              </FieldTitle>
              <RadioGroupItem value={value} id={`${id}-${value}`} />
            </Field>
          </FieldLabel>
        )
      })}
    </div>
  )
}
