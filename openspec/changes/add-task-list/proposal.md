# Proposal

## Why

FlowSync solo tiene cuentas y acceso: una persona puede entrar, pero no hay tareas ni forma de saber en qué anda cada miembro del equipo. Esta propuesta crea esa base con las historias E3-1 (lista compartida), E2-1 (crear con solo el título), E2-2 (título obligatorio), E2-3 (nace del creador y en pendiente) y E2-4 (cambiar el estado desde la lista). Sin la lista, ninguna historia posterior de tareas tiene dónde apoyarse.

## What Changes

- **Nueva entidad tarea** con título, estado y responsable. El estado es uno de tres valores cerrados que la API transporta como `pending`, `in_progress` y `done`, y que la pantalla muestra como Pendiente, En curso y Hecho. Cualquier otro valor se rechaza con 422.
- **API de tareas con exactamente tres operaciones**, todas exigen sesión:
  - Listar todas las tareas del espacio.
  - Crear una tarea con solo el título. Nace en `pending` y su responsable es quien la crea.
  - Actualizar el estado o el responsable de cualquier tarea.
- **No hay** lectura individual, borrado ni endpoints de equipo.
- **El responsable** se expone solo con su identificador y su nombre, nunca con el email ni con otros datos de su cuenta.
- **Título obligatorio.** Se recortan los espacios de los extremos. Vacío o solo espacios se rechaza; más de 255 caracteres se rechaza con aviso, nunca se recorta en silencio. La actualización no cambia el título.
- **Nueva pantalla "Tareas" en la web**, a la que solo se accede con sesión. Muestra:
  - Un formulario con un único campo, el título.
  - La lista compartida: cada fila con su título, el nombre del responsable ("Sin nombre" si no tiene) y un selector desplegable con los tres estados.
  - Un estado vacío que explica la pantalla e invita a crear la primera tarea.
- **La lista pasa a ser la pantalla de inicio de la web.** Tras el login o el registro, y ante cualquier dirección desconocida, se llega a la lista. El perfil se enlaza desde ella y desde el perfil se puede volver a la lista.
- **No se incluye:**
  - Fechas de vencimiento: ni en el modelo, ni en la API, ni en la lista.
  - Filtros, ordenación decidida y agrupación por persona.
  - Una vista "mis tareas" o tareas privadas.
  - Indicadores de presencia.
  - Refresco automático de la lista cuando otra persona hace cambios (E3-2).
  - Reasignar desde la interfaz.
  - Tests.

## Capabilities

### New Capabilities

- `tasks`: lista compartida de tareas del equipo. Cubre crear con solo el título, las reglas del título, el responsable y el estado iniciales, el conjunto cerrado de estados, y el cambio de estado y de responsable de cualquier tarea, tanto por la API como en la web.

### Modified Capabilities

- `auth`: la pantalla de inicio de la web pasa del perfil a la lista de tareas. Cambian a dónde se llega tras registrarse o iniciar sesión, a dónde se redirige con sesión desde login o registro y ante una dirección desconocida, y el perfil gana un enlace de vuelta a la lista.

## Impact

- **Backend**:
  - Nueva migración y tabla de tareas, con clave ajena al usuario responsable.
  - Nuevo modelo, validadores, transformer y controlador.
  - Tres rutas nuevas bajo `/api/v1`, protegidas con el middleware de auth.
  - Se regeneran el esquema de base de datos y el código commiteado en `backend/.adonisjs/` (mapa de controladores y registro de rutas).
- **Frontend**:
  - Nuevas llamadas en `src/lib/api.ts` y sus tipos.
  - Nueva página de tareas que reutiliza los componentes de `src/components/ui/` (Card, Input, Label, Button, Alert), más el `Select` de shadcn, que se trae con `npx shadcn@latest add select`.
  - Nueva ruta protegida, y cambios en la redirección por defecto, en el guard de rutas públicas y en el perfil.
  - Ninguna dependencia nueva.
- **Specs**:
  - Delta nuevo `tasks`.
  - Delta MODIFIED sobre `auth`, para tres requisitos de la web y la pantalla de perfil.

## Puntos abiertos

- **Orden de la lista (PA-3).** No hay regla decidida. Este change no ordena de forma explícita y no promete ningún orden. Lo que se vea será el que devuelva la base de datos sin criterio, y no se debe confiar en él. Tampoco hay agrupación por persona, aunque CA-5 de E3-1 la echa en falta.
- **Límite del título (PA-9).** Se fija en 255 caracteres de forma provisional, para que el aviso por título largo se pueda comprobar. El umbral de producto sigue sin decidir.
- **Transiciones de estado (PA-7).** Se permite pasar de cualquier estado a cualquier otro, también volver desde Hecho, porque no hay ningún grafo decidido. El riesgo de marcar algo como hecho por error sigue abierto.
- **Reasignar desde la interfaz.** La API ya lo permite, pero la web no lo ofrece porque no hay forma de listar a los miembros del equipo. Queda para otro change.
- **Cuántas tareas en curso por persona (PA-4)** y **qué ve alguien cuando la tarea cambia bajo sus pies (PA-8).** Ninguno de los dos se aborda.
