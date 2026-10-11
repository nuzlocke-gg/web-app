import { CaretDownIcon, WarningIcon } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"

export default function Demo() {
  return (
    <Collapsible
      defaultOpen
      className="w-72 rounded-3xl border bg-popover p-1.5 shadow-lg"
    >
      <CollapsibleTrigger
        render={
          <Button variant="ghost" className="h-11 w-full justify-start" />
        }
      >
        <WarningIcon className="text-warning" aria-hidden />
        <span className="flex-1 text-left">2 warnings</span>
        <CaretDownIcon aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 px-3 pt-1 pb-2 text-sm">
        <p>Route 104 already has an encounter: Taillow.</p>
        <p>Shedinja has no nickname.</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
