# Design

## Context

Los motivos están en el proposal y los requisitos en el delta `specs/tasks/spec.md`. Este es el estado del que se parte, tras `add-task-list`:

- **Backend:**
  - La tabla `tasks` tiene `id`, `title`, `status`, `assignee_id` y las marcas de tiempo.
  - `TasksController` tiene `index`, `store` y `update`.
  - `update` hace `merge` del payload validado tal cual. VineJS deja fuera los campos opcionales que no llegan, y desestructurarlos dejaba `undefined` en el modelo.
  - `TaskTransformer` hace `pick` de `id`, `title` y `status` y delega el responsable en `AssigneeTransformer`.
  - El bodyparser convierte `""` en `null`.
- **Comprobado en el código instalado:**
  - Con `vine.date({ formats: ['YYYY-MM-DD'] }).nullable().optional()`:
    - un campo omitido desaparece de la salida;
    - `null` se conserva;
    - `"2026-02-30"`, `"2026-10"` y `"05/10/2026"` fallan con la regla `date` sobre el campo;
    - una fecha válida sale como un `Date` a medianoche en la zona del proceso.
  - El generador de esquema de Lucid convierte una columna `date` en `@column.date()` de tipo `DateTime`.
  - `BaseTransformer.transform(data, ...rest)` pasa los argumentos extra al constructor del transformer.
  - El CORS de desarrollo acepta cualquier cabecera (`headers: true`).
- **Frontend:**
  - `TasksPage` pinta la lista, con título, responsable y `Select` de estado.
  - `src/components/ui/` no tiene ningún diálogo.
  - `radix-ui` está instalado.
  - El registro de shadcn genera hoy los componentes con `import { cn } from "cn"`, y eso obliga al retoque documentado en `add-task-list`.

## Goals / Non-Goals

**Goals:**
- La regla de vencimiento vive en un solo sitio del backend, y ninguna otra capa la reimplementa.
- El veredicto depende del día de quien pide, no del día del servidor ni del momento en que se guardó la tarea.
- Abrir una tarea, poner o quitar la fecha y ver la señal, con la menor superficie nueva posible.

**Non-Goals:**
- Pantalla de detalle de la tarea, ruta propia o URL compartible de una tarea abierta.
- Editar desde la tarea abierta nada que no sea la fecha.
- Refrescar la lista cuando cambian las fechas o pasa el día. La lista no las muestra.
- Tests de cualquier tipo.

## Decisions

### D1 — Columna `due_date` de tipo `date`, nullable

Se añade con `alterTable` en una migración nueva: `table.date('due_date').nullable()`. El `down` hace `dropColumn`. Las tareas que ya existen quedan con `NULL`, es decir, sin fecha.

- **Por qué `date` y no `datetime` ni `string`:** es una fecha de calendario sin hora, así que guardar una hora obligaría a decidir en qué zona y abriría el error del día de más. Lucid la expone como `DateTime` con `@column.date()`, que serializa con `toISODate()`.
- **Alternativa descartada:** guardar `YYYY-MM-DD` en un `string`. Funcionaría, pero pierde el tipo y obligaría a escribir a mano el parseo que Lucid ya hace.

### D2 — La regla, en el modelo

`Task` gana un método `isOverdueOn(today: string): boolean`. `today` es la fecha de referencia en formato `YYYY-MM-DD`, y el método devuelve `this.dueDate !== null && this.dueDate.toISODate()! < today && this.status !== 'done'`.

- **Comparar cadenas `YYYY-MM-DD`:** su orden lexicográfico coincide con el cronológico, y así se evita cualquier conversión de zona dentro de la regla. "Anterior a hoy" es `<` estricto, de modo que vencer hoy no es estar vencida (CA-5).
- **Por qué recibir `today` en lugar de calcularlo dentro:** la regla queda pura, depende solo de la tarea y del día, y el día de referencia es una decisión de la petición (D3), no del dominio. Por eso el veredicto cambia solo al pasar el día (CA-20) y es distinto para dos personas en dos zonas (CA-19).
- **Sin columna ni jobs:** `isOverdue` no existe en la base de datos. Ningún validador lo acepta, así que si llega en una petición VineJS lo descarta, igual que pasa hoy con `status` en la creación.

### D3 — Día de referencia: cabecera `X-Timezone`

Para cada petición de tareas, el controlador obtiene el día de referencia así:

1. Lee `request.header('x-timezone')`.
2. Lo valida con un validador VineJS propio (`timezoneValidator`, campo `timezone`). Usa una regla personalizada que acepta la cadena solo si `IANAZone.isValidZone()` de Luxon la da por buena. Si no lo es, VineJS lanza el error de validación de siempre, y el cliente recibe un 422 con `{ errors: [{ field: 'timezone', rule: 'timezone', ... }] }`, el mismo formato que el resto de la API.
3. Calcula `DateTime.now().setZone(tz ?? 'UTC').toISODate()`.

La validación se hace **antes** de validar el cuerpo y de tocar la base de datos, así que una zona inválida no crea ni modifica nada.

- **Por qué la zona y no la fecha del cliente:** con la zona, "hoy" lo decide el servidor a partir de su reloj, sin fiarse del reloj del cliente.
- **Por qué cabecera y no query string:**
  - Afecta a todas las operaciones por igual, también a las de escritura.
  - No ensucia las rutas.
  - El cliente la pone en un solo sitio, `request()` de `api.ts`.
- **Fallback UTC sin cabecera:** un cliente que no la mande, como `curl`, sigue funcionando, y lo que ve es predecible.
- **Alternativa descartada, un middleware que deja el día en `ctx`:** más maquinaria para cuatro acciones de un solo controlador. Basta un método privado del controlador.

### D4 — `dueDate` en los validadores y en la escritura

```ts
const dueDate = () => vine.date({ formats: ['YYYY-MM-DD'] }).nullable().optional()

createTaskValidator = vine.create({ title: title(), dueDate: dueDate() })
updateTaskValidator = vine.create({ status: ..., assigneeId: ..., dueDate: dueDate() })
```

- **Quitar la fecha:** `""` llega como `null` y `.nullable()` lo conserva. Un `dueDate` omitido no aparece en la salida, así que no se toca.
- **Del `Date` de VineJS al modelo:** no hace falta convertir nada. El proyecto ya registra en `start/validator.ts` un transform global (`VineDate.transform`) que entrega toda fecha validada como `DateTime` con `DateTime.fromJSDate`. VineJS parsea en la zona local del proceso y Luxon convierte en esa misma zona, así que el día no se desplaza sea cual sea la zona del servidor.
- **En `update`:**
  - `status` y `assigneeId` se siguen fusionando tal cual llegan.
  - `dueDate` solo se asigna si la clave está en el payload (`'dueDate' in payload`). Si se desestructurara, volvería el bug de `undefined` del change anterior.
- **El mensaje para la web:** `api.ts` gana `dueDate: 'la fecha de vencimiento'` en `FIELD_LABELS` y un caso para la regla `date`, "Introduce una fecha válida.".

### D5 — Representación: el transformer recibe el día

`TaskTransformer` pasa a tener el constructor `(resource: Task, today: string)` y devuelve:

```ts
{
  ...pick(['id', 'title', 'status']),
  assignee: AssigneeTransformer.transform(...),
  dueDate: this.resource.dueDate?.toISODate() ?? null,
  isOverdue: this.resource.isOverdueOn(this.today),
}
```

Las cuatro acciones llaman a `TaskTransformer.transform(tasks, today)`.

- **Por qué un argumento y no leer el contexto HTTP dentro del transformer:** así el transformer no depende de la petición, y el tipo obliga a pasar el día en cada llamada. Nadie puede olvidarlo.

### D6 — Lectura individual: `GET /tasks/:id`

Es una acción `show` nueva: `findOrFail`, cargar `assignee` y serializar. La ruta va en el mismo grupo con `middleware.auth()` y el mismo matcher numérico que `PATCH`. Un id inexistente da 404 por `findOrFail`, y uno no numérico, 404 de ruta.

- **Por qué existe:** es la superficie mínima para "abrir la tarea" (FS-118, restricción 5). La tarea abierta se carga con esta lectura, y así su `isOverdue` está calculado en el momento de abrirla, no al cargar la lista.
- **Punto abierto (PA-6):**
  - Esta operación nace solo para el panel de D7.
  - Cuando exista la pantalla de detalle, la reutilizará. Si esa pantalla necesita más datos, como fechas de creación o historial, la representación se ampliará en ese change, no aquí.

### D7 — Abrir la tarea: `Dialog` de shadcn sobre la lista

- **El componente:**
  - Se trae `Dialog` con `npx shadcn@latest add dialog` y se le aplica el mismo retoque que a `select.tsx`:
    - quitar la dependencia `cn` de `package.json` y del lock;
    - cambiar esa única línea a `@/lib/utils`.
  - Hay que comprobar que el CLI no sobrescribe `button.tsx` ni ningún otro componente que ya exista.
- **El disparador:**
  - En la fila, el título pasa a ser un `<button type="button">` con aspecto de texto que abre el diálogo para esa tarea.
  - Es un botón, y no un enlace, porque no navega: no hay ruta propia (Non-Goals).
  - La fila sigue mostrando solo título, responsable y estado.
- **`TaskDialog`** (`src/components/task-dialog.tsx`). Recibe el `id` y devuelve la tarea actualizada a la página por `onTaskChange`, para que la página la reemplace en su estado local. El estado local de la lista guarda `dueDate` e `isOverdue` aunque no los pinte.
  - Al abrirse llama a `getTask` y muestra la carga, y si la carga falla, el error.
  - Muestra:
    - el título como `DialogTitle`;
    - un `Input type="date"` con la etiqueta "Fecha de vencimiento";
    - el botón "Quitar fecha", solo si hay fecha;
    - la señal.
  - **La señal:**
    - Es un elemento con un icono de Lucide y el texto "Vencida", en color `destructive`.
    - Lleva `role="status"` para que el cambio se anuncie.
    - El texto es lo que transmite el estado, no el color.
    - Se pinta solo si `task.isOverdue` es `true`. El frontend nunca compara fechas.
  - Sin fecha no se pinta ningún texto de ayuda ni ningún aviso (CA-12).
- **Guardado automático y fechas a medias:**
  - El input lleva `min="1000-01-01"` y `max="9999-12-31"`, y solo se guarda si `validity.valid` es verdadero.
  - El input nativo entrega `""` tanto si se vacía como si la fecha está a medias o es imposible. Lo distingue `validity.badInput`.
  - Un año de menos de cuatro cifras o de más de cuatro es una fecha completa para el navegador, pero no para una persona. Lo marcan `rangeUnderflow` y `rangeOverflow`.
  - En cualquiera de esos tres casos `validity.valid` es falso: no se guarda nada y se pinta junto al campo "La fecha está incompleta o no existe." (CA-14).
  - Con `""` y `validity.valid` verdadero, la persona ha vaciado el campo, y se trata como "Quitar fecha".
  - La validez se comprueba cuando vence la espera del guardado, o cuando se fuerza el guardado. Así el mensaje no aparece en cada pulsación mientras se escribe.
  - Una fecha completa se guarda con `updateTask(id, { dueDate })`. La señal y el valor se actualizan con la respuesta.
  - Si la petición falla, el campo vuelve a la fecha anterior y aparece un `Alert` en castellano.
- **Escribir el año dígito a dígito:**
  - En Chrome, el input emite una fecha completa con cada pulsación del año (`0002-…`, `0020-…`, `0202-…`, `2026-…`).
  - Esas fechas intermedias no se guardan nunca, porque tienen un año de menos de cuatro cifras y `min` las deja fuera, sin depender del ritmo de quien teclea.
  - Además, el guardado espera unos 500 ms sin cambios, con un `setTimeout` que se reinicia. Esto ya no protege la corrección, solo evita mandar una petición y pintar un mensaje con cada pulsación.
  - **Alternativa descartada, solo la espera sin `min`:** quien tecleara el año con más de 500 ms entre dígitos guardaría `0202-10-05` un momento. Haría parpadear "Vencida" y rompería el escenario "Fecha incompleta o imposible".
  - Se ignoran las respuestas de una petición ya superada, con un contador de peticiones.
  - "Quitar fecha" y el cierre del diálogo guardan al momento lo que esté pendiente, así que cerrar no pierde el cambio (CA-16).
- **Accesibilidad del diálogo, ajustada al probarlo:**
  - Sin `DialogDescription` (`aria-describedby={undefined}`): una descripción como "Pon, cambia o quita la fecha…" se anuncia al abrir, y en una tarea sin fecha sería justo la sugerencia que CA-12 prohíbe.
  - El botón de cerrar de `DialogContent` tiene la etiqueta en inglés ("Close"). Se desactiva con `showCloseButton={false}` y se pone un botón propio "Cerrar", sin tocar más el componente generado.
  - Radix devuelve el foco a su `DialogTrigger`, y aquí no hay ninguno porque el diálogo se abre desde cada fila. `TaskDialog` guarda el elemento que tenía el foco al abrirse (el título de la fila) y lo devuelve en `onCloseAutoFocus`.
- **Por qué un diálogo y no una fila expandible:** el diálogo da el foco atrapado, el cierre con Escape y la devolución del foco al título, que es lo que pide el escenario de teclado, y todo eso viene ya de Radix. Una fila expandible obligaría a construirlo a mano y movería la lista al abrir.

### D8 — `X-Timezone` en el cliente

`request()` de `api.ts` añade a toda petición `X-Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone`, salvo si el navegador no la resuelve, y entonces no la manda. Va en todas las peticiones, también en las de auth, que la ignoran. Es más simple que decidir por ruta, y no tiene coste.

## Risks / Trade-offs

- **[La regla sin tests]**
  - FS-118.2 es el ticket de más riesgo, y este change va sin tests por decisión expresa.
  - Mitigación: los bordes (ayer, hoy, mañana, sin fecha, hecha) y el caso de dos zonas se comprueban a mano con `curl` en tasks.md, cambiando `X-Timezone`.
  - El paso de la medianoche (CA-20) solo se puede simular con una zona en la que ya sea el día siguiente.
- **[Reloj del servidor]**
  - "Hoy" sale del reloj del servidor llevado a la zona del cliente. Si ese reloj está mal, el veredicto también.
  - Se acepta: es la misma fuente de verdad que ya usan `created_at` y `updated_at`.
- **[`""` significa cosas distintas según el campo]**
  - En `dueDate`, `""` quita la fecha, como pide el contrato.
  - En `status`, `""` sigue siendo "no enviado" y responde 200 sin cambios, un caso que quedó pendiente en `add-task-list`.
  - La asimetría se documenta y no se toca aquí.
- **[Debounce del guardado]**
  - Entre el cambio y el guardado pasan unos 500 ms. Si se recarga la página justo en ese intervalo, el cambio se pierde. Cerrar el diálogo no lo pierde, porque fuerza el guardado.
  - Se acepta a cambio de no mandar una petición por pulsación. Las fechas intermedias como `0202-10-05` ya las bloquea `min`, no la espera.
- **[Años fuera de 1000–9999]**
  - La web no deja guardar una fecha con un año de menos de cuatro cifras o de más de cuatro. La API sí acepta cualquier fecha válida en formato `YYYY-MM-DD`, también con años por debajo de 1000.
  - Se acepta: el límite es una ayuda de la interfaz contra lo que se teclea a medias, no una regla de dominio.
- **[Componente generado retocado a mano]**
  - `dialog.tsx` tendrá la misma excepción que `select.tsx`.
  - Si alguien regenera el componente, tiene que repetir el retoque. Queda anotado en el propio design de `add-task-list`, y aquí.
- **[Lectura individual fuera de un detalle completo]** Puede tener que ampliarse cuando llegue la pantalla de detalle (D6, PA-6).
- **[Base de datos compartida]** La migración altera el mismo `tmp/db.sqlite3` que usa el servidor de desarrollo. Las tareas que ya existen quedan sin fecha, que es el comportamiento por defecto.

## Migration Plan

1. `node ace migration:run` aplica la migración, que solo añade la columna `due_date`, nullable, y regenera `database/schema.ts`.
2. La vuelta atrás es `node ace migration:rollback`, que hace `dropColumn`.
3. No hay datos que transformar: toda tarea existente queda sin fecha.
4. Se despliega primero el backend. El frontend anterior sigue funcionando, porque ignora los campos nuevos y, al no mandar `X-Timezone`, recibe el veredicto en UTC sin usarlo.
