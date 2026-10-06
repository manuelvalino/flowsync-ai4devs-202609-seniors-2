/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/**
 * Espejo de `TASK_STATUSES` del backend (app/models/task.ts).
 */
export type TaskStatus = 'pending' | 'in_progress' | 'done'

/** Único sitio donde viven las etiquetas en castellano de cada estado. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

/**
 * Espejo de `TaskTransformer` del backend (app/transformers/task_transformer.ts).
 * El responsable solo trae `id` y `fullName`, nunca datos de su cuenta.
 */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  assignee: { id: number; fullName: string | null }
  /** Fecha de calendario `YYYY-MM-DD`, o `null` si la tarea no tiene. */
  dueDate: string | null
  /** Veredicto del backend para el día de quien pide. La web nunca lo calcula. */
  isOverdue: boolean
}
