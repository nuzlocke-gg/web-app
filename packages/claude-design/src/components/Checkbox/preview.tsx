import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"

export default function Demo() {
  return (
    <div className="grid max-w-md grid-cols-2 gap-x-8 gap-y-4">
      <Label>
        <Checkbox defaultChecked />
        Dupes clause
      </Label>
      <Label>
        <Checkbox />
        Shiny clause
      </Label>
      <Label>
        <Checkbox defaultChecked disabled />
        First encounter only
      </Label>
      <Label>
        <Checkbox aria-invalid />
        Accept run rules
      </Label>
    </div>
  )
}
