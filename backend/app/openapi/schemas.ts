import { TASK_STATUSES } from '#models/task'
import { ApiProperty } from '@foadonis/openapi/decorators'

/**
 * Esquemas del documento OpenAPI que se repiten entre operaciones. Cada clase
 * se publica una sola vez en `components.schemas`, con su nombre de clase, y
 * las respuestas la referencian por `$ref`.
 *
 * Describen lo que la API devuelve hoy, no lo que debería devolver: la fuente
 * de verdad de la forma son los transformers de `app/transformers/` y el
 * serializer de `providers/api_provider.ts`, y estas clases los siguen. Si uno
 * cambia, el otro se cambia a la vez.
 *
 * Los tipos van siempre explícitos (`type`, `enum`) y no inferidos por
 * reflexión: lo que el decorador pudiera deducir de `declare` no dice nada de
 * nulos ni de formatos.
 */

/**
 * El responsable tal y como viaja con una tarea (`TaskAssigneeTransformer`):
 * lo justo para identificarlo, y nunca su email.
 */
export class TaskAssignee {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Nulo si la cuenta se registró sin nombre.',
  })
  declare fullName: string | null

  @ApiProperty({
    type: 'string',
    description: 'Siempre presente; sin nombre, se derivan del email.',
    example: 'AL',
  })
  declare initials: string
}

/**
 * Una tarea tal y como la devuelven la lista, el alta y el cambio de estado
 * (`TaskTransformer`). No lleva el vencimiento: la lista no debe poder
 * enseñarlo.
 */
export class Task {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', minLength: 1, maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: () => TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  declare updatedAt: string | null
}

/**
 * Una tarea suelta con su vencimiento (`TaskDetailTransformer`): la que
 * devuelven la consulta de una tarea y el cambio de fecha.
 */
export class TaskDetail {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', minLength: 1, maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: 'Un día del calendario, sin hora. Nulo si la tarea no tiene fecha.',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Si la tarea está vencida vista desde el día `today` de la petición: tiene fecha, es anterior a ese día y la tarea no está hecha.',
  })
  declare isOverdue: boolean

  @ApiProperty({ type: () => TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  declare updatedAt: string | null
}

/**
 * Los envoltorios `{ data }` que añade el serializer a toda respuesta correcta.
 */
export class TaskResponse {
  @ApiProperty({ type: () => Task })
  declare data: Task
}

export class TaskListResponse {
  @ApiProperty({ type: () => [Task], description: 'La lista entera, sin paginar.' })
  declare data: Task[]
}

export class TaskDetailResponse {
  @ApiProperty({ type: () => TaskDetail })
  declare data: TaskDetail
}

/**
 * Un error de validación de VineJS, señalando el campo.
 */
export class ValidationError {
  @ApiProperty({ type: 'string' })
  declare message: string

  @ApiProperty({ type: 'string', example: 'required' })
  declare rule: string

  @ApiProperty({ type: 'string', example: 'title' })
  declare field: string

  @ApiProperty({
    type: 'object',
    required: false,
    description: 'Datos de la regla; p. ej. `choices` en un enum.',
  })
  declare meta?: Record<string, unknown>
}

/**
 * La respuesta `422`: un error por cada campo que no pasa la validación.
 */
export class ValidationErrorResponse {
  @ApiProperty({ type: () => [ValidationError] })
  declare errors: ValidationError[]
}

export class ErrorMessage {
  @ApiProperty({ type: 'string', example: 'Unauthorized access' })
  declare message: string
}

/**
 * La respuesta `401` del middleware de auth.
 */
export class UnauthorizedResponse {
  @ApiProperty({ type: () => [ErrorMessage] })
  declare errors: ErrorMessage[]
}

/**
 * La respuesta `404` cuando el id no corresponde a ninguna tarea. Solo se
 * garantiza `message`: fuera de producción el manejador de excepciones añade
 * además el nombre del error y la traza.
 */
export class NotFoundResponse {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  declare message: string
}
