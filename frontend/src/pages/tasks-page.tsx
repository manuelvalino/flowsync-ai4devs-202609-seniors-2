import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
} from '@/lib/types'

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

export function TasksPage() {
  const { token } = useAuth()
  // `null` mientras llega la primera respuesta.
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isCreating, setCreating] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  // Último fallo de una acción (crear o cambiar estado); cualquier acción nueva lo borra.
  const [actionError, setActionError] = useState<string | null>(null)
  // Tareas con un cambio de estado en curso: sus botones no admiten otro cambio.
  const [savingIds, setSavingIds] = useState<ReadonlySet<number>>(new Set())

  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .listTasks(token)
      .then((list) => {
        // Si ya hay lista (p. ej. tras crear una tarea antes de que llegase), manda la más reciente.
        if (!cancelled) setTasks((current) => current ?? list)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return

    setCreating(true)
    setTitleError(null)
    setActionError(null)

    try {
      const task = await api.createTask(token, title)
      if (tasks === null) {
        // La lista inicial no llegó: se pide entera para no mostrar solo la tarea nueva.
        setTasks(await api.listTasks(token))
        setLoadError(null)
      } else {
        setTasks([...tasks, task])
      }
      setTitle('')
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.title) {
        setTitleError(error.fieldErrors.title)
      } else {
        setActionError(errorMessage(error))
      }
    } finally {
      setCreating(false)
    }
  }

  const handleStatus = async (task: Task, status: TaskStatus) => {
    if (!token || status === task.status || savingIds.has(task.id)) return

    setActionError(null)
    setSavingIds((current) => new Set(current).add(task.id))

    try {
      const updated = await api.updateTaskStatus(token, task.id, status)
      setTasks((current) =>
        (current ?? []).map((item) =>
          item.id === updated.id ? updated : item,
        ),
      )
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setSavingIds((current) => {
        const next = new Set(current)
        next.delete(task.id)
        return next
      })
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">FlowSync</h1>
          <Link
            to="/profile"
            className="text-muted-foreground hover:text-foreground text-sm font-medium underline"
          >
            Perfil
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Tareas del equipo</CardTitle>
            <CardDescription>
              Una sola lista para todos: quién lleva cada tarea y en qué estado
              está.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <form onSubmit={handleCreate} className="grid gap-2" noValidate>
              <Label htmlFor="title">Nueva tarea</Label>
              <div className="flex gap-2">
                <Input
                  id="title"
                  name="title"
                  placeholder="¿En qué vas a trabajar?"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? 'title-error' : undefined}
                />
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creando…' : 'Crear tarea'}
                </Button>
              </div>
              <FieldError id="title-error" message={titleError ?? undefined} />
            </form>

            {(actionError || loadError) && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{actionError ?? loadError}</AlertDescription>
              </Alert>
            )}

            {tasks === null ? (
              !loadError && (
                <p className="text-muted-foreground text-sm" role="status">
                  Cargando tareas…
                </p>
              )
            ) : tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aquí aparecerán las tareas de todo el equipo, cada una con su
                responsable y su estado. Todavía no hay ninguna: crea la primera
                con el formulario de arriba.
              </p>
            ) : (
              <ul className="grid gap-3">
                {tasks.map((task) => {
                  const isSaving = savingIds.has(task.id)

                  return (
                    <li
                      key={task.id}
                      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {task.title}
                        </Link>
                        <p className="text-muted-foreground truncate text-sm">
                          {task.assignee.fullName?.trim() || 'Sin nombre'}
                        </p>
                      </div>

                      <div
                        className="flex gap-1"
                        role="group"
                        aria-label={`Estado de ${task.title}`}
                      >
                        {TASK_STATUSES.map((status) => (
                          <Button
                            key={status}
                            type="button"
                            size="sm"
                            variant={
                              status === task.status ? 'default' : 'outline'
                            }
                            aria-pressed={status === task.status}
                            disabled={isSaving}
                            onClick={() => handleStatus(task, status)}
                          >
                            {TASK_STATUS_LABELS[status]}
                          </Button>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
