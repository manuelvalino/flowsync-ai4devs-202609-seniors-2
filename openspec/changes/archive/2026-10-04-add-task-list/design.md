# Design

## Context

Los motivos están en el proposal y los requisitos en los deltas `specs/tasks/spec.md` y `specs/auth/spec.md`. De partida:

- **Backend.** Las tareas tienen que seguir las convenciones del proyecto:
  - El esquema de base de datos se genera a partir de las migraciones y los modelos no declaran columnas.
  - Las rutas referencian el mapa de controladores generado.
  - Toda respuesta sale por `serialize()` con un transformer, envuelta en `{ data }`.
  - La validación usa VineJS 4 con `vine.create`.
  - El guard por defecto es el de access tokens y los grupos se protegen con `middleware.auth()`.
  - El bodyparser convierte las cadenas vacías en `null`.
- **Frontend.**
  - `src/lib/api.ts` es el único punto de contacto con la API y traduce los errores de VineJS a castellano con `FIELD_LABELS` y `translate`.
  - El patrón de páginas y rutas es el del login: `ProtectedRoute`/`PublicOnlyRoute`, `useAuth` para el token y los componentes de `src/components/ui/`.
  - En esa carpeta solo hay Alert, Button, Card, Input y Label. No hay ningún componente de selección, pero `radix-ui` ya está en las dependencias, así que el `Select` de shadcn se puede traer sin añadir ninguna.

## Goals / Non-Goals

**Goals:**
- Una única entidad de tarea y tres endpoints, expuestos con los mismos patrones que la parte de auth.
- Que la respuesta del responsable no pueda filtrar datos de su cuenta por accidente, ni ahora ni cuando el modelo de usuario crezca.
- Una pantalla de tareas hecha con componentes de shadcn/ui (los que ya existen más `Select`), sin dependencias npm nuevas.

**Non-Goals:**
- Refresco en tiempo real o por polling (E3-2).
- Paginación: la lista se devuelve entera.
- Ordenación explícita (PA-3), que queda como punto abierto.
- Optimizar el rendimiento más allá de evitar el N+1 al cargar responsables.
- Tests de cualquier tipo, porque este change va sin tests por decisión expresa.

## Decisions

### D1 — Modelo de datos: tabla `tasks`

Las columnas son:
- `id`, autoincremental.
- `title`: `string(255)`, no nulo.
- `status`: `string`, no nulo, por defecto `'pending'`.
- `assignee_id`: entero, no nulo, con clave ajena a `users.id` y `ON DELETE CASCADE`, igual que los tokens.
- `created_at` y `updated_at`, que no se exponen en la API.

No hay columna de fecha de vencimiento ni ningún campo reservado para ella.

El modelo `Task` extiende el esquema generado, declara `belongsTo(() => User, { foreignKey: 'assigneeId' })` como `assignee` y exporta la lista de estados como una constante `as const` en el propio modelo (`TASK_STATUSES = ['pending', 'in_progress', 'done']`). Validador y frontend toman los valores de esa constante; el frontend tiene su espejo en `types.ts`.

- **Por qué `string` y no un `enum` de base de datos:** SQLite no tiene enums, y Knex los emula con un CHECK que complica las migraciones futuras. El conjunto cerrado se impone en el validador, que es el único sitio por el que se escribe. Se descarta añadir además un CHECK en la base de datos: protegería de escrituras fuera de la API, pero esas escrituras no existen hoy.
- **Por qué `assignee_id` y no `user_id`:** en este dominio, quien crea la tarea y quien la lleva pueden ser personas distintas en cuanto se reasigna. Se descarta guardar también al creador (`created_by`), porque ningún requisito lo usa.

### D2 — Rutas y controlador

Bajo `/api/v1`, en un grupo con `.use(middleware.auth())`:

| Método | Ruta | Acción |
|---|---|---|
| GET | `/tasks` | `TasksController.index` |
| POST | `/tasks` | `TasksController.store` |
| PATCH | `/tasks/:id` | `TasksController.update` |

- **Por qué PATCH y no PUT:** la actualización es parcial; los dos campos son opcionales.
- **Restricción del parámetro:** `:id` se restringe a número con el matcher de la ruta (`.where('id', router.matchers.number())`). Un id no numérico cae en 404 de ruta inexistente, igual que un GET o un DELETE sobre `/tasks/:id`, que no existen.
- **Tarea inexistente:** `update` usa `Task.findOrFail`, que responde 404.
- **Código de creación:** `store` responde 201 con `response.status(201)`. Se descarta mantener el 200 del registro: aquel es un intercambio de credenciales y este crea un recurso.

### D3 — Validadores (`app/validators/task.ts`)

```ts
const title = () => vine.string().trim().minLength(1).maxLength(255)

export const createTaskValidator = vine.create({ title: title() })

export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional(),
  assigneeId: vine.number().withoutDecimals().exists({ table: 'users', column: 'id' }).optional(),
})
```

- **Campos ajenos al validador.** VineJS solo devuelve los campos que valida. En la creación se descartan `status`, `assigneeId` o cualquier fecha; en la actualización, `title`. Es el comportamiento que piden los deltas ("se ignora"), sin código adicional. Se descarta rechazarlos con 422: sería más estricto que el resto de la API y rompería clientes que envían el objeto entero.
- **Título vacío o en blanco:** `""` llega como `null` y da `required`. `"   "` se recorta a `""` y da `minLength`. Los dos son 422 sobre `title`, como pide el delta. La web nunca llega a enviar el segundo caso (ver D6).
- **Comprobación del responsable:** `vine.number().exists({ table, column })` existe en las bindings de Lucid para VineJS (firma comprobada en el provider de base de datos). Un `assigneeId` inexistente da 422 con la regla `database.exists`.

### D4 — Transformers: el responsable solo con id y nombre

- **`AssigneeTransformer`** hace `pick(['id', 'fullName'])` sobre `User`. Es un transformer distinto de `UserTransformer` a propósito: si se reutilizara aquel, la lista expondría email, fechas e iniciales, y cualquier campo que se añada a `UserTransformer` en el futuro se filtraría a la lista sin que nadie lo decida (nota de la historia E3-1).
- **`TaskTransformer`** devuelve `{ ...pick(['id', 'title', 'status']), assignee: AssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)) }`.
- **Carga del responsable:**
  - `index` hace `Task.query().preload('assignee')`, sin `orderBy`, para evitar el N+1.
  - `store` asigna `assigneeId = auth.user.id` y `status = 'pending'` (el valor por defecto de la columna también lo garantiza) y después carga la relación.
  - `update` hace `merge` + `save` y vuelve a cargar `assignee`, por si ha cambiado.

### D5 — Cliente API y tipos en el frontend

- **`types.ts`:**
  - `TaskStatus = 'pending' | 'in_progress' | 'done'`.
  - `Task = { id, title, status, assignee: { id, fullName: string | null } }`.
  - `TASK_STATUS_LABELS: Record<TaskStatus, string>` con Pendiente, En curso y Hecho, el único sitio donde viven las etiquetas.
- **`api.ts`:**
  - Se añaden `listTasks(token)`, `createTask(token, { title })` y `updateTask(token, id, { status?, assigneeId? })`.
  - El cliente expone `assigneeId` aunque la web no lo use, para que el contrato de la API quede reflejado en un solo sitio.
  - Se añade `title: 'el título'` a `FIELD_LABELS`, con lo que `required` produce "Falta rellenar el título." y `maxLength` "el título no puede superar los 255 caracteres.".
  - La minúscula inicial es la misma rareza que ya tienen los mensajes de auth. No se toca, para no modificar los mensajes que fija la spec viva de `auth`.

### D6 — Página de tareas

La ruta `/tasks` es una `TasksPage` dentro de `ProtectedRoute`. La página usa una `Card` como contenedor, igual que el perfil. En la cabecera lleva el título "Tareas" y un `Link` al perfil.

- **Formulario de creación:**
  - Tiene un `Input` "Título" y un `Button` "Crear tarea".
  - Reutiliza `useAuthForm(['title'])` para el estado de envío y el reparto de errores entre el campo y el aviso general. Pese al nombre, el hook es genérico. Renombrarlo ahora tocaría el login y el registro sin necesidad, así que solo se documenta.
  - Antes de enviar recorta el título. Si queda vacío, llama a `failWith('title', 'Falta rellenar el título.')` y no hace la petición.
  - El atributo `maxLength` no se pone en el input, porque recortaría lo escrito en silencio y eso contradice CA-3 de E2-2. El servidor es quien avisa.
  - Si la creación va bien, la tarea devuelta se añade al final del estado local y el campo se vacía, sin volver a pedir la lista.
- **Lista:**
  - Se carga con `listTasks` al montar la página, con estado de carga (spinner) y de error (`Alert`).
  - Se pinta en el orden en que llega, sin ordenar en el cliente.
  - Cada fila muestra el título, `assignee.fullName ?? 'Sin nombre'` y un `Select` de estado (`src/components/ui/select.tsx`, traído con `npx shadcn@latest add select`). Sus opciones salen de `TASK_STATUS_LABELS` y su `value` es el estado actual. El trigger lleva un `aria-label` con el título de la tarea (por ejemplo, "Estado de «Preparar la demo»"), porque si no todos los selectores de la lista se anunciarían igual.
  - Con la lista vacía se muestra un texto explicativo que señala el formulario.
- **Por qué un `Select` de shadcn:**
  - Frente a tres botones: la fila es más compacta y el estado se lee como un valor, no como un botón pulsado.
  - Frente a un `<select>` nativo: mantiene el aspecto del resto de componentes de `src/components/ui/`, y Radix ya resuelve el teclado y la accesibilidad. No añade dependencias, porque `radix-ui` ya está instalado.
- **Excepción a "los componentes de `ui/` no se editan a mano":** el registro de shadcn sirve ahora el `Select` con `import { cn } from "cn"` y el CLI instala el paquete `cn` como dependencia nueva. Pasa con todas las versiones del CLI probadas, de la 3.8.5 a la 4.21.1. Para que no entre esa dependencia y el componente use el mismo `cn` que los demás, se revierte `cn` en `package.json` y `package-lock.json` y en `select.tsx` se cambia solo esa línea a `@/lib/utils`. Si se regenera el componente, hay que repetir el retoque.
- **Cambio de estado:**
  - Es optimista. El selector cambia al instante y se llama a `updateTask`.
  - Si la llamada falla, se restaura el estado anterior de esa fila y se muestra el error en un `Alert` sobre la lista.
  - El handler compara el valor elegido con el actual. Si son iguales no hace la petición.
  - Se descarta deshabilitar el selector mientras dura la petición: obliga a esperar y contradice "un gesto". El riesgo de que dos cambios rápidos acaben fuera de orden se acepta (ver Riesgos).

### D7 — La lista como pantalla de inicio

- En `app-routes.tsx` el comodín `*` pasa a redirigir a `/tasks`.
- En `public-only-route.tsx` la redirección con sesión pasa a `/tasks`.
- En `profile-page.tsx` se añade un `Link` a `/tasks`.
- El comentario de `profile-page.tsx` que dice que tras el logout se va a `/login` sigue siendo válido.

Es justo lo que describe el delta MODIFIED de `auth`.

## Risks / Trade-offs

- **[Orden indefinido]** Sin `orderBy`, SQLite devuelve en la práctica el orden de inserción, pero nada lo garantiza y puede cambiar con índices o borrados. → El proposal lo declara como punto abierto (PA-3) y el delta lo deja escrito como "sin orden garantizado". Nadie debería apoyarse en él.
- **[Cambios rápidos fuera de orden]** Si se eligen dos estados muy seguidos, las respuestas pueden llegar en otro orden y la fila puede quedar mostrando el estado de la última respuesta en llegar, no el de la última elección. → Se acepta para el MVP. Si molesta, la mitigación es ignorar las respuestas de una petición ya superada, con un contador por fila.
- **[Lista obsoleta]** Lo que cambian otras personas no se ve hasta recargar. → Está fuera de alcance de forma explícita (E3-2).
- **[Lista sin paginar]** Con las 200 tareas que contempla el PRD (RNF-5) cabe de sobra en una respuesta. → Se revisará si el volumen crece.
- **[Responsable borrado]** Con `ON DELETE CASCADE`, borrar un usuario borraría sus tareas. Hoy no hay forma de borrar usuarios. → Se acepta. Se elige por coherencia con los tokens y porque `SET NULL` obligaría a tratar un responsable nulo que ningún requisito contempla.
- **[Token revocado durante el uso]** Un 401 en la página de tareas solo muestra el aviso "Tu sesión ha caducado…". No cierra la sesión local, igual que pasa hoy en el resto de la web. → Es una limitación ya conocida de la capability de auth, que no se amplía aquí.
- **[Código generado]** Las rutas y el controlador nuevos cambian `backend/.adonisjs/`. → Se regenera arrancando el servidor de desarrollo y el diff se commitea, como indica CLAUDE.md.

## Migration Plan

Una única migración nueva, que solo añade. `node ace migration:run` la aplica y regenera `database/schema.ts`. La vuelta atrás es `node ace migration:rollback`, que hace un `dropTable`. No hay datos que migrar.
