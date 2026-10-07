import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  DotsThreeIcon,
  PencilSimpleIcon,
  ArrowsLeftRightIcon,
  TrashIcon,
} from "@phosphor-icons/react"

export default function Demo() {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <DotsThreeIcon data-icon="inline-start" />
        Pikachu
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Team member</DropdownMenuLabel>
          <DropdownMenuItem>
            <PencilSimpleIcon />
            Rename
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ArrowsLeftRightIcon />
            Move to box
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem defaultChecked>
            Show in summary
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <TrashIcon />
          Release
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
