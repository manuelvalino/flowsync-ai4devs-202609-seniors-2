import { TaskSchema } from '#database/schema'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Closed set of task statuses. The validator and the frontend
 * mirror take their values from here.
 */
export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * The only place that decides whether a task is overdue. `today` is the
   * reference day of whoever is asking, as `YYYY-MM-DD`; ISO dates compare
   * chronologically as strings, and "before today" is strict, so a task due
   * today is not overdue yet. Computed on every read, never stored.
   */
  isOverdueOn(today: string): boolean {
    return this.dueDate !== null && this.dueDate.toISODate()! < today && this.status !== 'done'
  }
}
