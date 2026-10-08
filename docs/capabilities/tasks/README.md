# Capability `tasks`

La lista de trabajo del equipo. Se crean tareas escribiendo solo el título, todas viven en una lista compartida, cualquiera cambia el estado de cualquiera, y a cada tarea se le puede poner una fecha de vencimiento que solo se ve al abrirla. Todo exige sesión iniciada.

**El comportamiento esperado está en la spec viva, [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md), y este README no lo repite.** Aquí solo hay un mapa: dónde está cada cosa en el código, qué endpoints hay y cómo probarlos. Si este documento y la spec dicen cosas distintas, manda la spec.

## Endpoints

Todos van bajo `/api/v1/tasks`, detrás de `middleware.auth()` (`Authorization: Bearer <token>`), y están definidos en [`backend/start/routes.ts`](../../../backend/start/routes.ts). Las respuestas correctas van envueltas en `{ "data": ... }`.

| Método | Ruta | Parámetros | Éxito | Controlador |
|---|---|---|---|---|
| `GET` | `/api/v1/tasks` | query `status` (opcional) | `200` | `TasksController.index` |
| `POST` | `/api/v1/tasks` | cuerpo `{ title }` | `201` | `TasksController.store` |
| `GET` | `/api/v1/tasks/:id` | query `today` (obligatorio, `AAAA-MM-DD`) | `200` | `TasksController.show` |
| `PATCH` | `/api/v1/tasks/:id/status` | cuerpo `{ status }` | `200` | `TaskStatusesController.update` |
| `PUT` | `/api/v1/tasks/:id/due-date` | cuerpo `{ dueDate, today }` | `200` | `TaskDueDatesController.update` |

El contrato completo, con cuerpos, códigos de error y forma de cada objeto, lo publica el propio servidor a partir de las anotaciones de los controladores:

- documento OpenAPI: `http://localhost:3333/api.json` (también en `/api.yaml`)
- interfaz navegable (Scalar): `http://localhost:3333/api`

## Reglas de negocio

Cada enlace lleva al requisito correspondiente de la spec, con sus scenarios.

**API**

- Alta:
  - [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título)
  - [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título)
  - [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo)
- Lista:
  - [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio)
  - [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento)
- Filtro por estado:
  - [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado)
  - [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima)
  - [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío)
- Responsable: [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable)
- Estados:
  - [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos)
  - [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea)
- Fecha de vencimiento:
  - [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional)
  - [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento)
  - [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida)
  - [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira)
- Tarea suelta: [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta)
- Sesión: [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión)

**Interfaz**

- Pantalla de la lista:
  - [Pantalla de la lista del equipo](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-la-lista-del-equipo)
  - [El espacio sin tareas](../../../openspec/specs/tasks/spec.md#requirement-el-espacio-sin-tareas)
  - [Una sola vista de tareas, sin señales de presencia](../../../openspec/specs/tasks/spec.md#requirement-una-sola-vista-de-tareas-sin-señales-de-presencia)
- Crear y cambiar estado desde la lista:
  - [Crear una tarea desde la lista](../../../openspec/specs/tasks/spec.md#requirement-crear-una-tarea-desde-la-lista)
  - [Aviso al intentar crear sin un título válido](../../../openspec/specs/tasks/spec.md#requirement-aviso-al-intentar-crear-sin-un-título-válido)
  - [Cambiar el estado desde la propia fila](../../../openspec/specs/tasks/spec.md#requirement-cambiar-el-estado-desde-la-propia-fila)
- Filtro en la lista:
  - [El control para acotar la lista](../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista)
  - [El filtro se pide en la dirección de la lista](../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista)
  - [Una lista sin filas no significa siempre lo mismo](../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo)
  - [Lo que sale de la vista no se pierde](../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde)
- Pantalla de una tarea:
  - [Pantalla de una tarea](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-una-tarea)
  - [Poner y quitar la fecha desde la pantalla de la tarea](../../../openspec/specs/tasks/spec.md#requirement-poner-y-quitar-la-fecha-desde-la-pantalla-de-la-tarea)
  - [Aviso ante una fecha que no vale](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-una-fecha-que-no-vale)
  - [La señal de tarea vencida](../../../openspec/specs/tasks/spec.md#requirement-la-señal-de-tarea-vencida)
  - [No tener fecha no se penaliza](../../../openspec/specs/tasks/spec.md#requirement-no-tener-fecha-no-se-penaliza)

De dónde sale cada requisito (propuesta, diseño y delta) está en los changes archivados de [`openspec/changes/archive/`](../../../openspec/changes/archive/): `add-task-list`, `add-task-due-date` y `add-task-status-filter`.

## Dónde vive en el código

**Backend** (`backend/`)

| Pieza | Fichero |
|---|---|
| Modelo, estados y regla de vencimiento | [`app/models/task.ts`](../../../backend/app/models/task.ts) |
| Controladores | [`tasks_controller.ts`](../../../backend/app/controllers/tasks_controller.ts), [`task_statuses_controller.ts`](../../../backend/app/controllers/task_statuses_controller.ts), [`task_due_dates_controller.ts`](../../../backend/app/controllers/task_due_dates_controller.ts) |
| Validadores | [`app/validators/task.ts`](../../../backend/app/validators/task.ts) |
| Forma de las respuestas | [`task_transformer.ts`](../../../backend/app/transformers/task_transformer.ts) (lista, alta y estado), [`task_detail_transformer.ts`](../../../backend/app/transformers/task_detail_transformer.ts) (tarea suelta y fecha), [`task_assignee_transformer.ts`](../../../backend/app/transformers/task_assignee_transformer.ts) (responsable) |
| Esquemas OpenAPI | [`app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts) |
| Migraciones | [`database/migrations/`](../../../backend/database/migrations/) (`create_tasks_table`, `add_due_date_to_tasks_table`) |
| Tests | [`tests/functional/tasks/`](../../../backend/tests/functional/tasks/) |

**Frontend** (`frontend/src/`)

| Pieza | Fichero |
|---|---|
| Llamadas a la API (`listTasks`, `createTask`, `getTask`, `updateTaskStatus`, `setTaskDueDate`) | [`lib/api.ts`](../../../frontend/src/lib/api.ts) |
| Pantalla de la lista (`/tasks`) | [`pages/tasks-page.tsx`](../../../frontend/src/pages/tasks-page.tsx), [`components/task-item.tsx`](../../../frontend/src/components/task-item.tsx), [`components/task-filter.tsx`](../../../frontend/src/components/task-filter.tsx) |
| Pantalla de una tarea (`/tasks/:id`) | [`pages/task-page.tsx`](../../../frontend/src/pages/task-page.tsx) |
| Rutas protegidas | [`routes/app-routes.tsx`](../../../frontend/src/routes/app-routes.tsx) |

## Cómo se prueba en local

### Puesta en marcha

```bash
cd backend
npm install
cp .env.example .env && node ace generate:key   # solo la primera vez
node ace migration:run
npm run dev                                     # http://localhost:3333
```

```bash
cd frontend
npm install
cp .env.example .env                            # VITE_API_URL=http://localhost:3333
npm run dev                                     # http://localhost:5173
```

### Tests automáticos

```bash
cd backend
node ace test functional --files="tasks/*"      # solo los de tareas
npm test                                        # toda la suite
```

Ojo: `--files=tasks` sin el `/*` no selecciona ningún test. Los tests usan el mismo fichero SQLite (`tmp/db.sqlite3`) que el servidor de desarrollo, y se aíslan con una transacción global por test (`testUtils.db().withGlobalTransaction()`). Los tests nuevos deben hacer lo mismo para no dejar datos tras de sí.

Hoy los tests cubren solo una parte pequeña de la spec. El frontend no tiene runner de tests: los requisitos de interfaz se comprueban a mano.

### A mano contra la API

Con el backend arrancado, crea una cuenta y quédate con su token. Los datos se escriben en la base de desarrollo.

```bash
TOKEN=$(curl -s -X POST http://localhost:3333/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

AUTH="Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:3333/api/v1/tasks -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"Revisar el informe"}'
curl -s http://localhost:3333/api/v1/tasks -H "$AUTH"
curl -s "http://localhost:3333/api/v1/tasks?status=done" -H "$AUTH"
curl -s "http://localhost:3333/api/v1/tasks/1?today=$(date +%F)" -H "$AUTH"
curl -s -X PATCH http://localhost:3333/api/v1/tasks/1/status -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"in_progress"}'
curl -s -X PUT http://localhost:3333/api/v1/tasks/1/due-date -H "$AUTH" -H 'Content-Type: application/json' -d "{\"dueDate\":\"2026-09-30\",\"today\":\"$(date +%F)\"}"
```

Si la cuenta ya existe, cambia `signup` por `login` y envía solo `email` y `password`. Las mismas llamadas se pueden lanzar desde la interfaz de `http://localhost:3333/api`.

### A mano en la interfaz

Con los dos servidores arrancados, entra en `http://localhost:5173`, regístrate y llegarás a `/tasks`. Desde ahí se crean tareas, se cambia el estado desde cada fila, se filtra por estado (que queda en la URL como `?status=`) y se abre cada tarea para ponerle o quitarle la fecha.
