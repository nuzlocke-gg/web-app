import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { FunnelIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="flex justify-center">
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="outline" />}>
          <FunnelIcon data-icon="inline-start" />
          Filter routes
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Filter routes</PopoverTitle>
            <PopoverDescription>
              Show only routes that match.
            </PopoverDescription>
          </PopoverHeader>
          <Input placeholder="Route name" aria-label="Route name" />
          <Button size="sm">Apply filter</Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
