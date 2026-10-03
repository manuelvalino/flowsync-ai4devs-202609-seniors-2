import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task'

/**
 * Validator to use when creating a task. The title is required and the due
 * date optional: status and assignee are decided by the server.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1),
  dueDate: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
})

/**
 * Validator to use when updating a task. All fields are optional, but a task
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
  // Absent leaves the date alone; `null` (or an empty string) removes it.
  dueDate: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
})

/**
 * Validator for the `today` query parameter shared by every operation that
 * returns tasks: the calendar day of the person asking, as `YYYY-MM-DD`.
 */
export const todayValidator = vine.create({
  today: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
})
