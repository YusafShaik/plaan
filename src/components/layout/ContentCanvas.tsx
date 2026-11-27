import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ContentCanvasProps {
  children: ReactNode
  className?: string
  /**
   * Mercury-style centered column. Default 1120px leaves clear side gutters
   * on wide monitors while still fitting ERP tables.
   */
  maxWidth?: number | string
}

/** Centered main content column with left/right breathing room. */
export function ContentCanvas({
  children,
  className,
  maxWidth = 'var(--content-max)',
}: ContentCanvasProps) {
  const width =
    typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth

  return (
    <div
      className={cn('mx-auto w-full', className)}
      style={{ maxWidth: width }}
    >
      {children}
    </div>
  )
}
