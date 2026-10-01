# Tasks

Sin tests en este change: la verificación es por tipos, lint, build, peticiones a la API con distintos `today` y comprobación en pantalla. Los comandos se ejecutan desde `backend/` o `frontend/`. Probar contra una copia aislada de la base de datos, no contra la de desarrollo.

## 1. Modelo de datos y regla

- [ ] 1.1 Crear la migración que añade `due_date` anulable y sin valor por defecto a `tasks` y ejecutar `node ace migration:run` sobre una copia con tareas existentes; verificar que las tareas previas siguen válidas con fecha vacía, que `database/schema.ts` se regenera con la nueva columna y que `migration:rollback` seguido de `migration:run` funciona
- [ ] 1.2 Añadir al modelo `Task` el método único que decide el vencimiento (fecha presente, anterior al día de referencia y estado distinto de `done`), comparando solo días `AAAA-MM-DD`; verificar con `npm run typecheck` y escribiendo y leyendo una fecha en `node ace repl` para comprobar que no se desplaza un día

## 2. API

- [ ] 2.1 Extender el validador de crear (`dueDate` opcional, anulable, formato estricto `AAAA-MM-DD`) y el de actualizar (`dueDate` anulable y opcional; el cuerpo es válido con `status`, `assigneeId` o `dueDate`), y añadir el validador compartido del parámetro `today`; verificar con `npm run typecheck`
- [ ] 2.2 Pasar el día de referencia al `TaskTransformer` (`dueDate` y `isOverdue`) y usarlo desde todas las operaciones; resolver el día como `today` o, si no llega, el día UTC del servidor; verificar con `npm run typecheck`
- [ ] 2.3 Añadir `show` al controlador y la ruta `GET /api/v1/tasks/:id` con `auth`, y hacer que `store` y `update` acepten `dueDate`; verificar con `node ace list:routes` que hay cuatro rutas de tareas y ninguna de borrado
- [ ] 2.4 Verificar con `curl` contra una copia aislada: crear sin fecha (`dueDate` `null`, `isOverdue` `false`); crear con fecha pasada (vencida) y con fecha de hoy y futura (no vencidas); fecha `2026-02-30`, `2026-10` y formato libre dan 422 sobre `dueDate` y no cambian la tarea; quitar con `null` y con `""`; cambiar solo el estado conserva la fecha; terminar una vencida la deja `false` con la fecha intacta y volver a `pending` la vuelve `true`; reasignar no toca fecha ni veredicto; `isOverdue` enviado se ignora; la misma tarea con dos `today` distintos da veredictos distintos; sin `today` usa el día UTC; `today` mal formado da 422; `GET /tasks/:id` con token, sin token, inexistente y no numérico; `DELETE` sigue dando 404
- [ ] 2.5 Regenerar y commitear el diff de `.adonisjs/` arrancando el servidor; verificar que `git status` no deja generados sin commitear

## 3. Interfaz

- [ ] 3.1 Añadir `dueDate` e `isOverdue` al tipo `Task`, la llamada de lectura individual y `dueDate` a la actualización en `lib/api.ts`, con el día local del dispositivo (`AAAA-MM-DD`) como `today` en todas las llamadas de tareas, y la etiqueta «la fecha de vencimiento» en la traducción de errores; verificar con `npm run build`
- [ ] 3.2 Crear la página `/tasks/:id` (título, campo de fecha nativo con guardado automático solo si la fecha está completa, botón «Quitar fecha» sin confirmación, aviso «Vencida» con texto e icono, mensaje junto al campo si se rechaza, aviso si no se encuentra la tarea y enlace de vuelta a la lista), reutilizando `Alert`, `Button`, `Card`, `Input` y `Label`; verificar en el navegador cada caso, incluido que la fecha vuelve a la guardada si falla el guardado
- [ ] 3.3 Registrar `/tasks/:id` dentro de `ProtectedRoute` y hacer que el título de cada fila de la lista enlace a ella sin mostrar fecha ni marca de vencida en la lista; verificar en el navegador que sin sesión redirige a `/login` y que la lista y el formulario de creación no ofrecen ni muestran fechas
- [ ] 3.4 Ejecutar `npm run build` y `npm run lint` en `frontend/` y `npm run typecheck` y `npm run lint` en `backend/`; verificar que terminan sin errores
- [ ] 3.5 Recorrido final en el navegador con dos cuentas: poner una fecha pasada (aparece «Vencida»), aplazarla, quitarla, terminar la tarea desde la lista y reabrir la página, y comprobar que la lista no muestra fechas ni marcas; verificar que coincide con los escenarios de `specs/tasks/spec.md`
