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
  /** Aviso para la lista cuando un guardado falla con la tarea ya cerrada. */
  onSaveError: (message: string) => void
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
  onSaveError,
}: TaskDialogProps) {
  const { token } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  // La última versión que se sabe guardada en el servidor, para volver a ella
  // si un guardado falla.
  const savedRef = useRef<Task | null>(null)
  // La última fecha mandada (o la guardada, si no hay nada en vuelo): con ella
  // se decide si hace falta guardar, no con la guardada.
  const sentRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Número de la última petición lanzada, y de la última cuya respuesta
  // correcta se ha aplicado: una respuesta más antigua no pisa a una nueva.
  const requestRef = useRef(0)
  const appliedRef = useRef(0)
  // Si la última petición ya ha respondido (bien o mal).
  const latestSettledRef = useRef(true)
  // Tras cerrar, los fallos ya no se pueden enseñar aquí: los avisa la lista.
  const closedRef = useRef(false)
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

  const save = async (dueDate: string | null) => {
    if (!token) return

    const request = ++requestRef.current
    latestSettledRef.current = false
    sentRef.current = dueDate
    setSaveError(null)
    setFieldError(null)

    try {
      const updated = await updateTask(token, taskId, { dueDate })
      // Aunque ya haya otra petición en vuelo, esta fecha es la que tiene el
      // servidor ahora: si la siguiente falla, se vuelve a esta.
      if (request < appliedRef.current) return
      appliedRef.current = request
      savedRef.current = updated
      onTaskChange(updated)
      const isLatest = request === requestRef.current
      if (isLatest) latestSettledRef.current = true
      // Una respuesta superada solo se pinta si la última ya falló y la
      // pantalla volvió a una fecha que el servidor ya no tiene.
      else if (!latestSettledRef.current) return
      sentRef.current = updated.dueDate
      setTask(updated)
      // Si se ha vuelto a editar el campo mientras tanto, no se pisa lo escrito.
      if (!timerRef.current) setInputValue(updated.dueDate ?? '')
    } catch (error) {
      if (request !== requestRef.current) return
      latestSettledRef.current = true
      if (closedRef.current) {
        onSaveError(
          `No se ha guardado la fecha de «${title}». ${messageOf(error)}`,
        )
        return
      }
      const saved = savedRef.current
      sentRef.current = saved?.dueDate ?? null
      if (saved) setTask(saved)
      if (!timerRef.current) setInputValue(saved?.dueDate ?? '')
      const dueDateError =
        error instanceof ApiError ? error.fieldErrors.dueDate : undefined
      if (dueDateError) setFieldError(dueDateError)
      else setSaveError(messageOf(error))
    }
  }

  // Guarda lo que haya en el campo, si es una fecha completa y distinta de la
  // última mandada. `min`/`max` hacen que un año a medio teclear (0202…) no
  // sea válido, y `badInput` cubre las fechas a medias o imposibles.
  const commit = () => {
    cancelPending()
    const input = inputRef.current
    if (!input || !savedRef.current) return

    if (!input.validity.valid) {
      setFieldError(INVALID_DATE)
      return
    }

    const dueDate = input.value || null
    if (dueDate !== sentRef.current) void save(dueDate)
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
    // Si quedaba una fecha a medias, el valor ya era "" y React no tocaría el
    // campo: se vacía a mano. El botón desaparece, así que el foco va al campo.
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
    void save(null)
  }

  // Cerrar es inmediato. Lo pendiente se guarda si es una fecha válida (una a
  // medias se descarta y la tarea conserva la suya), y si ese guardado falla
  // después, avisa la lista.
  const handleOpenChange = (open: boolean) => {
    if (open) return
    closedRef.current = true
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
