"use client"

import { CaretLeftIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"

/** The back control of a Drawer header, named by where it goes. */
export type Back = {
  label: string
  onClick: () => void
}

type DrawerHeaderRowProps = {
  title: string
  description: string
  back?: Back
}

/** A Drawer's title and description between a back control and Close. */
export function DrawerHeaderRow({
  title,
  description,
  back,
}: DrawerHeaderRowProps) {
  return (
    <div className="flex items-start gap-1 px-2">
      <div className="w-11 shrink-0 pt-2">
        {back ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={back.label}
            onClick={back.onClick}
          >
            <CaretLeftIcon />
          </Button>
        ) : null}
      </div>
      <DrawerHeader className="flex-1 px-0">
        <DrawerTitle>{title}</DrawerTitle>
        <DrawerDescription>{description}</DrawerDescription>
      </DrawerHeader>
      <div className="w-11 shrink-0 pt-2">
        <DrawerClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Close"
            />
          }
        >
          <XIcon />
        </DrawerClose>
      </div>
    </div>
  )
}
