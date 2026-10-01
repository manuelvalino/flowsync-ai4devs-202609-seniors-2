import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task'

/**
 * Validator to use when creating a task. The title is the only input:
 * status and assignee are decided by the server.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1),
})

/**
 * Validator to use when updating a task. Both fields are optional, but a task
 * can never lose its status or its assignee, so the controller rejects `null`
 * (declared nullable here only so that VineJS does not treat it as absent) and
 * a request that carries neither field.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).nullable().optional(),
  assigneeId: vine
    .number()
    .withoutDecimals()
    .positive()
    .exists({ table: 'users', column: 'id' })
    .nullable()
    .optional(),
})
