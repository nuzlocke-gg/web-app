"use client"

import { type FormRef, type LoadedMap } from "@workspace/game-data"
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import type { ReactNode } from "react"

import { Sprite } from "@/components/sprite"

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

type ChoiceGridProps = {
  map: LoadedMap
  choices: SpeciesChoice[]
  /** The Species and Form shown as pressed, for a pick that a button saves. */
  picked?: FormRef | null
  onPick: (choice: SpeciesChoice) => void
}

/** Species in two columns, each a button with its sprite and name. */
export function ChoiceGrid({ map, choices, picked, onPick }: ChoiceGridProps) {
  return (
    <ItemGroup className="grid grid-cols-2 gap-1.5">
      {choices.map((choice) => (
        <div key={`${choice.met.species}/${choice.met.form}`} role="listitem">
          <Item
            variant="muted"
            size="xs"
            render={
              <button
                type="button"
                className="min-h-11 text-left aria-pressed:bg-primary/12 aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-inset"
                aria-pressed={
                  picked === undefined
                    ? undefined
                    : picked?.species === choice.met.species &&
                      picked.form === choice.met.form
                }
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
            </ItemContent>
          </Item>
        </div>
      ))}
    </ItemGroup>
  )
}
