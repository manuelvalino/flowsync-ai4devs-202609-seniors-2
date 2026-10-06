import vine from '@vinejs/vine'
import { IANAZone } from 'luxon'
import { TASK_STATUSES } from '#models/task'

/**
 * Shared rule for the task title. Surrounding spaces are trimmed
 * before checking the length, so a blank title fails `minLength`.
 */
const title = () => vine.string().trim().minLength(1).maxLength(255)

/**
 * Shared rule for the due date: a calendar date with no time. `null`
 * (or `""`, which the bodyparser turns into `null`) is kept so that it
 * clears the date; an omitted field is left out of the output.
 */
const dueDate = () =>
  vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional()

/**
 * Validator to use when creating a task. Status and assignee are decided
 * by the server; the due date is optional.
 */
export const createTaskValidator = vine.create({
  title: title(),
  dueDate: dueDate(),
})

/**
 * Validator to use when updating a task. Every field is optional
 * and the title cannot be changed.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional(),
  assigneeId: vine.number().withoutDecimals().exists({ table: 'users', column: 'id' }).optional(),
  dueDate: dueDate(),
})

const ianaTimezone = vine.createRule(
  (value, _, field) => {
    if (typeof value === 'string' && !IANAZone.isValidZone(value)) {
      field.report('The {{ field }} field must be a valid IANA time zone', 'timezone', field)
    }
  },
  { name: 'timezone' }
)

/**
 * Validator for the `X-Timezone` header, which sets the reference day
 * of the person asking. Absent is fine (the API falls back to UTC).
 */
export const timezoneValidator = vine.create({
  timezone: vine.string().use(ianaTimezone()).optional(),
})
