# 2. Los tests de integración como única fuente de verdad ejecutable

## Contexto

El [ADR 0001](0001-openspec-como-fuente-de-verdad.md) hizo de la spec viva de OpenSpec (`openspec/specs/`) la fuente de verdad de qué hace FlowSync, y de las delta-specs de cada change el único camino para cambiarla. Ya entonces dejaba escrito lo que eso costaba, y esos costes son los que motivan este ADR:

- **La spec no se cumplía sola.** Dos commits la contradijeron sin que fallara nada:
  - `8c15707`: `GET /api/v1/tasks?status=archivado` responde `200` con una lista vacía, cuando la spec exige `422`.
  - `0aa5af7`: la lista exponía el email del responsable.

  Los dos fallos aparecieron al contrastar la spec a mano. El primero, al comparar el documento OpenAPI con la spec. El segundo, al escribir los tests de integración del requisito «Lo que cada tarea muestra de su responsable», que fallaron en cuanto existieron.
- **Archivar un change no demostraba nada.** `add-task-due-date` y `add-task-status-filter` se archivaron sin pruebas, a conciencia. A 2026-10-08, de los 124 scenarios de `tasks` solo 3 tenían un test.
- **La spec también se desfasaba consigo misma.** El «Purpose» de `tasks` seguía diciendo «todas las tareas del espacio» después de que el filtro por estado lo dejara de ser, porque los deltas solo operan sobre requisitos.
- **Mantener las dos cosas era trabajo doble.** Cada cambio de comportamiento llevaba propuesta, diseño, tareas y delta, y además sus tests. El texto de la spec y el test decían lo mismo con palabras distintas, y solo uno de los dos podía fallar.

La pregunta de fondo dejó de ser «¿dónde está escrito qué hace el sistema?» y pasó a ser «¿qué nos avisa cuando deja de hacerlo?». La respuesta es una sola: un test que falla.

## Decisión

Los **tests de integración** pasan a ser la única fuente de verdad ejecutable del comportamiento de FlowSync. Hoy son las suites `functional` de Japa en `backend/tests/functional/`. Las specs de OpenSpec dejan de mantenerse.

- **Lo que el sistema debe hacer es lo que dicen sus tests.** Si un comportamiento no tiene test, no está especificado: se puede cambiar sin romper ningún contrato.
- **Todo cambio de comportamiento observable llega con el test que lo fija,** en el mismo commit. Un arreglo llega con el test que reproduce el fallo. El test se escribe en rojo y el código lo pone en verde, no al revés.
- **Los tests se organizan por capability y se leen como especificación.** Un fichero por requisito y un `test.group` con el nombre de la capability, como `Tasks | responsable`. Cada fichero lleva un comentario de cabecera que explica el porqué: la regla de negocio, lo que queda fuera a propósito y la decisión de producto que lo motivó. Los títulos de los tests son frases de comportamiento en castellano, al estilo de los de `backend/tests/functional/auth/`.
- **La suite bloquea la integración.** Esto exige poner en marcha lo que hoy no existe: un pipeline de CI que ejecute `npm test` y bloquee el merge si falla, y una base de datos de tests separada de la del servidor de desarrollo. Hoy las dos apuntan al mismo `tmp/db.sqlite3`.
- **`openspec/` se congela como archivo histórico.** No se borra, porque explica el porqué de decisiones que el código no cuenta. Pero ya no se actualiza, no se abren changes nuevos y deja de ser referencia del comportamiento actual. Las skills `openspec-*` de `.claude/skills/` se retiran.
- **El PRD y el backlog siguen siendo la entrada** de por qué y para quién, igual que con el ADR 0001.

## Estado

Aceptada. Reemplaza al [ADR 0001](0001-openspec-como-fuente-de-verdad.md).

## Consecuencias

**Lo que ganamos:**

- La deriva entre lo que se dice y lo que se hace deja de pasar en silencio. Una regresión como la de `0aa5af7` falla en CI el mismo día, no meses después cuando alguien se pone a contrastar.
- Se mantiene una sola descripción del comportamiento, no dos. Desaparece el trabajo de escribir cada regla en prosa y además en código.
- La verdad es comprobable por máquina. Ya no se discute qué quería decir un scenario: el test pasa o no pasa.
- Cada test que se añade ya está en su sitio. No hace falta una tabla de trazabilidad entre la spec y las pruebas, porque la prueba es la spec.

**Lo que nos cuesta:**

- **Arrancamos con casi nada especificado.** Con la cobertura de 2026-10-08, solo 3 de los 124 scenarios de `tasks` tienen test. Hasta que se migren, todo lo demás pasa a estar sin especificar, aunque el texto siga en el archivo de `openspec/`. Migrarlos es trabajo explícito que hay que planificar, no algo que ocurra solo.
- **La interfaz se queda sin fuente de verdad.** 56 de los 124 scenarios de `tasks` son de pantalla, y el frontend no tiene runner de tests. Mientras no se añada uno (de componentes o end-to-end), el comportamiento visible para el usuario no está especificado en ninguna parte viva.
- **Los tests dicen qué, no por qué.** Las secciones «Fuera de alcance, y a propósito», los motivos de decisiones como el límite de 200 caracteres o «vencer hoy no es estar vencida», y las preguntas abiertas (PA-3, PA-7…) no caben en una aserción. Si los comentarios de cabecera no lo recogen con disciplina, el porqué se pierde y solo queda en el archivo congelado, cada vez más lejos del código.
- **Lo que no debe existir es difícil de probar.** Requisitos como «no hay vista "mis tareas"», «no existe operación para crear o borrar un estado» o «sin señales de presencia» se especificaban con una frase. Como test solo se pueden aproximar, y lo más probable es que se queden sin cubrir.
- **Un test puede fijar un fallo como correcto.** Si alguien escribe el test contra lo que el código ya hace, el fallo queda especificado. Con OpenSpec había un texto independiente contra el que contrastar. Ahora el único contraste es la revisión del PR.
- **La especificación deja de ser legible para producto.** Quien no lee TypeScript ya no puede revisar ni discutir el contrato. Los títulos y las cabeceras en castellano lo suavizan, pero no lo resuelven.
- **Los tests se acoplan a la implementación.** Una spec en prosa sobrevivía a un refactor. Un test de integración puede romperse por cambiar la forma de una respuesta o un fixture, y cada fallo hay que mirarlo antes de decidir si es una regresión o un cambio legítimo.
- **Hay infraestructura que montar y pagar:** CI, una base de datos aislada para tests y, para la interfaz, un runner en el frontend. Hoy no existe ninguna de las tres cosas.
- **Queda un archivo que puede confundir.** `openspec/` sigue en el repositorio con 169 scenarios que parecen normativos y ya no lo son. Hay que señalarlo en su propia carpeta para que nadie lo tome por vigente.
