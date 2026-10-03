# Design

## Context

Ver `proposal.md` (Why / What Changes). Estado actual relevante:

- Existe la capability `tasks` (listar, crear, actualizar) con `TaskTransformer`, validadores en `app/validators/task.ts` y rutas bajo `/api/v1/tasks` con `middleware.auth()`. El `PATCH` ya rechaza con 422 un cuerpo sin cambios y `null` en `status`/`assigneeId`.
- El bodyparser tiene `convertEmptyStringsToNull: true`, así que una cadena vacía llega a los validadores como `null`.
- `start/validator.ts` transforma las fechas de VineJS a `DateTime` de Luxon.
- El frontend concentra las llamadas en `lib/api.ts`, protege rutas con `ProtectedRoute` y no tiene ningún componente de fecha.

## Goals / Non-Goals

**Goals:**
- Una única regla de vencimiento, en el backend, evaluada en cada lectura con el día de calendario de quien mira.
- La mínima superficie de interfaz para poner, quitar y ver el vencimiento.

**Non-Goals:**
- Tests, dependencias nuevas, componentes de fecha nuevos.
- Persistir el veredicto, jobs o procesos programados.
- Detalle completo de tarea, ordenar o filtrar por fecha, notificaciones, recordatorios, recurrencia.

## Decisions

**1. `due_date` anulable, de calendario.** Migración nueva y reversible que añade una columna de fecha (`date`) anulable a `tasks`, sin valor por defecto: las tareas existentes quedan sin fecha y siguen siendo válidas. No hay columna `is_overdue`. `database/schema.ts` se regenera con `node ace migration:run`. La fecha se maneja como día de calendario sin hora; para evitar errores de huso, el veredicto compara solo días en formato `AAAA-MM-DD` (comparación de cadenas ISO o `DateTime.toISODate()`), nunca instantes. El detalle de cómo Lucid serializa la columna (`DateTime` o texto) se resuelve al implementar, comprobando que la fecha leída coincide con la guardada.

**2. La regla vive en el modelo, una sola vez.** `Task` expone un método (`isOverdueOn(today)`) que devuelve `true` solo si hay `dueDate`, `dueDate < today` y `status !== 'done'`. Nadie más reimplementa la comparación: el transformer lo llama. Con este diseño, volver de `done` con fecha pasada vuelve a vencer sin código extra (PA-7), y cruzar la medianoche cambia el veredicto sin tocar nada, porque se calcula en cada lectura. Alternativa descartada: columna o job que marque las tareas, incompatible con el huso de cada persona.

**3. El día de referencia llega por `?today=AAAA-MM-DD`.** Un parámetro de consulta en todas las operaciones que devuelven tareas (listar, leer, crear, actualizar), en vez de una cabecera, evita un asunto de CORS con cabeceras propias. Un validador compartido lo lee de `request.qs()`: opcional, fecha válida `AAAA-MM-DD`; mal formado da 422 sobre `today`. Sin él se usa el día UTC del servidor (`DateTime.utc().toISODate()`). El validador de `today` se ejecuta aparte del cuerpo para que un `today` en la query nunca se confunda con un campo del cuerpo.

**4. `TaskTransformer` recibe el día.** Se añade un segundo argumento al constructor (`new TaskTransformer(task, today)`; `transform(data, today)`), que devuelve `dueDate` (`AAAA-MM-DD` o `null`) e `isOverdue`. Así toda representación incluye `isOverdue` y ningún controlador lo calcula a mano. El `id` del responsable y su `fullName` siguen siendo lo único que se expone del usuario.

**5. Validación de `dueDate`.** Se declara con VineJS como fecha con formato estricto `AAAA-MM-DD`, anulable y opcional: ausente = no tocar, `null` (o cadena vacía, que el bodyparser convierte en `null`) = quitar. Se comprueba al implementar que `2026-02-30`, `2026-10` y otros formatos dan 422 sobre `dueDate`; si el validador de fecha de VineJS los dejara pasar, se añade una comprobación calendaria explícita. No se rechazan fechas pasadas. `isOverdue` no se declara en ningún validador, por lo que se descarta si llega.

**6. Rutas.** `GET /api/v1/tasks/:id` (`show`) se añade al grupo existente, con `auth` y el mismo 404 de `findOrFail` que ya usa `update`. `POST` y `PATCH` aceptan `dueDate`; el `PATCH` pasa a ser un cuerpo válido si trae `status`, `assigneeId` o `dueDate`, y sigue rechazando `null` en `status` y `assigneeId` (en `dueDate` `null` es lo que quita la fecha).

**7. Frontend: página mínima `/tasks/:id`.** Es la superficie de «abrir la tarea» y se registra dentro de `ProtectedRoute`. Muestra título, fecha, el botón «Quitar fecha» y, si `isOverdue`, un aviso con texto «Vencida» e icono (no solo color), reutilizando `Alert`, `Button`, `Card`, `Input` y `Label`. No muestra ni edita responsable ni estado. El título de cada fila de la lista pasa a ser un enlace a ella; la fila no muestra nada más.

**8. Campo de fecha nativo y guardado automático.** Se usa `<input type="date">`, sin dependencias ni componente nuevo. `onChange` solo guarda cuando el valor es una fecha completa: un campo incompleto entrega cadena vacía y por eso quitar la fecha es una acción explícita («Quitar fecha»), no borrar el campo, de modo que una fecha a medias nunca borra la guardada. El guardado envía `PATCH` con `dueDate` y se muestra lo que devuelve el servidor, igual que el cambio de estado: sin actualización optimista. Si falla, el campo vuelve a la fecha guardada y se muestra el mensaje.

**9. El cliente envía su día.** `lib/api.ts` añade `today` (fecha local del dispositivo en formato `AAAA-MM-DD`, calculada con `Date` local, no UTC) a las llamadas de tareas. Es la única lógica de fechas del cliente: no calcula ningún veredicto.

**10. La lista no cambia.** La respuesta del listado ya trae `dueDate` e `isOverdue` (misma representación), pero `tasks-page.tsx` no los pinta. Los tipos de `Task` en el frontend los incluyen.

**11. Traducción de errores.** `lib/api.ts` añade la etiqueta del campo `dueDate` («la fecha de vencimiento») para que un 422 se explique junto al campo en castellano.

## Risks / Trade-offs

- [Un `today` del cliente manipulado cambia el veredicto que ve esa persona] → Aceptado: el veredicto solo afecta a su lectura y nunca se persiste.
- [Reloj del dispositivo equivocado da un día equivocado] → Aceptado; es el coste de respetar el huso de cada persona.
- [Fechas y husos en Lucid/SQLite: una conversión a instante podría desplazar la fecha un día] → La comparación y la serialización usan solo `AAAA-MM-DD`; se verifica al implementar escribiendo y leyendo una fecha.
- [Campo de fecha nativo: la forma de elegir la fecha cambia según navegador] → Aceptado; no hay componente de fecha en el proyecto ni se añade ninguno.
- [Dos personas cambiando la fecha a la vez (PA-8)] → Gana el último guardado, sin control de concurrencia.
- [Sin tests, las regresiones de la regla del borde (hoy no vence) solo se detectan a mano] → Decisión del change; cada grupo de tareas se verifica con peticiones concretas a la API con `today` distintos.
- [Un 401 durante la sesión sigue sin cerrarla] → Igual que en la lista; fuera de este change.

## Migration Plan

Una migración nueva y reversible (`due_date` anulable). `node ace migration:run` la aplica y regenera `schema.ts`; `migration:rollback` la deshace. No toca las tareas existentes. Como la base de desarrollo y la de pruebas son el mismo fichero, se hace una copia de `tmp/db.sqlite3` antes de migrar y se prueba contra una copia aislada, no contra el estado real. Se commitean los diffs regenerados de `database/schema.ts` y `.adonisjs/`.
