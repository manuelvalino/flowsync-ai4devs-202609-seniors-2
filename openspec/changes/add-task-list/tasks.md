# Tasks

Sin tests en este change: la verificación es por tipos, lint, build, peticiones a la API y comprobación en pantalla. Los comandos se ejecutan desde `backend/` o `frontend/`.

## 1. Modelo de datos

- [x] 1.1 Crear la migración de la tabla `tasks` (`title`, `status` con default `pending`, `assignee_id` → `users`, marcas de auditoría de creación y actualización; sin fecha de vencimiento) y ejecutar `node ace migration:run`; verificar que `database/schema.ts` se regenera con `TaskSchema` y que `migration:rollback` seguido de `migration:run` funciona
- [x] 1.2 Crear el modelo de tarea con la relación `assignee` hacia `User` y la constante única de estados (`pending`, `in_progress`, `done`); verificar con `npm run typecheck`

## 2. API de tareas

- [x] 2.1 Crear los validadores de crear (título obligatorio, recortado y con longitud mínima 1, sin longitud máxima) y de actualizar (`status` enum cerrado y `assigneeId` entero positivo existente, ambos opcionales, `null` no admitido, 422 si no llega ninguno); verificar con `npm run typecheck`
- [x] 2.2 Crear el transformer de tarea (`id`, `title`, `status`, `assignee: { id, fullName }`, sin correo ni fechas) y el controlador con `index` (sin `orderBy`, con el responsable precargado), `store` (estado `pending`, responsable = usuario autenticado) y `update` (404 si no existe); verificar con `npm run typecheck`
- [x] 2.3 Registrar el grupo `/api/v1/tasks` con `middleware.auth()` y solo `GET /`, `POST /` y `PATCH /:id`; verificar con `node ace list:routes` que solo hay esas tres rutas de tareas
- [x] 2.4 Verificar contra el servidor (`npm run dev`) con `curl`: 401 sin token en las tres operaciones; crear con título (nace `pending` y a nombre de quien crea, aunque se envíen `status`/`assigneeId`); 422 con título ausente, vacío o en blanco; listado igual con dos tokens; 422 con `status: "Hecho"`; cambio válido de estado y de `assigneeId`; 422 con `assigneeId` inexistente o cuerpo vacío; 404 con id inexistente o no numérico, con `GET /tasks/1`, `PUT /tasks/1` y `DELETE /tasks/1`; 422 con `assigneeId: null`; reasignar a quien ya la lleva es un éxito
- [x] 2.5 Regenerar y commitear el diff de `.adonisjs/` arrancando el servidor; verificar que `git status` no deja generados sin commitear

## 3. Interfaz de la lista

- [x] 3.1 Añadir el tipo `Task`, los estados con sus etiquetas (Pendiente, En curso, Hecho) y las llamadas `listTasks`, `createTask` y `updateTask` en `lib/api.ts`, ampliar `request()` a `PATCH` y traducir el `minLength` del título como «Falta rellenar el título.»; verificar con `npm run build`
- [x] 3.2 Crear la página `/tasks` con el formulario de creación (solo título, botón «Crear tarea», error junto al campo), la lista (título, responsable por nombre o «Sin nombre», estado; sin fechas), el estado vacío explicativo y el aviso si la lista no carga; verificar en el navegador cada caso, incluido el título en blanco y un responsable con nombre en blanco
- [x] 3.3 Añadir el cambio de estado por fila con tres botones, desactivados mientras el cambio se guarda, aviso si falla y fila sin cambios en ese caso; verificar en el navegador con una tarea propia y una creada por otra cuenta
- [x] 3.4 Registrar `/tasks` dentro de `ProtectedRoute`; verificar que sin sesión redirige a `/login`

## 4. Inicio en la lista y enlaces

- [x] 4.1 Cambiar a `/tasks` las redirecciones de `PublicOnlyRoute` y del comodín, y añadir el enlace «Tareas» en el perfil y el enlace al perfil en la lista; verificar que registro y login terminan en la lista, que `/login` y `/register` con sesión llevan a `/tasks`, que una URL desconocida lleva a `/tasks` y que `/profile` sigue accesible
- [x] 4.2 Ejecutar `npm run build` y `npm run lint` en `frontend/` y `npm run typecheck` y `npm run lint` en `backend/`; verificar que terminan sin errores
- [x] 4.3 Recorrido final con dos cuentas en el navegador: ambas ven la misma lista, una cambia el estado de una tarea de la otra, un responsable sin nombre se ve como «Sin nombre» y no aparece ningún correo ni fecha; verificar que coincide con los escenarios de `specs/tasks/spec.md`
