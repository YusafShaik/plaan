export type ToastTone = 'error' | 'success' | 'info'

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'primary'
}

type ToastListener = (item: ToastItem) => void
type ConfirmListener = (req: ConfirmOptions & { resolve: (ok: boolean) => void }) => void

const toastListeners = new Set<ToastListener>()
const confirmListeners = new Set<ConfirmListener>()
let nextToastId = 1

function emitToast(tone: ToastTone, message: string) {
  const item: ToastItem = { id: nextToastId++, tone, message }
  toastListeners.forEach((fn) => fn(item))
}

export const toast = {
  error: (message: string) => emitToast('error', message),
  success: (message: string) => emitToast('success', message),
  info: (message: string) => emitToast('info', message),
}

export function confirmAction(options: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions =
    typeof options === 'string' ? { title: 'Confirm action', description: options } : options
  if (confirmListeners.size === 0) {
    return Promise.resolve(false)
  }
  return new Promise<boolean>((resolve) => {
    confirmListeners.forEach((fn) => fn({ ...normalized, resolve }))
  })
}

export function subscribeToasts(fn: ToastListener) {
  toastListeners.add(fn)
  return () => {
    toastListeners.delete(fn)
  }
}

export function subscribeConfirm(fn: ConfirmListener) {
  confirmListeners.add(fn)
  return () => {
    confirmListeners.delete(fn)
  }
}
