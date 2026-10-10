import { TrackingScreen } from "./tracking-screen"

// Every page that calls the Run action finishes within its deadlines
// (technical design, "Deadlines").
export const maxDuration = 9

export default function RunPage() {
  return <TrackingScreen />
}
