# auth Specification

## Purpose

Cuentas y acceso de FlowSync: registro de usuarios, inicio y cierre de sesión mediante token, consulta del perfil propio y protección de las pantallas que exigen sesión. Describe el comportamiento actual del sistema, observable por HTTP en la API y por pantalla en la aplicación web.

## Requirements

### Requirement: Registro de cuenta por API

El sistema SHALL permitir crear una cuenta con `POST /api/v1/auth/signup` a partir de `fullName` (texto o `null`, pero siempre presente), `email`, `password` y `passwordConfirmation`, y SHALL responder con el usuario creado y un token de acceso.

#### Scenario: Registro correcto

- **WHEN** se envía un `email` válido y no registrado, una `password` de entre 8 y 32 caracteres y una `passwordConfirmation` idéntica
- **THEN** la respuesta es satisfactoria y su cuerpo contiene `data.user` (con `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt`) y `data.token`
- **AND** la contraseña no aparece en la respuesta

#### Scenario: Registro sin nombre

- **WHEN** se envía `fullName` con valor `null`
- **THEN** la cuenta se crea y `data.user.fullName` es `null`

#### Scenario: Nombre vacío

- **WHEN** se envía `fullName` como cadena vacía
- **THEN** la cuenta se crea y `data.user.fullName` es `null`

#### Scenario: Email ya registrado

- **WHEN** se envía un `email` que ya pertenece a otra cuenta
- **THEN** la respuesta es 422 con un error sobre el campo `email`

#### Scenario: Contraseña de longitud inválida

- **WHEN** la `password` tiene menos de 8 o más de 32 caracteres
- **THEN** la respuesta es 422 con un error sobre el campo `password`

#### Scenario: Confirmación distinta

- **WHEN** `passwordConfirmation` no coincide con `password`
- **THEN** la respuesta es 422 con un error sobre el campo `passwordConfirmation`
- **AND** si además la confirmación tiene menos de 8 caracteres, también hay un error de longitud sobre ese campo

#### Scenario: Email mal formado o demasiado largo

- **WHEN** el `email` no es una dirección válida o supera los 254 caracteres
- **THEN** la respuesta es 422 con un error sobre el campo `email`

#### Scenario: Campos obligatorios ausentes

- **WHEN** falta `fullName`, `email`, `password` o `passwordConfirmation` (aunque `fullName` admita `null`, la clave debe enviarse)
- **THEN** la respuesta es 422 con un error por cada campo ausente

### Requirement: Inicio de sesión por API

El sistema SHALL permitir iniciar sesión con `POST /api/v1/auth/login` mediante `email` y `password`, y SHALL responder con el usuario y un token de acceso nuevo.

#### Scenario: Credenciales correctas

- **WHEN** se envían el `email` y la `password` de una cuenta existente
- **THEN** la respuesta es satisfactoria y su cuerpo contiene `data.user` y `data.token`

#### Scenario: Cada inicio de sesión emite un token distinto

- **WHEN** la misma cuenta inicia sesión dos veces
- **THEN** se devuelven dos tokens distintos y ambos permiten acceder a las rutas protegidas

#### Scenario: Credenciales incorrectas

- **WHEN** el `email` no existe o la `password` no corresponde a la cuenta
- **THEN** la respuesta es 400 y no se devuelve ningún token

#### Scenario: El email distingue mayúsculas y minúsculas

- **WHEN** se registra `Ana@x.com` y otra persona se registra con `ana@x.com`
- **THEN** ambas cuentas se crean y cada una inicia sesión solo con su email exacto

#### Scenario: Datos de acceso mal formados

- **WHEN** falta el `email` o la `password` (o viene vacía), o el `email` no es una dirección válida
- **THEN** la respuesta es 422 con un error por cada campo afectado

### Requirement: Consulta del perfil propio por API

El sistema SHALL devolver los datos del usuario autenticado en `GET /api/v1/account/profile` cuando la petición lleva un token de acceso válido en la cabecera `Authorization: Bearer`.

#### Scenario: Token válido

- **WHEN** se solicita el perfil con un token emitido en el registro o el inicio de sesión
- **THEN** la respuesta es satisfactoria y `data` contiene `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt` de ese usuario

#### Scenario: Iniciales del usuario

- **WHEN** el usuario tiene un nombre con al menos dos palabras separadas por un espacio
- **THEN** `initials` son las primeras letras de la primera y la segunda palabra en mayúsculas (`Ada Byron Lovelace` da `AB`)
- **AND** cuando el usuario no tiene nombre, `initials` son la primera letra de la parte local del email y la primera del dominio en mayúsculas (`manu@gmail.com` da `MG`)
- **AND** cuando el nombre es una sola palabra, `initials` son sus dos primeras letras en mayúsculas (`Ada` da `AD`)

#### Scenario: Sin token

- **WHEN** se solicita el perfil sin cabecera `Authorization`
- **THEN** la respuesta es 401

#### Scenario: Token inválido

- **WHEN** se solicita el perfil con un token inexistente, alterado o ya revocado
- **THEN** la respuesta es 401

### Requirement: Cierre de sesión por API

El sistema SHALL revocar el token usado en la petición cuando se llama a `POST /api/v1/account/logout` con un token válido.

#### Scenario: Cierre correcto

- **WHEN** se llama al cierre de sesión con un token válido
- **THEN** la respuesta es satisfactoria con el mensaje `Logged out successfully`
- **AND** ese token deja de ser aceptado en las rutas protegidas, que responden 401

#### Scenario: Otros tokens de la misma cuenta siguen vigentes

- **WHEN** una cuenta con dos tokens cierra sesión con uno de ellos
- **THEN** el otro token sigue permitiendo acceder a las rutas protegidas

#### Scenario: Cierre sin token

- **WHEN** se llama al cierre de sesión sin token o con un token inválido
- **THEN** la respuesta es 401

### Requirement: Formato de las respuestas de la API de acceso

El sistema SHALL responder siempre en JSON en las rutas de acceso, envolviendo en una propiedad `data` las respuestas de registro, inicio de sesión y perfil. La respuesta del cierre de sesión es la excepción: no lleva envoltorio.

#### Scenario: Petición sin cabecera Accept de JSON

- **WHEN** se llama a cualquier ruta de acceso sin indicar que se espera JSON
- **THEN** la respuesta, correcta o de error, tiene formato JSON

#### Scenario: Cierre de sesión sin envoltorio

- **WHEN** el cierre de sesión se completa
- **THEN** el cuerpo es `{ "message": "Logged out successfully" }`, sin propiedad `data`

### Requirement: Pantalla de registro

El sistema SHALL ofrecer una pantalla de registro en `/register` con los campos «Nombre completo (opcional)», «Email», «Contraseña» (con la indicación «Entre 8 y 32 caracteres.») y «Repite la contraseña», un botón «Crear cuenta» y un enlace «Inicia sesión» hacia la pantalla de acceso.

#### Scenario: Registro correcto

- **WHEN** una persona sin sesión rellena email, contraseña y confirmación válidos y pulsa «Crear cuenta»
- **THEN** el botón muestra «Creando cuenta…» mientras espera
- **AND** al terminar queda con la sesión iniciada y se muestra su pantalla de perfil

#### Scenario: Nombre en blanco

- **WHEN** la persona deja el nombre vacío o solo con espacios
- **THEN** la cuenta se crea sin nombre y el perfil muestra «Sin nombre»

#### Scenario: Las contraseñas no coinciden

- **WHEN** la contraseña y su repetición son distintas
- **THEN** se muestra «Las contraseñas no coinciden.» bajo «Repite la contraseña» sin llegar a enviar el formulario

#### Scenario: Email ya registrado

- **WHEN** el email ya pertenece a otra cuenta
- **THEN** se muestra bajo «Email» el mensaje «Ese email ya está registrado. Inicia sesión en su lugar.»

#### Scenario: Errores de validación del servidor

- **WHEN** el servidor rechaza un campo por email inválido, campo vacío o longitud
- **THEN** bajo ese campo aparece un mensaje en castellano que explica el problema, como «Introduce una dirección de email válida.», «Falta rellenar el email.» o «la contraseña debe tener al menos 8 caracteres.»

#### Scenario: Ir al acceso

- **WHEN** la persona pulsa «Inicia sesión»
- **THEN** se muestra la pantalla de inicio de sesión

### Requirement: Pantalla de inicio de sesión

El sistema SHALL ofrecer una pantalla de inicio de sesión en `/login` con los campos «Email» y «Contraseña», un botón «Entrar» y un enlace «Crea una» hacia el registro.

#### Scenario: Acceso correcto

- **WHEN** una persona sin sesión introduce credenciales correctas y pulsa «Entrar»
- **THEN** el botón muestra «Entrando…» mientras espera
- **AND** al terminar queda con la sesión iniciada y se muestra su pantalla de perfil

#### Scenario: Credenciales incorrectas

- **WHEN** el email o la contraseña no son correctos
- **THEN** se muestra un aviso general «El email o la contraseña no son correctos.» y la persona permanece en la pantalla

#### Scenario: Errores de validación del servidor

- **WHEN** el servidor rechaza el email por no ser una dirección válida o por estar vacío, o la contraseña por estar vacía
- **THEN** el mensaje en castellano aparece bajo el campo afectado, como «Introduce una dirección de email válida.» o «Falta rellenar la contraseña.»

#### Scenario: Servidor inaccesible

- **WHEN** no se puede conectar con el servidor al enviar el formulario
- **THEN** se muestra un aviso que indica que no se pudo conectar con el servidor

#### Scenario: Error inesperado del servidor

- **WHEN** el servidor responde con un error que no es de validación ni de credenciales
- **THEN** se muestra un aviso «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.»

#### Scenario: Error nuevo tras un envío anterior fallido

- **WHEN** la persona reenvía el formulario
- **THEN** el aviso del intento anterior y los errores bajo cada campo desaparecen mientras se procesa el nuevo envío
- **AND** el aviso de sesión perdida, si lo había, permanece hasta que se inicie sesión correctamente

#### Scenario: Ir al registro

- **WHEN** la persona pulsa «Crea una»
- **THEN** se muestra la pantalla de registro

### Requirement: Pantalla de perfil

El sistema SHALL mostrar en `/profile` al usuario con sesión sus iniciales, su nombre (o «Sin nombre»), su email, la fecha «Miembro desde» en formato largo en castellano y un botón «Cerrar sesión».

#### Scenario: Visualización del perfil

- **WHEN** una persona con sesión abre `/profile`
- **THEN** ve sus iniciales, su nombre completo o «Sin nombre», su email y la fecha de creación de su cuenta

#### Scenario: Cerrar sesión

- **WHEN** la persona pulsa «Cerrar sesión»
- **THEN** se muestra la pantalla de inicio de sesión sin ningún aviso de error

#### Scenario: Cerrar sesión con el servidor caído

- **WHEN** la persona pulsa «Cerrar sesión» y el servidor no responde o rechaza el token
- **THEN** igualmente queda sin sesión en la aplicación y se muestra la pantalla de inicio de sesión, sin ningún aviso
- **AND** el token no se revoca en el servidor, por lo que sigue siendo válido allí

### Requirement: Protección de pantallas según la sesión

El sistema SHALL mostrar el perfil solo a quien tiene sesión, y SHALL mostrar el registro y el inicio de sesión solo a quien no la tiene.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es llevada a la pantalla de inicio de sesión

#### Scenario: Acceso con sesión

- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** es llevada a su perfil

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no existe
- **THEN** es llevada a `/profile`, y de ahí a la pantalla de inicio de sesión si no tiene sesión

#### Scenario: Indicador de carga al restaurar la sesión

- **WHEN** la aplicación se carga con una sesión guardada y aún no ha confirmado con el servidor que sigue siendo válida
- **THEN** se muestra un indicador de carga y no se redirige a ninguna pantalla hasta confirmarlo

### Requirement: Persistencia de la sesión entre cargas

El sistema SHALL conservar la sesión del navegador al recargar la página o cerrar y reabrir la pestaña, siempre que el servidor siga reconociendo el token guardado.

#### Scenario: Recarga con sesión válida

- **WHEN** una persona con sesión recarga la página
- **THEN** permanece en la pantalla de perfil sin volver a introducir sus credenciales

#### Scenario: Token rechazado por el servidor

- **WHEN** la aplicación se carga con una sesión guardada que el servidor rechaza con 401
- **THEN** la sesión se descarta definitivamente
- **AND** la persona ve la pantalla de inicio de sesión con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.»

#### Scenario: Servidor inaccesible o con error al restaurar

- **WHEN** la aplicación se carga con una sesión guardada y el servidor no responde o responde con un error distinto de 401
- **THEN** la persona ve la pantalla de inicio de sesión con un aviso que explica el fallo
- **AND** la sesión guardada se conserva, de modo que al recargar con el servidor disponible vuelve a su perfil

#### Scenario: El token no caduca por tiempo

- **WHEN** pasa tiempo sin que se cierre sesión
- **THEN** el token sigue siendo válido hasta que se revoque con el cierre de sesión

#### Scenario: Aviso de sesión perdida al volver a entrar

- **WHEN** la persona inicia sesión correctamente tras ver un aviso de sesión perdida
- **THEN** el aviso desaparece
