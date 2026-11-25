/** Shared field chrome — keep Input / Select / NativeSelect visually identical. */
export const fieldChrome =
  'rounded-md border bg-secondary transition-all duration-150 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground'

export const fieldChromeIdle = 'border-border/80 hover:border-border'
export const fieldChromeError = 'border-destructive ring-1 ring-destructive'
export const fieldChromeFocus = 'border-foreground ring-1 ring-foreground'

export const controlInput =
  'h-9 w-full rounded-md border border-border/80 bg-secondary px-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground disabled:opacity-50 disabled:cursor-not-allowed'

export const controlSelect =
  'h-9 w-full rounded-md border border-border/80 bg-secondary px-2.5 pr-8 text-xs font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed'

/** Reference / code cells — use with text-ref utility; never bold, never blue unless text-ref-link */
export const monoRef = 'text-ref text-foreground'

/** Numeric table cells */
export const monoNum = 'font-mono text-xs font-medium text-foreground tabular-nums'
