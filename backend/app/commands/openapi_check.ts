import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { diffDocuments, versionedDocumentPath, writeDocument } from '#openapi/document'

const MAX_DIFF_LINES = 40

export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Comprueba que docs/api/openapi.json coincide con el documento que genera el código (no escribe en él)'

  static options: CommandOptions = { startApp: true }

  async run() {
    const versionedPath = versionedDocumentPath()
    const dir = await mkdtemp(join(tmpdir(), 'openapi-check-'))

    try {
      const generatedPath = join(dir, 'openapi.json')
      await writeDocument(generatedPath)
      const generated = await readFile(generatedPath, 'utf-8')

      const versioned = await readFile(versionedPath, 'utf-8').catch(() => null)
      if (versioned === null) {
        return this.fail(`No existe ${versionedPath}.`)
      }
      if (versioned === generated) {
        this.logger.success('docs/api/openapi.json está al día con el código.')
        return
      }

      const differences = diffDocuments(JSON.parse(versioned), JSON.parse(generated))
      const shown = differences.slice(0, MAX_DIFF_LINES)
      const detail = differences.length
        ? [
            ...shown,
            ...(differences.length > shown.length
              ? [`… y ${differences.length - shown.length} diferencias más`]
              : []),
          ].join('\n')
        : 'El contenido es el mismo y cambia solo el formato (sangría o salto de línea final).'
      this.fail(`El contrato versionado no coincide con el que genera el código:\n${detail}`)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }

  private fail(reason: string) {
    this.logger.error(reason)
    this.logger.error(
      'Si el cambio es intencionado, ejecuta `npm run openapi:generate` y commitea el fichero.'
    )
    this.exitCode = 1
  }
}
