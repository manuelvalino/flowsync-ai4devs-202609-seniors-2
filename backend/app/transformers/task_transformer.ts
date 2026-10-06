import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import AssigneeTransformer from '#transformers/assignee_transformer'

/**
 * `today` is the reference day of whoever is asking (`YYYY-MM-DD`). It is a
 * constructor argument so that no caller can forget it: `isOverdue` is never
 * stored, it is decided here on every response.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  constructor(
    resource: Task,
    protected today: string
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: AssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.today),
    }
  }
}
