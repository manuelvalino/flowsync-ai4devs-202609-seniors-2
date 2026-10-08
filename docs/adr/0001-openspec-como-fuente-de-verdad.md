# 1. Las delta-specs de OpenSpec como fuente de verdad viva

## Contexto

FlowSync describe su comportamiento en lenguaje natural y en tres sitios: el PRD (`docs/prd/`), el backlog de historias (`docs/backlog/`) y el código. Ninguno de ellos sirve para responder qué hace hoy el sistema. El PRD y las historias cuentan qué se quería hacer y dejan decisiones abiertas («PA-3», «PA-7», «PA-9»). El código solo dice qué se hizo, no qué se pretendía.

El repositorio ya trabaja con OpenSpec (`openspec/config.yaml`, esquema `spec-driven`), y la práctica tiene esta forma:

- **Spec viva por capability:** hay dos, `openspec/specs/auth/spec.md` (19 requisitos, 45 scenarios) y `openspec/specs/tasks/spec.md` (32 requisitos, 124 scenarios). Cada requisito es una frase normativa (SHALL / NO SHALL) con scenarios WHEN/THEN.
- **Changes que proponen deltas:** cada change vive en `openspec/changes/<nombre>/` con `proposal.md`, `design.md`, `tasks.md` y un `specs/<capability>/spec.md`. Ese último no es una spec completa, sino un delta con secciones `## ADDED Requirements` y `## MODIFIED Requirements`.
- **Archivar fusiona el delta en la spec viva:** el change se mueve a `openspec/changes/archive/AAAA-MM-DD-<nombre>/` y sus requisitos se incorporan a `openspec/specs/`.

Hay tres changes archivados, los tres con fecha 2026-08-13, y cada uno se apoya en el anterior:

1. **`add-task-list`:** crea la capability `tasks` (14 requisitos añadidos), modifica 3 requisitos de `auth` y le añade uno. Cierra por escrito decisiones que las historias dejaban abiertas: el límite de 200 caracteres en el título, el orden de más reciente a más antigua y las transiciones libres entre estados.
2. **`add-task-due-date`:** añade 11 requisitos sobre la fecha de vencimiento y modifica uno ya existente («Una sola vista de tareas, sin señales de presencia»).
3. **`add-task-status-filter`:** añade 7 requisitos y modifica 4. Su `proposal.md` dice algo importante: «**este change documenta comportamiento que ya está implementado**». No se escribió para construir nada, sino porque el código había dejado falsos requisitos vivos: la lista ya no devolvía «todas» las tareas.

El requisito «Una sola vista de tareas, sin señales de presencia» se ha modificado en dos changes distintos. La versión que vale hoy solo se puede leer en la spec viva; los archivos archivados solo cuentan cómo se llegó a ella.

La spec de `auth` no tiene un change de origen en el archivo: llegó a `openspec/specs/` en el mismo commit que `add-task-list` (04940fc), y ese change solo la modifica.

## Decisión

La **spec viva** de `openspec/specs/<capability>/spec.md` es la fuente de verdad de qué hace FlowSync. Ni el PRD, ni las historias, ni el código lo son. La forma de cambiarla es la **delta-spec** de un change:

- **Antes de implementar:** todo cambio de comportamiento observable entra como un change de OpenSpec, con su delta (`ADDED` / `MODIFIED`). Los requisitos se escriben como contrato verificable, con scenarios WHEN/THEN.
- **Al cerrar el trabajo:** el change se archiva y su delta se fusiona en la spec viva. La spec viva no se edita a mano fuera de ese flujo.
- **Si el código ya hace algo que la spec no dice:** se abre un change que documenta lo existente, como se hizo con `add-task-status-filter`. No se deja que spec y código diverjan.
- **Ante una discrepancia entre spec y código:** se presume que la spec tiene razón y el código está mal, salvo que un change nuevo diga lo contrario.
- **El PRD y el backlog siguen existiendo:** son la entrada (por qué y para quién) y no se mantienen al día con lo construido.

## Estado

Aceptada, como registro a posteriori. La práctica ya estaba en uso desde el 2026-08-13, con los tres changes archivados ese día. Este ADR la deja escrita el 2026-10-08, sin cambiarla.

## Consecuencias

**Lo que ganamos:**

- Hay un único sitio donde leer qué debe hacer el sistema, con el detalle suficiente para escribir pruebas contra él. Los tests del responsable (`backend/tests/functional/tasks/assignee.spec.ts`) se escribieron scenario a scenario sobre la spec viva, y destaparon que la lista exponía el email del responsable.
- Las decisiones de producto que las historias dejaban abiertas quedan fijadas en un requisito con fecha y con el change que las tomó, en lugar de vivir en la cabeza de alguien.
- Cada delta deja claro qué cambia y qué no. Las secciones «Fuera de alcance, y a propósito» de los `proposal.md` dejan constancia de lo que no se hizo y por qué.
- La spec sirve de contrato para otros artefactos. El documento OpenAPI y la tabla de trazabilidad se contrastan contra ella.

**Lo que nos cuesta:**

- **La spec no se cumple sola.** Nada en el repositorio comprueba que el código haga lo que dice la spec viva. Dos commits la incumplieron sin que fallara nada:
  - `8c15707` aceptó el filtro como texto libre, y `GET /api/v1/tasks?status=archivado` responde hoy `200` con una lista vacía en lugar del `422` que exige «Estado inventado».
  - `0aa5af7` hizo que la lista expusiera el email del responsable, contra «La tarea no filtra datos de cuenta».

  La fuente de verdad solo lo es mientras alguien la contraste.
- **Los changes se han archivado sin pruebas, a conciencia.** `add-task-due-date` y `add-task-status-filter` lo dejan escrito como decisión de quien encargó el trabajo. Antes de los tests de hoy, ninguno de los 124 scenarios de `tasks` tenía una prueba que lo cubriera. Archivar un delta no demuestra que el comportamiento exista.
- **El delta no cubre todo el fichero.** Las operaciones de delta afectan a los requisitos, no al «Purpose» de la spec. El de `tasks` sigue diciendo «una sola lista compartida con todas las tareas del espacio», que es justo lo que `add-task-status-filter` dejó de ser cierto. Las partes de la spec que no son requisitos pueden quedarse atrás sin que nadie lo note.
- **Las specs retroactivas son posibles, y eso tiene doble filo.** Documentar lo ya hecho evita que la spec mienta, pero invierte el flujo: la spec deja de ser una decisión previa y pasa a ser una descripción posterior. Los fallos del código pueden acabar especificados como si fueran comportamiento correcto.
- **Hay más que escribir y que leer.** Cada cambio de comportamiento lleva propuesta, diseño, tareas y delta, y los requisitos `MODIFIED` se reescriben enteros, no como un diff de líneas. La spec de `tasks` ya ocupa 750 líneas.
- **La historia queda repartida.** Para saber por qué un requisito dice lo que dice hay que rastrear qué changes archivados lo tocaron. «Una sola vista de tareas…» pasó por dos, y nada en la spec viva enlaza con ellos.
- **No todo lo especificado se puede verificar igual.** 56 de los 124 scenarios de `tasks` son de interfaz, y el frontend no tiene runner de tests. Hoy solo se pueden comprobar a mano.
- **Dependemos de la herramienta y de su formato:** el esquema `spec-driven`, las cabeceras `ADDED` / `MODIFIED` y las skills `openspec-*` de `.claude/skills/`. Si dejamos OpenSpec, el contenido se conserva, pero el flujo de fusión hay que rehacerlo.
