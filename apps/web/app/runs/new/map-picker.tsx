"use client"

import type { MapSummary } from "@workspace/game-data"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { useState } from "react"

import { mapDetail, mapsByRegion } from "./map-choices"

type MapPickerProps = {
  /** Every Map, in release order. */
  maps: MapSummary[]
  value: MapSummary
  disabled: boolean
  onChange: (map: MapSummary) => void
}

/**
 * The Map row of New run and its "Choose a map" Drawer, with the Maps grouped
 * by region. The choice applies with "Use <map>".
 */
export function MapPicker({ maps, value, disabled, onChange }: MapPickerProps) {
  const [open, setOpen] = useState(false)
  const [choiceId, setChoiceId] = useState(value.id)
  const choice = maps.find((map) => map.id === choiceId) ?? value

  function openDrawer() {
    setChoiceId(value.id)
    setOpen(true)
  }

  function applyChoice() {
    onChange(choice)
    setOpen(false)
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-sm font-medium">Map</h2>
      <Item
        variant="muted"
        size="sm"
        render={
          <button
            type="button"
            onClick={openDrawer}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-label={`Map: ${value.name}, ${value.region} · Generation ${value.generation}. Change the map`}
            className="text-left disabled:opacity-50"
          />
        }
      >
        <MapMonogram map={value} />
        <ItemContent>
          <ItemTitle>{value.name}</ItemTitle>
          <ItemDescription>
            {value.region} · Generation {value.generation}
          </ItemDescription>
        </ItemContent>
        <ItemActions className="font-medium">Change</ItemActions>
      </Item>

      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle id="map-title">Choose a map</DrawerTitle>
            <DrawerDescription>
              Games that were released together share a map: the same routes and
              towns. You choose your game after this.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
            <RadioGroup
              value={choiceId}
              onValueChange={(id) => setChoiceId(id as string)}
              aria-labelledby="map-title"
              className="gap-1"
            >
              {mapsByRegion(maps).map(({ region, maps: regionMaps }) => (
                <div key={region} className="flex flex-col gap-1">
                  <h3 className="px-1 pt-3 pb-1 text-sm font-medium">
                    {region}
                  </h3>
                  {regionMaps.map((map) => (
                    <FieldLabel key={map.id} htmlFor={`map-${map.id}`}>
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>{map.name}</FieldTitle>
                          <FieldDescription>{mapDetail(map)}</FieldDescription>
                        </FieldContent>
                        <RadioGroupItem id={`map-${map.id}`} value={map.id} />
                      </Field>
                    </FieldLabel>
                  ))}
                </div>
              ))}
            </RadioGroup>
          </div>
          <DrawerFooter className="pt-3">
            <Button
              type="button"
              size="lg"
              className="h-11"
              onClick={applyChoice}
            >
              Use {choice.name}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </section>
  )
}

function MapMonogram({ map }: { map: MapSummary }) {
  return (
    <ItemMedia
      variant="image"
      aria-hidden
      className="bg-background text-xs font-medium text-muted-foreground"
    >
      {map.games.map((game) => game.monogram).join("")}
    </ItemMedia>
  )
}
