import Task from '#models/task'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, timezoneValidator, updateTaskValidator } from '#validators/task'

export default class TasksController {
  /**
   * Every task in the space, with no guaranteed order (PA-3).
   */
  async index(ctx: HttpContext) {
    const today = await this.referenceDay(ctx)
    const tasks = await Task.query().preload('assignee')
    return ctx.serialize(TaskTransformer.transform(tasks, today))
  }

  /**
   * A single task: the minimal surface to "open" it (FS-118, PA-6).
   */
  async show(ctx: HttpContext) {
    const today = await this.referenceDay(ctx)
    const task = await Task.findOrFail(ctx.params.id)
    await task.load('assignee')
    return ctx.serialize(TaskTransformer.transform(task, today))
  }

  /**
   * Creates a task from its title and an optional due date. It starts as
   * pending and assigned to whoever creates it.
   */
  async store(ctx: HttpContext) {
    const today = await this.referenceDay(ctx)
    const { title, dueDate } = await ctx.request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: ctx.auth.getUserOrFail().id,
      dueDate: dueDate ?? null,
    })
    await task.load('assignee')

    ctx.response.status(201)
    return ctx.serialize(TaskTransformer.transform(task, today))
  }

  /**
   * Changes the status, the assignee and/or the due date of any task. The
   * title is not part of the validator, so it is never updated here.
   *
   * Status and assignee are merged as is: VineJS leaves out the optional
   * fields that were not sent, while destructuring them would set `undefined`
   * on the model and wipe the loaded value. The due date is only touched when
   * its key is present, because `null` there means "clear it".
   */
  async update(ctx: HttpContext) {
    const today = await this.referenceDay(ctx)
    const task = await Task.findOrFail(ctx.params.id)
    const { dueDate, ...payload } = await ctx.request.validateUsing(updateTaskValidator)

    task.merge(payload)
    if (dueDate !== undefined) task.dueDate = dueDate
    await task.save()
    await task.load('assignee')

    return ctx.serialize(TaskTransformer.transform(task, today))
  }

  /**
   * Today's date (`YYYY-MM-DD`) in the time zone the client sends in
   * `X-Timezone`, or in UTC when it sends none. An empty header counts as
   * none. An invalid zone fails with the usual 422 before anything is read
   * or written.
   */
  private async referenceDay({ request }: HttpContext) {
    const { timezone } = await timezoneValidator.validate({
      timezone: request.header('x-timezone') || undefined,
    })
    return DateTime.now()
      .setZone(timezone ?? 'UTC')
      .toISODate()!
  }
}
