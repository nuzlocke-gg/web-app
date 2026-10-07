import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { SkullIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Mark as fainted
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <SkullIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Mark Charmander as fainted?</AlertDialogTitle>
          <AlertDialogDescription>
            It moves to the graveyard and can't be used again in this run.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep in team</AlertDialogCancel>
          <AlertDialogAction variant="destructive">
            Mark as fainted
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
