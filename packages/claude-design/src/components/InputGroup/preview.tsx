import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="grid grid-cols-2 items-start gap-4">
      <div className="flex flex-col gap-3">
        <InputGroup>
          <InputGroupInput
            aria-label="Search routes"
            placeholder="Search routes"
          />
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput aria-label="Nickname" defaultValue="Sparky" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Clear nickname">
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <InputGroup>
        <InputGroupTextarea
          aria-label="Encounter notes"
          placeholder="Notes on this encounter"
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>0 / 280</InputGroupText>
          <InputGroupButton variant="default" className="ml-auto">
            Save note
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
