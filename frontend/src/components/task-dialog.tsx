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
  // La última fecha mandada (o la guardada, si no hay nada en vuelo): con ella
  // se decide si hace falta guardar, no con la guardada.
  const sentRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Solo la respuesta de la última petición actualiza la pantalla.
  const requestRef = useRef(0)
  // La última petición, mientras no ha respondido: cerrar espera a que acabe.
  const inFlightRef = useRef<Promise<boolean> | null>(null)
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
        sentRef.current = data.dueDate
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

  // Resuelve `true` si queda guardado. Si mientras tanto se ha vuelto a editar
  // el campo (hay una espera en marcha), la respuesta no pisa lo escrito.
  const save = (dueDate: string | null): Promise<boolean> => {
    if (!token) return Promise.resolve(false)

    const request = ++requestRef.current
    const isLatest = () => request === requestRef.current
    sentRef.current = dueDate
    setSaveError(null)
    setFieldError(null)

    const promise = updateTask(token, taskId, { dueDate }).then(
      (updated) => {
        if (!isLatest()) return true
        inFlightRef.current = null
        savedRef.current = updated
        sentRef.current = updated.dueDate
        onTaskChange(updated)
        setTask(updated)
        if (!timerRef.current) setInputValue(updated.dueDate ?? '')
        return true
      },
      (error: unknown) => {
        if (!isLatest()) return false
        inFlightRef.current = null
        const saved = savedRef.current?.dueDate ?? null
        sentRef.current = saved
        if (!timerRef.current) setInputValue(saved ?? '')
        const dueDateError =
          error instanceof ApiError ? error.fieldErrors.dueDate : undefined
        if (dueDateError) setFieldError(dueDateError)
        else setSaveError(messageOf(error))
        return false
      },
    )
    inFlightRef.current = promise
    return promise
  }

  // Guarda lo que haya en el campo, si es una fecha completa y distinta de la
  // última mandada. `min`/`max` hacen que un año a medio teclear (0202…) no
  // sea válido, y `badInput` cubre las fechas a medias o imposibles. Devuelve
  // `false` si el campo no es válido.
  const commit = () => {
    cancelPending()
    const input = inputRef.current
    if (!input || !savedRef.current) return true

    if (!input.validity.valid) {
      setFieldError(INVALID_DATE)
      return false
    }

    const dueDate = input.value || null
    if (dueDate !== sentRef.current) void save(dueDate)
    return true
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

  // Cerrar no pierde el cambio pendiente: lo guarda y espera a la respuesta.
  // Si la fecha no es válida o el guardado falla, la tarea sigue abierta con
  // la explicación a la vista, en vez de perder el cambio en silencio.
  const close = async () => {
    if (!commit()) return
    const pending = inFlightRef.current
    if (pending && !(await pending)) return
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) void close()
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
                  // Una fecha a medias en un campo vacío no cambia su valor
                  // (sigue siendo ""), así que solo salir del campo la delata.
                  onBlur={() => commit()}
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
