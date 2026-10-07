import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { InfoIcon, SkullIcon, WarningIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <InfoIcon />
        <AlertTitle>Dupes clause is on</AlertTitle>
        <AlertDescription>
          Repeat species on a route do not count as your first encounter.
        </AlertDescription>
      </Alert>
      <Alert className="text-warning" role="status">
        <WarningIcon />
        <AlertTitle>Marshtomp is over the level cap</AlertTitle>
        <AlertDescription>
          Level cap for Gym 5 is 29. Box it or stop training.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <SkullIcon />
        <AlertTitle>Torchic fainted</AlertTitle>
        <AlertDescription>
          Move it to the graveyard to keep the run legal.
        </AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline">
            Undo
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}
