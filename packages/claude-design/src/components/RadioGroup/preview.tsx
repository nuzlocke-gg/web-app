import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"

export default function Demo() {
  return (
    <div className="flex flex-col gap-2">
      <p id="rg-difficulty" className="text-sm font-medium">
        Difficulty
      </p>
      <RadioGroup
        aria-labelledby="rg-difficulty"
        defaultValue="standard"
        className="w-fit"
      >
        <Label>
          <RadioGroupItem value="standard" />
          Standard
        </Label>
        <Label>
          <RadioGroupItem value="hardcore" />
          Hardcore (level caps, no items)
        </Label>
        <Label>
          <RadioGroupItem value="kaizo" disabled />
          Kaizo (needs a ROM hack)
        </Label>
      </RadioGroup>
    </div>
  )
}
