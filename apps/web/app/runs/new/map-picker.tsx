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
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { cn } from "@workspace/ui/lib/utils"
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
      <button
        type="button"
        onClick={openDrawer}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={`Map: ${value.name}, ${value.region} · Generation ${value.generation}. Change the map`}
        className="flex min-h-13 w-full items-center gap-3 rounded-[18px] bg-muted/60 py-2 pr-3.5 pl-2 text-left disabled:opacity-50"
      >
        <MapMonogram map={value} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{value.name}</span>
          <span className="text-xs text-muted-foreground">
            {value.region} · Generation {value.generation}
          </span>
        </span>
        <span className="text-xs font-medium text-primary">Change</span>
      </button>

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
                    <label
                      key={map.id}
                      htmlFor={`map-${map.id}`}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 rounded-[18px] py-2 pr-3 pl-2",
                        map.id === choiceId && "bg-muted/60"
                      )}
                    >
                      <MapMonogram map={map} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium">{map.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {mapDetail(map)}
                        </span>
                      </span>
                      <RadioGroupItem id={`map-${map.id}`} value={map.id} />
                    </label>
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
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-xs font-medium text-muted-foreground ring-1 ring-foreground/8"
    >
      {map.games.map((game) => game.monogram).join("")}
    </span>
  )
}
