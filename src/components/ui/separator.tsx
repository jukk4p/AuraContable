"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & { asChild?: boolean, children?: React.ReactNode }
>(
  (
    { className, orientation = "horizontal", decorative = true, asChild, children, ...props },
    ref
  ) => {
    if (children) {
      return (
        <div
          className={cn(
            "flex items-center",
            orientation === "horizontal" ? "flex-row" : "flex-col",
            className
          )}
        >
          <SeparatorPrimitive.Root
            ref={ref}
            decorative={decorative}
            orientation={orientation}
            className={cn(
              "shrink-0 bg-border flex-1",
              orientation === "horizontal" ? "h-[1px]" : "w-[1px]",
            )}
            {...props}
          />
          {children}
          <SeparatorPrimitive.Root
            ref={ref}
            decorative={decorative}
            orientation={orientation}
            className={cn(
              "shrink-0 bg-border flex-1",
              orientation === "horizontal" ? "h-[1px]" : "w-[1px]",
            )}
            {...props}
          />
        </div>
      )
    }

    const Comp = asChild ? Slot : SeparatorPrimitive.Root

    return (
      <Comp
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          "shrink-0 bg-border",
          orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
          className
        )}
        {...props}
      />
    )
  }
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
