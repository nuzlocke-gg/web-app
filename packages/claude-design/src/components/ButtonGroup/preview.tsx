import { Button } from "@workspace/ui/components/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@workspace/ui/components/button-group"
import { Input } from "@workspace/ui/components/input"
import { CaretDownIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonGroup aria-label="Team view">
        <Button variant="outline">Party</Button>
        <Button variant="outline">Box</Button>
        <Button variant="outline">Graveyard</Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button variant="secondary">Log encounter</Button>
        <ButtonGroupSeparator />
        <Button
          variant="secondary"
          size="icon"
          aria-label="More encounter actions"
        >
          <CaretDownIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <ButtonGroupText>Level cap</ButtonGroupText>
        <Input aria-label="Level cap" defaultValue="14" className="w-16" />
        <Button>Save</Button>
      </ButtonGroup>
    </div>
  )
}
