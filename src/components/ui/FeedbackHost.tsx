import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import {
  subscribeConfirm,
  subscribeToasts,
  type ConfirmOptions,
  type ToastItem,
  type ToastTone,
} from '../../lib/feedback'
import { cn } from '../../lib/cn'

const toneClasses: Record<ToastTone, string> = {
  error: 'border-destructive/40 bg-card text-foreground',
  success: 'border-success/40 bg-card text-foreground',
  info: 'border-border bg-card text-foreground',
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'error') return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
  if (tone === 'success') return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
  return <Info className="h-4 w-4 text-muted-foreground shrink-0" />
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/** Global toast stack + confirmation modal replacing browser alert()/confirm(). */
export function FeedbackHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmReq, setConfirmReq] = useState<PendingConfirm | null>(null)

  useEffect(() => {
    const unsubToast = subscribeToasts((item) => {
      setToasts((prev) => [...prev.slice(-3), item])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 4500)
    })
    const unsubConfirm = subscribeConfirm((req) => {
      setConfirmReq(req)
    })
    return () => {
      unsubToast()
      unsubConfirm()
    }
  }, [])

  const closeConfirm = (result: boolean) => {
    if (!confirmReq) return
    confirmReq.resolve(result)
    setConfirmReq(null)
  }

  return (
    <>
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[300] flex w-full max-w-sm flex-col gap-2 pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((item) => (
            <div
              key={item.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm shadow-panel',
                toneClasses[item.tone]
              )}
            >
              <ToneIcon tone={item.tone} />
              <p className="flex-1 text-sm font-medium leading-5 text-foreground">
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== item.id))}
                className="rounded-md p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(confirmReq)}
        onClose={() => closeConfirm(false)}
        className="max-w-[440px]"
      >
        {confirmReq && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {confirmReq.title}
                </h2>
                {confirmReq.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {confirmReq.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => closeConfirm(false)}>
                {confirmReq.cancelLabel || 'Cancel'}
              </Button>
              <Button
                variant={confirmReq.variant === 'primary' ? 'primary' : 'destructive'}
                size="sm"
                onClick={() => closeConfirm(true)}
                autoFocus
              >
                {confirmReq.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
