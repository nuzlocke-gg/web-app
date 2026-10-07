import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const starters = [
  { label: "Treecko", value: "treecko" },
  { label: "Torchic", value: "torchic" },
  { label: "Mudkip", value: "mudkip" },
]

export default function Demo() {
  return (
    <div className="flex items-start gap-4">
      <Select items={starters} defaultValue="mudkip" defaultOpen modal={false}>
        <SelectTrigger className="w-48" aria-label="Starter">
          <SelectValue placeholder="Pick a starter" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectLabel>Hoenn starters</SelectLabel>
            {starters.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
            <SelectItem value="pikachu" disabled>
              Pikachu (event only)
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
