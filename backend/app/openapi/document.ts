import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import app from '@adonisjs/core/services/app'

/**
 * Dónde vive el documento versionado. Está en `docs/` en la raíz del
 * monorepo, es decir, un nivel por encima de `backend/`.
 */
export function versionedDocumentPath() {
  return app.makePath('..', 'docs', 'api', 'openapi.json')
}

/**
 * El documento tal y como se escribe a disco: el mismo que sirve `/api.json`
 * (sale de `openapi.buildDocument()`), pero con sangría y salto de línea
 * final para que el diff de git sea legible. Es el único sitio que lo
 * serializa, así que `openapi:generate` y `openapi:check` no pueden discrepar
 * por formato.
 */
export async function renderDocument() {
  // Un comando de consola arranca la app pero no el servidor HTTP, que es quien
  // hace `router.commit()`. Sin esto las rutas siguen "por registrar", el
  // router no las ve y el documento sale con `paths: {}`. Es idempotente.
  const router = await app.container.make('router')
  router.commit()

  const openapi = await app.container.make('openapi')
  const document = await openapi.buildDocument()
  return `${JSON.stringify(document, null, 2)}\n`
}

export async function writeDocument(path: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, await renderDocument())
}

/**
 * Diferencias entre dos valores JSON, una línea por ruta que no coincide
 * (`$.paths./api/v1/tasks.get.summary`). Es más útil que un diff de texto
 * para un documento OpenAPI: dice qué parte del contrato se movió.
 */
export function diffDocuments(
  versioned: unknown,
  generated: unknown,
  path = '$',
  out: string[] = []
) {
  if (
    isTree(versioned) &&
    isTree(generated) &&
    Array.isArray(versioned) === Array.isArray(generated)
  ) {
    const keys = new Set([...Object.keys(versioned), ...Object.keys(generated)])
    for (const key of keys) {
      const child = Array.isArray(versioned) ? `${path}[${key}]` : `${path}.${key}`
      if (!(key in generated)) out.push(`- ${child}: solo en el versionado`)
      else if (!(key in versioned)) out.push(`+ ${child}: solo en el generado`)
      else
        diffDocuments(
          versioned[key as keyof typeof versioned],
          generated[key as keyof typeof generated],
          child,
          out
        )
    }
  } else if (JSON.stringify(versioned) !== JSON.stringify(generated)) {
    out.push(
      `~ ${path}: versionado ${JSON.stringify(versioned)} → generado ${JSON.stringify(generated)}`
    )
  }
  return out
}

function isTree(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
