# Design

## Context

Ver `proposal.md` (Why / What Changes). Estado actual relevante:

- El backend solo tiene la capability de cuentas: `/api/v1/auth/*` y `/api/v1/account/*`, con el grupo protegido por `middleware.auth()` y respuestas envueltas con `serialize()` y transformers.
- El esquema se genera desde las migraciones (`database/schema.ts`); los modelos solo añaden relaciones y lógica.
- El frontend concentra las llamadas a la API en `lib/api.ts` (que ya traduce errores de VineJS al castellano), guarda la sesión en `auth/` y protege rutas con `ProtectedRoute` / `PublicOnlyRoute`. `components/ui/` solo tiene `alert`, `button`, `card`, `input` y `label`.
- Hoy login, registro y direcciones desconocidas redirigen a `/profile`.

## Goals / Non-Goals

**Goals:**
- Tres operaciones HTTP (listar, crear, actualizar) con el estilo del backend actual.
- Una pantalla `/tasks` que sigue el patrón de las páginas de auth y reutiliza los componentes que ya hay.

**Non-Goals:**
- Tests, base de pruebas y dependencias nuevas.
- Fecha de vencimiento (ni columna, ni campo en la API, ni UI).
- Ordenación, filtros, agrupado, paginación, borrado, lectura individual, edición del título, endpoints de equipo, refresco automático.

## Decisions

**1. Tabla `tasks` con `title`, `status` y `assignee_id`.** `status` es texto con default `pending`; `assignee_id` referencia a `users` y es obligatorio, porque una tarea nace siempre con responsable. Sin columna de fecha de vencimiento. Se sigue el flujo del repo: migración → `node ace migration:run` regenera `schema.ts` → el modelo solo añade la relación `assignee` (belongsTo `User`). El conjunto de estados vive en un único sitio del backend (constante compartida por el validador y el modelo) para que el 422 y la columna no diverjan.

**2. Estados con identificadores en inglés; etiquetas solo en la interfaz.** La API usa `pending`, `in_progress`, `done`. El frontend mantiene un único mapa valor → etiqueta (Pendiente, En curso, Hecho). Alternativa descartada: guardar o enviar los textos en castellano, que acopla la API a la presentación.

**3. Validación con VineJS, en `app/validators/`.** Crear: `title` obligatorio con recorte de espacios, de modo que ausente, vacío o en blanco dan el mismo 422 `required`. Actualizar: `status` (enum cerrado) y `assigneeId` (número que debe existir en `users`), ambos opcionales; si no llega ninguno, 422. Los campos no declarados se descartan, lo que cumple «otros campos en la petición se ignoran» al crear y «el título no se actualiza». Sin `maxLength` en el título: el umbral es un punto abierto (PA-9) y no se inventa uno; el requisito de no recortar en silencio se cumple porque nunca se trunca.

**4. Sin ordenación explícita.** El listado hace un `all()` sin `orderBy`. Es una decisión consciente, recogida como punto abierto en el proposal, y el orden resultante no es contrato. El frontend pinta las tareas en el orden recibido y, al crear, añade la nueva al final de lo que ya tiene; no reordena.

**5. Qué se expone del responsable.** Un transformer de tarea devuelve `id`, `title`, `status` y `assignee: { id, fullName }`; nunca el correo ni el resto del usuario. Se lee con la relación precargada (`preload`) para no hacer una consulta por tarea. La pantalla usa solo `fullName` (o «Sin nombre»); el `id` está para poder usar `assigneeId` en la actualización por API. No se incluyen fechas de la tarea en la respuesta, para no dejar preparada ninguna fecha en el contrato.

**6. Rutas.** Un grupo `tasks` bajo `/api/v1`, con `middleware.auth()`: `GET /tasks` (index), `POST /tasks` (store) y `PATCH /tasks/:id` (update). Un `id` inexistente da 404. No se registra ninguna otra ruta, de modo que lectura individual y borrado devuelven el 404 normal del framework. El responsable al crear sale de `auth.getUserOrFail()`, nunca del cuerpo.

**7. Frontend: página `/tasks` y llamadas en `lib/api.ts`.** Se añaden `listTasks`, `createTask` y `updateTask` en `lib/api.ts` y el tipo `Task` en `lib/types.ts`. La etiqueta de campo `title` se añade a la traducción de errores («el título», lo que produce «Falta rellenar el título.»). La ruta `/tasks` va dentro de `ProtectedRoute`. La página compone `Card`, `Input`, `Button`, `Label` y `Alert`, con el mismo estilo que `login-page`. El formulario de creación reutiliza `use-auth-form` solo si encaja sin tocarlo; si no, un estado local equivalente (cargando, error de campo, aviso general).

**8. Cambio de estado: tres botones por fila, no un desplegable.** Cada fila muestra Pendiente / En curso / Hecho como botones (el actual, marcado) para cambiar en un clic, sin diálogo. No existe un componente `select` en `components/ui/` y se evita generarlo. Se actualiza la fila con la tarea devuelta por la API; si falla, se muestra un aviso y la fila conserva el estado anterior. Sin actualización optimista: es más simple y no puede mostrar un estado que el servidor no aceptó.

**9. Inicio en `/tasks`.** `PublicOnlyRoute` y el comodín `*` redirigen a `/tasks`; `login` y `register` terminan allí, porque dependen de esas redirecciones. `/profile` se mantiene y gana un enlace «Tareas»; la lista gana un enlace al perfil. La redirección de `ProtectedRoute` a `/login` no cambia. Esto es lo que modifica la capability `auth`.

**10. Estado vacío.** Cuando la lista llega vacía se muestra un texto que explica qué es la lista del equipo, junto al formulario de creación (siempre visible), en lugar de una tabla vacía.

## Risks / Trade-offs

- [Sin orden definido, el orden puede variar entre peticiones o motores] → Es un punto abierto declarado; en SQLite el orden de inserción es el habitual, pero no se promete.
- [Sin tests, las regresiones solo se detectan a mano] → Decisión del change; cada grupo de tareas se verifica con comandos concretos (`npm run typecheck`, `npm run build`, `npm run lint`, peticiones con `curl` y comprobación en el navegador).
- [Cualquiera puede cambiar el estado o responsable de cualquier tarea, y pasar de `done` a otro estado es barato por error] → Es la regla de producto (PA-7 abierta); no se añaden confirmaciones.
- [Sin tope de longitud del título, un título enorme rompe el diseño de la fila] → La fila trunca visualmente con CSS sin tocar el dato guardado; el umbral queda por decidir.
- [`assigneeId` por API sin forma de descubrir ids más allá de los que ya salen en el listado] → Aceptado: no hay endpoints de equipo.
- [Cambiar el inicio de `/profile` a `/tasks` altera comportamiento visible de `auth`] → Se refleja como delta MODIFIED sobre `auth`.

## Migration Plan

Se añade una migración nueva y reversible (crea la tabla `tasks`); `node ace migration:run` la aplica y regenera `schema.ts`, y `migration:rollback` la deshace. No toca datos existentes. Se commitean los diffs regenerados de `database/schema.ts` y `.adonisjs/`.
