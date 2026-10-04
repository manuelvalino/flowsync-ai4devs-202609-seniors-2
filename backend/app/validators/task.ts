import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task'

/**
 * Shared rule for the task title. Surrounding spaces are trimmed
 * before checking the length, so a blank title fails `minLength`.
 */
const title = () => vine.string().trim().minLength(1).maxLength(255)

/**
 * Validator to use when creating a task. Only the title is accepted;
 * status and assignee are decided by the server.
 */
export const createTaskValidator = vine.create({
  title: title(),
})

/**
 * Validator to use when updating a task. Both fields are optional
 * and the title cannot be changed.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional(),
  assigneeId: vine.number().withoutDecimals().exists({ table: 'users', column: 'id' }).optional(),
})
