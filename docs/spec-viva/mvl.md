# Cuentas y acceso

## Purpose

Permitir que una persona cree su cuenta, inicie y cierre sesión y conserve esa sesión entre visitas, de modo que solo quien tiene una sesión válida pueda entrar en el espacio compartido de FlowSync.

## Requirements

### Requirement: Registro de una cuenta por la API

El sistema SHALL crear una cuenta cuando reciba en `POST /api/v1/auth/signup` un nombre completo, un email, una contraseña y su confirmación válidos, y SHALL responder con los datos públicos de la cuenta creada junto con un token de acceso ya utilizable, sin ningún paso adicional de invitación ni de alta en un equipo.

#### Scenario: Registro correcto

- **WHEN** se envía `POST /api/v1/auth/signup` con `fullName` «Ada Lovelace», un `email` que no existe todavía y una `password` de entre 8 y 32 caracteres repetida idéntica en `passwordConfirmation`
- **THEN** la respuesta es 200 con un cuerpo `data` que contiene `user` (con `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt`, y nunca la contraseña) y `token`, y ese token da acceso inmediato a las rutas protegidas

#### Scenario: El nombre completo es opcional pero debe viajar en la petición

- **WHEN** se envía el registro con `fullName` a `null` o como cadena vacía
- **THEN** la cuenta se crea y la respuesta devuelve `fullName` como `null`

#### Scenario: Omitir la clave del nombre completo

- **WHEN** se envía el registro sin la clave `fullName` en el cuerpo
- **THEN** la respuesta es 422 con un error asociado al campo `fullName` y no se crea ninguna cuenta

#### Scenario: Espacios alrededor del email

- **WHEN** se envía el registro con un email rodeado de espacios, como «  ana@ejemplo.com »
- **THEN** la cuenta se crea con el email sin esos espacios

### Requirement: Validación del registro

El sistema SHALL rechazar con 422 cualquier registro con campos ausentes o inválidos, indicando en la respuesta cada campo afectado, y SHALL NOT crear la cuenta en ese caso. El email MUST tener formato válido y como mucho 254 caracteres; la contraseña MUST tener entre 8 y 32 caracteres; la confirmación MUST coincidir con la contraseña y cumplir esos mismos límites de longitud, por lo que un error de longitud se informa en ambos campos.

#### Scenario: Campos obligatorios ausentes

- **WHEN** se envía el registro con un cuerpo vacío
- **THEN** la respuesta es 422 con un error por cada uno de los campos `fullName`, `email`, `password` y `passwordConfirmation`

#### Scenario: Email con formato inválido

- **WHEN** se envía el registro con `email` «nope»
- **THEN** la respuesta es 422 con un error asociado al campo `email`

#### Scenario: Contraseña demasiado corta

- **WHEN** se envía el registro con una contraseña de 7 caracteres repetida idéntica en la confirmación
- **THEN** la respuesta es 422 con un error de longitud mínima asociado al campo `password` y otro al campo `passwordConfirmation`

#### Scenario: Contraseña demasiado larga

- **WHEN** se envía el registro con una contraseña de 33 caracteres repetida idéntica en la confirmación
- **THEN** la respuesta es 422 con un error de longitud máxima asociado al campo `password` y otro al campo `passwordConfirmation`

#### Scenario: La confirmación no coincide

- **WHEN** se envía el registro con una `passwordConfirmation` válida pero distinta de `password`
- **THEN** la respuesta es 422 con un error asociado al campo `passwordConfirmation`

### Requirement: Email único, distinguiendo mayúsculas

El sistema SHALL rechazar el registro de un email idéntico a uno ya registrado, y SHALL tratar como distintos dos emails que solo difieren en mayúsculas y minúsculas.

#### Scenario: Email ya registrado

- **WHEN** existe una cuenta con «ada@x.com» y se envía un registro con ese mismo email
- **THEN** la respuesta es 422 con un error de unicidad asociado al campo `email` y no se crea una segunda cuenta

#### Scenario: Mismo email con otras mayúsculas

- **WHEN** existe una cuenta con «ada@x.com» y se envía un registro con «ADA@X.com»
- **THEN** la respuesta es 200 y se crea una cuenta nueva e independiente con «ADA@X.com»

### Requirement: Inicio de sesión por la API

El sistema SHALL emitir un token de acceso nuevo cuando reciba en `POST /api/v1/auth/login` un email y una contraseña que correspondan a una cuenta existente, y SHALL responder con los datos públicos de la cuenta y ese token. La comparación del email SHALL distinguir mayúsculas y minúsculas.

#### Scenario: Credenciales correctas

- **WHEN** existe la cuenta «ada@x.com» y se envía `POST /api/v1/auth/login` con ese email y su contraseña
- **THEN** la respuesta es 200 con un cuerpo `data` que contiene `user` y un `token` nuevo

#### Scenario: Email con otras mayúsculas

- **WHEN** existe la cuenta «ada@x.com» y se inicia sesión con «Ada@x.com» y la contraseña correcta
- **THEN** la respuesta es 400 y no se emite ningún token

#### Scenario: Cada inicio de sesión abre una sesión independiente

- **WHEN** la misma persona inicia sesión dos veces
- **THEN** recibe dos tokens distintos y ambos son válidos a la vez

### Requirement: Credenciales incorrectas indistinguibles

El sistema SHALL responder 400, sin asociar el error a ningún campo, tanto cuando la contraseña es incorrecta como cuando el email no pertenece a ninguna cuenta, de forma que la respuesta no revele si el email está registrado.

#### Scenario: Contraseña incorrecta

- **WHEN** se inicia sesión con un email registrado y una contraseña que no es la suya
- **THEN** la respuesta es 400 con un error sin campo asociado y no se emite ningún token

#### Scenario: Email desconocido

- **WHEN** se inicia sesión con un email que no pertenece a ninguna cuenta
- **THEN** la respuesta es idéntica a la de la contraseña incorrecta

### Requirement: Validación del inicio de sesión

El sistema SHALL rechazar con 422 un inicio de sesión al que le falte el email o la contraseña, o cuyo email no tenga formato válido o supere los 254 caracteres, indicando cada campo afectado.

#### Scenario: Campos ausentes

- **WHEN** se envía `POST /api/v1/auth/login` con un cuerpo vacío
- **THEN** la respuesta es 422 con un error asociado a `email` y otro a `password`

#### Scenario: Email con formato inválido

- **WHEN** se inicia sesión con `email` «nope»
- **THEN** la respuesta es 422 con un error asociado al campo `email`

#### Scenario: Email demasiado largo

- **WHEN** se inicia sesión con un email de más de 254 caracteres
- **THEN** la respuesta es 422 con un error asociado al campo `email` y no se comprueban las credenciales

### Requirement: Rutas protegidas por token

El sistema SHALL exigir una cabecera `Authorization: Bearer <token>` con un token válido y no revocado en `GET /api/v1/account/profile` y `POST /api/v1/account/logout`, y SHALL responder 401 en cualquier otro caso sin ejecutar la acción.

#### Scenario: Sin token

- **WHEN** se llama a `GET /api/v1/account/profile` sin cabecera de autorización
- **THEN** la respuesta es 401

#### Scenario: Token inválido

- **WHEN** se llama a `GET /api/v1/account/profile` con un token que el sistema no ha emitido
- **THEN** la respuesta es 401

#### Scenario: Token revocado

- **WHEN** se llama a una ruta protegida con un token cuya sesión ya se cerró
- **THEN** la respuesta es 401

### Requirement: Consulta del perfil

El sistema SHALL devolver en `GET /api/v1/account/profile` los datos públicos de la persona dueña del token: `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt`, y nunca la contraseña.

#### Scenario: Perfil con sesión válida

- **WHEN** se llama a `GET /api/v1/account/profile` con un token válido
- **THEN** la respuesta es 200 con un cuerpo `data` que contiene los datos públicos de la cuenta dueña del token

### Requirement: Iniciales de la cuenta

El sistema SHALL calcular las iniciales de cada cuenta en mayúsculas, a partir del nombre completo sin los espacios de los extremos y separándolo por cada espacio individual: si los dos primeros trozos no están vacíos, la primera letra de cada uno; si no, las dos primeras letras del primer trozo (o la única, si solo tiene una). Si no hay nombre, SHALL usar la primera letra de la parte del email anterior a la arroba seguida de la primera letra del dominio.

#### Scenario: Nombre de dos palabras

- **WHEN** la cuenta tiene el nombre «Ada Lovelace»
- **THEN** sus iniciales son «AL»

#### Scenario: Nombre de una palabra

- **WHEN** la cuenta tiene el nombre «Ada»
- **THEN** sus iniciales son «AD»

#### Scenario: Nombre de una sola letra

- **WHEN** la cuenta tiene el nombre «A»
- **THEN** sus iniciales son «A»

#### Scenario: Nombre de tres palabras

- **WHEN** la cuenta tiene el nombre «Ada Byron Lovelace»
- **THEN** sus iniciales son «AB»

#### Scenario: Palabras separadas por más de un espacio

- **WHEN** la cuenta tiene el nombre «Ada  Lovelace», con dos espacios entre las palabras
- **THEN** sus iniciales son «AD»

#### Scenario: Espacios en los extremos del nombre

- **WHEN** se registra la cuenta con el nombre « Ada Lovelace »
- **THEN** el nombre se guarda como «Ada Lovelace» y sus iniciales son «AL»

#### Scenario: Sin nombre

- **WHEN** la cuenta no tiene nombre y su email es «manu@gmail.com»
- **THEN** sus iniciales son «MG»

### Requirement: Cierre de sesión por la API

El sistema SHALL revocar, al recibir `POST /api/v1/account/logout`, únicamente el token con el que se hace la petición, y SHALL responder 200. Las demás sesiones abiertas de la misma cuenta SHALL seguir siendo válidas. Los tokens SHALL NOT caducar por el paso del tiempo: solo dejan de valer al cerrar su sesión.

#### Scenario: Cerrar la sesión actual

- **WHEN** se envía `POST /api/v1/account/logout` con un token válido
- **THEN** la respuesta es 200 y cualquier petición posterior con ese token recibe 401

#### Scenario: Cerrar sesión dos veces

- **WHEN** se vuelve a enviar `POST /api/v1/account/logout` con un token ya revocado
- **THEN** la respuesta es 401

#### Scenario: Otras sesiones siguen abiertas

- **WHEN** la misma cuenta tiene dos tokens y se cierra la sesión con uno de ellos
- **THEN** el otro token sigue dando acceso a `GET /api/v1/account/profile`

### Requirement: Respuestas de la API en JSON

El sistema SHALL responder siempre en JSON en las rutas de cuentas y acceso, aunque la petición no lo pida. Las respuestas correctas de registro, inicio de sesión y perfil SHALL ir envueltas en una clave `data`, y las de validación, credenciales incorrectas o falta de autenticación SHALL llevar una lista `errors` en la que cada error de validación indica su `field`.

#### Scenario: Petición sin cabecera Accept

- **WHEN** se llama a `GET /api/v1/account/profile` sin cabecera `Accept` y sin token
- **THEN** la respuesta es 401 con un cuerpo JSON que contiene `errors`

### Requirement: Pantalla de registro

El sistema SHALL ofrecer una pantalla «Crea tu cuenta» con los campos «Nombre completo (opcional)», «Email», «Contraseña» (con la indicación «Entre 8 y 32 caracteres.») y «Repite la contraseña», un botón «Crear cuenta» y un enlace «Inicia sesión» hacia la pantalla de inicio de sesión. Al registrarse con éxito, la persona SHALL quedar con la sesión iniciada y ver su perfil sin ningún paso adicional.

#### Scenario: Registro correcto desde la pantalla

- **WHEN** una persona sin sesión rellena el formulario con datos válidos y pulsa «Crear cuenta»
- **THEN** el botón pasa a «Creando cuenta…» y queda deshabilitado mientras espera, y a continuación la persona ve su perfil con la sesión ya iniciada

#### Scenario: Nombre en blanco

- **WHEN** la persona deja el nombre completo vacío o solo con espacios y completa el resto del registro
- **THEN** la cuenta se crea y su perfil muestra «Sin nombre»

#### Scenario: Contraseñas distintas

- **WHEN** la persona escribe una confirmación distinta de la contraseña y pulsa «Crear cuenta»
- **THEN** ve «Las contraseñas no coinciden.» bajo el campo «Repite la contraseña» y el registro no se envía

#### Scenario: Email ya registrado

- **WHEN** la persona intenta registrarse con un email que ya tiene cuenta
- **THEN** ve bajo el campo «Email» el mensaje «Ese email ya está registrado. Inicia sesión en su lugar.» y sigue en la pantalla de registro

#### Scenario: Datos inválidos

- **WHEN** la persona envía el formulario con un email mal formado o una contraseña fuera de los límites
- **THEN** ve, bajo cada campo afectado, un mensaje en castellano que explica el problema, y sigue en la pantalla de registro

### Requirement: Pantalla de inicio de sesión

El sistema SHALL ofrecer una pantalla «Inicia sesión» con los campos «Email» y «Contraseña», un botón «Entrar» y un enlace «Crea una» hacia la pantalla de registro. Con credenciales correctas la persona SHALL ver su perfil; con credenciales incorrectas SHALL ver un error comprensible y SHALL NOT acceder.

#### Scenario: Inicio de sesión correcto

- **WHEN** una persona con cuenta introduce su email y contraseña y pulsa «Entrar»
- **THEN** el botón pasa a «Entrando…» y queda deshabilitado mientras espera, y a continuación la persona ve su perfil

#### Scenario: Credenciales incorrectas

- **WHEN** la persona introduce una contraseña equivocada o un email sin cuenta y pulsa «Entrar»
- **THEN** ve un aviso destacado «El email o la contraseña no son correctos.» y sigue en la pantalla de inicio de sesión

#### Scenario: Campos vacíos

- **WHEN** la persona pulsa «Entrar» sin rellenar ningún campo
- **THEN** ve «Falta rellenar el email.» bajo el campo «Email» y «Falta rellenar la contraseña.» bajo el campo «Contraseña»

#### Scenario: Servidor inalcanzable

- **WHEN** la persona intenta entrar o registrarse y el servidor no responde
- **THEN** ve el aviso «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.» y sigue en la misma pantalla

### Requirement: Pantalla de perfil

El sistema SHALL mostrar a la persona con sesión iniciada su perfil: un avatar con sus iniciales, su nombre completo (o «Sin nombre» si no lo tiene), su email, la fecha de alta como «Miembro desde» en formato largo en castellano, y un botón «Cerrar sesión».

#### Scenario: Ver el perfil

- **WHEN** una persona con sesión iniciada, registrada como «Ada Lovelace» con «ada@x.com», abre la aplicación
- **THEN** ve un avatar con «AL», el nombre «Ada Lovelace», el email «ada@x.com», «Miembro desde» con su fecha de alta, como «29 de septiembre de 2026», y el botón «Cerrar sesión»

### Requirement: Cierre de sesión desde la pantalla

El sistema SHALL cerrar la sesión en el navegador cuando la persona pulse «Cerrar sesión», aunque el servidor no llegue a confirmarlo, y SHALL llevarla a la pantalla de inicio de sesión sin mostrar ningún error. Tras cerrar sesión, volver atrás en el navegador SHALL NOT mostrar de nuevo el contenido protegido.

#### Scenario: Cerrar sesión

- **WHEN** una persona con sesión iniciada pulsa «Cerrar sesión» en su perfil
- **THEN** ve la pantalla de inicio de sesión, sin aviso de error

#### Scenario: Volver atrás tras cerrar sesión

- **WHEN** la persona acaba de cerrar sesión y pulsa «Atrás» en el navegador
- **THEN** no vuelve a ver su perfil ni ningún dato de su cuenta: cualquier vista protegida a la que regrese le lleva a la pantalla de inicio de sesión

#### Scenario: Cerrar sesión sin servidor

- **WHEN** la persona pulsa «Cerrar sesión» con el servidor caído
- **THEN** ve igualmente la pantalla de inicio de sesión y, al recargar, sigue sin sesión

### Requirement: Persistencia de la sesión en el navegador

El sistema SHALL conservar la sesión en el navegador tras recargar la página y tras cerrar y volver a abrir la pestaña, y SHALL comprobar contra el servidor que sigue siendo válida antes de mostrar contenido protegido. Mientras lo comprueba, SHALL mostrar un indicador de carga en lugar de redirigir.

#### Scenario: Recargar con sesión válida

- **WHEN** una persona con sesión iniciada recarga la página o cierra la pestaña y vuelve a abrir la aplicación
- **THEN** ve brevemente un indicador de carga y después su perfil, sin volver a introducir credenciales

#### Scenario: Sesión rechazada por el servidor

- **WHEN** la persona abre la aplicación y el servidor ya no reconoce su sesión
- **THEN** ve la pantalla de inicio de sesión con el aviso «Tu sesión ha caducado. Vuelve a iniciar sesión.», y la sesión se olvida en el navegador

#### Scenario: Servidor caído al abrir la aplicación

- **WHEN** la persona abre la aplicación con una sesión guardada y el servidor no responde
- **THEN** ve la pantalla de inicio de sesión con el aviso de que no se pudo conectar con el servidor, y al recargar cuando el servidor vuelve ve su perfil sin volver a introducir credenciales

### Requirement: Protección del espacio frente a visitantes sin sesión

El sistema SHALL llevar a la pantalla de inicio de sesión a cualquier persona sin sesión que intente abrir una vista del espacio, y SHALL NOT mostrarle contenido protegido en ningún momento.

#### Scenario: Abrir el perfil sin sesión

- **WHEN** una persona sin sesión abre la dirección del perfil
- **THEN** ve la pantalla de inicio de sesión y no llega a ver ningún dato del perfil

#### Scenario: Dirección desconocida sin sesión

- **WHEN** una persona sin sesión abre la raíz de la aplicación o cualquier dirección que no existe
- **THEN** ve la pantalla de inicio de sesión

### Requirement: Pantallas de acceso solo para visitantes sin sesión

El sistema SHALL llevar al perfil a cualquier persona con sesión iniciada que intente abrir la pantalla de inicio de sesión o la de registro, y a cualquier dirección que no existe.

#### Scenario: Abrir el inicio de sesión ya autenticado

- **WHEN** una persona con sesión iniciada abre la dirección de inicio de sesión o la de registro
- **THEN** ve su perfil en lugar del formulario

#### Scenario: Dirección desconocida con sesión

- **WHEN** una persona con sesión iniciada abre la raíz de la aplicación o una dirección que no existe
- **THEN** ve su perfil
