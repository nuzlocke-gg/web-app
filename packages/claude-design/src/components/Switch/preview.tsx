import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"

export default function Demo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-8">
        <Label>
          <Switch defaultChecked />
          Nicknames required
        </Label>
        <Label>
          <Switch />
          Show fainted Pokémon
        </Label>
        <Label>
          <Switch disabled />
          Sync to cloud
        </Label>
      </div>
      <Label>
        <Switch size="sm" defaultChecked />
        Compact team view (size sm)
      </Label>
    </div>
  )
}
