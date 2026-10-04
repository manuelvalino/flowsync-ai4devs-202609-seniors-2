# tasks Specification

## Purpose
Dar al equipo una única lista compartida de tareas, en la que cualquiera ve el título, el responsable y el estado de cada tarea, crea tareas con solo el título y cambia su estado sin salir de la lista.

## Requirements

### Requirement: Estados cerrados de una tarea

Toda tarea SHALL estar en exactamente uno de tres estados, identificados en la API como `pending`, `in_progress` y `done` y mostrados en pantalla como "Pendiente", "En curso" y "Hecho". No SHALL existir ninguna forma, ni en la API ni en la web, de añadir, renombrar o eliminar estados.

#### Scenario: Estado de cada tarea listada

- **WHEN** se listan las tareas por la API
- **THEN** el `status` de cada tarea es exactamente uno de `pending`, `in_progress` o `done`

#### Scenario: Estado fuera del conjunto

- **WHEN** se intenta actualizar una tarea con `status` "pendiente", "blocked" o cualquier otro valor ajeno a los tres
- **THEN** la respuesta es 422 con un error sobre `status` y la tarea conserva su estado anterior

#### Scenario: Etiquetas en pantalla

- **WHEN** una persona mira la lista de tareas en la web
- **THEN** los estados aparecen como "Pendiente", "En curso" y "Hecho", nunca con sus identificadores de la API

### Requirement: Listado de todas las tareas por API

La API SHALL devolver a cualquier persona autenticada todas las tareas del espacio, envueltas en `data`. Cada tarea SHALL incluir solo `id`, `title`, `status` y `assignee`, y `assignee` SHALL incluir solo el `id` y el `fullName` del responsable. La lista SHALL ser la misma con independencia de quién la pida, y SHALL no seguir ningún orden garantizado.

#### Scenario: Listado con tareas

- **WHEN** una persona autenticada pide la lista de tareas y existen tareas
- **THEN** la respuesta es 200 con `{ data: [...] }`, que contiene todas las tareas existentes, cada una con la forma `{ id, title, status, assignee: { id, fullName } }`

#### Scenario: El responsable no expone datos de cuenta

- **WHEN** se lista una tarea cuyo responsable tiene email y fecha de alta
- **THEN** el `assignee` de esa tarea no incluye el email, las fechas, las iniciales ni ningún otro dato aparte de `id` y `fullName`

#### Scenario: Responsable sin nombre

- **WHEN** se lista una tarea cuyo responsable no tiene nombre
- **THEN** su `assignee.fullName` es `null`

#### Scenario: Mismo contenido para todos

- **WHEN** dos personas autenticadas distintas piden la lista sin que nadie haya cambiado nada entre medias
- **THEN** las dos respuestas contienen exactamente el mismo conjunto de tareas

#### Scenario: Tareas de otros incluidas

- **WHEN** otra persona ha creado una tarea y la lista la pide alguien distinto
- **THEN** esa tarea aparece en su respuesta

#### Scenario: Espacio sin tareas

- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** la respuesta es 200 con `{ data: [] }`

#### Scenario: Listar no modifica nada

- **WHEN** se pide la lista de tareas varias veces seguidas
- **THEN** ninguna tarea cambia de título, de estado ni de responsable

### Requirement: Creación de una tarea por API con solo el título

La API SHALL permitir a cualquier persona autenticada crear una tarea enviando únicamente `title`. La tarea creada SHALL nacer en estado `pending` y SHALL tener como responsable a quien la crea. Cualquier otro campo de la petición SHALL ignorarse.

#### Scenario: Creación correcta

- **WHEN** una persona autenticada envía una petición de creación con `title` "Preparar la demo"
- **THEN** la respuesta es 201 con `{ data: { id, title: "Preparar la demo", status: "pending", assignee: { id, fullName } } }`, donde `assignee` es quien hizo la petición

#### Scenario: La tarea creada aparece en la lista

- **WHEN** tras crear una tarea cualquier persona autenticada pide la lista
- **THEN** la tarea creada está incluida

#### Scenario: No se puede elegir estado ni responsable al crear

- **WHEN** se envía una petición de creación con `title` válido junto con `status` "done" y el `assigneeId` de otra persona
- **THEN** la tarea se crea igualmente en `pending` y con quien hizo la petición como responsable

#### Scenario: La creación no admite fecha

- **WHEN** se envía una petición de creación con `title` válido y un campo de fecha de vencimiento
- **THEN** la tarea se crea sin ninguna fecha y la respuesta no incluye ningún campo de fecha

### Requirement: Título obligatorio y acotado

La API SHALL guardar el título sin los espacios de los extremos y SHALL rechazar con 422, sin crear la tarea, todo título ausente, vacío o formado solo por espacios, así como todo título de más de 255 caracteres tras quitar esos espacios. Un título demasiado largo no SHALL guardarse recortado.

#### Scenario: Sin título

- **WHEN** se envía una petición de creación sin el campo `title`
- **THEN** la respuesta es 422 con un error sobre `title` y no se crea ninguna tarea

#### Scenario: Título solo con espacios

- **WHEN** se envía una petición de creación con `title` "   "
- **THEN** se rechaza como un título vacío: la respuesta es 422 con un error sobre `title` y no se crea ninguna tarea

#### Scenario: Espacios de los extremos

- **WHEN** se crea una tarea con `title` "  Revisar el PR  "
- **THEN** la tarea se guarda y se devuelve con `title` "Revisar el PR"

#### Scenario: Título en el límite

- **WHEN** se crea una tarea con un `title` de exactamente 255 caracteres
- **THEN** la respuesta es 201 y el título se guarda completo

#### Scenario: Título demasiado largo

- **WHEN** se envía una petición de creación con un `title` de 256 caracteres
- **THEN** la respuesta es 422 con un error sobre `title` que indica el máximo de 255, y no se crea ninguna tarea, ni completa ni recortada

### Requirement: Actualización de estado y responsable por API

La API SHALL permitir a cualquier persona autenticada actualizar el `status` y el `assigneeId` de cualquier tarea, sea o no su responsable, y SHALL responder con la tarea actualizada envuelta en `data`, con la misma forma que en el listado. Ambos campos SHALL ser opcionales. El `status` SHALL pasar de cualquiera de los tres valores a cualquier otro. El título no SHALL cambiar por esta operación.

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

### Requirement: Solo tres operaciones de tareas

La API de tareas SHALL ofrecer únicamente listar todas, crear una y actualizar una. No SHALL existir lectura individual de una tarea, borrado de tareas ni ninguna operación sobre equipos o miembros.

#### Scenario: Sin lectura individual

- **WHEN** se pide una tarea concreta por su identificador
- **THEN** la respuesta es 404 porque esa operación no existe

#### Scenario: Sin borrado

- **WHEN** se intenta borrar una tarea
- **THEN** la respuesta es 404 y la tarea sigue apareciendo en el listado

### Requirement: Operaciones de tareas solo con sesión

La API SHALL responder 401 con `{ errors: [{ message: "Unauthorized access" }] }` a cualquier operación de tareas que no traiga un token de acceso válido, sin revelar ni modificar ninguna tarea.

#### Scenario: Listar sin sesión

- **WHEN** se pide la lista de tareas sin cabecera `Authorization`
- **THEN** la respuesta es 401 y no incluye ninguna tarea

#### Scenario: Crear o actualizar sin sesión

- **WHEN** se intenta crear o actualizar una tarea con un token inválido o revocado
- **THEN** la respuesta es 401 y no se crea ni modifica ninguna tarea

### Requirement: Pantalla de la lista compartida

La aplicación web SHALL ofrecer, solo con sesión iniciada, una pantalla "Tareas" con la lista de todas las tareas del espacio, la misma para cualquier persona. Cada fila SHALL mostrar, sin abrir nada, el título, el nombre del responsable y el estado. Si el responsable no tiene nombre, SHALL mostrarse "Sin nombre", y nunca su email ni su identificador. La lista no SHALL mostrar fechas, marcas de vencimiento ni señales de presencia o actividad de las personas, y no SHALL existir ninguna vista de "mis tareas" separada.

#### Scenario: Fila de una tarea

- **WHEN** una persona abre la pantalla de tareas y existe la tarea "Preparar la demo", en curso y a cargo de "Ada Lovelace"
- **THEN** ve en una fila "Preparar la demo", "Ada Lovelace" y el selector de estado mostrando "En curso", sin hacer clic en nada

#### Scenario: Responsable sin nombre en la lista

- **WHEN** la lista contiene una tarea cuyo responsable no tiene nombre
- **THEN** la fila muestra "Sin nombre" como responsable y no muestra su email

#### Scenario: Tareas de todo el equipo

- **WHEN** dos personas distintas abren la pantalla de tareas sin que nadie haya cambiado nada
- **THEN** las dos ven las mismas tareas, incluidas las que tienen otros responsables

#### Scenario: Sin fechas ni presencia

- **WHEN** una persona recorre la lista mientras otros miembros usan la aplicación
- **THEN** no ve ninguna fecha, ninguna marca de vencida ni ninguna indicación de quién está conectado

#### Scenario: Espacio vacío

- **WHEN** una persona abre la pantalla de tareas y no se ha creado ninguna
- **THEN** en lugar de una lista vacía ve un texto que explica que aquí estarán las tareas de todo el equipo y la invita a crear la primera con el formulario

#### Scenario: Carga de la lista

- **WHEN** la pantalla de tareas está pidiendo la lista al servidor
- **THEN** se muestra un indicador de carga, y si la petición falla aparece un aviso de error en castellano en lugar de la lista

#### Scenario: Pantalla de tareas sin sesión

- **WHEN** una persona sin sesión abre la dirección de la pantalla de tareas
- **THEN** es redirigida a la pantalla de login sin ver ninguna tarea

#### Scenario: Acceso al perfil

- **WHEN** una persona está en la pantalla de tareas
- **THEN** tiene un enlace visible que la lleva a su perfil

### Requirement: Crear una tarea desde la lista

La pantalla de tareas SHALL incluir un formulario cuyo único campo es "Título", con un botón "Crear tarea". El formulario no SHALL ofrecer ni sugerir responsable, estado, fecha ni ningún otro dato. Al crear con éxito, la tarea SHALL aparecer en la lista sin recargar ni navegar, como "Pendiente" y con el nombre de quien la creó como responsable, y el campo SHALL quedar vacío.

#### Scenario: Crear con solo el título

- **WHEN** una persona escribe "Preparar la demo" en "Título" y pulsa "Crear tarea"
- **THEN** el botón muestra "Creando…" y queda deshabilitado mientras se envía, y al terminar aparece en la lista una fila "Preparar la demo" en "Pendiente" con su nombre como responsable, sin recargar la página, y el campo queda vacío

#### Scenario: Único campo

- **WHEN** una persona mira el formulario de creación
- **THEN** solo ve el campo "Título" y el botón "Crear tarea", sin selectores ni sugerencias de responsable, estado o fecha

#### Scenario: Título vacío o en blanco

- **WHEN** una persona deja "Título" vacío o con solo espacios y pulsa "Crear tarea"
- **THEN** bajo el campo aparece "Falta rellenar el título." y no se añade ninguna fila a la lista

#### Scenario: Título demasiado largo desde la web

- **WHEN** una persona escribe un título de más de 255 caracteres y pulsa "Crear tarea"
- **THEN** bajo el campo aparece un aviso en castellano de que el título no puede superar los 255 caracteres, el texto escrito se conserva en el campo y no se añade ninguna fila

#### Scenario: Fallo al crear

- **WHEN** el servidor no está accesible o responde con un error inesperado al crear
- **THEN** aparece un aviso de error en castellano encima del formulario, el texto escrito se conserva y no se añade ninguna fila

### Requirement: Cambiar el estado desde la fila

Cada fila de la lista SHALL ofrecer un selector desplegable de estado con exactamente tres opciones, "Pendiente", "En curso" y "Hecho". Cerrado, el selector SHALL mostrar el estado actual de la tarea. Elegir otra opción SHALL cambiar la tarea a ese estado sin abrir la tarea, sin diálogo de confirmación, sin botón de guardar y sin rellenar nada más, en cualquier tarea y sea quien sea su responsable. El nuevo estado SHALL verse de inmediato en el selector de la fila.

#### Scenario: Cambio desde el selector

- **WHEN** una persona abre el selector de estado de una tarea que está en "Pendiente" y elige "En curso"
- **THEN** el selector muestra "En curso" al instante, sin diálogos ni botón de guardar, y el cambio queda guardado para todo el equipo

#### Scenario: Tarea de otra persona

- **WHEN** una persona elige "Hecho" en el selector de una tarea cuyo responsable es otra persona
- **THEN** el cambio se aplica igual que en una tarea propia, sin advertencias ni permisos adicionales

#### Scenario: Solo tres opciones

- **WHEN** una persona abre el selector de estado de una tarea
- **THEN** solo encuentra las opciones "Pendiente", "En curso" y "Hecho", con la actual marcada, sin poder escribir otro valor ni dejarlo vacío, y la tarea queda siempre en exactamente uno de ellos

#### Scenario: Elegir el estado actual

- **WHEN** una persona abre el selector de una tarea y elige la opción que ya tiene
- **THEN** no se envía ninguna petición y la fila no cambia

#### Scenario: El cambio falla

- **WHEN** una persona cambia el estado de una tarea y el servidor rechaza la petición o no está accesible
- **THEN** el selector vuelve a mostrar el estado anterior y aparece un aviso de error en castellano

#### Scenario: Cambiar el estado no altera lo demás

- **WHEN** una persona cambia el estado de una tarea desde la fila
- **THEN** el título y el responsable de esa tarea no cambian
