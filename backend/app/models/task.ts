import { TaskSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * The only place that decides whether a task is overdue: it has a due date
   * strictly before the reference day and it is not done. Only calendar days
   * (`YYYY-MM-DD`) are compared, never instants, so time zones cannot shift it.
   */
  isOverdueOn(today: string): boolean {
    const dueDate = this.dueDate?.toISODate()
    return dueDate !== null && dueDate !== undefined && dueDate < today && this.status !== 'done'
  }
}
