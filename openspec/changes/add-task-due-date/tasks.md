# Tasks

## 1. Datos y regla de vencimiento (backend)

- [x] 1.1 Crear una migración que añada a `tasks` la columna `due_date` (`date`, nullable), con un `down` que haga `dropColumn`. Verificar que `node ace migration:run` termina sin errores sobre la base con tareas, que `database/schema.ts` tiene `@column.date()` `dueDate: DateTime | null` en `TaskSchema`, y que las tareas existentes quedan con `due_date` `NULL`.
- [x] 1.2 Añadir a `Task` el método `isOverdueOn(today: string)` de D2: tiene fecha, `dueDate.toISODate() < today` y `status !== 'done'`. Verificar que `npm run typecheck` pasa.

## 2. API de tareas (backend)

- [x] 2.1 En `app/validators/task.ts`:
  - Añadir `dueDate` (`vine.date({ formats: ['YYYY-MM-DD'] }).nullable().optional()`) a `createTaskValidator` y a `updateTaskValidator`.
  - Crear `timezoneValidator` (campo `timezone`, opcional), con una regla personalizada `timezone` basada en `IANAZone.isValidZone`.

  Verificar que `npm run typecheck` pasa.
- [x] 2.2 `TaskTransformer` recibe `today` en el constructor y añade `dueDate` (`toISODate()` o `null`) e `isOverdue` (`isOverdueOn(today)`). Verificar que `npm run typecheck` señala las llamadas que todavía no pasan el día.
- [x] 2.3 En `TasksController`:
  - Un método privado que valide `X-Timezone` con `timezoneValidator` y devuelva `DateTime.now().setZone(tz ?? 'UTC').toISODate()`, que las cuatro acciones llaman antes de validar el cuerpo o tocar la base de datos.
  - `store` guarda `dueDate` con `DateTime.fromJSDate`, o `null` si no llega.
  - `update` fusiona `status` y `assigneeId` como hasta ahora y asigna `dueDate` solo si la clave está en el payload (`null` quita la fecha).
  - Una acción `show` nueva: `findOrFail`, cargar `assignee` y serializar.
  - Todas las respuestas pasan el día a `TaskTransformer.transform(..., today)`.

  Verificar que `npm run typecheck` pasa.
- [x] 2.4 Registrar `GET /tasks/:id` → `controllers.Tasks.show` en el grupo protegido, con el matcher numérico. Arrancar `npm run dev` para regenerar `backend/.adonisjs/` y verificar con `node ace list:routes` que hay exactamente cuatro rutas de tareas (GET lista, GET una, POST, PATCH) y ningún DELETE.
- [x] 2.5 Comprobar a mano con `curl` contra el servidor de desarrollo cada escenario API del delta, y verificar que cada respuesta coincide con su escenario:
  - Representación `{ id, title, status, assignee, dueDate, isOverdue }` en la lista, en la lectura de una tarea, en la creación y en la actualización.
  - **Lectura individual:** 200, también de una tarea ajena; 404 si no existe; 401 sin token. Sin DELETE.
  - **Crear:** sin fecha da `dueDate` `null` e `isOverdue` `false`; con fecha futura; con fecha pasada da 201 e `isOverdue` `true`. Se ignoran `status`, `assigneeId` e `isOverdue` enviados.
  - **Actualizar:**
    - poner, cambiar y quitar la fecha con `null` y con `""`;
    - omitir `dueDate` la conserva;
    - `"2026-02-30"`, `"05/10/2026"` y `"2026-10"` dan 422 sobre `dueDate` y conservan la fecha;
    - pasar a `done` y reasignar conservan la fecha;
    - `isOverdue: true` enviado se ignora.
  - **Regla:**
    - ayer da `true`, hoy `false`, mañana `false`, sin fecha `false`, `done` con fecha pasada `false`;
    - pasar a `done` da `false` y volver a `pending` da `true`;
    - aplazar la fecha da `false` y quitarla da `false`.
  - **Día de referencia:**
    - la misma tarea con `dueDate` igual al día UTC actual, pedida con `X-Timezone` `Pacific/Kiritimati` (UTC+14) y con `Pacific/Pago_Pago` (UTC−11), da veredictos distintos cuando en una de las dos zonas ya es el día siguiente;
    - sin cabecera, se usa el día UTC;
    - `X-Timezone: Marte/Olympus` da 422 sobre `timezone` en las cuatro operaciones, sin crear ni modificar nada.
- [x] 2.6 Pasar `npm run lint` y `npm run format` en `backend/` y verificar que terminan sin errores ni diff fuera de lo esperado.

## 3. Cliente API y tipos (frontend)

- [x] 3.1 Añadir a `Task` en `src/lib/types.ts` los campos `dueDate: string | null` e `isOverdue: boolean`. Verificar que `npm run build` compila.
- [x] 3.2 En `src/lib/api.ts`:
  - `request()` añade `X-Timezone` con `Intl.DateTimeFormat().resolvedOptions().timeZone` cuando existe.
  - Nueva `getTask(token, id)`.
  - `dueDate?: string | null` en `updateTask`.
  - `dueDate: 'la fecha de vencimiento'` en `FIELD_LABELS`.
  - En `translate`, un caso `date` con "Introduce una fecha válida.".

  Verificar que `npm run build` compila y que `npm run lint` pasa.

## 4. Abrir una tarea y su fecha (frontend)

- [x] 4.1 Traer `Dialog` con `npx shadcn@latest add dialog`. Revertir la dependencia `cn` en `package.json` y `package-lock.json` y cambiar en `dialog.tsx` el import de `cn` a `@/lib/utils`, como en `select.tsx`. Verificar:
  - que solo se crea `src/components/ui/dialog.tsx`;
  - que `git diff` no toca ningún otro componente de `ui/` ni las dependencias;
  - que `npm run build` compila.
- [x] 4.2 Crear `src/components/task-dialog.tsx` según D7:
  - **Carga:** al abrirse llama a `getTask`, con estado de carga y `Alert` si falla.
  - **Contenido:** el título como `DialogTitle`, un `Input type="date"` con la etiqueta "Fecha de vencimiento", "Quitar fecha" solo si hay fecha, y la señal "Vencida" (icono más texto, `role="status"`) solo si `isOverdue`.
  - **Sin fecha:** ningún aviso.
  - **Guardado:**
    - automático, con unos 500 ms de espera y respuestas obsoletas ignoradas;
    - el input lleva `min="1000-01-01"` y `max="9999-12-31"`, y solo se guarda si `validity.valid`;
    - si no es válido (`badInput`, `rangeUnderflow` o `rangeOverflow`), no guarda y muestra el mensaje junto al campo;
    - vaciar el campo quita la fecha;
    - si falla, vuelve a la fecha anterior con un `Alert`;
    - cerrar y "Quitar fecha" guardan al momento lo pendiente;
    - cada tarea devuelta se pasa por `onTaskChange`.

  Verificar que `npm run build` compila y que `npm run lint` pasa.
- [x] 4.3 En `src/pages/tasks-page.tsx`, convertir el título de cada fila en un `<button type="button">` que abre `TaskDialog` para esa tarea, y reemplazar la tarea en el estado local con lo que devuelva `onTaskChange`. La fila sigue sin pintar fecha ni marca. Verificar que `npm run build` compila.
- [x] 4.4 Pasar `npm run build`, `npm run lint` y `npm run format` en `frontend/` y verificar que terminan sin errores ni diff pendiente.

## 5. Comprobación integrada

- [x] 5.1 Con el backend y el frontend arrancados y dos cuentas, recorrer en el navegador los escenarios de "Abrir una tarea desde la lista" y verificar que se cumplen todos:
  - abrir con el ratón y con el teclado (Tab, Intro, Escape devuelve el foco);
  - poner una fecha y verla al instante;
  - quitarla sin confirmación;
  - una fecha pasada muestra "Vencida" de inmediato;
  - la fecha de hoy no la muestra;
  - sin fecha no hay avisos;
  - una fecha a medias o imposible no se guarda y se explica junto al campo;
  - teclear el año despacio, dígito a dígito y con pausas de más de un segundo, no guarda ninguna fecha intermedia (pestaña de red) ni hace aparecer "Vencida";
  - con el backend parado, vuelve a la fecha anterior con aviso;
  - cerrar y reabrir conserva el cambio;
  - cambiar la fecha de una tarea ajena;
  - la lista sigue sin fechas ni marcas;
  - el formulario de creación sigue con solo el título.

  Ejecutar `openspec validate add-task-due-date --strict` sin errores.
