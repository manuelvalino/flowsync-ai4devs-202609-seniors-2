# Arquitectura de FlowSync

Diagrama de contenedores al estilo C4 de FlowSync, sacado únicamente de lo que hay en el código. FlowSync tiene tres contenedores:

- **La SPA de React:** `frontend/`. Guarda el token en `localStorage` bajo `flowsync.token` y hace todas sus llamadas desde `src/lib/api.ts`.
- **La API de AdonisJS:** `backend/`. Expone las rutas `/api/v1/*` de `start/routes.ts`.
- **El fichero SQLite:** `tmp/db.sqlite3`, al que se llega por Lucid con `better-sqlite3`.

Dentro de la API se ve, además, por qué capas pasa una petición: middleware de auth, controladores, validadores de VineJS, modelos de Lucid y transformers. El serializer de `providers/api_provider.ts` envuelve cada respuesta en `{ data }`. No aparece ningún sistema externo, porque el código no llama a ninguno.

```mermaid
C4Container
  title FlowSync: diagrama de contenedores

  Person(member, "Miembro del equipo", "Apunta tareas, cambia su estado y su fecha y ve en qué anda cada uno")

  System_Boundary(flowsync, "FlowSync") {
    Container(spa, "SPA web", "React 19, Vite 8, react-router, Tailwind v4, shadcn/ui", "Pantallas /login, /register, /tasks, /tasks/:id y /profile. Token en localStorage (flowsync.token). Toda llamada pasa por src/lib/api.ts")

    Container_Boundary(api, "API REST · AdonisJS 7 (http://localhost:3333)") {
      Component(routes, "Rutas y middleware", "start/routes.ts, start/kernel.ts", "/api/v1/auth, /api/v1/account y /api/v1/tasks. force_json_response, silent_auth y auth (guard api) en los grupos protegidos")
      Component(controllers, "Controladores", "app/controllers", "NewAccount, AccessTokens, Profile, Tasks, TaskStatuses, TaskDueDates")
      Component(validators, "Validadores", "VineJS 4, app/validators", "user.ts (signup, login) y task.ts (alta, filtro, estado, fecha, día de referencia)")
      Component(models, "Modelos", "Lucid 22, app/models", "User (withAuthFinder, DbAccessTokensProvider) y Task (belongsTo assignee). Columnas desde database/schema.ts generado")
      Component(transformers, "Transformers y serializer", "app/transformers, providers/api_provider.ts", "UserTransformer, TaskTransformer, TaskDetailTransformer, TaskAssigneeTransformer. Respuesta envuelta en { data }")
    }

    ContainerDb(db, "Base de datos", "SQLite (better-sqlite3), tmp/db.sqlite3", "Tablas users, auth_access_tokens y tasks")
  }

  Rel(member, spa, "Usa", "Navegador")
  Rel(spa, routes, "Llama a la API", "JSON/HTTP, Authorization: Bearer")
  Rel(routes, controllers, "Despacha a")
  Rel(controllers, validators, "Valida la petición con")
  Rel(controllers, models, "Lee y escribe con")
  Rel(controllers, transformers, "Da forma a la respuesta con")
  Rel(models, db, "Consulta", "Lucid / SQL")
```
