# Matriz de trazabilidad — «Lo que cada tarea muestra de su responsable»

- **Scenarios del requisito:** 3
- **Scenarios cubiertos:** 0

Spec: `openspec/specs/tasks/spec.md`. Tests revisados: toda la suite del backend (`backend/tests/functional/auth/{signup,login,session,initials}.spec.ts`); no hay `tests/unit/` ni runner de tests en el frontend.

| Scenario | Test que lo cubre | Estado | Si «No lo sé», qué faltó |
| --- | --- | --- | --- |
| Al obtener una tarea cuyo responsable es "Ada Lovelace", su `assignee` trae ese nombre y sus iniciales. | | No cubierto | |
| Al obtener una tarea, suelta o en la lista, su `assignee` no trae el email ni ningún otro dato de acceso. | | No cubierto | |
| Si el responsable se registró sin nombre, su `assignee` trae el nombre a `null` y las iniciales igualmente. | | No cubierto | |

## Notas

- Ningún test de la suite hace peticiones a `/api/v1/tasks`. Por eso los tres scenarios salen «No cubierto».
- Hay dos tests parecidos al tercer scenario, pero no lo cubren. `Auth | registro` › «una cuenta puede quedarse sin nombre» y `Auth | iniciales` › «sin nombre, las iniciales salen del email» comprueban la respuesta de registro y de login, no el `assignee` de una tarea.
- Observación de lectura de código, sin ejecutar: `GET /tasks`, `POST /tasks` y `PATCH /tasks/:id/status` serializan con `TaskTransformer`. Para el `assignee` usa `UserTransformer`, que incluye `email` (`backend/app/transformers/task_transformer.ts:9`). `GET /tasks/:id`, en cambio, usa `TaskAssigneeTransformer` (`id`, `fullName`, `initials`). Si esta lectura es correcta, un test del segundo scenario sobre la lista fallaría hoy.

## Parte B: las tres líneas

1. Creía cubiertos antes de mirar: 0. Cubiertos de verdad: 0.
2. «Responsable identificable»: además de no tener test, dice que nombre e iniciales «bastan para saber quién la lleva», pero ninguna regla escrita exige que sean únicos entre cuentas, así que lo de «bastan» lo estaría poniendo yo y no la spec.
3. Todas las cuentas de los tests usan el mismo email (`ada@example.com`), y eso no lo fija el scenario. Como una cuenta sin nombre saca las iniciales de su email (`AE`), el test de «Responsable sin nombre» solo comprueba que las iniciales no lleguen vacías: no comprueba qué valor llevan ni si dejan ver parte del email.
