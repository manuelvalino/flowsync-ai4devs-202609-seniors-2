# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Actualización de estado y responsable por API`
- TO: `### Requirement: Actualización de estado, responsable y fecha por API`

## MODIFIED Requirements

### Requirement: Listado de todas las tareas por API

La API SHALL devolver a cualquier persona autenticada todas las tareas del espacio, envueltas en `data`. Cada tarea SHALL incluir solo `id`, `title`, `status`, `assignee`, `dueDate` e `isOverdue`, y `assignee` SHALL incluir solo el `id` y el `fullName` del responsable. La lista SHALL ser la misma con independencia de quién la pida, salvo el valor de `isOverdue`, que depende del día de referencia de quien la pide. La lista SHALL no seguir ningún orden garantizado.

#### Scenario: Listado con tareas

- **WHEN** una persona autenticada pide la lista de tareas y existen tareas
- **THEN** la respuesta es 200 con `{ data: [...] }`, que contiene todas las tareas existentes, cada una con la forma `{ id, title, status, assignee: { id, fullName }, dueDate, isOverdue }`

#### Scenario: El responsable no expone datos de cuenta

- **WHEN** se lista una tarea cuyo responsable tiene email y fecha de alta
- **THEN** el `assignee` de esa tarea no incluye el email, las fechas, las iniciales ni ningún otro dato aparte de `id` y `fullName`

#### Scenario: Responsable sin nombre

- **WHEN** se lista una tarea cuyo responsable no tiene nombre
- **THEN** su `assignee.fullName` es `null`

#### Scenario: Mismo contenido para todos

- **WHEN** dos personas autenticadas distintas piden la lista sin que nadie haya cambiado nada entre medias
- **THEN** las dos respuestas contienen exactamente el mismo conjunto de tareas, con los mismos títulos, estados, responsables y fechas

#### Scenario: Tareas de otros incluidas

- **WHEN** otra persona ha creado una tarea y la lista la pide alguien distinto
- **THEN** esa tarea aparece en su respuesta

#### Scenario: Espacio sin tareas

- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** la respuesta es 200 con `{ data: [] }`

#### Scenario: Listar no modifica nada

- **WHEN** se pide la lista de tareas varias veces seguidas
- **THEN** ninguna tarea cambia de título, de estado, de responsable ni de fecha

### Requirement: Actualización de estado, responsable y fecha por API

La API SHALL permitir a cualquier persona autenticada actualizar el `status`, el `assigneeId` y el `dueDate` de cualquier tarea, sea o no su responsable, y SHALL responder con la tarea actualizada envuelta en `data`, con la misma forma que en el listado. Los tres campos SHALL ser opcionales, y un campo que no se envía SHALL quedar como estaba. El `status` SHALL pasar de cualquiera de los tres valores a cualquier otro. El título no SHALL cambiar por esta operación.

#### Scenario: Cambio de estado

- **WHEN** una persona autenticada actualiza una tarea en `pending` con `status` "in_progress"
- **THEN** la respuesta es 200 con la tarea en `in_progress`, y el listado posterior la muestra en ese estado

#### Scenario: Cambio de estado en una tarea ajena

- **WHEN** una persona actualiza el `status` de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica igual que en una tarea propia, con respuesta 200

#### Scenario: Volver atrás desde hecho

- **WHEN** se actualiza una tarea en `done` con `status` "pending"
- **THEN** la respuesta es 200 y la tarea queda en `pending`

#### Scenario: Cambio de responsable

- **WHEN** una persona autenticada actualiza una tarea con el `assigneeId` de otro usuario existente
- **THEN** la respuesta es 200 y el `assignee` de la tarea pasa a ser ese usuario, con su `id` y su `fullName`

#### Scenario: Responsable inexistente

- **WHEN** se actualiza una tarea con un `assigneeId` que no corresponde a ningún usuario
- **THEN** la respuesta es 422 con un error sobre `assigneeId` y la tarea conserva su responsable

#### Scenario: El título no se actualiza

- **WHEN** se envía una actualización con `title` "Otro título" y `status` "done"
- **THEN** el estado pasa a `done` y el título sigue siendo el anterior

#### Scenario: Tarea inexistente

- **WHEN** se intenta actualizar una tarea con un identificador que no existe
- **THEN** la respuesta es 404 y no se modifica ninguna tarea

## REMOVED Requirements

### Requirement: Creación de una tarea por API con solo el título

**Reason**: La creación pasa a admitir una fecha de vencimiento opcional, y su escenario "La creación no admite fecha" deja de ser cierto.
**Migration**: Lo sustituye el requisito "Creación de una tarea por API", que conserva el resto de su comportamiento.

### Requirement: Solo tres operaciones de tareas

**Reason**: Se añade la lectura individual de una tarea, la superficie mínima para abrirla (FS-118), y su escenario "Sin lectura individual" deja de ser cierto.
**Migration**: Lo sustituyen "Solo cuatro operaciones de tareas" y "Lectura individual de una tarea por API".

## ADDED Requirements

### Requirement: Creación de una tarea por API

La API SHALL permitir a cualquier persona autenticada crear una tarea enviando `title` y, de forma opcional, `dueDate`. La tarea creada SHALL nacer en estado `pending`, SHALL tener como responsable a quien la crea y SHALL quedar sin fecha de vencimiento si no se indica `dueDate`. Cualquier otro campo de la petición SHALL ignorarse.

#### Scenario: Creación correcta

- **WHEN** una persona autenticada envía una petición de creación con `title` "Preparar la demo"
- **THEN** la respuesta es 201 con `{ data: { id, title: "Preparar la demo", status: "pending", assignee: { id, fullName }, dueDate: null, isOverdue: false } }`, donde `assignee` es quien hizo la petición

#### Scenario: La tarea creada aparece en la lista

- **WHEN** tras crear una tarea cualquier persona autenticada pide la lista
- **THEN** la tarea creada está incluida

#### Scenario: No se puede elegir estado ni responsable al crear

- **WHEN** se envía una petición de creación con `title` válido junto con `status` "done" y el `assigneeId` de otra persona
- **THEN** la tarea se crea igualmente en `pending` y con quien hizo la petición como responsable

#### Scenario: Creación con fecha

- **WHEN** se envía una petición de creación con `title` válido y `dueDate` "2026-12-01"
- **THEN** la respuesta es 201 y la tarea creada tiene `dueDate` "2026-12-01"

### Requirement: Solo cuatro operaciones de tareas

La API de tareas SHALL ofrecer únicamente listar todas, leer una, crear una y actualizar una. No SHALL existir borrado de tareas ni ninguna operación sobre equipos o miembros.

#### Scenario: Sin borrado

- **WHEN** se intenta borrar una tarea
- **THEN** la respuesta es 404 y la tarea sigue apareciendo en el listado

### Requirement: Fecha de vencimiento de una tarea

Una tarea SHALL tener como mucho una fecha de vencimiento, que es una fecha de calendario sin hora. La API SHALL representarla como `dueDate` en formato `YYYY-MM-DD`, o como `null` si la tarea no tiene fecha. La API SHALL aceptar `dueDate` al crear y al actualizar cualquier tarea, sea quien sea su responsable, también cuando la fecha es anterior a hoy. Al actualizar, enviar `dueDate` como `null` o como cadena vacía SHALL quitar la fecha. Un `dueDate` que no sea una fecha existente en formato `YYYY-MM-DD` SHALL rechazarse con 422 sobre `dueDate`, y entonces no se crea la tarea, o la tarea conserva la fecha que tenía. Cambiar el estado o el responsable de una tarea no SHALL alterar su fecha.

#### Scenario: Sin fecha por defecto

- **WHEN** se crea una tarea enviando solo `title`
- **THEN** la tarea tiene `dueDate` `null` e `isOverdue` `false`

#### Scenario: Poner una fecha

- **WHEN** se actualiza una tarea sin fecha con `dueDate` "2026-12-01"
- **THEN** la respuesta es 200 con `dueDate` "2026-12-01", y el listado posterior la muestra con esa fecha

#### Scenario: Cambiar la fecha

- **WHEN** se actualiza una tarea con `dueDate` "2026-12-01" enviando `dueDate` "2027-01-15"
- **THEN** la respuesta es 200 con `dueDate` "2027-01-15"

#### Scenario: Quitar la fecha con null

- **WHEN** se actualiza una tarea con fecha enviando `dueDate` `null`
- **THEN** la respuesta es 200 con `dueDate` `null`

#### Scenario: Quitar la fecha con cadena vacía

- **WHEN** se actualiza una tarea con fecha enviando `dueDate` ""
- **THEN** la respuesta es 200 con `dueDate` `null`

#### Scenario: No enviar la fecha la conserva

- **WHEN** se actualiza una tarea con `dueDate` "2026-12-01" enviando solo `status` "in_progress"
- **THEN** la tarea sigue con `dueDate` "2026-12-01"

#### Scenario: Fecha pasada aceptada

- **WHEN** se crea o se actualiza una tarea en `pending` con una `dueDate` anterior al día de referencia
- **THEN** la petición se acepta (201 o 200), la tarea guarda esa fecha y la respuesta trae `isOverdue` `true`

#### Scenario: Fecha imposible

- **WHEN** se actualiza una tarea con `dueDate` "2026-12-01" enviando `dueDate` "2026-02-30"
- **THEN** la respuesta es 422 con un error sobre `dueDate`, y la tarea sigue con `dueDate` "2026-12-01"

#### Scenario: Formato incorrecto

- **WHEN** se crea o se actualiza una tarea con `dueDate` "05/10/2026" o "2026-10"
- **THEN** la respuesta es 422 con un error sobre `dueDate`, y no se crea ni se modifica ninguna tarea

#### Scenario: Fecha de una tarea ajena

- **WHEN** una persona cambia la fecha de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica igual que en una tarea propia, con respuesta 200

#### Scenario: Pasar a hecho conserva la fecha

- **WHEN** se actualiza a `status` "done" una tarea con `dueDate` "2026-09-01"
- **THEN** la tarea sigue con `dueDate` "2026-09-01"

#### Scenario: Reasignar conserva la fecha y el vencimiento

- **WHEN** se cambia el responsable de una tarea con fecha
- **THEN** la tarea conserva su `dueDate`, y su `isOverdue` no varía

### Requirement: Regla de vencimiento

Toda representación de una tarea que devuelva la API SHALL incluir el booleano `isOverdue`. `isOverdue` SHALL ser `true` si y solo si se cumplen las tres condiciones: la tarea tiene fecha, esa fecha es anterior al día de referencia y su estado no es `done`. El valor SHALL calcularse en cada respuesta a partir de la fecha, el estado y el día de referencia en ese momento. No SHALL almacenarse ni actualizarse por ningún proceso programado. La API SHALL ignorar `isOverdue` si llega en una petición.

#### Scenario: Fecha anterior a hoy

- **WHEN** se lee una tarea en `pending` o `in_progress` con fecha anterior al día de referencia
- **THEN** su `isOverdue` es `true`

#### Scenario: Vencer hoy todavía no es estar vencida

- **WHEN** se lee una tarea no hecha cuya fecha es el día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Fecha futura

- **WHEN** se lee una tarea no hecha con fecha posterior al día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Sin fecha no se vence nunca

- **WHEN** se lee una tarea sin fecha, creada hace semanas y todavía en `pending`
- **THEN** su `isOverdue` es `false`

#### Scenario: Una tarea hecha nunca está vencida

- **WHEN** se lee una tarea en `done` cuya fecha es anterior al día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Darla por hecha la deja de vencer

- **WHEN** se actualiza a `status` "done" una tarea vencida
- **THEN** la respuesta trae `isOverdue` `false`

#### Scenario: Volver desde hecho con la fecha pasada

- **WHEN** se actualiza a `status` "pending" una tarea en `done` cuya fecha es anterior al día de referencia
- **THEN** la respuesta trae `isOverdue` `true`

#### Scenario: Aplazar la fecha resuelve el vencimiento

- **WHEN** se actualiza una tarea vencida con una `dueDate` posterior al día de referencia
- **THEN** la respuesta trae `isOverdue` `false`

#### Scenario: Quitar la fecha resuelve el vencimiento

- **WHEN** se quita la fecha de una tarea vencida
- **THEN** la respuesta trae `dueDate` `null` e `isOverdue` `false`

#### Scenario: Vence sola al pasar el día

- **WHEN** una tarea en `pending` con fecha de hoy se vuelve a leer cuando en el día de referencia ya es el día siguiente, sin que nadie la haya modificado
- **THEN** su `isOverdue` es `true`

#### Scenario: El cliente no puede fijar el vencimiento

- **WHEN** se crea o se actualiza una tarea sin fecha enviando `isOverdue` `true`
- **THEN** la petición se procesa sin tener en cuenta `isOverdue`, y la respuesta trae `isOverdue` `false`

### Requirement: Día de referencia de quien mira

El día de referencia de cada petición de tareas SHALL ser la fecha actual en la zona horaria IANA que el cliente indique en la cabecera `X-Timezone`. Si la petición no trae esa cabecera, SHALL usarse la fecha actual en UTC. Si la cabecera no es una zona horaria válida, la API SHALL responder 422 con un error sobre `timezone`, sin crear ni modificar ninguna tarea. La aplicación web SHALL enviar siempre la zona horaria del navegador.

#### Scenario: Cada persona ve el vencimiento según su día

- **WHEN** en el instante 2026-10-06T02:00Z una persona pide una tarea en `pending` con `dueDate` "2026-10-05" con `X-Timezone` "Europe/Madrid", y otra la pide con `X-Timezone` "America/Los_Angeles"
- **THEN** la primera recibe `isOverdue` `true`, porque para ella ya es 6 de octubre, y la segunda `false`, porque para ella todavía es 5 de octubre

#### Scenario: Sin zona horaria

- **WHEN** se pide una tarea sin la cabecera `X-Timezone`
- **THEN** la respuesta se calcula con la fecha actual en UTC como día de referencia

#### Scenario: Zona horaria no válida

- **WHEN** se pide la lista, se lee, se crea o se actualiza una tarea con `X-Timezone` "Marte/Olympus"
- **THEN** la respuesta es 422 con un error sobre `timezone`, y no se crea ni se modifica ninguna tarea

### Requirement: Lectura individual de una tarea por API

La API SHALL permitir a cualquier persona autenticada leer cualquier tarea por su identificador, y SHALL responder con la tarea envuelta en `data`, con la misma forma que en el listado. Leer una tarea no SHALL modificarla.

#### Scenario: Leer una tarea

- **WHEN** una persona autenticada pide una tarea existente por su identificador
- **THEN** la respuesta es 200 con `{ data: { id, title, status, assignee: { id, fullName }, dueDate, isOverdue } }`

#### Scenario: Leer una tarea ajena

- **WHEN** una persona pide una tarea cuyo responsable es otra persona
- **THEN** la respuesta es 200 con la tarea, igual que si fuera propia

#### Scenario: Leer una tarea inexistente

- **WHEN** se pide una tarea con un identificador que no existe
- **THEN** la respuesta es 404

#### Scenario: Leer una tarea sin sesión

- **WHEN** se pide una tarea sin token de acceso válido
- **THEN** la respuesta es 401 y no incluye ningún dato de la tarea

### Requirement: Abrir una tarea desde la lista

En la pantalla de tareas, el título de cada fila SHALL abrir esa tarea sin salir de la lista, tanto con el ratón como con el teclado. La tarea abierta SHALL mostrar su título y un campo "Fecha de vencimiento" con la fecha actual de la tarea, o vacío si no tiene. Cuando la tarea tenga fecha, SHALL ofrecer además la acción "Quitar fecha". Si la API indica que la tarea está vencida, SHALL mostrar la señal "Vencida" con texto e icono, no solo con color. Si no tiene fecha, no SHALL mostrar ningún aviso, recordatorio ni sugerencia de ponerle una.

Poner, cambiar o quitar la fecha SHALL guardarse sin botón de guardar ni diálogo de confirmación. El nuevo valor y la señal SHALL actualizarse al instante con lo que devuelva la API. Una fecha incompleta o imposible no SHALL guardarse: la tarea SHALL conservar la fecha anterior y SHALL aparecer una explicación en castellano junto al campo. La web no SHALL decidir por su cuenta si una tarea está vencida. Tras cerrar la tarea, la lista SHALL seguir sin mostrar fechas ni marcas de vencimiento.

#### Scenario: Abrir una tarea

- **WHEN** una persona pulsa el título de una fila de la lista
- **THEN** se abre esa tarea con su título y el campo "Fecha de vencimiento", sin salir de la pantalla de tareas

#### Scenario: Abrir con el teclado

- **WHEN** una persona llega con el tabulador al título de una fila y pulsa Intro
- **THEN** se abre esa tarea, y puede manejar el campo de fecha y cerrarla con el teclado

#### Scenario: Poner una fecha al abrir la tarea

- **WHEN** una persona abre una tarea sin fecha y elige una fecha completa en "Fecha de vencimiento"
- **THEN** la fecha queda guardada sin pulsar ningún botón y se ve al instante en la tarea abierta, sin recargar ni volver a abrirla

#### Scenario: Quitar la fecha sin confirmación

- **WHEN** una persona abre una tarea con fecha y pulsa "Quitar fecha"
- **THEN** la fecha se quita directamente, sin diálogo de confirmación, el campo queda vacío y deja de mostrarse "Vencida" si se mostraba

#### Scenario: Señal de vencida

- **WHEN** una persona abre una tarea en "Pendiente" con una fecha anterior a su día
- **THEN** ve la señal "Vencida" con texto e icono, sin tener que comparar la fecha con el día de hoy

#### Scenario: Fecha de hoy al abrir

- **WHEN** una persona abre una tarea no hecha cuya fecha es su día de hoy
- **THEN** no ve la señal "Vencida"

#### Scenario: Fecha pasada desde la web

- **WHEN** una persona pone en una tarea no hecha una fecha anterior a su día
- **THEN** la fecha se guarda sin impedimento y la señal "Vencida" aparece de inmediato

#### Scenario: Sin fecha no hay avisos

- **WHEN** una persona abre una tarea sin fecha
- **THEN** ve el campo de fecha vacío, sin ningún aviso, recordatorio ni indicación de que le falte algo

#### Scenario: Fecha incompleta o imposible

- **WHEN** una persona deja a medio escribir una fecha en el campo, o escribe una que no existe
- **THEN** no se guarda nada, la tarea conserva la fecha que tenía y junto al campo aparece una explicación en castellano

#### Scenario: El cambio falla en el servidor

- **WHEN** una persona cambia la fecha y el servidor rechaza la petición o no está accesible
- **THEN** la tarea abierta vuelve a mostrar la fecha anterior y aparece un aviso de error en castellano

#### Scenario: El cambio queda guardado al cerrar

- **WHEN** una persona cambia la fecha de una tarea, la cierra y la vuelve a abrir
- **THEN** ve la fecha nueva, sin haber dado ningún paso extra de guardado

#### Scenario: Fecha de una tarea ajena desde la web

- **WHEN** una persona abre una tarea cuyo responsable es otra persona y le cambia la fecha
- **THEN** el cambio se aplica sin advertencias ni permisos adicionales

#### Scenario: La lista sigue sin fechas

- **WHEN** hay tareas con fecha, algunas vencidas, y una persona mira la lista
- **THEN** ninguna fila muestra una fecha ni una marca de vencida
