import Task, { type TaskStatus } from '#models/task'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { errors } from '@vinejs/vine'

export default class TasksController {
  async index({ serialize }: HttpContext) {
    // No explicit order: the order of the list is still an open decision.
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ auth, request, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
    })
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }

  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.query().where('id', params.id).preload('assignee').firstOrFail()
    const { status, assigneeId } = await request.validateUsing(updateTaskValidator)

    const changes: { status?: TaskStatus; assigneeId?: number } = {}
    if (status !== undefined) changes.status = status ?? undefined
    if (assigneeId !== undefined) changes.assigneeId = assigneeId ?? undefined

    const rejected = [
      ...(status === null ? ['status'] : []),
      ...(assigneeId === null ? ['assigneeId'] : []),
    ]
    if (rejected.length > 0) {
      throw new errors.E_VALIDATION_ERROR(
        rejected.map((field) => ({
          field,
          rule: 'required',
          message: `The ${field} cannot be null`,
        }))
      )
    }
    if (status === undefined && assigneeId === undefined) {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'status', rule: 'required', message: 'Send a status or an assigneeId' },
      ])
    }

    task.merge(changes)
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
