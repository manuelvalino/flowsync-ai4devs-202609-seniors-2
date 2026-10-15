import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { versionedDocumentPath, writeDocument } from '#openapi/document'

export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Escribe el documento OpenAPI en docs/api/openapi.json'

  static options: CommandOptions = { startApp: true }

  async run() {
    const path = versionedDocumentPath()
    await writeDocument(path)
    this.logger.success(`Documento OpenAPI escrito en ${path}`)
  }
}
