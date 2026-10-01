# Spec Delta

## Purpose

Lista única y compartida de tareas del equipo: cualquier miembro con sesión las ve todas, crea una con solo el título y cambia su estado desde la propia lista.

## ADDED Requirements

### Requirement: Listado de tareas por API

El sistema SHALL devolver todas las tareas en `GET /api/v1/tasks` a cualquier persona con un token de acceso válido, con el mismo contenido para todas ellas, y SHALL exigir sesión para hacerlo.

#### Scenario: Lista igual para todos

- **WHEN** dos personas distintas con sesión piden el listado sin que nadie haya tocado nada
- **THEN** ambas reciben exactamente el mismo conjunto de tareas

#### Scenario: Contenido de cada tarea

- **WHEN** se pide el listado y hay tareas
- **THEN** `data` es una colección en la que cada tarea trae su `id`, su `title`, su `status` (`pending`, `in_progress` o `done`) y su responsable con `id` y `fullName`
- **AND** el responsable no incluye su correo ni ningún otro dato de cuenta
- **AND** ninguna tarea trae fecha de vencimiento

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
- **THEN** ninguna tarea cambia de estado ni de responsable

#### Scenario: Sin sesión

- **WHEN** se pide el listado sin token o con un token inválido
- **THEN** la respuesta es 401 y no se devuelve ninguna tarea

### Requirement: Creación de tareas por API

El sistema SHALL crear una tarea con `POST /api/v1/tasks` a partir únicamente de `title`, y SHALL dejarla en estado `pending` y con quien la crea como responsable.

#### Scenario: Creación solo con el título

- **WHEN** una persona con sesión envía un `title` con texto
- **THEN** la respuesta es satisfactoria y `data` contiene la tarea creada con ese `title`, `status` `pending` y como responsable a quien la creó
- **AND** la tarea aparece desde ese momento en el listado

#### Scenario: Título con espacios alrededor

- **WHEN** se envía un `title` con espacios al principio o al final
- **THEN** la tarea se crea con el título sin esos espacios

#### Scenario: Otros campos en la petición

- **WHEN** además del `title` se envían `status` o un responsable
- **THEN** esos datos se ignoran y la tarea nace `pending` y a nombre de quien la crea

#### Scenario: Título ausente

- **WHEN** se envía la petición sin `title`
- **THEN** la respuesta es 422 con un error sobre el campo `title` y no se crea ninguna tarea

#### Scenario: Título vacío o en blanco

- **WHEN** el `title` está vacío o contiene solo espacios
- **THEN** la respuesta es 422 con un error sobre el campo `title`, igual que si faltara, y no se crea ninguna tarea

#### Scenario: Sin sesión

- **WHEN** se intenta crear una tarea sin token o con un token inválido
- **THEN** la respuesta es 401 y no se crea ninguna tarea

### Requirement: Título largo sin recorte silencioso

El sistema SHALL NOT guardar una versión recortada de un título sin avisar de ello.

#### Scenario: Título muy largo

- **WHEN** se envía un `title` más largo de lo que el sistema admite
- **THEN** o bien la tarea se crea con el título completo, o bien la respuesta es 422 con un error sobre `title`; en ningún caso se guarda una versión recortada con respuesta satisfactoria

### Requirement: Estados cerrados de una tarea

El sistema SHALL permitir únicamente los estados `pending`, `in_progress` y `done`, sin ninguna forma de añadir, renombrar o eliminar estados, y SHALL rechazar con 422 cualquier otro valor.

#### Scenario: Valor de estado desconocido

- **WHEN** se actualiza una tarea con un `status` distinto de `pending`, `in_progress` o `done`, por ejemplo `Hecho`
- **THEN** la respuesta es 422 con un error sobre el campo `status` y la tarea no cambia

#### Scenario: Una tarea siempre tiene un estado

- **WHEN** se consulta cualquier tarea en cualquier momento
- **THEN** su `status` es exactamente uno de los tres valores

### Requirement: Actualización de tareas por API

El sistema SHALL actualizar una tarea con `PATCH /api/v1/tasks/:id`, admitiendo cambiar su `status` y su responsable (`assigneeId`), y SHALL permitirlo a cualquier persona con sesión sobre cualquier tarea, sea o no la suya.

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

#### Scenario: Responsable inexistente

- **WHEN** se envía un `assigneeId` que no corresponde a ninguna cuenta
- **THEN** la respuesta es 422 con un error sobre el campo `assigneeId` y la tarea no cambia

#### Scenario: Petición sin cambios

- **WHEN** no se envía ni `status` ni `assigneeId`
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

El sistema SHALL ofrecer sobre las tareas únicamente listar, crear y actualizar.

#### Scenario: Operaciones no ofrecidas

- **WHEN** se intenta leer una tarea individual, borrarla o consultar endpoints de equipo
- **THEN** el sistema no responde a esas peticiones como operaciones válidas (404)

### Requirement: Pantalla de la lista de tareas

El sistema SHALL ofrecer en `/tasks` una única lista con todas las tareas del equipo, en la que cada fila muestra el título, el responsable por su nombre y el estado como Pendiente, En curso o Hecho, sin necesidad de abrir ninguna.

#### Scenario: Ver la lista

- **WHEN** una persona con sesión abre `/tasks` y hay tareas
- **THEN** ve una fila por tarea con su título, quién la lleva y su estado
- **AND** ve las mismas tareas que cualquier otra persona del equipo

#### Scenario: Responsable sin nombre

- **WHEN** el responsable de una tarea no tiene nombre
- **THEN** la fila muestra «Sin nombre» y nunca su correo ni su identificador

#### Scenario: Sin fechas

- **WHEN** se mira la lista
- **THEN** no aparece ninguna fecha ni marca de tarea vencida

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

### Requirement: Creación de tareas desde la pantalla

El sistema SHALL permitir crear una tarea desde la lista pidiendo únicamente el título, con un botón «Crear tarea», y SHALL mostrar la tarea nueva en la lista sin recargar ni navegar.

#### Scenario: Crear una tarea

- **WHEN** la persona escribe un título y pulsa «Crear tarea»
- **THEN** la tarea aparece en la lista sin recargar la página, en estado Pendiente y con su propio nombre como responsable
- **AND** el campo del título queda vacío para poder anotar otra

#### Scenario: Solo se pide el título

- **WHEN** la persona recorre el flujo de creación
- **THEN** el título es lo único que se le pide
- **AND** no se le ofrece ni sugiere indicar responsable, estado ni fecha

#### Scenario: Título vacío o en blanco

- **WHEN** la persona intenta crear una tarea con el título vacío o solo con espacios
- **THEN** no se crea ninguna tarea y se muestra junto al campo un mensaje en castellano que explica que falta el título, como «Falta rellenar el título.»

#### Scenario: Título demasiado largo

- **WHEN** el servidor rechaza el título por su longitud
- **THEN** se muestra junto al campo un mensaje que avisa de que se pasa de largo, y no se crea ninguna tarea

#### Scenario: Error al crear

- **WHEN** no se puede crear la tarea porque el servidor no responde o responde con un error inesperado
- **THEN** se muestra un aviso en castellano y el título escrito se conserva

### Requirement: Cambio de estado desde la lista

El sistema SHALL permitir cambiar el estado de cualquier tarea desde su propia fila, con un solo gesto, ofreciendo como únicos destinos Pendiente, En curso y Hecho.

#### Scenario: Cambiar el estado

- **WHEN** la persona elige otro estado en la fila de una tarea
- **THEN** la fila refleja el nuevo estado sin abrir la tarea, sin diálogo de confirmación y sin rellenar ningún campo

#### Scenario: Tarea de otra persona

- **WHEN** la persona cambia el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual que en una tarea propia, sin permiso especial ni advertencia

#### Scenario: Solo tres destinos

- **WHEN** la persona mira a qué puede cambiar una tarea
- **THEN** los únicos destinos ofrecidos son Pendiente, En curso y Hecho
- **AND** al terminar la tarea está en exactamente uno de ellos

#### Scenario: El cambio falla

- **WHEN** no se puede guardar el cambio porque el servidor no responde o responde con un error
- **THEN** se muestra un aviso en castellano y la fila conserva el estado anterior

#### Scenario: Cambiar el responsable

- **WHEN** la persona recorre la pantalla
- **THEN** no se le ofrece cambiar el responsable de ninguna tarea
