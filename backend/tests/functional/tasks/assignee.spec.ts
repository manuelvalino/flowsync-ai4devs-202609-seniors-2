import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que una tarea cuenta de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable identificable, que la tarea no
 * filtre datos de la cuenta, y el responsable que se registró sin nombre.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // La consulta de una tarea suelta exige el día de quien mira; para lo que
  // se comprueba aquí da igual cuál sea.
  const today = '2026-10-06'

  async function sesion(client: any, fullName: string | null, email = 'ada@example.com') {
    const user = await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: response.body().data.token as string }
  }

  async function tareaDe(user: User) {
    return Task.create({ title: 'Revisar el informe', status: 'pending', assigneeId: user.id })
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace')
    const task = await tareaDe(user)

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.equal(assignee.fullName, 'Ada Lovelace')
    assert.equal(assignee.initials, 'AL')
  })

  test('ni la tarea suelta ni la lista sacan el email del responsable', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace')
    const task = await tareaDe(user)

    const suelta = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)
    lista.assertStatus(200)

    const tareas = lista.body().data as Array<{ id: number; assignee: Record<string, unknown> }>
    const enLista = tareas.find((t) => t.id === task.id)!
    assert.exists(enLista)

    // El scenario pide «suelta o dentro de la lista»: se comprueban las dos
    // lecturas, y en las dos se busca el email como valor y no solo como clave,
    // por si un día aparece bajo otro nombre.
    const lecturas: Array<[string, Record<string, unknown>]> = [
      ['tarea suelta', suelta.body().data.assignee],
      ['lista', enLista.assignee],
    ]

    for (const [lectura, assignee] of lecturas) {
      const serialized = JSON.stringify(assignee)
      assert.notInclude(serialized, 'ada@example.com', `la ${lectura} saca el email`)
      assert.notProperty(assignee, 'email', `la ${lectura} saca el email`)
      assert.notProperty(assignee, 'password', `la ${lectura} saca la contraseña`)
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, null)
    const task = await tareaDe(user)

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.isNull(assignee.fullName)
    assert.isString(assignee.initials)
    assert.isNotEmpty(assignee.initials)
  })
})
