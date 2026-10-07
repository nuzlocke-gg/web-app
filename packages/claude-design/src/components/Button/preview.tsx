import { Button } from "@workspace/ui/components/button"
import { PlusIcon, TrashIcon, DotsThreeIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button>Start new run</Button>
        <Button variant="secondary">Save team</Button>
        <Button variant="outline">Export</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="destructive">Release</Button>
        <Button variant="link">View rules</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add encounter
        </Button>
        <Button variant="destructive" size="icon" aria-label="Delete">
          <TrashIcon />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="More">
          <DotsThreeIcon />
        </Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
  )
}
