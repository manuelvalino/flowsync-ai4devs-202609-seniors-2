import Task from '#models/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

export default class TasksController {
  /**
   * Every task in the space, with no guaranteed order (PA-3).
   */
  async index({ serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee')
    return serialize(TaskTransformer.transform(tasks))
  }

  /**
   * Creates a task from its title only. It starts as pending and
   * assigned to whoever creates it.
   */
  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
    })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }

  /**
   * Changes the status and/or the assignee of any task. The title is
   * not part of the validator, so it is never updated here.
   *
   * The payload is merged as is: VineJS leaves out the optional fields
   * that were not sent, while destructuring them would set `undefined`
   * on the model and wipe the loaded value.
   */
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const payload = await request.validateUsing(updateTaskValidator)

    task.merge(payload)
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
