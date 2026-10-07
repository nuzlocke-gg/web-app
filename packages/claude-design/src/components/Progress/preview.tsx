import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@workspace/ui/components/progress"

export default function Demo() {
  return (
    <div className="grid grid-cols-2 gap-8">
      <Progress value={5} max={8}>
        <ProgressLabel>Badges earned</ProgressLabel>
        <ProgressValue>{(_, value) => `${value} of 8`}</ProgressValue>
      </Progress>
      <Progress value={62}>
        <ProgressLabel>Routes cleared</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  )
}
