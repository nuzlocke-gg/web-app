import { Input } from "@workspace/ui/components/input"

export default function Demo() {
  return (
    <div className="grid max-w-xl grid-cols-2 gap-x-4 gap-y-3">
      <Input aria-label="Search Pokémon" placeholder="Search Pokémon" />
      <Input aria-label="Nickname" defaultValue="Sparky" />
      <Input aria-label="Level" type="number" defaultValue="101" aria-invalid />
      <Input aria-label="Run name" defaultValue="Emerald Kaizo" disabled />
    </div>
  )
}
