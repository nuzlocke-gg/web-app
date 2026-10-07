import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export default function Demo() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit nickname
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit nickname</DialogTitle>
          <DialogDescription>
            Give your Route 1 Pidgey a name for this run.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input id="nickname" defaultValue="Captain" />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button>Save nickname</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
