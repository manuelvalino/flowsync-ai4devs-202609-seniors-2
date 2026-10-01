# Spec Delta

## MODIFIED Requirements

### Requirement: Pantalla de registro

El sistema SHALL ofrecer una pantalla de registro en `/register` con los campos «Nombre completo (opcional)», «Email», «Contraseña» (con la indicación «Entre 8 y 32 caracteres.») y «Repite la contraseña», un botón «Crear cuenta» y un enlace «Inicia sesión» hacia la pantalla de acceso.

#### Scenario: Registro correcto

- **WHEN** una persona sin sesión rellena email, contraseña y confirmación válidos y pulsa «Crear cuenta»
- **THEN** el botón muestra «Creando cuenta…» mientras espera
- **AND** al terminar queda con la sesión iniciada y se muestra la lista de tareas

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
- **AND** al terminar queda con la sesión iniciada y se muestra la lista de tareas

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

El sistema SHALL mostrar en `/profile` al usuario con sesión sus iniciales, su nombre (o «Sin nombre»), su email, la fecha «Miembro desde» en formato largo en castellano y un botón «Cerrar sesión» y un enlace «Tareas» hacia la lista de tareas.

#### Scenario: Visualización del perfil

- **WHEN** una persona con sesión abre `/profile`
- **THEN** ve sus iniciales, su nombre completo o «Sin nombre», su email y la fecha de creación de su cuenta

#### Scenario: Ir a la lista

- **WHEN** la persona pulsa «Tareas»
- **THEN** se muestra la lista de tareas

#### Scenario: Cerrar sesión

- **WHEN** la persona pulsa «Cerrar sesión»
- **THEN** se muestra la pantalla de inicio de sesión sin ningún aviso de error

#### Scenario: Cerrar sesión con el servidor caído

- **WHEN** la persona pulsa «Cerrar sesión» y el servidor no responde o responde con error
- **THEN** igualmente queda sin sesión en la aplicación y se muestra la pantalla de inicio de sesión, sin ningún aviso
- **AND** si el servidor no llegó a procesar la petición, el token no se revoca y sigue siendo válido allí

### Requirement: Protección de pantallas según la sesión

El sistema SHALL mostrar el perfil y la lista de tareas solo a quien tiene sesión, y SHALL mostrar el registro y el inicio de sesión solo a quien no la tiene.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es llevada a la pantalla de inicio de sesión

#### Scenario: Lista de tareas sin sesión

- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** es llevada a la pantalla de inicio de sesión

#### Scenario: Acceso con sesión

- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** es llevada a la lista de tareas

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no existe
- **THEN** es llevada a la lista de tareas, y de ahí a la pantalla de inicio de sesión si no tiene sesión

#### Scenario: Indicador de carga al restaurar la sesión

- **WHEN** la aplicación se carga con una sesión guardada y aún no ha confirmado con el servidor que sigue siendo válida
- **THEN** se muestra un indicador de carga y no se redirige a ninguna pantalla hasta confirmarlo
