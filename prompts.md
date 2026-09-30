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

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
crea la spec `docs/spec-viva/mvl.md` para escenario "E1 · Cuentas y acceso" del PRD `docs\prd\flowsync-mvp.md' ya implementado pero no detallado en el backlog y que ya esta implementada
sobre el vertical de **cuentas y acceso** del proyecto que acabas de dejar listo (registro, inicio de sesión, sesión y perfil), que es lo que ya está construido de punta a punta. **Entero, en sus dos capas** en el backend, sus rutas, sus controladores, el modelo de usuario, sus validadores y sus middlewares; en el frontend, las pantallas de acceso, el estado de sesión y la protección de rutas.

Las dos capas, y solo ese vertical. Lo que pasa por la API y lo que se ve en pantalla, y nada que no sea cuentas y acceso. 


Formato:

Arriba, un ## Purpose de una o dos frases: para qué existe esta capability.
Debajo, ## Requirements, y colgando de él ### Requirement: en los que el sistema SHALL hacer algo.
Bajo cada requisito, al menos un #### Scenario: de cuatro almohadillas, con dos viñetas: - **WHEN** y - **THEN**. No hay casilla para el GIVEN: la precondición se mete dentro del WHEN.
En castellano, salvo las mayúsculas de la RFC 2119.

Restriciones:

1. Nada de ADDED, MODIFIED ni REMOVED. Eso es el vocabulario de un delta, y esto no es un delta: es la verdad actual del sistema. 
2. Solo comportamiento observable desde fuera. Ni un nombre de clase, ni un nombre de archivo, ni una ruta de código. En la API, observable es la petición y la respuesta. En la pantalla, observable es lo que una persona ve y puede hacer.
3. No toques el código. Ni siquiera para arreglar lo que encuentres

Pregunta si dudas a la hora de proponer los escenarios o requisiotos sino puedes extraerlos del codigo.
```

**Qué salió:** el agente leyó el código, probó la API contra una copia aislada del backend y preguntó antes de escribir. Respondí «tal cual, como SHALL» para los comportamientos dudosos y «código + campo afectado» para los errores de API. Escribió 18 requisitos, abrió un PR que no hacía falta y pasó una revisión adversarial que corrigió iniciales, login y errores de longitud.

## Prompt 2

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
borra la pr no era necesario  y enumera los requirement y scenarios para revisarlos
```

**Qué salió:** cerró el PR (GitHub no deja borrarlo) y listó los 18 requisitos y 54 escenarios.

## Prompt 3

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
ayudame a revisar los escanrios con el codigo - marcandome las clases principales usada no lo escribas en la spec es solo para revisar
```

**Qué salió:** mapa escenario por escenario con el código que lo sostiene, solo en el chat.

## Prompt 4

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
add a la @../../docs/spec-viva/mvl.md una sección al final Parte  :  las 3 listas  la 1. el agente escrbio 18 Requisitos he comprobado 9:  2 de api y 7 pantalla
```

**Qué salió:** añadió la Parte B; las listas 2 y 3 las redactó el agente a partir de lo encontrado en la revisión.

## Prompt 5

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
realmente las comprobaciones fueron con el navegador mas que con el código
```

**Qué salió:** corrigió la lista 1 para reflejarlo.

## Prompt 6

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
No consegui reproducir el 49 no se si es correcto este escenario no vi "Tu sesion ha caducado .."
```

**Qué salió:** el escenario era correcto según el código pero inalcanzable con la app sola; se precisó el WHEN y se corrigió una línea falsa de la lista 2.

## Prompt 7

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
realmente si que caduca y he intentado borrar la cookie con devtools pero lo que hace es redirect al login
```

**Qué salió:** el agente mostró que los tokens no caducan (librería y BD) y que borrar no es lo mismo que invalidar.

## Prompt 8

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
la cookie tiene adonis-session=s%3AeyJtZXNzYWdlIjoiZjEwYWFkN2MtMjg2Ny00MjQxLTkwMDMtYzhkMDFiZjg1YjY5IiwicHVycG9zZSI6ImFkb25pcy1zZXNzaW9uIn0.tF3K_FRhtBQzOASg1b_aWP1cc953JPNrFizxssYc6K0; Max-Age=7200; Path=/; HttpOnly; SameSite=Lax
```

**Qué salió:** es la sesión web del framework (2 h), que no interviene en el acceso; salió como incoherencia para la lista 2.

## Prompt 9

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
ok
```

**Qué salió:** añadió la incoherencia de la cookie a la lista 2.

## Prompt 10

**Modelo:** Opus 5.5 (1M) · esfuerzo high
**Herramienta:** Claude Code

```
@../prompts.md  add los prompts de la sesion como se indica en el archivo
```

**Qué salió:** este archivo.
