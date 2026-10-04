# Spec Delta

## MODIFIED Requirements

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
