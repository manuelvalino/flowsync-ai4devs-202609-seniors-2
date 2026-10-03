import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class TaskTransformer extends BaseTransformer<Task> {
  /** `today` is the reference calendar day (`YYYY-MM-DD`) the overdue verdict is computed for. */
  constructor(
    resource: Task,
    protected today: string
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.today),
      // Only what the list needs: never the e-mail or any other account data.
      assignee: {
        id: this.resource.assignee.id,
        fullName: this.resource.assignee.fullName,
      },
    }
  }
}
