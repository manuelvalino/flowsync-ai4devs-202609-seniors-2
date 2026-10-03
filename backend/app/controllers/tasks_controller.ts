import Task, { type TaskStatus } from '#models/task'
import { createTaskValidator, todayValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'

/**
 * Reference day for the overdue verdict: the `today` query parameter sent by
 * the client, or the server's UTC day when it is absent.
 */
async function referenceDay({ request }: HttpContext): Promise<string> {
  const { today } = await todayValidator.validate(request.qs())
  return (today ?? DateTime.utc()).toISODate()!
}

export default class TasksController {
  async index(ctx: HttpContext) {
    const today = await referenceDay(ctx)
    // No explicit order: the order of the list is still an open decision.
    const tasks = await Task.query().preload('assignee')

    return ctx.serialize(TaskTransformer.transform(tasks, today))
  }

  async show(ctx: HttpContext) {
    const today = await referenceDay(ctx)
    const task = await Task.query().where('id', ctx.params.id).preload('assignee').firstOrFail()

    return ctx.serialize(TaskTransformer.transform(task, today))
  }

  async store(ctx: HttpContext) {
    const { auth, request, serialize } = ctx
    const today = await referenceDay(ctx)
    const { title, dueDate } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
      dueDate: dueDate ?? null,
    })
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }

  async update(ctx: HttpContext) {
    const { params, request, serialize } = ctx
    const today = await referenceDay(ctx)
    const task = await Task.query().where('id', params.id).preload('assignee').firstOrFail()
    const { status, assigneeId, dueDate } = await request.validateUsing(updateTaskValidator)

    const changes: { status?: TaskStatus; assigneeId?: number; dueDate?: DateTime | null } = {}
    if (status !== undefined) changes.status = status ?? undefined
    if (assigneeId !== undefined) changes.assigneeId = assigneeId ?? undefined
    // Absent keeps the date; null removes it.
    if (dueDate !== undefined) changes.dueDate = dueDate

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
    if (status === undefined && assigneeId === undefined && dueDate === undefined) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'status',
          rule: 'required',
          message: 'Send a status, an assigneeId or a dueDate',
        },
      ])
    }

    task.merge(changes)
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }
}
