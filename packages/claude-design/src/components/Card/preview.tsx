import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card"

export default function Demo() {
  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Emerald run</CardTitle>
          <CardDescription>Hard mode, level caps on</CardDescription>
          <CardAction>
            <Badge variant="secondary">Active</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          5 badges, 3 deaths, 14 Pokémon caught.
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm">Continue run</Button>
          <Button size="sm" variant="ghost">
            View rules
          </Button>
        </CardFooter>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Next gym</CardTitle>
          <CardDescription>Wattson, Mauville City</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Level cap 30. Bring a Ground type.
        </CardContent>
      </Card>
    </div>
  )
}
