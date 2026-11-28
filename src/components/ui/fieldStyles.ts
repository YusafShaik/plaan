/** Shared field chrome — keep Input / Select / NativeSelect visually identical. */
export const fieldChrome =
  'rounded-md border bg-card transition-all duration-150 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground'

export const fieldChromeIdle = 'border-border hover:border-foreground/30'
export const fieldChromeError = 'border-destructive ring-1 ring-destructive'
export const fieldChromeFocus = 'border-foreground ring-1 ring-foreground'

export const controlInput =
  'h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground disabled:opacity-50 disabled:cursor-not-allowed'

export const controlSelect =
  'h-9 w-full rounded-md border border-border bg-card px-2.5 pr-8 text-sm font-medium text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed'

/** Reference / code cells — use with text-ref utility; never bold, never blue unless text-ref-link */
export const monoRef = 'text-ref text-foreground'

/** Numeric table cells — Archivo + tabular nums (no mono face) */
export const monoNum = 'text-sm font-medium text-foreground tabular-nums'
