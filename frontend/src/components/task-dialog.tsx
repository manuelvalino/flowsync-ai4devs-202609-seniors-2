import { useEffect, useRef, useState } from 'react'
import { AlertCircleIcon, AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, getTask, updateTask } from '@/lib/api'
import type { Task } from '@/lib/types'

/** Espera sin cambios antes de guardar: evita una petición por pulsación. */
const SAVE_DELAY_MS = 500

const INVALID_DATE = 'La fecha está incompleta o no existe.'

const messageOf = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

type TaskDialogProps = {
  taskId: number
  /** Título que ya conoce la lista, para no esperar a la carga. */
  title: string
  onClose: () => void
  onTaskChange: (task: Task) => void
}

/**
 * La tarea abierta: solo su fecha de vencimiento y la señal de vencida.
 * Si está vencida lo decide siempre el backend (`isOverdue`).
 */
export function TaskDialog({
  taskId,
  title,
  onClose,
  onTaskChange,
}: TaskDialogProps) {
  const { token } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  // La última versión guardada, para volver a ella si un guardado falla.
  const savedRef = useRef<Task | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Solo la respuesta de la última petición actualiza la pantalla.
  const requestRef = useRef(0)
  // Quien abrió la tarea (el título de la fila). Radix devuelve el foco a su
  // `DialogTrigger`, y aquí no lo hay: el diálogo se abre desde cada fila.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )

  useEffect(() => {
    if (!token) return

    let ignore = false
    getTask(token, taskId)
      .then((data) => {
        if (ignore) return
        savedRef.current = data
        setTask(data)
        setInputValue(data.dueDate ?? '')
      })
      .catch((error: unknown) => {
        if (!ignore) setLoadError(messageOf(error))
      })

    return () => {
      ignore = true
    }
  }, [token, taskId])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const cancelPending = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const save = async (dueDate: string | null) => {
    if (!token) return

    const request = ++requestRef.current
    setSaveError(null)
    setFieldError(null)

    try {
      const updated = await updateTask(token, taskId, { dueDate })
      onTaskChange(updated)
      if (request !== requestRef.current) return
      savedRef.current = updated
      setTask(updated)
      setInputValue(updated.dueDate ?? '')
    } catch (error) {
      if (request !== requestRef.current) return
      setInputValue(savedRef.current?.dueDate ?? '')
      const dueDateError =
        error instanceof ApiError ? error.fieldErrors.dueDate : undefined
      if (dueDateError) setFieldError(dueDateError)
      else setSaveError(messageOf(error))
    }
  }

  // Guarda lo que haya en el campo, si es una fecha completa y distinta de la
  // guardada. `min`/`max` hacen que un año a medio teclear (0202…) no sea
  // válido, y `badInput` cubre las fechas a medias o imposibles.
  const commit = () => {
    cancelPending()
    const input = inputRef.current
    if (!input || !savedRef.current) return

    if (!input.validity.valid) {
      setFieldError(INVALID_DATE)
      return
    }

    const dueDate = input.value || null
    if (dueDate === savedRef.current.dueDate) return
    void save(dueDate)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
    setFieldError(null)
    cancelPending()
    timerRef.current = setTimeout(commit, SAVE_DELAY_MS)
  }

  const handleRemove = () => {
    cancelPending()
    setInputValue('')
    void save(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (open) return
    // Cerrar no pierde el cambio pendiente.
    commit()
    onClose()
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      {/* Sin descripción a propósito: a una tarea sin fecha no se le sugiere
          ponerle una, tampoco al lector de pantalla. */}
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          opener?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="break-words">
            {task?.title ?? title}
          </DialogTitle>
        </DialogHeader>

        {loadError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : task === null ? (
          <div
            className="flex justify-center py-6"
            role="status"
            aria-live="polite"
          >
            <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
            <span className="sr-only">Cargando tarea…</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {saveError && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="due-date">Fecha de vencimiento</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="due-date"
                  type="date"
                  min="1000-01-01"
                  max="9999-12-31"
                  value={inputValue}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? 'due-date-error' : undefined}
                />
                {task.dueDate && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemove}
                  >
                    Quitar fecha
                  </Button>
                )}
              </div>
              <FieldError
                id="due-date-error"
                message={fieldError ?? undefined}
              />
            </div>

            {/* Siempre montado para que el lector de pantalla anuncie el cambio. */}
            <div role="status" aria-live="polite">
              {task.isOverdue && (
                <p className="text-destructive flex items-center gap-2 text-sm font-medium">
                  <AlertTriangleIcon className="size-4" aria-hidden="true" />
                  Vencida
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
