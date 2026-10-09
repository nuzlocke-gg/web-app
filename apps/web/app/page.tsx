import { requireActor } from "@/lib/actor"

export default async function HomePage() {
  await requireActor()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-medium">Your runs</h1>
    </main>
  )
}
