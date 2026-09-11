import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-display font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 outline-none focus-visible:outline-2 focus-visible:outline-flag-yellow focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-kerb text-white hover:bg-kerb-deep",
        destructive: "bg-kerb text-white hover:bg-kerb-deep",
        outline:
          "border border-asphalt-500 bg-transparent text-chalk hover:bg-asphalt-700 hover:border-asphalt-500",
        secondary: "bg-asphalt-700 text-chalk hover:bg-asphalt-600",
        ghost: "text-chalk-dim hover:text-chalk hover:bg-asphalt-700",
        link: "text-kerb underline-offset-4 hover:underline normal-case tracking-normal font-sans font-medium",
        board: "bg-flag-yellow text-asphalt-950 hover:bg-[#ffe14d]",
      },
      size: {
        default: "h-10 px-4 text-[0.95rem]",
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-6 text-lg",
        xl: "h-14 px-8 text-xl",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
