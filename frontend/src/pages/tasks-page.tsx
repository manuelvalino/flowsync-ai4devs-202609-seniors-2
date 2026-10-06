import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { TaskDialog } from '@/components/task-dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError, createTask, listTasks, updateTask } from '@/lib/api'
import { TASK_STATUS_LABELS, type Task, type TaskStatus } from '@/lib/types'

const FIELDS = ['title'] as const

const STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS) as [
  TaskStatus,
  string,
][]

const messageOf = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

export function TasksPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [openTask, setOpenTask] = useState<Pick<Task, 'id' | 'title'> | null>(
    null,
  )
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)

  useEffect(() => {
    if (!token) return

    let ignore = false
    listTasks(token)
      .then((data) => {
        if (!ignore) setTasks(data)
      })
      .catch((error: unknown) => {
        if (!ignore) setLoadError(messageOf(error))
      })

    return () => {
      ignore = true
    }
  }, [token])

  // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
  if (!token) return null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) return failWith('title', 'Falta rellenar el título.')

    return submit(async () => {
      const task = await createTask(token, { title: trimmed })
      setTasks((current) => [...(current ?? []), task])
      setTitle('')
    })
  }

  // La tarea abierta devuelve cada versión guardada; la lista la guarda aunque
  // no pinte ni la fecha ni el vencimiento.
  const replaceTask = (updated: Task) =>
    setTasks(
      (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)) ??
        null,
    )

  const setTaskStatus = (id: number, status: TaskStatus) =>
    setTasks(
      (current) =>
        current?.map((task) => (task.id === id ? { ...task, status } : task)) ??
        null,
    )

  // Optimista: la fila cambia al instante y vuelve atrás si el servidor falla.
  // Si se eligen dos estados muy seguidos, manda la última respuesta en llegar
  // (riesgo aceptado en el design).
  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (status === task.status) return

    setStatusError(null)
    setTaskStatus(task.id, status)

    try {
      replaceTask(await updateTask(token, task.id, { status }))
    } catch (error) {
      setTaskStatus(task.id, task.status)
      setStatusError(messageOf(error))
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-svh items-start justify-center p-6 sm:p-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Tareas</CardTitle>
              <CardDescription>
                La lista compartida de todo el equipo.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">Mi perfil</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6">
          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            {formError && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                {/* Sin `maxLength`: recortaría lo escrito en silencio. Avisa el servidor. */}
                <Input
                  id="title"
                  name="title"
                  autoComplete="off"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={
                    fieldErrors.title ? 'title-error' : undefined
                  }
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando…' : 'Crear tarea'}
                </Button>
              </div>
              <FieldError id="title-error" message={fieldErrors.title} />
            </div>
          </form>

          {statusError && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{statusError}</AlertDescription>
            </Alert>
          )}

          {loadError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : tasks === null ? (
            <div
              className="flex justify-center py-8"
              role="status"
              aria-live="polite"
            >
              <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
              <span className="sr-only">Cargando tareas…</span>
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Aquí verás las tareas de todo el equipo. Todavía no hay ninguna:
              crea la primera con el formulario de arriba.
            </p>
          ) : (
            // En el orden en que llegan: no hay ninguna ordenación decidida (PA-3).
            <ul className="divide-y">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="focus-visible:ring-ring/50 rounded-sm text-left font-medium break-words hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                      onClick={() =>
                        setOpenTask({ id: task.id, title: task.title })
                      }
                    >
                      {task.title}
                    </button>
                    <p className="text-muted-foreground text-sm">
                      {task.assignee.fullName ?? 'Sin nombre'}
                    </p>
                  </div>
                  <Select
                    value={task.status}
                    onValueChange={(value) =>
                      handleStatusChange(task, value as TaskStatus)
                    }
                  >
                    <SelectTrigger
                      className="w-32 shrink-0"
                      aria-label={`Estado de «${task.title}»`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {openTask && (
        <TaskDialog
          key={openTask.id}
          taskId={openTask.id}
          title={openTask.title}
          onClose={() => setOpenTask(null)}
          onTaskChange={replaceTask}
        />
      )}
    </div>
  )
}
