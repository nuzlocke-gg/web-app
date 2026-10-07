import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <div className="flex items-center gap-3">
        <Label htmlFor="label-nickname">Nickname</Label>
        <Input id="label-nickname" placeholder="Sparky" className="w-40" />
      </div>
      <Label>
        <Checkbox defaultChecked />
        Dupes clause
      </Label>
      <div className="flex items-center gap-2">
        <Checkbox id="label-shiny" disabled />
        <Label htmlFor="label-shiny">Shiny clause</Label>
      </div>
    </div>
  )
}
