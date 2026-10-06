import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Public view of a task assignee. Kept apart from UserTransformer on
 * purpose, so fields added to the account view never reach the task list.
 */
export default class AssigneeTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'fullName'])
  }
}
