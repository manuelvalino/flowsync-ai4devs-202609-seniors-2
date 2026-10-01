# Proposal

## Why

FlowSync todavía no tiene su función central: no hay forma de apuntar una tarea ni de ver en qué anda cada miembro del equipo. Tras la capability de cuentas y acceso (`auth`), lo siguiente es una lista única y compartida donde cualquiera crea tareas con solo el título y cambia su estado desde la propia fila. Cubre las historias E3-1, E2-1, E2-2, E2-3 y E2-4 del backlog y, de forma parcial, la parte de API de E2-7 (reasignar responsable: sin interfaz y sin endpoint de equipo, por lo que no cubre «todas las personas registradas» como destino elegible desde pantalla).

## What Changes

- **API** (AdonisJS, bajo `/api/v1`, todas con sesión): exactamente tres operaciones sobre tareas: listar todas, crear una y actualizar una. No hay lectura individual, ni borrado, ni endpoints de equipo.
- **Modelo de tarea**: título, estado y responsable. El estado es un conjunto cerrado de tres valores: `pending`, `in_progress`, `done`. Cualquier otro valor se rechaza con 422. No hay fecha de vencimiento ni se deja preparada.
- **Crear**: el título es lo único que se pide. La tarea nace en `pending` y con quien la crea como responsable, aunque la petición traiga otros campos. Un título ausente o en blanco se rechaza con 422.
- **Actualizar**: la API admite cambiar el estado y el responsable de cualquier tarea, sin distinguir quién la hace. El título no se edita.
- **Listar**: una sola lista, igual para todos, que devuelve el responsable solo con lo que la pantalla necesita (su nombre), sin exponer su correo.
- **Interfaz** (React 19, reutilizando los componentes de `components/ui` y el patrón de páginas y rutas del login): pantalla de lista en `/tasks` con una fila por tarea (título, responsable por su nombre o «Sin nombre», y estado), formulario de creación con solo el título, estado vacío que explica qué es y ofrece crear la primera, y cambio de estado desde la fila con un gesto. Los estados se pintan como Pendiente, En curso y Hecho. La interfaz no ofrece cambiar el responsable.
- **Inicio**: `/tasks` pasa a ser la pantalla a la que se llega tras iniciar sesión o registrarse y a la que redirigen `/login`, `/register` y las direcciones desconocidas con sesión. `/profile` sigue existiendo y se enlaza desde la lista. Esto modifica requisitos de `auth`.
- **Sin tests**: este change no monta base de pruebas ni escribe tests.
- **Sin dependencias nuevas.**

## Capabilities

### New Capabilities
- `tasks`: lista compartida de tareas del equipo: listar, crear con solo el título (pendiente y a nombre de quien la crea) y cambiar estado o responsable, por API y desde la pantalla de lista.

### Modified Capabilities
- `auth`: la pantalla a la que se llega con sesión pasa de `/profile` a `/tasks` (registro, inicio de sesión, redirecciones de pantallas públicas y direcciones desconocidas), y el perfil enlaza con la lista.

## Impact

- `backend/`: nueva migración, modelo, controlador, validadores y transformer de tareas, y rutas protegidas en `start/routes.ts`; se regeneran `database/schema.ts` y `.adonisjs/`.
- `frontend/`: nueva página de tareas, tipos y llamadas en `lib/api.ts`, ruta protegida, y cambios en las redirecciones de `app-routes.tsx`, `public-only-route.tsx`, y en las pantallas de perfil.
- Sin dependencias nuevas ni cambios en cuentas, tokens o contrato de `auth` más allá de la redirección.

## Puntos abiertos

- **Orden de la lista.** No hay regla de orden decidida. Este change no inventa ninguno ni ordena explícitamente: el orden en que llegan las tareas no está garantizado como contrato. Dependen de esta decisión (PA-3) el agrupado por persona y la promesa de «enumerar el trabajo de cada miembro» (E3-1, CA-5).
- **Longitud máxima del título** (PA-9). No se fija umbral; el delta solo exige no guardar una versión recortada en silencio.
- **Transiciones de estado legales** (PA-7). Se permite pasar de cualquier estado a cualquier otro, incluso volver atrás desde `done`.
- **Cuántas tareas «En curso» por persona** (PA-4), y qué ve alguien cuando su tarea cambia bajo sus pies (PA-8): fuera de este change.
- **Cambiar el responsable desde la interfaz**: no hay endpoint de equipo con el que elegir persona; queda solo por API.
- **Refresco automático** de la lista cuando otros cambian algo (E3-2): historia aparte. Aquí la lista es correcta en el momento en que se pide.
