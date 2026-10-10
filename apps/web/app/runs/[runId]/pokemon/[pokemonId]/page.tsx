import { PokemonScreen } from "./pokemon-screen"

// Every page that calls the Run action finishes within its deadlines
// (technical design, "Deadlines").
export const maxDuration = 9

type PokemonPageProps = {
  params: Promise<{ runId: string; pokemonId: string }>
}

export default async function PokemonPage({ params }: PokemonPageProps) {
  const { pokemonId } = await params

  return <PokemonScreen pokemonId={pokemonId} />
}
