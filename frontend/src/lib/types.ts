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

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

/** Etiqueta con la que se pinta cada estado; los valores de la API no se traducen. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

/** Espejo de `TaskTransformer` del backend: del responsable solo viaja lo que la lista necesita. */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  /** Día de calendario `AAAA-MM-DD` o `null` si no tiene fecha. */
  dueDate: string | null
  /** Veredicto del servidor para el día que envía el cliente; el cliente no lo calcula. */
  isOverdue: boolean
  assignee: { id: number; fullName: string | null }
}
