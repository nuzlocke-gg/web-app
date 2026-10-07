import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

export default function Demo() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ta-notes">Run notes</Label>
        <Textarea id="ta-notes" placeholder="Rules, goals, house clauses" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ta-cause">Cause of faint</Label>
        <Textarea
          id="ta-cause"
          aria-invalid
          defaultValue=""
          placeholder="Required"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ta-locked">Locked note</Label>
        <Textarea
          id="ta-locked"
          disabled
          defaultValue="Run finished. Notes are read-only."
        />
      </div>
    </div>
  )
}
