import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { ListIcon, SquaresFourIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <ToggleGroup
          variant="outline"
          spacing={0}
          defaultValue={["caught"]}
          aria-label="Encounter result"
        >
          <ToggleGroupItem value="caught">Caught</ToggleGroupItem>
          <ToggleGroupItem value="missed">Missed</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          spacing={0}
          defaultValue={["wild"]}
          aria-label="How it was obtained"
        >
          <ToggleGroupItem value="wild">Wild</ToggleGroupItem>
          <ToggleGroupItem value="gift">Gift</ToggleGroupItem>
          <ToggleGroupItem value="trade">Trade</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup defaultValue={["party"]} aria-label="Where it is">
          <ToggleGroupItem value="party">Party</ToggleGroupItem>
          <ToggleGroupItem value="box">Box</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ToggleGroup
          variant="outline"
          spacing={0}
          size="sm"
          defaultValue={["list"]}
          aria-label="Layout"
        >
          <ToggleGroupItem value="list" aria-label="List">
            <ListIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid">
            <SquaresFourIcon />
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          defaultValue={["dupes", "nicknames"]}
          aria-label="Rules"
        >
          <ToggleGroupItem value="dupes">Dupes clause</ToggleGroupItem>
          <ToggleGroupItem value="nicknames">Nicknames</ToggleGroupItem>
          <ToggleGroupItem value="items">No items</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
