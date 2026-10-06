# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus 5.5 High
**Herramienta:** Claude Code

```
Lee los scenarios de la spec viva de esta requisito "Lo que cada tarea muestra de su responsable" [openspec/tasks/spec.md] y los tests existentes.
Genera una matriz de trazabilidad: 
Scenario | Test que lo cubre | Cubierto / NO cubierto / No lo sé  

El scenario, en una línea. Qué se espera y en qué situación. Si no cabe en una línea, es que estás juntando dos.

Qué test lo cubre, con el nombre exacto que aparece en la suite. Sin el nombre concreto, la columna va vacía: "seguro que algo lo cubre" no es una fila.

Cubierto · No cubierto · No lo sé. Los tres estados son válidos, y el tercero no es un fallo: es el resultado más informativo de los tres.

Si pusiste "no lo sé", qué te faltó para decidirlo. Media línea. Suele ser una de dos: no encontraste dónde se comprueba, o encontraste algo que se le parece y no dice exactamente lo mismo.

Restriciones:
* No cambies nada de codigo
* Genera la matriz en formato markdown [docs/verification/matriz_trazabilidad.md]
```

**Qué salió:** Matriz de 7 filas (partió los 3 scenarios) y, siguiendo el CLAUDE.md, hizo commit y push sin que se lo pidiera; el PR falló.

## Prompt 2

**Modelo:** Opus 5.5 High
**Herramienta:** Claude Code

```
no hagas commit ni pr aun
```

**Qué salió:** Llegó tarde: el commit y el push ya estaban hechos; el PR no se llegó a abrir.

## Prompt 3

**Modelo:** Opus 5.5 High
**Herramienta:** Claude Code

```
La matriz mapea, scenario a scenario, si el requisito está cubierto por los tests. El formato lo fija esta lección y no es negociable: una fila por scenario y cuatro columnas. Encima, dos números: cuántos scenarios tiene el requisito y cuántos resultaron cubiertos — el primero se anota al empezar, el segundo al terminar.
no hagas commit ni pr aun
```

**Qué salió:** Rehizo la matriz con 3 filas y 4 columnas, más los dos números (3 scenarios, 0 cubiertos).

## Prompt 4

**Modelo:** Opus 5.5 High
**Herramienta:** Claude Code

```
Por cada fila en No cubierto, escribe el test que falta — uno por scenario — siguiendo el estilo de los que ya existen en el proyecto [backend/tests/functional/tasks]. Sin tocar nada fuera de la carpeta de tests. Cuando los tengas, ejecútalos.
no hagas commit ni pr aun
```

**Qué salió:** 3 tests; 2 pasan y 1 falla porque la lista (`GET /tasks`) saca el email del responsable.

## Prompt 5

**Modelo:** Opus 5.5 High
**Herramienta:** Claude Code

```
renombra el archivo de la matriz a mvl.md y añade nueva seccion al final Parte B: las tres líneas.

1. Cuántos scenarios creías cubiertos antes de mirar, y cuántos lo estaban. El primer número se escribe antes de lanzar el primer prompt, a ojo y sin abrir nada; el segundo, al final. Los dos tal cual salieron, sin redondear ni explicar.
( 0 creia había visto al correr los test que no había ninguno de tasks y efectivamente eran 0)
2. El scenario del que no supiste si era un hueco de test o un hueco de spec, y en una frase, por qué. Son dos cosas distintas y se parecen mucho desde fuera: en un caso la regla está escrita y nadie la comprobó; en el otro, lo que creías que era la regla no está escrito en ninguna parte y lo estabas poniendo tú.
(El primer escanario no había test pero ademas es que indica que bastaba con las iniciales y el nombre, no parece que haya una regla de que sean unicos)

3. Algo que el scenario no decidía por ti y tuviste que decidir al escribir el test. Un valor concreto, un límite, qué pasa cuando el dato viene vacío. Casi ningún scenario determina su test del todo, y el hueco que rellenaste sin darte cuenta es lo que más se parece a un defecto futuro.
(creo claude decidio poner el correo en todos los tests)
```

**Qué salió:** Renombró la matriz a `mvl.md` y añadió la Parte B redactando mis notas.

## Prompt 6

**Modelo:** Opus 5.5 High
**Herramienta:** Claude Code

```
no hagas commit ni pr aun
```

**Qué salió:** Llegó durante el mismo turno; no había nada que deshacer.

## Prompt 7

**Modelo:** Opus 5.5 High
**Herramienta:** Claude Code

```
add los prompts de la sesion a @../../prompts.md con el formato que se indica en el archivo no commit ni pr aun
```
