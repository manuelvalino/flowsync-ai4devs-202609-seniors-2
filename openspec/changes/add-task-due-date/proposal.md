# Proposal

## Why

Hoy una tarea no tiene fecha de vencimiento, así que nadie puede comprometerse con una fecha ni saber que algo se ha pasado de plazo. La historia FS-118 (RF-13, RF-14 y RF-15 del PRD) lo pide así: la fecha es opcional, se pone y se quita al abrir la tarea, y el vencimiento se ve ahí y no en la lista. El change anterior (`add-task-list`) dejó la lista en marcha, pero ninguna forma de abrir una tarea.

## What Changes

- **Fecha de vencimiento opcional** en cada tarea. Es una fecha de calendario sin hora, y la API la transporta como `dueDate` en formato `YYYY-MM-DD`, o `null` si no hay fecha.
  - Se puede indicar al crear (opcional) y al actualizar. Se acepta también una fecha anterior a hoy.
  - Para quitarla hay que enviarla explícitamente vacía (`null` o `""`). Si no se envía el campo, la fecha no cambia.
  - Si la fecha no existe o no tiene el formato, la API responde 422 y la tarea conserva la fecha que tenía.
- **Veredicto de vencimiento calculado por el backend:**
  - **Regla.** Toda representación de una tarea incluye el booleano `isOverdue`, que es verdadero solo si se cumplen las tres condiciones: la tarea tiene fecha, esa fecha es anterior a hoy y su estado no es `done`.
  - **Se calcula en cada lectura.** No se guarda en ninguna columna, no hay ningún proceso programado que lo marque, y si el cliente lo envía se ignora.
  - **El "hoy" es el de quien mira.** El cliente indica su zona horaria IANA en la cabecera `X-Timezone`. Si falta, se usa el día UTC; si no es una zona válida, se responde 422.
  - **El frontend no lo calcula.** Pinta lo que dice la API.
- **Lectura individual de una tarea**, `GET /api/v1/tasks/:id`, con la misma representación que el listado y 404 si la tarea no existe. Es la superficie mínima para "abrir la tarea". **BREAKING** respecto a la spec viva, que exige un 404 porque esa operación no existía.
- **La representación de la tarea crece:**
  - Pasa a ser `{ id, title, status, assignee, dueDate, isOverdue }` en todas las respuestas, también en el listado.
  - **BREAKING** respecto al requisito vivo que limitaba el listado a `id`, `title`, `status` y `assignee`.
- **Crear acepta `dueDate`:**
  - `POST /tasks` admite `dueDate` como campo opcional; los demás campos siguen ignorándose.
  - **BREAKING** respecto al escenario vivo "La creación no admite fecha".
  - El formulario de la web **no cambia**: sigue sin ofrecer ni sugerir fecha (CA-1).
- **En la web, abrir una tarea desde la lista:**
  - El título de cada fila abre un panel mínimo con:
    - el título;
    - un campo de fecha;
    - "Quitar fecha";
    - una señal propia de "Vencida", con texto e icono, no solo color.
  - El cambio se guarda solo, sin botón ni confirmación, y una fecha incompleta o imposible no se guarda y se explica junto al campo.
  - Una tarea sin fecha no recibe ningún aviso.
- **La lista no cambia lo que muestra:** sigue con título, responsable y estado, sin fecha y sin marca de vencida.
- **No se incluye:**
  - Notificaciones ni recordatorios.
  - Recurrencia.
  - Ordenar o filtrar por fecha.
  - La pantalla de detalle completa de la tarea.
  - Tests de cualquier tipo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tasks`: requisitos de la capability que cambian.
  - **La representación de la tarea** incorpora `dueDate` e `isOverdue`.
  - **Crear** acepta `dueDate` opcional.
  - **Actualizar** acepta poner, cambiar y quitar la fecha.
  - **Operaciones de la API**: pasan de tres a cuatro, con la lectura individual.
  - **Requisitos nuevos**:
    - la fecha de vencimiento;
    - la regla de vencimiento y el día de referencia de quien mira;
    - la lectura individual;
    - el panel que abre una tarea desde la lista.
  - Los requisitos de la pantalla de la lista y del formulario de creación no cambian.

## Impact

- **Backend:**
  - Migración que añade a `tasks` la columna `due_date`, de tipo fecha y nullable. Se regenera `database/schema.ts`.
  - El modelo `Task` incorpora la regla de vencimiento.
  - Cambian los validadores de creación y actualización.
  - Validación de la cabecera `X-Timezone`.
  - `TaskTransformer` recibe el día de referencia.
  - El controlador gana la acción `show` y hay una ruta nueva `GET /tasks/:id`. Se regenera `backend/.adonisjs/`.
- **Frontend:**
  - `src/lib/api.ts`: `getTask`, `dueDate` en `updateTask` y la cabecera `X-Timezone` en las peticiones. Los tipos de `src/lib/types.ts` se amplían.
  - Un panel nuevo para abrir la tarea, con el `Dialog` de shadcn, y el título de la fila como disparador.
  - Ninguna dependencia npm nueva: `radix-ui` ya está instalado, y el `cn` del componente generado se retoca igual que en `select.tsx`.
- **Specs:** delta sobre `tasks`.
- **Datos:** la migración solo añade una columna nullable, y las tareas que ya existen quedan sin fecha. La base de desarrollo es la misma que usan los tests, así que migrar también cambia ese estado local.

## Puntos abiertos

- **Superficie de "abrir la tarea" (PA-6).**
  - Este change añade solo la lectura individual y un panel mínimo, sin pantalla de detalle.
  - Cuando exista el detalle completo, el panel tendrá que absorberse en él o sustituirse.
- **Volver desde "Hecho" con la fecha pasada (PA-7).** La regla se calcula al leer, así que la tarea vuelve a estar vencida sin más. La historia no lo puede escribir todavía como criterio.
- **Dos personas cambiando la fecha a la vez (PA-8).** No se aborda: gana la última escritura.
- **Criterios marcados [PROPUESTO] en la historia.** Se implementan CA-4 y de CA-13 a CA-20 tal y como están escritos, aunque sigan pendientes de validación de producto.
- **Sin tests.**
  - La historia pide pruebas en FS-118.2, FS-118.3 y FS-118.5, y este change va sin tests por decisión expresa.
  - La comprobación es manual, y la regla de vencimiento, el ticket de más riesgo, queda sin cobertura automática.
