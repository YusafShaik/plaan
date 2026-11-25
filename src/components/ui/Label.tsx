import { type LabelHTMLAttributes } from 'react'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ className = '', children, required, ...props }: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-foreground mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  )
}
