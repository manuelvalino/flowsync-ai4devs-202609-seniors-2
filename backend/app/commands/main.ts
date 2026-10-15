import { ListLoader } from '@adonisjs/core/ace'
import OpenapiCheck from '#commands/openapi_check'
import OpenapiGenerate from '#commands/openapi_generate'

/**
 * Los comandos del proyecto se registran desde `adonisrc.ts` con este loader
 * y no se dejan en `./commands/`, que ace escanea solo y valida con
 * `jsonschema`. La 1.5.0 que trae `@adonisjs/ace` revienta con «Invalid URL»
 * en Node 24.20 (`new URL('#/definitions/…', 'thismessage::/')`) y deja
 * inservible `node ace` mientras haya un solo fichero en esa carpeta.
 * `ListLoader` no valida: serializa la clase y listo.
 */
const loader = new ListLoader([OpenapiGenerate, OpenapiCheck])

/**
 * Con esta forma, `() => import('#commands/main')` en `adonisrc.ts` es un
 * loader tal cual, igual que los de los paquetes.
 */
export const getMetaData = () => loader.getMetaData()
export const getCommand = (...args: Parameters<typeof loader.getCommand>) =>
  loader.getCommand(...args)
