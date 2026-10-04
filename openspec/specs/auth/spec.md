# auth Specification

## Purpose

Permitir que una persona cree una cuenta en FlowSync, inicie y cierre sesión, y consulte su perfil, tanto a través de la API HTTP como desde la aplicación web.

## Requirements

### Requirement: Registro de cuenta por API

La API SHALL permitir crear una cuenta nueva sin autenticación previa mediante una petición con nombre completo, email, contraseña y confirmación de contraseña, y SHALL responder con el usuario creado y un token de acceso ya válido, envueltos en `data`.

#### Scenario: Registro correcto

- **WHEN** se envía una petición de registro con `fullName` "Ada Lovelace", un `email` válido y no registrado, `password` de entre 8 y 32 caracteres y `passwordConfirmation` idéntica
- **THEN** la respuesta es 200 con un cuerpo `{ data: { user, token } }`, donde `user` contiene `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt`, y `token` es una cadena que empieza por `oat_`

#### Scenario: El token del registro ya sirve para autenticarse

- **WHEN** se usa el `token` devuelto por el registro como `Authorization: Bearer` en una petición de perfil
- **THEN** la respuesta es 200 con los datos del usuario recién creado

#### Scenario: Registro sin nombre

- **WHEN** se envía una petición de registro con `fullName` a `null` y el resto de campos válidos
- **THEN** la cuenta se crea y el `user` devuelto tiene `fullName` a `null`

#### Scenario: La contraseña no se expone

- **WHEN** se registra una cuenta correctamente
- **THEN** el `user` de la respuesta no incluye la contraseña ni ningún derivado de ella

### Requirement: Validación de los datos de registro

La API SHALL rechazar con un 422 toda petición de registro cuyos datos no cumplan las reglas, sin crear la cuenta, y SHALL devolver un cuerpo `{ errors: [...] }` donde cada error indica `field`, `rule` y `message`. Las reglas son: `fullName` presente y de tipo texto o `null`; `email` con formato de email, de como máximo 254 caracteres y no registrado ya; `password` de entre 8 y 32 caracteres; `passwordConfirmation` de entre 8 y 32 caracteres e igual a `password`.

#### Scenario: Email ya registrado

- **WHEN** se intenta registrar una cuenta con un email que ya pertenece a otra cuenta
- **THEN** la respuesta es 422 con un error sobre `email` de regla `database.unique` y no se crea ninguna cuenta

#### Scenario: Email mal formado

- **WHEN** se envía un registro con `email` "no-es-un-email"
- **THEN** la respuesta es 422 con un error sobre `email` de regla `email`

#### Scenario: Contraseña demasiado corta

- **WHEN** se envía un registro con una `password` de 7 caracteres
- **THEN** la respuesta es 422 con un error sobre `password` de regla `minLength` cuyo `meta.min` es 8

#### Scenario: Contraseña demasiado larga

- **WHEN** se envía un registro con una `password` de 33 caracteres
- **THEN** la respuesta es 422 con un error sobre `password` de regla `maxLength` cuyo `meta.max` es 32

#### Scenario: Las contraseñas no coinciden

- **WHEN** se envía un registro con `passwordConfirmation` distinta de `password`
- **THEN** la respuesta es 422 con un error sobre `passwordConfirmation` de regla `sameAs`

#### Scenario: Falta la clave del nombre

- **WHEN** se envía un registro sin la clave `fullName` en el cuerpo
- **THEN** la respuesta es 422 con un error sobre `fullName` de regla `required`

### Requirement: Campos vacíos equivalen a nulos

La API SHALL tratar como `null` cualquier campo enviado como cadena vacía en el registro y en el login, antes de validarlo: un campo obligatorio vacío SHALL rechazarse como ausente y no por su formato o su longitud.

#### Scenario: Email vacío en el registro

- **WHEN** se envía un registro con `email` igual a `""`
- **THEN** la respuesta es 422 con un error sobre `email` de regla `required`

#### Scenario: Nombre vacío en el registro

- **WHEN** se envía un registro con `fullName` igual a `""` y el resto de campos válidos
- **THEN** la cuenta se crea y el `user` devuelto tiene `fullName` a `null`

#### Scenario: Contraseña vacía en el login

- **WHEN** se envía un login con `password` igual a `""`
- **THEN** la respuesta es 422 con un error sobre `password` de regla `required`, sin comprobar las credenciales

### Requirement: Inicio de sesión por API

La API SHALL permitir, sin autenticación previa, intercambiar un email y una contraseña correctos por un token de acceso nuevo, devolviendo el usuario y el token envueltos en `data`.

#### Scenario: Credenciales correctas

- **WHEN** se envía una petición de login con el email y la contraseña de una cuenta existente
- **THEN** la respuesta es 200 con un cuerpo `{ data: { user, token } }` con la misma forma que en el registro

#### Scenario: Cada login emite un token distinto y los anteriores siguen vivos

- **WHEN** la misma cuenta inicia sesión dos veces seguidas
- **THEN** se obtienen dos tokens diferentes y ambos son aceptados en peticiones autenticadas

### Requirement: Rechazo de credenciales incorrectas

La API SHALL responder 400 con el mismo cuerpo `{ errors: [{ message: "Invalid user credentials" }] }` tanto si el email no corresponde a ninguna cuenta como si la contraseña es incorrecta, sin emitir token y sin revelar cuál de los dos ha fallado.

#### Scenario: Contraseña incorrecta

- **WHEN** se envía un login con un email registrado y una contraseña que no es la suya
- **THEN** la respuesta es 400 con `{ errors: [{ message: "Invalid user credentials" }] }`

#### Scenario: Email no registrado

- **WHEN** se envía un login con un email que no pertenece a ninguna cuenta
- **THEN** la respuesta es 400 con exactamente el mismo cuerpo que para una contraseña incorrecta

### Requirement: Validación de los datos de login

La API SHALL rechazar con un 422 y el formato `{ errors: [...] }` toda petición de login cuyo `email` no tenga formato de email o supere 254 caracteres, o cuya `password` no sea un texto, antes de comprobar las credenciales. La contraseña del login no SHALL estar sujeta a reglas de longitud.

#### Scenario: Email mal formado en el login

- **WHEN** se envía un login con `email` "no-es-un-email"
- **THEN** la respuesta es 422 con un error sobre `email` de regla `email`

#### Scenario: Falta la contraseña

- **WHEN** se envía un login sin la clave `password`
- **THEN** la respuesta es 422 con un error sobre `password` de regla `required`

### Requirement: Consulta del perfil propio

La API SHALL devolver, a quien presente un token de acceso válido como `Authorization: Bearer`, los datos de la cuenta a la que pertenece ese token, envueltos en `data`.

#### Scenario: Perfil con token válido

- **WHEN** se pide el perfil con un token válido
- **THEN** la respuesta es 200 con `{ data: { id, fullName, email, initials, createdAt, updatedAt } }` de la cuenta dueña del token

### Requirement: Iniciales del usuario

La API SHALL incluir en cada usuario devuelto un campo `initials`, en mayúsculas, calculado así. Si la cuenta tiene nombre, se trocea por cada carácter de espacio; si no lo tiene, el email se trocea por la arroba. Si los dos primeros trozos son no vacíos, `initials` es el primer carácter de cada uno; si no, son los dos primeros caracteres del primer trozo, o menos si el trozo es más corto. El nombre no se recorta antes de trocearlo.

#### Scenario: Nombre separado por más de un espacio

- **WHEN** la cuenta tiene `fullName` "Ada  Lovelace", con dos espacios entre las palabras
- **THEN** `initials` vale "AD", porque el segundo trozo está vacío

#### Scenario: Nombre de un solo carácter

- **WHEN** la cuenta tiene `fullName` "A"
- **THEN** `initials` vale "A"

#### Scenario: Nombre que empieza por espacio

- **WHEN** la cuenta tiene `fullName` " Ada", creada directamente por API
- **THEN** `initials` es una cadena vacía

#### Scenario: Nombre de dos o más palabras

- **WHEN** la cuenta tiene `fullName` "ada lovelace byron"
- **THEN** `initials` vale "AL"

#### Scenario: Nombre de una sola palabra

- **WHEN** la cuenta tiene `fullName` "Ada"
- **THEN** `initials` vale "AD"

#### Scenario: Sin nombre

- **WHEN** la cuenta tiene `fullName` a `null` y `email` `ada@example.com`
- **THEN** `initials` vale "AE"

### Requirement: Protección de los endpoints de cuenta

La API SHALL responder 401 con `{ errors: [{ message: "Unauthorized access" }] }` a cualquier petición de perfil o de cierre de sesión que no traiga un token de acceso válido, ya sea porque falta, está mal formado, no existe o fue revocado.

#### Scenario: Sin cabecera de autorización

- **WHEN** se pide el perfil sin cabecera `Authorization`
- **THEN** la respuesta es 401 con `{ errors: [{ message: "Unauthorized access" }] }`

#### Scenario: Token inventado

- **WHEN** se pide el perfil con `Authorization: Bearer oat_inventado`
- **THEN** la respuesta es 401

#### Scenario: Endpoints de registro y login abiertos

- **WHEN** se llama al registro o al login sin cabecera `Authorization`
- **THEN** la petición se procesa con normalidad y no se responde 401

### Requirement: Cierre de sesión por API

La API SHALL permitir a quien presenta un token válido revocar ese token concreto, respondiendo 200 con `{ message: "Logged out successfully" }` sin envoltorio `data`. Tras ello ese token SHALL dejar de ser aceptado, mientras que los demás tokens de la misma cuenta SHALL seguir siendo válidos.

#### Scenario: Logout correcto

- **WHEN** se envía una petición de logout con un token válido
- **THEN** la respuesta es 200 con `{ message: "Logged out successfully" }`

#### Scenario: El token revocado deja de valer

- **WHEN** tras hacer logout con un token se pide el perfil con ese mismo token
- **THEN** la respuesta es 401

#### Scenario: Otros tokens de la cuenta no se ven afectados

- **WHEN** una cuenta tiene dos tokens activos y hace logout con uno de ellos
- **THEN** el otro token sigue obteniendo 200 al pedir el perfil

### Requirement: Tokens sin caducidad

Un token de acceso SHALL seguir siendo válido indefinidamente mientras no se revoque mediante logout.

#### Scenario: Token antiguo

- **WHEN** se usa un token emitido hace tiempo y nunca revocado
- **THEN** la API lo acepta igual que uno recién emitido

### Requirement: Respuestas siempre en JSON

La API SHALL responder en JSON a todas las peticiones de cuenta, incluidos los errores, con independencia de la cabecera `Accept` que envíe el cliente.

#### Scenario: Cliente que pide HTML

- **WHEN** se pide el perfil sin token y con `Accept: text/html`
- **THEN** la respuesta es 401 con cuerpo JSON `{ errors: [{ message: "Unauthorized access" }] }`, no HTML ni una redirección

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer una pantalla "Crea tu cuenta" con los campos "Nombre completo (opcional)", "Email", "Contraseña" (con la ayuda "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" que lleva a la pantalla de login. Al registrarse con éxito SHALL dejar a la persona con la sesión iniciada en la lista de tareas.

#### Scenario: Registro correcto desde la web

- **WHEN** una persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** el botón pasa a mostrar "Creando cuenta…" y queda deshabilitado mientras se envía, y al terminar la persona ve la lista de tareas con la sesión iniciada

#### Scenario: Nombre en blanco

- **WHEN** una persona deja el nombre vacío o solo con espacios y se registra
- **THEN** la cuenta se crea sin nombre y su perfil muestra "Sin nombre"

#### Scenario: Contraseñas distintas detectadas sin ir al servidor

- **WHEN** una persona escribe una contraseña y una confirmación distintas y pulsa "Crear cuenta"
- **THEN** bajo "Repite la contraseña" aparece "Las contraseñas no coinciden." y no se envía nada al servidor

#### Scenario: Email ya registrado desde la web

- **WHEN** una persona intenta registrarse con un email que ya tiene cuenta
- **THEN** bajo el campo Email aparece "Ese email ya está registrado. Inicia sesión en su lugar."

#### Scenario: Errores de validación junto a su campo

- **WHEN** el servidor rechaza el registro por reglas de validación
- **THEN** cada mensaje aparece en castellano bajo el campo afectado (por ejemplo "la contraseña debe tener al menos 8 caracteres.", "Introduce una dirección de email válida.") y no aparece aviso general encima del formulario

### Requirement: Pantalla de inicio de sesión

La aplicación web SHALL ofrecer una pantalla "Inicia sesión" con los campos "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" que lleva a la pantalla de registro. Al iniciar sesión con éxito SHALL llevar a la persona a la lista de tareas.

#### Scenario: Login correcto desde la web

- **WHEN** una persona introduce credenciales correctas y pulsa "Entrar"
- **THEN** el botón muestra "Entrando…" y queda deshabilitado mientras se envía, y al terminar la persona ve la lista de tareas

#### Scenario: Credenciales incorrectas desde la web

- **WHEN** una persona introduce un email o una contraseña incorrectos y pulsa "Entrar"
- **THEN** aparece encima del formulario un aviso de error con "El email o la contraseña no son correctos." y el botón vuelve a estar disponible

#### Scenario: Email mal formado desde la web

- **WHEN** una persona introduce un email sin formato válido y pulsa "Entrar"
- **THEN** bajo el campo Email aparece "Introduce una dirección de email válida."

#### Scenario: Contraseña vacía desde la web

- **WHEN** una persona escribe su email, deja la contraseña vacía y pulsa "Entrar"
- **THEN** el formulario se envía igualmente al servidor y bajo el campo Contraseña aparece "Falta rellenar la contraseña."

### Requirement: Traducción de los errores del servidor en los formularios

La aplicación web SHALL traducir la respuesta de error del servidor a un mensaje en castellano en el aviso general de los formularios de login y de registro, siguiendo estas reglas: una respuesta 400 muestra "El email o la contraseña no son correctos.", sea cual sea su causa y en cualquiera de los dos formularios; una respuesta 422 con errores por campo muestra cada error bajo su campo; un fallo de conexión muestra un aviso de conexión; y cualquier otra respuesta de error distinta de 401, incluido un 422 sin errores por campo, muestra un aviso genérico de fallo del servidor. Nunca SHALL dejar el formulario sin respuesta.

#### Scenario: Backend apagado

- **WHEN** una persona envía el formulario de login o de registro y el servidor no está accesible
- **THEN** aparece el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Error inesperado del servidor

- **WHEN** el servidor responde a un envío de formulario con un error distinto de 400, 401 y 422, por ejemplo 404, 429 o 5xx
- **THEN** aparece el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

#### Scenario: Un 400 en el registro se presenta como credenciales incorrectas

- **WHEN** el servidor responde 400 a un envío del formulario de registro
- **THEN** aparece el aviso "El email o la contraseña no son correctos.", igual que en el login

### Requirement: Persistencia de la sesión en el navegador

La aplicación web SHALL conservar la sesión entre recargas y cierres de pestaña del mismo navegador, y al arrancar SHALL comprobar contra el servidor que la sesión guardada sigue siendo válida antes de mostrar contenido protegido o redirigir, mostrando mientras tanto un indicador de carga a pantalla completa.

#### Scenario: Recarga con sesión válida

- **WHEN** una persona con sesión iniciada recarga la página del perfil
- **THEN** ve brevemente un indicador de carga y después su perfil, sin pasar por el login

#### Scenario: Sesión revocada o inválida al arrancar

- **WHEN** la aplicación arranca con una sesión guardada que el servidor ya no reconoce
- **THEN** la sesión guardada se descarta y la persona llega al login con el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión."

#### Scenario: Servidor caído al arrancar

- **WHEN** la aplicación arranca con una sesión guardada y el servidor no está accesible
- **THEN** la persona llega al login con el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado.", y si recarga cuando el servidor vuelve recupera su sesión sin volver a introducir credenciales

#### Scenario: El aviso de sesión perdida cede ante un intento nuevo

- **WHEN** en el login se muestra el aviso de sesión perdida y la persona hace un intento de login que falla
- **THEN** el aviso pasa a mostrar el error de ese intento

### Requirement: Protección de pantallas según la sesión

La aplicación web SHALL permitir el acceso al perfil y a la lista de tareas solo con sesión iniciada, y SHALL impedir el acceso a login y registro con sesión iniciada. Cualquier otra dirección SHALL llevar a la lista de tareas.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre la dirección del perfil
- **THEN** es redirigida a la pantalla de login

#### Scenario: Login o registro con sesión

- **WHEN** una persona con sesión iniciada abre la pantalla de login o la de registro
- **THEN** es redirigida a la lista de tareas

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no corresponde a ninguna pantalla
- **THEN** es llevada a la lista de tareas si tiene sesión, o al login si no la tiene

### Requirement: Pantalla de perfil

La aplicación web SHALL mostrar en el perfil un círculo con las iniciales, el nombre completo (o "Sin nombre" si no tiene), el email y la fecha de alta como "Miembro desde" en formato largo en castellano, junto a un botón "Cerrar sesión" y un enlace que lleva a la lista de tareas.

#### Scenario: Perfil con nombre

- **WHEN** una persona llamada "Ada Lovelace" registrada el 3 de octubre de 2026 abre su perfil
- **THEN** ve "AL" en el círculo, "Ada Lovelace", su email y "Miembro desde 3 de octubre de 2026"

#### Scenario: Perfil sin nombre

- **WHEN** una persona registrada sin nombre abre su perfil
- **THEN** ve "Sin nombre" como título y las iniciales calculadas a partir de su email

#### Scenario: Volver a la lista desde el perfil

- **WHEN** una persona pulsa en su perfil el enlace a la lista de tareas
- **THEN** llega a la pantalla de tareas

### Requirement: Cierre de sesión desde la web

La aplicación web SHALL cerrar la sesión local de inmediato al pulsar "Cerrar sesión" y llevar a la persona al login, aunque el servidor no confirme la revocación.

#### Scenario: Cerrar sesión

- **WHEN** una persona pulsa "Cerrar sesión" en su perfil
- **THEN** llega a la pantalla de login sin ningún aviso de error, y recargar la página no recupera la sesión

#### Scenario: Cerrar sesión con el servidor caído

- **WHEN** una persona pulsa "Cerrar sesión" y el servidor no está accesible
- **THEN** igualmente llega al login sin aviso de error y la sesión del navegador queda cerrada
