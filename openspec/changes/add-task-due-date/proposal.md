# Proposal

## Why

Hoy una tarea no puede comprometerse con un plazo ni avisar de que se ha pasado de él. La historia FS-118 pide poner, cambiar y quitar una fecha de vencimiento, y que quien abre una tarea vea sin cálculo mental si está vencida. Todo ello sin que la lista principal cambie ni penalice a las tareas sin fecha.

## What Changes

- **Fecha de vencimiento** opcional en la tarea, de calendario y sin hora (`dueDate`, formato `AAAA-MM-DD` o `null`). Se puede poner al crear y al actualizar, cambiar y quitar; quitarla es enviarla explícitamente vacía. Se acepta una fecha anterior a hoy: la tarea nace vencida y no se rechaza. Una fecha inexistente o incompleta da 422 sobre `dueDate` y la tarea conserva la que tuviera.
- **Vencimiento calculado en el backend**: la representación de una tarea gana `isOverdue` (booleano). Una tarea está vencida si tiene fecha, esa fecha es anterior a hoy y su estado no es `done`. Se calcula en cada lectura, nunca se persiste, no hay jobs ni procesos nocturnos, y si el cliente envía `isOverdue` se ignora.
- **El día de referencia lo manda el cliente**: toda operación que devuelve tareas admite `?today=AAAA-MM-DD`; el servidor devuelve el veredicto. Sin ese parámetro usa el día UTC del servidor; con un valor mal formado responde 422.
- **Lectura individual**: `GET /api/v1/tasks/:id`, la superficie mínima que necesita «al abrir la tarea». Pasan a ser cuatro las operaciones sobre tareas: listar, leer una, crear y actualizar. Sigue sin haber borrado ni endpoints de equipo.
- **Interfaz**: una página mínima `/tasks/:id`, a la que enlaza el título de cada fila de la lista, con el título, el campo de fecha (se guarda sola al cambiarla), un botón «Quitar fecha» sin confirmación y una señal «Vencida» que no depende solo del color. No es la pantalla de detalle completa: no muestra ni edita responsable ni estado. El cliente envía su día en cada llamada.
- **La lista no cambia lo que muestra**: título, responsable y estado, sin fecha y sin marca de vencida. El formulario de creación sigue pidiendo solo el título.
- **Sin tests.** Sin dependencias nuevas ni componentes de fecha nuevos (campo de fecha nativo).

## Capabilities

### New Capabilities

### Modified Capabilities
- `tasks`: la tarea gana fecha de vencimiento y `isOverdue`; el listado, la creación y la actualización pasan a manejarlos; se añade la lectura individual y la página mínima de una tarea; las operaciones ofrecidas pasan de tres a cuatro.

## Impact

- `backend/`: migración (columna de fecha anulable, reversible, sin tocar las tareas existentes), modelo, transformer (`dueDate`, `isOverdue`), validadores, controlador y una ruta nueva `GET /tasks/:id`; se regeneran `database/schema.ts` y `.adonisjs/`.
- `frontend/`: tipos y llamadas en `lib/api.ts` (con el día del cliente), página `/tasks/:id` dentro de la ruta protegida, y enlace desde el título en la lista.
- Sin dependencias nuevas.

## Puntos abiertos

- **Qué abre una tarea** (PA-6): la lectura individual y la página mínima son lo justo para esta historia; el detalle completo (editar título, responsable, estado) queda para otro change.
- **Volver de `done` a otro estado con la fecha pasada** (PA-7): como el veredicto se calcula en cada lectura, la tarea vuelve a estar vencida automáticamente; no se añade ninguna regla aparte.
- **Dos personas cambiando la fecha a la vez** (PA-8): gana el último guardado; no hay control de concurrencia.
- **Ordenar o filtrar por fecha**, notificaciones, recordatorios y recurrencia: fuera de alcance. El orden de la lista sigue sin decidirse.
