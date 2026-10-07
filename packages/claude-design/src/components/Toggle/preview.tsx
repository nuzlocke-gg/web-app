import { Toggle } from "@workspace/ui/components/toggle"
import { EyeIcon, StarIcon, SwordIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle defaultPressed aria-label="Show fainted">
        <EyeIcon data-icon="inline-start" />
        Show fainted
      </Toggle>
      <Toggle>Shiny only</Toggle>
      <Toggle variant="outline" defaultPressed aria-label="Favorite">
        <StarIcon />
      </Toggle>
      <Toggle variant="outline" size="sm">
        <SwordIcon data-icon="inline-start" />
        Battle log
      </Toggle>
      <Toggle size="lg" disabled>
        Locked
      </Toggle>
    </div>
  )
}
