import { useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Toaster, toast } from "@workspace/ui/components/toast"

export default function Demo() {
  useEffect(() => {
    toast.add({
      title: "Encounter saved",
      description: "Route 3: Jigglypuff, level 11.",
      type: "success",
      timeout: 0,
      actionProps: { children: "Undo" },
    })
  }, [])

  return (
    <Toaster>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Run synced",
            description: "Your team and routes are up to date.",
            type: "info",
          })
        }
      >
        Show toast
      </Button>
    </Toaster>
  )
}
