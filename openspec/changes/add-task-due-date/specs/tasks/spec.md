# Spec Delta

## MODIFIED Requirements

### Requirement: Listado de tareas por API

El sistema SHALL devolver todas las tareas en `GET /api/v1/tasks` a cualquier persona con un token de acceso válido, con el mismo contenido para todas ellas, y SHALL exigir sesión para hacerlo.

#### Scenario: Lista igual para todos

- **WHEN** dos personas distintas con sesión piden el listado sin que nadie haya tocado nada
- **THEN** ambas reciben exactamente el mismo conjunto de tareas

#### Scenario: Contenido de cada tarea

- **WHEN** se pide el listado y hay tareas
- **THEN** `data` es una colección en la que cada tarea trae su `id`, su `title`, su `status` (`pending`, `in_progress` o `done`) y su responsable con `id` y `fullName`, su `dueDate` (fecha `AAAA-MM-DD` o `null`) y su `isOverdue` (booleano)
- **AND** el responsable no incluye su correo ni ningún otro dato de cuenta

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre
- **THEN** su `fullName` es `null`

#### Scenario: Tareas de otras personas

- **WHEN** otra persona ha creado una tarea y se la ha asignado a sí misma
- **THEN** esa tarea aparece en el listado de cualquier otra persona con sesión
- **AND** no existe forma de crear una tarea que los demás no vean

#### Scenario: Lista vacía

- **WHEN** no se ha creado ninguna tarea
- **THEN** la respuesta es satisfactoria y `data` es una colección vacía

#### Scenario: Consultar no cambia nada

- **WHEN** se pide el listado, una o varias veces
- **THEN** ninguna tarea cambia de estado, de responsable ni de fecha de vencimiento

#### Scenario: Sin sesión

- **WHEN** se pide el listado sin token o con un token inválido
- **THEN** la respuesta es 401 y no se devuelve ninguna tarea

### Requirement: Creación de tareas por API

El sistema SHALL crear una tarea con `POST /api/v1/tasks` a partir de `title` y, opcionalmente, `dueDate`, y SHALL dejarla en estado `pending` y con quien la crea como responsable.

#### Scenario: Creación solo con el título

- **WHEN** una persona con sesión envía un `title` con texto
- **THEN** la respuesta es satisfactoria y `data` contiene la tarea creada con ese `title`, `status` `pending` y como responsable a quien la creó
- **AND** si no se envió `dueDate`, la tarea no tiene fecha: `dueDate` es `null` e `isOverdue` es `false`
- **AND** la tarea aparece desde ese momento en el listado

#### Scenario: Título con espacios alrededor

- **WHEN** se envía un `title` con espacios al principio o al final
- **THEN** la tarea se crea con el título sin esos espacios

#### Scenario: Otros campos en la petición

- **WHEN** además del `title` se envían `status`, un responsable o `isOverdue`
- **THEN** esos datos se ignoran y la tarea nace `pending` y a nombre de quien la crea

#### Scenario: Título ausente

- **WHEN** se envía la petición sin `title`
- **THEN** la respuesta es 422 con un error sobre el campo `title` y no se crea ninguna tarea

#### Scenario: Título vacío o en blanco

- **WHEN** el `title` está vacío o contiene solo espacios
- **THEN** la respuesta es 422 con un error sobre el campo `title` y no se crea ninguna tarea

#### Scenario: Sin sesión

- **WHEN** se intenta crear una tarea sin token o con un token inválido
- **THEN** la respuesta es 401 y no se crea ninguna tarea

### Requirement: Actualización de tareas por API

El sistema SHALL actualizar una tarea con `PATCH /api/v1/tasks/:id`, admitiendo cambiar su `status`, su responsable (`assigneeId`) y su fecha de vencimiento (`dueDate`), y SHALL permitirlo a cualquier persona con sesión sobre cualquier tarea, sea o no la suya.

#### Scenario: Cambio de estado

- **WHEN** una persona con sesión envía un `status` válido para una tarea
- **THEN** la respuesta es satisfactoria y `data` contiene la tarea con ese estado
- **AND** el listado refleja el nuevo estado

#### Scenario: Tarea de otra persona

- **WHEN** una persona cambia el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual que en una tarea propia, sin permiso especial ni advertencia

#### Scenario: Cualquier cambio entre estados

- **WHEN** se pasa una tarea de cualquier estado a cualquier otro, incluido volver de `done` a `pending`
- **THEN** el cambio se aplica

#### Scenario: Cambio de responsable

- **WHEN** una persona con sesión envía como `assigneeId` el id de una cuenta existente
- **THEN** la tarea queda con esa persona como responsable, sea quien sea quien la tenía

#### Scenario: Reasignar a quien ya la lleva

- **WHEN** se envía como `assigneeId` el de quien ya es el responsable
- **THEN** la respuesta es satisfactoria y la tarea no cambia

#### Scenario: Tarea sin responsable

- **WHEN** se envía `assigneeId` o `status` con valor `null`, o `assigneeId` que no es un entero positivo
- **THEN** la respuesta es 422 con un error sobre ese campo y la tarea no cambia, de modo que ninguna tarea queda sin responsable ni sin estado

#### Scenario: Responsable inexistente

- **WHEN** se envía un `assigneeId` que no corresponde a ninguna cuenta
- **THEN** la respuesta es 422 con un error sobre el campo `assigneeId` y la tarea no cambia

#### Scenario: Petición sin cambios

- **WHEN** no se envía ni `status` ni `assigneeId` ni `dueDate`
- **THEN** la respuesta es 422 y la tarea no cambia

#### Scenario: El título no se actualiza

- **WHEN** se envía un `title` en la actualización
- **THEN** el título de la tarea no cambia

#### Scenario: Tarea inexistente

- **WHEN** se actualiza una tarea con un `id` que no existe
- **THEN** la respuesta es 404

#### Scenario: Sin sesión

- **WHEN** se intenta actualizar una tarea sin token o con un token inválido
- **THEN** la respuesta es 401 y la tarea no cambia

### Requirement: Operaciones de tareas limitadas

El sistema SHALL ofrecer sobre las tareas únicamente listar, leer una, crear y actualizar.

#### Scenario: Operaciones no ofrecidas

- **WHEN** se intenta borrar una tarea o consultar endpoints de equipo
- **THEN** el sistema no responde a esas peticiones como operaciones válidas (404)

### Requirement: Pantalla de la lista de tareas

El sistema SHALL ofrecer en `/tasks` una única lista con todas las tareas del equipo, en la que cada fila muestra el título, el responsable por su nombre y el estado como Pendiente, En curso o Hecho, sin necesidad de abrir ninguna.

#### Scenario: Ver la lista

- **WHEN** una persona con sesión abre `/tasks` y hay tareas
- **THEN** ve una fila por tarea con su título, quién la lleva y su estado
- **AND** ve las mismas tareas que cualquier otra persona del equipo

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre, o su nombre está vacío o en blanco
- **THEN** la fila muestra «Sin nombre» y nunca su correo ni su identificador

#### Scenario: Sin fechas

- **WHEN** se mira la lista, aunque haya tareas con fecha de vencimiento o vencidas
- **THEN** no aparece ninguna fecha ni marca de tarea vencida, y las tareas sin fecha no reciben ningún aviso ni indicación de que les falte algo

#### Scenario: Abrir una tarea

- **WHEN** la persona pulsa el título de una tarea
- **THEN** se muestra la página de esa tarea

#### Scenario: Sin otras vistas

- **WHEN** la persona busca otras vistas de tareas
- **THEN** no hay ninguna vista de «mis tareas» ni tareas privadas, solo la lista del equipo

#### Scenario: Sin señales de presencia

- **WHEN** otras personas están usando la aplicación a la vez
- **THEN** la lista no muestra quién está en línea ni actividad por persona

#### Scenario: Mirar no cambia nada

- **WHEN** la persona abre y recorre la lista
- **THEN** ninguna tarea cambia de estado ni de responsable

#### Scenario: Estado vacío

- **WHEN** no existe ninguna tarea
- **THEN** se explica qué es la lista del equipo y se ofrece crear la primera tarea
- **AND** no se muestra una lista vacía sin más

#### Scenario: Lista no cargada

- **WHEN** no se puede obtener la lista porque el servidor no responde o responde con error
- **THEN** se muestra un aviso en castellano que explica el fallo en lugar de la lista

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** es llevada a la pantalla de inicio de sesión y no ve ninguna tarea

## ADDED Requirements

### Requirement: Lectura individual de una tarea por API

El sistema SHALL devolver una tarea en `GET /api/v1/tasks/:id` a cualquier persona con un token de acceso válido, con la misma representación que en el listado.

#### Scenario: Tarea existente

- **WHEN** una persona con sesión pide una tarea que existe
- **THEN** la respuesta es satisfactoria y `data` contiene su `id`, `title`, `status`, `dueDate`, `isOverdue` y su responsable con `id` y `fullName`, sin su correo

#### Scenario: Tarea inexistente

- **WHEN** se pide una tarea con un `id` que no existe o no es numérico
- **THEN** la respuesta es 404

#### Scenario: Sin sesión

- **WHEN** se pide una tarea sin token o con un token inválido
- **THEN** la respuesta es 401

#### Scenario: Leer no cambia nada

- **WHEN** se lee una tarea, una o varias veces
- **THEN** la tarea no cambia

### Requirement: Fecha de vencimiento de una tarea

El sistema SHALL permitir que una tarea tenga una fecha de vencimiento de calendario, sin hora, enviada como `dueDate` con formato `AAAA-MM-DD`, y que no tenerla sea lo normal.

#### Scenario: Tarea sin fecha por defecto

- **WHEN** se crea una tarea sin enviar `dueDate`
- **THEN** la tarea queda sin fecha de vencimiento

#### Scenario: Crear con fecha

- **WHEN** se crea una tarea enviando un `dueDate` válido
- **THEN** la respuesta contiene esa fecha en `dueDate`

#### Scenario: Poner o cambiar la fecha

- **WHEN** una persona con sesión actualiza una tarea enviando un `dueDate` válido
- **THEN** la tarea queda con esa fecha, tuviera o no otra antes, y la respuesta y el listado la reflejan

#### Scenario: Fecha anterior a hoy

- **WHEN** se envía un `dueDate` anterior al día de hoy, al crear o al actualizar
- **THEN** la fecha se acepta sin bloquearla y la tarea queda vencida de inmediato si no está hecha

#### Scenario: Quitar la fecha

- **WHEN** se actualiza una tarea enviando `dueDate` explícitamente vacío, como `null` o cadena vacía
- **THEN** la tarea queda sin fecha, `dueDate` es `null` e `isOverdue` es `false`

#### Scenario: No enviar la fecha no la toca

- **WHEN** se actualiza una tarea sin enviar `dueDate`, por ejemplo para cambiar solo su estado
- **THEN** la fecha de la tarea se conserva igual

#### Scenario: Fecha inválida

- **WHEN** se envía un `dueDate` que no existe (como `2026-02-30`), está incompleto (como `2026-10`) o no tiene formato `AAAA-MM-DD`
- **THEN** la respuesta es 422 con un error sobre el campo `dueDate`
- **AND** la tarea conserva la fecha que tuviera antes y, al crear, no se crea

#### Scenario: Cualquiera puede cambiar la fecha

- **WHEN** una persona con sesión cambia o quita la fecha de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica sin advertencia ni permiso especial

#### Scenario: Reasignar no toca la fecha

- **WHEN** se cambia el responsable de una tarea con fecha
- **THEN** su `dueDate` no cambia y su `isOverdue` tampoco

#### Scenario: Terminar la tarea conserva la fecha

- **WHEN** una tarea con fecha pasa a `done`
- **THEN** su `dueDate` se conserva sin ningún cambio

### Requirement: Vencimiento calculado por el servidor

El sistema SHALL indicar en `isOverdue` si una tarea está vencida, calculándolo en cada lectura y devolviendo `true` solo cuando la tarea tiene fecha de vencimiento, esa fecha es anterior al día de referencia y su estado no es `done`.

#### Scenario: Fecha anterior a hoy

- **WHEN** una tarea no hecha tiene una fecha anterior al día de referencia
- **THEN** su `isOverdue` es `true`

#### Scenario: Vence hoy

- **WHEN** una tarea no hecha tiene como fecha el día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Fecha futura

- **WHEN** una tarea tiene una fecha posterior al día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Sin fecha nunca vence

- **WHEN** una tarea sin fecha, por antigua que sea, está pendiente
- **THEN** su `isOverdue` es `false`

#### Scenario: Una tarea hecha no vence

- **WHEN** una tarea en estado `done` tiene una fecha anterior al día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Terminar una tarea vencida

- **WHEN** una tarea vencida pasa a `done`
- **THEN** su `isOverdue` pasa a `false` y su fecha se conserva

#### Scenario: Volver desde hecha

- **WHEN** una tarea `done` con fecha anterior al día de referencia vuelve a `pending` o `in_progress`
- **THEN** su `isOverdue` pasa a `true`

#### Scenario: Aplazar la fecha

- **WHEN** a una tarea vencida se le pone una fecha posterior al día de referencia
- **THEN** su `isOverdue` pasa a `false`

#### Scenario: Quitar la fecha de una tarea vencida

- **WHEN** a una tarea vencida se le quita la fecha
- **THEN** su `isOverdue` pasa a `false`

#### Scenario: Vence sin que nadie la toque

- **WHEN** una tarea no hecha con fecha igual a un día de referencia se lee con el día de referencia siguiente, sin que nadie la haya modificado
- **THEN** su `isOverdue` pasa de `false` a `true`

#### Scenario: El cliente no decide el veredicto

- **WHEN** una petición de crear o actualizar incluye `isOverdue`
- **THEN** ese valor se ignora y el veredicto se calcula con la regla

#### Scenario: Presente en toda representación

- **WHEN** una operación de la API devuelve una tarea, sea al listar, leer, crear o actualizar
- **THEN** la tarea incluye `isOverdue`

### Requirement: Día de referencia enviado por el cliente

El sistema SHALL calcular el vencimiento con el día que el cliente indica en el parámetro `today` (`AAAA-MM-DD`) de cualquier operación que devuelva tareas, y SHALL usar el día UTC del servidor cuando no se indica.

#### Scenario: Dos personas, dos días

- **WHEN** una tarea no hecha tiene fecha `2026-10-01` y una persona la pide con `today=2026-10-02` y otra con `today=2026-10-01`
- **THEN** la primera recibe `isOverdue` `true` y la segunda `false`, y ambas lecturas son correctas

#### Scenario: Sin día del cliente

- **WHEN** se pide una tarea sin `today`
- **THEN** el veredicto se calcula con el día UTC del servidor

#### Scenario: Día mal formado

- **WHEN** se envía un `today` que no es una fecha `AAAA-MM-DD` válida
- **THEN** la respuesta es 422 con un error sobre el parámetro `today`

#### Scenario: El día se aplica también al escribir

- **WHEN** se crea o actualiza una tarea indicando `today`
- **THEN** el `isOverdue` de la respuesta se calcula con ese día

### Requirement: Página de una tarea

El sistema SHALL ofrecer en `/tasks/:id` una página mínima de la tarea con su título, su fecha de vencimiento y, cuando esté vencida, una señal explícita de que lo está.

#### Scenario: Ver una tarea

- **WHEN** una persona con sesión abre `/tasks/:id` de una tarea que existe
- **THEN** ve su título y su fecha de vencimiento, o que no tiene, y un enlace para volver a la lista de tareas
- **AND** la página no ofrece cambiar el responsable ni el estado

#### Scenario: Señal de vencida

- **WHEN** la tarea está vencida según el servidor
- **THEN** la página muestra un aviso con el texto «Vencida», que no depende solo del color, sin que la persona tenga que comparar la fecha con hoy

#### Scenario: Sin señal si no está vencida

- **WHEN** la tarea vence hoy, tiene fecha futura, está hecha o no tiene fecha
- **THEN** la página no muestra la señal «Vencida»

#### Scenario: Sin fecha no hay aviso

- **WHEN** la tarea no tiene fecha
- **THEN** la página no muestra ningún aviso, recordatorio ni indicación de que le falte algo

#### Scenario: Poner o cambiar la fecha

- **WHEN** la persona elige una fecha completa en el campo de fecha
- **THEN** la fecha se guarda sola, sin botón de guardado, y la página la refleja al instante sin recargar
- **AND** si la nueva fecha es anterior a hoy, la señal «Vencida» aparece de inmediato

#### Scenario: Quitar la fecha

- **WHEN** la persona pulsa «Quitar fecha»
- **THEN** la tarea queda sin fecha de inmediato, sin diálogo de confirmación, y la señal «Vencida» desaparece si estaba

#### Scenario: Fecha incompleta o rechazada

- **WHEN** la persona deja la fecha incompleta o el servidor la rechaza
- **THEN** la tarea conserva la fecha que tuviera, y si el servidor la rechazó se muestra junto al campo un mensaje en castellano que explica el problema

#### Scenario: Tarea de otra persona

- **WHEN** la persona cambia la fecha de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica sin advertencia ni permiso especial

#### Scenario: Día de la persona

- **WHEN** la página pide o guarda una tarea
- **THEN** envía el día de calendario del dispositivo de la persona, de modo que el vencimiento se ve según su propio día

#### Scenario: Error al guardar

- **WHEN** no se puede guardar el cambio porque el servidor no responde o responde con un error inesperado
- **THEN** se muestra un aviso en castellano y la fecha mostrada vuelve a la guardada

#### Scenario: Tarea inexistente

- **WHEN** la persona abre `/tasks/:id` de una tarea que no existe
- **THEN** se muestra un aviso de que no se encontró la tarea y un enlace para volver a la lista

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/tasks/:id`
- **THEN** es llevada a la pantalla de inicio de sesión y no ve ninguna tarea
