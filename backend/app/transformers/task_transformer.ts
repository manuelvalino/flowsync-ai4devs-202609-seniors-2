import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      // Only what the list needs: never the e-mail or any other account data.
      assignee: {
        id: this.resource.assignee.id,
        fullName: this.resource.assignee.fullName,
      },
    }
  }
}
