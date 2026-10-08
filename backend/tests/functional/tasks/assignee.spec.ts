import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que una tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`.
 *
 * Cada scenario se comprueba por las dos lecturas que devuelven tareas, la
 * suelta (`GET /tasks/:id`) y la lista (`GET /tasks`): el requisito habla de
 * «cada tarea», y que una de las dos lo cumpla no dice nada de la otra.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function sesion(client: any, fullName: string | null, email: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: response.body().data.token as string }
  }

  /**
   * El `assignee` de una misma tarea según cada lectura. La suelta exige el día
   * de quien mira; cualquiera vale, aquí no se mira el vencimiento.
   */
  async function responsables(client: any, token: string, task: Task) {
    const suelta = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: '2026-10-08' })
      .header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === task.id)

    return { suelta: suelta.body().data.assignee, lista: enLista?.assignee }
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const task = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: user.id,
    })

    const { suelta, lista } = await responsables(client, token, task)

    for (const [lectura, assignee] of Object.entries({ suelta, lista })) {
      assert.equal(assignee.fullName, 'Ada Lovelace', lectura)
      assert.equal(assignee.initials, 'AL', lectura)
    }
  })

  test('el responsable no trae el email ni otros datos de la cuenta', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const task = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: user.id,
    })

    const { suelta, lista } = await responsables(client, token, task)

    for (const [lectura, assignee] of Object.entries({ suelta, lista })) {
      // Lo justo para identificarlo: el nombre, las iniciales y la referencia.
      assert.sameMembers(Object.keys(assignee), ['id', 'fullName', 'initials'], lectura)
      assert.notInclude(JSON.stringify(assignee), 'ada@example.com', lectura)
    }
  })

  test('un responsable sin nombre llega con nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, null, 'ada@example.com')
    const task = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: user.id,
    })

    const { suelta, lista } = await responsables(client, token, task)

    for (const [lectura, assignee] of Object.entries({ suelta, lista })) {
      assert.isNull(assignee.fullName, lectura)
      assert.isString(assignee.initials, lectura)
      assert.isNotEmpty(assignee.initials, lectura)
    }
  })
})
