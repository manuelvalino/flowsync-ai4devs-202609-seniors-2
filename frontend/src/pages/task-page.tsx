import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task } from '@/lib/types'

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

export function TaskPage() {
  const { token } = useAuth()
  const { id = '' } = useParams()
  // `null` mientras llega la respuesta.
  const [task, setTask] = useState<Task | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Valor del campo de fecha: puede ir por delante de la fecha guardada mientras se escribe.
  const [draft, setDraft] = useState('')
  const [isSaving, setSaving] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .getTask(token, id)
      .then((loaded) => {
        if (cancelled) return
        setTask(loaded)
        setDraft(loaded.dueDate ?? '')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError(errorMessage(error))
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, id])

  const save = async (current: Task, dueDate: string | null) => {
    if (!token) return

    setSaving(true)
    setDateError(null)
    setActionError(null)

    try {
      const updated = await api.updateTaskDueDate(token, current.id, dueDate)
      setTask(updated)
      setDraft(updated.dueDate ?? '')
    } catch (error) {
      // Lo mostrado vuelve a la fecha guardada.
      setDraft(current.dueDate ?? '')
      if (error instanceof ApiError && error.fieldErrors.dueDate) {
        setDateError(error.fieldErrors.dueDate)
      } else {
        setActionError(errorMessage(error))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDateChange = (value: string) => {
    if (!task) return
    setDraft(value)
    // Un campo incompleto entrega cadena vacía: no se guarda nada, para que una
    // fecha a medias nunca borre la guardada. Quitarla es la acción explícita.
    if (value === '' || value === task.dueDate) return
    void save(task, value)
  }

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">FlowSync</h1>
          <Link
            to="/tasks"
            className="text-muted-foreground hover:text-foreground text-sm font-medium underline"
          >
            Volver a las tareas
          </Link>
        </header>

        {notFound ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>No se encontró la tarea.</AlertDescription>
          </Alert>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : task === null ? (
          <p className="text-muted-foreground text-sm" role="status">
            Cargando tarea…
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{task.title}</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4">
              {task.isOverdue && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>Vencida</AlertDescription>
                </Alert>
              )}

              {actionError && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Fecha de vencimiento</Label>
                <div className="flex gap-2">
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={draft}
                    disabled={isSaving}
                    onChange={(event) => handleDateChange(event.target.value)}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? 'dueDate-error' : undefined}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving || task.dueDate === null}
                    onClick={() => void save(task, null)}
                  >
                    Quitar fecha
                  </Button>
                </div>
                <FieldError
                  id="dueDate-error"
                  message={dateError ?? undefined}
                />
                {task.dueDate === null && (
                  <p className="text-muted-foreground text-sm">Sin fecha.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
