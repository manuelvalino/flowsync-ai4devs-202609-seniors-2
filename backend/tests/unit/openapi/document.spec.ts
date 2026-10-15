import { test } from '@japa/runner'
import { diffDocuments } from '#openapi/document'

/**
 * `diffDocuments` es lo que `openapi:check` imprime cuando el documento
 * versionado y el generado no coinciden. Lo que importa de él es que diga
 * *dónde* se movió el contrato, y que dos documentos iguales no den nada.
 */
test.group('OpenAPI | diffDocuments', () => {
  test('dos documentos iguales no tienen diferencias', ({ assert }) => {
    const doc = { paths: { '/a': { get: { summary: 'x', tags: ['t'] } } } }

    assert.deepEqual(diffDocuments(doc, structuredClone(doc)), [])
  })

  test('señala la ruta de un valor que cambia', ({ assert }) => {
    const versioned = { paths: { '/a': { get: { summary: 'viejo' } } } }
    const generated = { paths: { '/a': { get: { summary: 'nuevo' } } } }

    assert.deepEqual(diffDocuments(versioned, generated), [
      '~ $.paths./a.get.summary: versionado "viejo" → generado "nuevo"',
    ])
  })

  test('distingue lo que solo está en un lado', ({ assert }) => {
    const versioned = { paths: { '/vieja': {} } }
    const generated = { paths: { '/nueva': {} } }

    assert.sameMembers(diffDocuments(versioned, generated), [
      '- $.paths./vieja: solo en el versionado',
      '+ $.paths./nueva: solo en el generado',
    ])
  })

  test('compara los arrays por posición', ({ assert }) => {
    const versioned = { parameters: [{ name: 'id' }] }
    const generated = { parameters: [{ name: 'id' }, { name: 'id' }] }

    assert.deepEqual(diffDocuments(versioned, generated), [
      '+ $.parameters[1]: solo en el generado',
    ])
  })

  test('un objeto que pasa a array es una diferencia, no un recorrido', ({ assert }) => {
    assert.deepEqual(diffDocuments({ a: {} }, { a: [] }), ['~ $.a: versionado {} → generado []'])
  })
})
