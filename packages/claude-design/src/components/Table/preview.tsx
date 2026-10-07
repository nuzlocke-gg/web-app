import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@workspace/ui/components/table"

const encounters = [
  { route: "Route 101", pokemon: "Zigzagoon", level: 3, status: "Caught" },
  { route: "Route 102", pokemon: "Ralts", level: 4, status: "Caught" },
  { route: "Route 103", pokemon: "Wingull", level: 5, status: "Fainted" },
]

export default function Demo() {
  return (
    <Table>
      <TableCaption>Encounters on the Emerald run.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Route</TableHead>
          <TableHead>Pokémon</TableHead>
          <TableHead className="text-right">Level</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {encounters.map((e) => (
          <TableRow key={e.route}>
            <TableCell className="font-medium">{e.route}</TableCell>
            <TableCell>{e.pokemon}</TableCell>
            <TableCell className="text-right tabular-nums">{e.level}</TableCell>
            <TableCell className="text-right">
              <Badge
                variant={e.status === "Fainted" ? "destructive" : "secondary"}
              >
                {e.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
