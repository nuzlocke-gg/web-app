import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { FloppyDiskIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <TooltipProvider>
      <div className="flex justify-center pt-12">
        <Tooltip defaultOpen>
          <TooltipTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Save team" />
            }
          >
            <FloppyDiskIcon />
          </TooltipTrigger>
          <TooltipContent>
            Save team <Kbd>⌘S</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
