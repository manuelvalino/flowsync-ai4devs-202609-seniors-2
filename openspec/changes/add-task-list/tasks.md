# Tasks

## 1. Modelo de datos (backend)

- [x] 1.1 Crear la migración de la tabla `tasks` con `node ace make:migration tasks`, con `id`, `title` (string 255, no nulo), `status` (string, no nulo, por defecto `pending`), `assignee_id` (FK a `users.id`, `ON DELETE CASCADE`), `created_at` y `updated_at`, y sin columna de fecha de vencimiento. Verificar que `node ace migration:run` termina sin errores y que `database/schema.ts` contiene el nuevo `TaskSchema`.
- [x] 1.2 Crear el modelo `app/models/task.ts`, que extiende `TaskSchema`, exporta `TASK_STATUSES = ['pending', 'in_progress', 'done'] as const` y declara la relación `assignee` (`belongsTo` a `User` por `assigneeId`), sin declarar columnas. Verificar que `npm run typecheck` pasa.

## 2. API de tareas (backend)

- [x] 2.1 Crear `app/validators/task.ts` con `createTaskValidator` (`title`: trim, minLength 1, maxLength 255) y `updateTaskValidator` (`status`: `vine.enum(TASK_STATUSES).optional()`; `assigneeId`: número entero con `exists` en `users.id`, opcional). Verificar que `npm run typecheck` pasa.
- [x] 2.2 Crear `app/transformers/assignee_transformer.ts` (solo `id` y `fullName`) y `app/transformers/task_transformer.ts` (`id`, `title`, `status` y `assignee` por medio de `AssigneeTransformer` con `whenLoaded`). Verificar que `npm run typecheck` pasa.
- [x] 2.3 Crear `app/controllers/tasks_controller.ts`:
  - `index` precarga `assignee`, sin `orderBy`.
  - `store` valida, crea con `assigneeId` igual al usuario autenticado y `status` `pending`, carga `assignee` y responde 201.
  - `update` hace `findOrFail`, valida, aplica `merge` solo con `status` y `assigneeId`, guarda, recarga `assignee` y responde 200.
  - Las tres respuestas salen por `serialize(TaskTransformer.transform(...))`.

  Verificar que `npm run typecheck` pasa.
- [x] 2.4 Registrar en `start/routes.ts` un grupo `/api/v1/tasks` con `middleware.auth()`, con `GET /tasks`, `POST /tasks` y `PATCH /tasks/:id` (este último con el matcher numérico), usando `controllers.Tasks`. Arrancar `npm run dev` para regenerar `backend/.adonisjs/`. Verificar con `node ace list:routes` que aparecen exactamente esas tres rutas de tareas y que no hay ni GET individual ni DELETE.
- [x] 2.5 Comprobar a mano con `curl` contra el servidor de desarrollo cada escenario API del delta `tasks`:
  - 401 sin token.
  - Lista vacía `{ data: [] }`.
  - Creación con 201, `pending` y el creador como responsable, ignorando `status` y `assigneeId`.
  - Título ausente, en blanco y de 256 caracteres rechazado con 422; de 255 aceptado; espacios de los extremos recortados.
  - Actualización de estado en una tarea ajena y vuelta desde `done`.
  - `status` inválido y `assigneeId` inexistente rechazados con 422.
  - `title` ignorado al actualizar.
  - 404 al actualizar una tarea inexistente, y también en el GET individual y en el DELETE.
  - `assignee` sin email.

  Verificar que cada respuesta coincide con su escenario.
- [x] 2.6 Pasar `npm run lint` y `npm run format` en `backend/`, y verificar que los dos terminan sin errores ni diff pendiente fuera de lo esperado.

## 3. Cliente API y tipos (frontend)

- [x] 3.1 Añadir a `src/lib/types.ts` `TaskStatus`, `Task` (con `assignee: { id: number; fullName: string | null }`) y `TASK_STATUS_LABELS` (Pendiente, En curso, Hecho). Verificar que `npm run build` compila.
- [x] 3.2 Añadir a `src/lib/api.ts` `listTasks`, `createTask` y `updateTask` (este último con `status?` y `assigneeId?`), y `title: 'el título'` en `FIELD_LABELS`. Verificar que `npm run build` compila y que `npm run lint` (oxlint) pasa.

## 4. Pantalla de tareas (frontend)

- [x] 4.1 Crear `src/pages/tasks-page.tsx` con la cabecera "Tareas", un enlace al perfil y la carga de la lista al montar, con indicador de carga, `Alert` de error y estado vacío explicativo. Cada fila muestra el título y `fullName ?? 'Sin nombre'`, sin fechas, en el orden recibido. Verificar en el navegador que se ve la lista, el estado vacío y que una tarea de un responsable sin nombre muestra "Sin nombre".
- [x] 4.2 Añadir el formulario de creación (solo "Título" y "Crear tarea") con `useAuthForm(['title'])`:
  - Recorta el título y, si queda vacío, muestra "Falta rellenar el título." sin hacer la petición.
  - El botón muestra "Creando…" durante el envío.
  - Si va bien, añade la tarea a la lista y vacía el campo.
  - El input no lleva `maxLength`.

  Verificar en el navegador la creación, el título vacío o en blanco, y que un título de 256 caracteres muestra el aviso bajo el campo y conserva el texto.
- [x] 4.3 Traer el componente `Select` de shadcn con `npx shadcn@latest add select` (desde `frontend/`). Verificar que se crea `src/components/ui/select.tsx`, que `package.json` no gana dependencias (usa `radix-ui`, ya instalado) y que `npm run build` compila.
- [x] 4.4 Añadir en cada fila un `Select` de estado con las tres opciones de `TASK_STATUS_LABELS`, el estado actual como `value` y un `aria-label` en el trigger que incluya el título de la tarea. El cambio es optimista; si falla, restaura el estado anterior y muestra un `Alert`. Elegir la opción actual no hace ninguna petición. Verificar en el navegador:
  - El cambio desde el selector en una tarea propia y en una ajena, con ratón y con teclado.
  - Que el selector solo ofrece Pendiente, En curso y Hecho.
  - Que elegir el estado actual no lanza ninguna petición (pestaña de red).
  - Que el cambio persiste al recargar.
  - Que con el backend parado el selector vuelve al estado anterior con aviso.
- [x] 4.5 Registrar `/tasks` dentro de `ProtectedRoute` en `src/routes/app-routes.tsx`. Verificar que sin sesión `/tasks` redirige al login.

## 5. La lista como pantalla de inicio (frontend)

- [x] 5.1 Cambiar a `/tasks` el comodín `*` de `app-routes.tsx` y la redirección con sesión de `public-only-route.tsx`. Verificar en el navegador que tras el login y tras el registro se llega a la lista, que `/login` con sesión lleva a la lista y que una ruta desconocida lleva a la lista o, sin sesión, al login.
- [x] 5.2 Añadir en `profile-page.tsx` un enlace a la lista de tareas. Verificar en el navegador que el enlace lleva a `/tasks` y que "Cerrar sesión" sigue llevando al login.
- [x] 5.3 Pasar `npm run build`, `npm run lint` y `npm run format` en `frontend/` y verificar que terminan sin errores.

## 6. Comprobación integrada

- [x] 6.1 Con dos cuentas en dos navegadores, recorrer los escenarios de pantalla de los deltas `tasks` y `auth`:
  - Las dos cuentas ven la misma lista.
  - Una tarea creada por B aparece en A al recargar.
  - A cambia el estado de una tarea de B.
  - Cada fila muestra título, nombre y estado.
  - No hay fechas, ni "mis tareas", ni indicadores de presencia.

  Verificar que cada escenario se cumple y ejecutar `openspec validate add-task-list --strict` sin errores.
