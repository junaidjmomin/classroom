import * as React from "react"
import { cn } from "@/lib/utils"

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex items-center rounded-md border border-muted bg-muted px-2.5 py-0.5 text-sm font-semibold text-muted-foreground", className)} {...props} />
  )
}
